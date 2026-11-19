(function () {
    if (!window.SM_BANK || !SM.arcade) return;
    const { el } = SM, A = SM.arcade, $ = (id) => document.getElementById(id), T = ['Easy', 'Medium', 'Hard', 'Expert', 'Insane'], SPEED = [20, 27, 35, 44, 54], fx = (n) => SM.sfx && SM.sfx.play(n);
    A.state.rain = A.state.rain || {};
    const shuffle = (l) => { const a = l.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    function home() {
        const q = $('arc-qlevel'); if (q) q.replaceChildren(...['All', ...T].map((n, i) => { const b = el('button', { type: 'button', class: 'bt-tier' + (A.state.qtier === i - 1 ? ' on' : ''), text: n }); b.addEventListener('click', () => { A.state.qtier = i - 1; A.save(); home(); }); return b; }));
        const g = $('arc-rain'); if (!g) return;
        g.replaceChildren(...SM_ARCADE.langs.map((l) => el('div', { class: 'game-card bt-card', style: '--tc:' + l.color }, el('span', { class: 't-mono', text: l.code }), el('h3', { text: l.name + ' Rain' }), el('p', { text: 'Fast logic: 8 falling questions, 3 hearts.' }),
            el('div', { class: 'bt-tiers' }, T.map((t, i) => { const b = el('button', { type: 'button', class: 'bt-tier' + (A.state.rain[l.id + i] ? ' won' : ''), text: (A.state.rain[l.id + i] ? '✔ ' : '') + t }); b.addEventListener('click', () => start(l, i)); return b; })))));
    }
    const prev = A.onHome; A.onHome = () => { if (prev) prev(); home(); };
    let raf = 0, ro = null, onKey = null;
    function stop() { if (SM.sfx) SM.sfx.music(false); cancelAnimationFrame(raf); raf = 0; if (ro) ro.disconnect(); ro = null; if (onKey) removeEventListener('keydown', onKey); onKey = null; }
    addEventListener('hashchange', () => { if (location.hash !== '#arcade') stop(); });

    function start(lang, tier) {
        stop(); if (SM.sfx) SM.sfx.music(true);
        const qs = shuffle(SM_BANK.pool(lang.id, tier).filter((q) => q.type === 'mcq')).slice(0, 8 + tier);
        let i = 0, hearts = 3, score = 0, blocks = [], parts = [], busy = false, last = 0, W = 0, H = 0;
        $('arc-home').hidden = true; $('arc-play').hidden = false; scrollTo({ top: 0, behavior: 'smooth' });
        const cv = el('canvas', { class: 'bt-canvas' }), qbox = el('div', { class: 'panel bt-q' }), hud = el('span');
        const back = el('button', { type: 'button', class: 'btn', text: '< All games' }); back.addEventListener('click', () => { stop(); $('arc-play').hidden = true; $('arc-home').hidden = false; });
        $('arc-play').replaceChildren(el('div', { class: 'play-top' }, back, el('div', { class: 'play-meta' }, el('b', { text: lang.name + ' Rain - ' + T[tier] }), hud)), qbox, el('div', { class: 'rain-wrap' }, cv));
        const ctx = cv.getContext('2d');
        const fit = () => { W = Math.min(cv.parentElement.clientWidth || 320, 760); H = Math.round(Math.max(300, W * 0.75)); const d = devicePixelRatio || 1; cv.width = W * d; cv.height = H * d; cv.style.height = H + 'px'; ctx.setTransform(d, 0, 0, d, 0, 0); };
        ro = new ResizeObserver(() => { fit(); if (blocks.length) layout(); }); ro.observe(cv.parentElement); fit();
        const setHud = () => { hud.textContent = '♥'.repeat(hearts) + '♡'.repeat(3 - hearts) + '  Score ' + score + '  Q ' + Math.min(i + 1, qs.length) + '/' + qs.length; };
        function layout() { blocks.forEach((b, k) => { b.w = W / 4 - 10; b.x = k * (W / 4) + 5; }); }
        function spawn() {
            const q = qs[i]; busy = false; setHud();
            qbox.replaceChildren(el('h3', { class: 'q-text', text: q.q }), q.code ? el('pre', { class: 'code-block q-code' }, el('code', { text: q.code })) : null, el('small', { class: 'muted', text: 'Tap a block or press 1-4.' }));
            blocks = shuffle(q.options).map((o, k) => ({ t: o, ok: o === q.options[0], y: -70 - k * 22, h: 104, dead: 0, n: k + 1 })); layout();
        }
        function burst(x, y, c) { for (let k = 0; k < 22; k++) parts.push({ x, y, vx: (Math.random() - 0.5) * 7, vy: (Math.random() - 0.9) * 7, l: 1, c }); }
        function after(ok, b) {
            if (busy) return; busy = true; const q = qs[i];
            fx(ok ? 'right' : 'wrong'); if (ok) { score += 10; A.addXp(8); burst(b.x + b.w / 2, b.y + 30, '#3ddc97'); } else { hearts--; if (b) { b.dead = 1; burst(b.x + b.w / 2, b.y + 30, '#ff6b7a'); } }
            qbox.append(el('div', { class: 'feedback ' + (ok ? 'ok' : 'bad') }, el('strong', { text: ok ? 'Correct!' : 'Right answer: ' + q.options[0] }), el('p', { text: q.why }))); setHud();
            setTimeout(() => { if (!hearts) return end(false); i++; if (i >= qs.length) end(true); else spawn(); }, ok ? 1100 : 2200);
        }
        function pick(b) { if (!busy && b && !b.dead) after(b.ok, b); }
        cv.addEventListener('pointerdown', (e) => { const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; pick(blocks.find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h)); });
        onKey = (e) => { const n = +e.key; if (n >= 1 && n <= 4) pick(blocks.find((b) => b.n === n)); }; addEventListener('keydown', onKey);
        function wrap(text, mw) { const words = text.split(' '), lines = []; let cur = ''; words.forEach((w) => { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > mw && cur) { lines.push(cur); cur = w; } else cur = t; }); lines.push(cur); return lines.slice(0, 6); }
        function frame(ts) {
            if (!cv.isConnected) return stop(); const dt = Math.min((ts - (last || ts)) / 1000, 0.05); last = ts; const t = ts / 1000, fk = dt * 60;
            const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#080c1e'); bg.addColorStop(1, lang.color + '44'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#fff'; for (let k = 0; k < 50; k++) { ctx.globalAlpha = 0.25 + 0.5 * Math.abs(Math.sin(t + k)); ctx.fillRect((k * 89 % 100) / 100 * W, (k * 47 % 100) / 100 * H, 1.5, 1.5); } ctx.globalAlpha = 1;
            const gl = ctx.createLinearGradient(0, H - 22, 0, H); gl.addColorStop(0, 'rgba(255,60,90,0)'); gl.addColorStop(1, 'rgba(255,60,90,.55)'); ctx.fillStyle = gl; ctx.fillRect(0, H - 22, W, 22);
            ctx.font = '600 ' + Math.max(11, Math.min(14, W / 34)) + 'px DM Sans, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            blocks.forEach((b) => {
                if (!b.dead && !busy) { b.y += SPEED[tier] * (H / 300) * dt; if (b.y + b.h >= H - 8) { if (b.ok) after(false, b); else b.y = H - 8 - b.h; } } else if (b.dead) b.dead = Math.max(b.dead - dt * 2, 0.0001);
                const a = b.dead ? b.dead : 1, c = busy && b.ok ? '#3ddc97' : lang.color; ctx.globalAlpha = a; ctx.shadowColor = c; ctx.shadowBlur = 14;
                const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h); g.addColorStop(0, '#1d2848'); g.addColorStop(1, '#0f1730'); ctx.fillStyle = g; ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 12); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
                ctx.fillStyle = c; ctx.beginPath(); ctx.arc(b.x + 14, b.y + 14, 9, 0, 7); ctx.fill(); ctx.fillStyle = '#07090f'; ctx.fillText(b.n, b.x + 14, b.y + 14);
                ctx.fillStyle = '#eef1f8'; const ls = wrap(b.t, b.w - 14); ls.forEach((l, k) => ctx.fillText(l, b.x + b.w / 2, b.y + b.h / 2 + 6 + (k - (ls.length - 1) / 2) * 15)); ctx.globalAlpha = 1;
            });
            parts = parts.filter((p) => { p.x += p.vx * fk; p.y += p.vy * fk; p.vy += 0.3 * fk; p.l -= 0.03 * fk; ctx.globalAlpha = Math.max(p.l, 0); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, 3.5, 3.5); return p.l > 0; }); ctx.globalAlpha = 1;
            raf = requestAnimationFrame(frame);
        }
        function end(win) {
            stop(); fx(win ? 'win' : 'lose'); const key = lang.id + tier, bonus = win && hearts === 3 ? 20 : 0;
            if (win && !A.state.rain[key]) { A.state.rain[key] = true; A.addXp(30 + bonus); } else A.save(); if (win && SM.confetti) SM.confetti(150);
            const again = el('button', { type: 'button', class: 'btn primary', text: win ? 'Play again' : 'Try again' }); again.addEventListener('click', () => start(lang, tier));
            const hm = el('button', { type: 'button', class: 'btn', text: 'All games' }); hm.addEventListener('click', () => { $('arc-play').hidden = true; $('arc-home').hidden = false; });
            qbox.replaceChildren(el('div', { class: 'result-card' }, el('h2', { text: win ? 'Level cleared!' : 'Game over' }), el('p', { class: 'muted', text: 'Score ' + score + (win ? (bonus ? ' (+20 no-damage bonus)' : '') : '. Read the explanations and try again.') }), el('div', { class: 'detail-actions', style: 'justify-content:center' }, again, hm)));
        }
        spawn(); raf = requestAnimationFrame(frame);
    }
    home();
})();
