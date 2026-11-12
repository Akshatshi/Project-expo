/* Login, signup and account-recovery pages. */
(function () {
    const { api, auth, el, setBusy, showMsg } = SM;

    // backend field name -> input name on the page
    const FIELD_MAP = { full_name: 'fullname', user_id: 'userid', identifier: 'email' };

    function messageBox(form) {
        let box = form.querySelector('.form-msg');
        if (!box) {
            box = el('p', { class: 'form-msg', role: 'alert' });
            form.querySelector('button[type="submit"]').before(box);
        }
        return box;
    }

    function clearErrors(form) {
        form.querySelectorAll('.field-error').forEach((n) => n.classList.remove('field-error'));
    }

    function showError(form, err) {
        const box = messageBox(form);
        clearErrors(form);
        const fields = err.fields || {};
        const names = Object.keys(fields);
        showMsg(box, names.length ? fields[names[0]] : err.message, 'error');
        names.forEach((f) => {
            const input = form.elements[FIELD_MAP[f] || f];
            if (input) input.classList.add('field-error');
        });
    }

    /* wraps a submit handler with busy state + error display */
    function handle(formId, busyText, fn) {
        const form = document.getElementById(formId);
        if (!form) return;
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            showMsg(messageBox(form), '');
            clearErrors(form);
            setBusy(btn, true, busyText);
            try { await fn(form, messageBox(form)); }
            catch (err) { showError(form, err); }
            finally { setBusy(btn, false); }
        });
    }

    handle('login-form', 'Logging in...', async (form) => {
        const data = await api.post('/auth/login', {
            identifier: form.elements.email.value.trim(),
            password: form.elements.password.value,
        });
        auth.save(data.token, form.elements.remember.checked);
        location.href = 'dashboard.html';
    });

    handle('signup-form', 'Creating account...', async (form) => {
        const f = form.elements;
        if (f.password.value !== f.confirm_password.value) {
            throw { fields: { confirm_password: 'Passwords do not match.' }, message: 'Passwords do not match.' };
        }
        const data = await api.post('/auth/signup', {
            full_name: f.fullname.value, email: f.email.value.trim(), user_id: f.userid.value.trim(),
            password: f.password.value, confirm_password: f.confirm_password.value,
        });
        auth.save(data.token, true);
        location.href = 'dashboard.html';
    });

    handle('forgot-password-form', 'Sending...', async (form, box) => {
        const data = await api.post('/auth/forgot-password', { email: form.elements.email.value.trim() });
        showMsg(box, data.message, 'success');
        if (data.dev_reset_link) {   // only present when DEV_MODE=true on the server
            box.append(' ', el('br'), 'Dev mode link: ', el('a', { href: data.dev_reset_link, text: 'open reset page' }));
        }
    });

    handle('forgot-userid-form', 'Checking...', async (form, box) => {
        const data = await api.post('/auth/forgot-userid', { email: form.elements.email.value.trim() });
        showMsg(box, data.message, 'success');
        if (data.dev_user_id) box.append(' ', el('br'), 'Dev mode - your User ID is: ', el('b', { text: data.dev_user_id }));
    });

    handle('reset-password-form', 'Updating...', async (form, box) => {
        const token = new URLSearchParams(location.search).get('token');
        if (!token) throw { message: 'This page needs the link from your reset request. Request a new link.' };
        const data = await api.post('/auth/reset-password', {
            token, password: form.elements.password.value, confirm_password: form.elements.confirm_password.value,
        });
        showMsg(box, data.message + ' Redirecting to login...', 'success');
        setTimeout(() => { location.href = 'index.html'; }, 1800);
    });
})();
