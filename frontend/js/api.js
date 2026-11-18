(function () {
    const usingOtherServer = location.protocol === 'file:' || ['5500', '5501'].includes(location.port);
    const API_BASE = window.SKILLMATRIX_API_BASE || (usingOtherServer ? 'http://127.0.0.1:5000/api' : '/api');

    const TOKEN_KEY = 'sm_token';

    const auth = {
        token() { return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY); },
        save(token, remember) {
            this.clear();
            (remember === false ? sessionStorage : localStorage).setItem(TOKEN_KEY, token);
        },
        clear() { sessionStorage.removeItem(TOKEN_KEY); localStorage.removeItem(TOKEN_KEY); },
    };

    class ApiError extends Error {
        constructor(message, status, code, fields) {
            super(message);
            this.status = status; this.code = code; this.fields = fields || {};
        }
    }

    async function request(method, path, body) {
        const headers = { 'Content-Type': 'application/json' };
        const token = auth.token();
        if (token) headers.Authorization = 'Bearer ' + token;
        let res;
        try {
            res = await fetch(API_BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
        } catch (e) {
            throw new ApiError('Cannot reach the server. Make sure the backend is running (python app.py).', 0, 'network');
        }
        let data = null;
        try { data = await res.json(); } catch (e) { /* non-JSON reply */ }
        if (!res.ok) {
            const err = (data && data.error) || {};
            const waking = [500, 502, 503, 504].includes(res.status) && !err.message;
            throw new ApiError(err.message || (waking
                ? 'The server took too long or is still waking up (error ' + res.status + '). Wait 20 seconds and try again.'
                : 'Request failed (' + res.status + ').'), res.status, err.code, err.fields);
        }
        return data;
    }
    function el(tag, attrs, ...children) {
        const node = document.createElement(tag);
        for (const [k, v] of Object.entries(attrs || {})) {
            if (v === null || v === undefined || v === false) continue;
            if (k === 'class') node.className = v;
            else if (k === 'text') node.textContent = v;
            else if (k === 'style') node.setAttribute('style', v);
            else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
            else node.setAttribute(k, v === true ? '' : v);
        }
        for (const c of children.flat()) {
            if (c === null || c === undefined || c === false) continue;
            node.append(c.nodeType ? c : document.createTextNode(String(c)));
        }
        return node;
    }

    function setBusy(button, busy, busyText) {
        if (!button) return;
        if (busy) { button.dataset.label = button.textContent; button.textContent = busyText || 'Please wait...'; }
        else if (button.dataset.label) { button.textContent = button.dataset.label; }
        button.disabled = busy;
    }

    function showMsg(node, text, type) {
        if (!node) return;
        node.textContent = text || '';
        node.className = node.className.replace(/\b(error|success)\b/g, '').trim() + (text && type ? ' ' + type : '');
    }

    async function stream(path, body, onItem) {
        const headers = { 'Content-Type': 'application/json' };
        const token = auth.token();
        if (token) headers.Authorization = 'Bearer ' + token;
        let res;
        try {
            res = await fetch(API_BASE + path, { method: 'POST', headers, body: JSON.stringify(body || {}) });
        } catch (e) {
            throw new ApiError('Cannot reach the server. Make sure the backend is running (python app.py).', 0, 'network');
        }
        if (!res.ok) {
            let data = null;
            try { data = await res.json(); } catch (e) { /* non-JSON reply */ }
            const err = (data && data.error) || {};
            throw new ApiError(err.message || 'Request failed (' + res.status + ').', res.status, err.code, err.fields);
        }
        const feed = (line) => { line = line.trim(); if (line) { try { onItem(JSON.parse(line)); } catch (e) { /* ignore a broken line */ } } };
        if (!res.body || !res.body.getReader) { (await res.text()).split('\n').forEach(feed); return; }
        const reader = res.body.getReader(), decoder = new TextDecoder();
        let buffer = '';
        for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let at;
            while ((at = buffer.indexOf('\n')) >= 0) { feed(buffer.slice(0, at)); buffer = buffer.slice(at + 1); }
        }
        feed(buffer);
    }

    window.SM = {
        API_BASE, auth, el, setBusy, showMsg, ApiError,
        api: {
            stream,
            get: (p) => request('GET', p),
            post: (p, b) => request('POST', p, b || {}),
            put: (p, b) => request('PUT', p, b || {}),
            del: (p, b) => request('DELETE', p, b),
        },
    };
})();
