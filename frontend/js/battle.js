(function () {
    if (!window.SM_ARCADE || !SM.arcade) return;
    const { el } = SM, A = SM.arcade, $ = (id) => document.getElementById(id), D = SM_ARCADE;
    const TIERS = ['Easy', 'Medium', 'Hard', 'Expert', 'Insane'], COUNT = [5, 6, 7, 8, 9], BOSS_NAMES = ['Slime King', 'Stone Golem', 'Ancient Dragon', 'Void Wraith', 'Chaos Dragon'], BSP = [10, 11, 12, 2, 12], fx = (n) => SM.sfx && SM.sfx.play(n);
    A.state.battle = A.state.battle || {};
    const shuffle = (l) => { const a = l.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    function build(lang, tier) {
        const boss = SM_BANK.boss(lang.id, tier), pool = SM_BANK.pool(lang.id, tier).filter((q) => q.q !== boss.q || q.code !== boss.code);
        return { boss, foes: shuffle(pool).slice(0, Math.min(COUNT[tier], pool.length)) };
    }

    function renderHome() {
        const g = $('arc-battle'); if (!g) return;
        g.replaceChildren(...D.langs.map((l) => el('div', { class: 'game-card bt-card', style: '--tc:' + l.color },
            el('span', { class: 't-mono', text: l.code }), el('h3', { text: l.name + ' Battle' }), el('p', { text: 'Beat the enemies with correct code, then the boss.' }),
            el('div', { class: 'bt-tiers' }, TIERS.map((t, i) => {
                const b = el('button', { type: 'button', class: 'bt-tier' + (A.state.battle[l.id + i] ? ' won' : ''), text: (A.state.battle[l.id + i] ? '✔ ' : '') + t });
                b.addEventListener('click', () => start(l, i)); return b;
            })))));
    }
    A.onHome = renderHome;

    let raf = 0, ro = null, G = null;
    function stop() { if (SM.sfx) SM.sfx.music(false); cancelAnimationFrame(raf); raf = 0; if (ro) ro.disconnect(); ro = null; G = null; }
    addEventListener('hashchange', () => { if (location.hash !== '#arcade') stop(); });

    function start(lang, tier) {
        stop(); if (SM.sfx) SM.sfx.music(true);
        const w = build(lang, tier);
        G = { lang, tier, hearts: 3, q: w.foes.map((q, i) => ({ q, x: 0.9, seed: i * 7 + 1, hp: 1, die: 0, hurt: 0 })), boss: { q: w.boss, x: 0.9, seed: 99, hp: 1, die: 0, hurt: 0, boss: true }, cur: null, shots: [], parts: [], shake: 0, flash: 0, lunge: 0, cast: 0, kills: 0, busy: false };
        $('arc-home').hidden = true; $('arc-play').hidden = false; scrollTo({ top: 0, behavior: 'smooth' });
        const cv = el('canvas', { class: 'bt-canvas' }), qbox = el('div', { class: 'panel bt-q' }), hud = el('span');
        const back = el('button', { type: 'button', class: 'btn', text: '< All games' }); back.addEventListener('click', () => { stop(); $('arc-play').hidden = true; $('arc-home').hidden = false; });
        $('arc-play').replaceChildren(el('div', { class: 'play-top' }, back, el('div', { class: 'play-meta' }, el('b', { text: lang.name + ' - ' + TIERS[tier] }), hud)), el('div', { class: 'bt-stage' }, cv), qbox);
        const ctx = cv.getContext('2d'); let W = 0, H = 0;
        const fit = () => { W = Math.min(cv.parentElement.clientWidth || 320, 860); H = Math.round(Math.max(190, W * 0.44)); const d = devicePixelRatio || 1; cv.width = W * d; cv.height = H * d; cv.style.height = H + 'px'; ctx.setTransform(d, 0, 0, d, 0, 0); };
        ro = new ResizeObserver(fit); ro.observe(cv.parentElement); fit();
        const gy = () => H * 0.8, u = () => H / 230;
        const col = lang.color, alive = () => G.q.filter((e) => e.hp > 0);
        const setHud = () => { hud.textContent = '♥'.repeat(G.hearts) + '♡'.repeat(3 - G.hearts) + '  Enemies left: ' + alive().length + (G.cur && G.cur.boss ? '  BOSS' : ''); };

        function burst(x, y, c, n) { for (let i = 0; i < n; i++) G.parts.push({ x, y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.9) * 6, l: 1, c }); }
        const eye = (x, y, r, pu) => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.fillStyle = pu || '#111'; ctx.beginPath(); ctx.arc(x - r * 0.3, y, r * 0.5, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(x - r * 0.5, y - r * 0.5, 2, 2); };
        const fillG = (c) => { ctx.fillStyle = c; ctx.fill(); const g = ctx.createLinearGradient(0, -70, 0, 6); g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.5)'); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 2; ctx.stroke(); };
        const tri = (a, b, c, d, e2, f, col2) => { ctx.fillStyle = col2; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.lineTo(e2, f); ctx.fill(); };
        function monster(e, x, y, s, t) {
            const sp = e.boss ? BSP[G.tier] : e.seed % 4, h = e.hurt > 0, c = h ? '#ffffff' : (e.boss && G.tier === 4 ? '#6a3bd6' : col), w = Math.sin(t * 9 + e.seed);
            ctx.save(); ctx.translate(x, y); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0, 2, 30 * s, 6 * s, 0, 0, 7); ctx.fill();
            ctx.scale(s, s * (1 - e.die * 0.9)); ctx.globalAlpha = 1 - e.die; ctx.lineJoin = 'round';
            const bob = Math.sin(t * 3 + e.seed) * 3; if (e.boss) { ctx.shadowColor = sp === 12 ? '#ff7a18' : '#ff2d55'; ctx.shadowBlur = 26; }
            if (sp === 0 || sp === 10) {                                                 // slime (boss: slime king)
                ctx.translate(0, bob * 0.5); ctx.beginPath(); ctx.moveTo(-28, 0); ctx.bezierCurveTo(-34, -52, -14, -66, 0, -66); ctx.bezierCurveTo(14, -66, 34, -52, 28, 0);
                for (let i = 0; i < 4; i++) ctx.quadraticCurveTo(21 - i * 14, 9, 14 - i * 14, 0); fillG(c); ctx.shadowBlur = 0;
                ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(-14, -50, 6, 3, -0.6, 0, 7); ctx.fill();
                eye(-11, -34, 8, e.boss ? '#c00' : '#111'); eye(11, -34, 8, e.boss ? '#c00' : '#111'); ctx.strokeStyle = '#111'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-22, -48); ctx.lineTo(-4, -42); ctx.moveTo(22, -48); ctx.lineTo(4, -42); ctx.stroke();
                ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.moveTo(-13, -19); ctx.quadraticCurveTo(0, -4, 13, -19); ctx.fill(); ctx.fillStyle = '#fff'; for (let i = -9; i < 10; i += 6) tri(i, -18, i + 3, -11, i + 6, -18, '#fff');
                if (sp === 10) { ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.moveTo(-18, -62); ctx.lineTo(-20, -86); ctx.lineTo(-9, -72); ctx.lineTo(0, -92); ctx.lineTo(9, -72); ctx.lineTo(20, -86); ctx.lineTo(18, -62); ctx.fill(); ctx.strokeStyle = '#a56a00'; ctx.lineWidth = 2; ctx.stroke(); }
            } else if (sp === 1) {                                                       // bat
                ctx.translate(0, -50 + bob * 2); [-1, 1].forEach((k) => { ctx.beginPath(); ctx.moveTo(k * 8, -6); ctx.quadraticCurveTo(k * 44, -40 + w * 16, k * 62, -4 + w * 22); ctx.quadraticCurveTo(k * 46, -6, k * 38, 10); ctx.quadraticCurveTo(k * 26, 0, k * 18, 12); ctx.quadraticCurveTo(k * 12, 0, k * 8, 8); fillG(c); });
                ctx.beginPath(); ctx.ellipse(0, 0, 17, 22, 0, 0, 7); fillG(c); tri(-14, -14, -10, -34, -3, -18, h ? '#fff' : '#222a40'); tri(14, -14, 10, -34, 3, -18, h ? '#fff' : '#222a40'); ctx.shadowBlur = 0;
                eye(-7, -4, 5, '#d00'); eye(7, -4, 5, '#d00'); tri(-6, 8, -4, 15, -2, 8, '#fff'); tri(2, 8, 4, 15, 6, 8, '#fff');
            } else if (sp === 2) {                                                       // ghost
                ctx.translate(0, -8 + bob * 2); ctx.globalAlpha *= 0.9; ctx.beginPath(); ctx.arc(0, -34, 25, Math.PI, 0); ctx.lineTo(25, 0);
                for (let i = 0; i < 5; i++) ctx.quadraticCurveTo(20 - i * 10, 12 * (i % 2 ? -0.3 : 1) + w * 3, 15 - i * 10, 0); ctx.closePath(); fillG(h ? '#fff' : '#d6dcff');
                ctx.fillStyle = '#10162b'; [-9, 9].forEach((k) => { ctx.beginPath(); ctx.ellipse(k, -36, 6, 8, 0, 0, 7); ctx.fill(); }); ctx.fillStyle = col; [-9, 9].forEach((k) => { ctx.beginPath(); ctx.arc(k - 1, -35, 2.6, 0, 7); ctx.fill(); });
                ctx.beginPath(); ctx.ellipse(0, -16, 6, 8 + w, 0, 0, 7); ctx.fillStyle = '#10162b'; ctx.fill();
            } else if (sp === 3 || sp === 11) {                                          // stone golem (boss: bigger with glowing eye)
                const st = h ? '#fff' : '#6f7896'; ctx.translate(0, bob * 0.3); [-1, 1].forEach((k) => { ctx.beginPath(); ctx.roundRect(k * 28 - 8, -50 + w * 2, 16, 40, 7); fillG(st); });
                ctx.beginPath(); ctx.roundRect(-24, -62, 48, 62, 12); fillG(st); ctx.beginPath(); ctx.roundRect(-14, -84, 28, 26, 8); fillG(st); ctx.shadowBlur = 0;
                ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, -50); ctx.lineTo(-2, -38); ctx.lineTo(-12, -26); ctx.moveTo(14, -30); ctx.lineTo(6, -18); ctx.stroke();
                const g = ctx.createRadialGradient(0, -72, 1, 0, -72, 10); g.addColorStop(0, '#fff'); g.addColorStop(1, e.boss ? '#ff3b3b' : col); ctx.fillStyle = g; ctx.shadowColor = e.boss ? '#ff3b3b' : col; ctx.shadowBlur = 16; ctx.beginPath(); ctx.arc(0, -72, 8 + w, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
                if (e.boss) [-1, 1].forEach((k) => tri(k * 22, -62, k * 38, -86, k * 30, -56, '#4a5170'));
            } else {                                                                     // ancient dragon (boss of the Hard level)
                ctx.translate(0, bob);
                [-1].forEach(() => { ctx.beginPath(); ctx.moveTo(8, -52); ctx.quadraticCurveTo(40, -110 + w * 14, 78, -60 + w * 22); ctx.quadraticCurveTo(60, -58, 54, -40); ctx.quadraticCurveTo(40, -50, 30, -36); ctx.quadraticCurveTo(22, -46, 8, -40); fillG('#8a2c4a'); });
                ctx.beginPath(); ctx.moveTo(30, -20); ctx.quadraticCurveTo(70, -10, 82, -34); ctx.quadraticCurveTo(60, 0, 24, 0); ctx.fill(); ctx.strokeStyle = '#000'; ctx.stroke(); ctx.fillStyle = c;
                ctx.beginPath(); ctx.ellipse(8, -32, 34, 26, 0, 0, 7); fillG(c); ctx.beginPath(); ctx.moveTo(-14, -40); ctx.quadraticCurveTo(-30, -58, -36, -72); ctx.lineTo(-22, -76); ctx.quadraticCurveTo(-8, -56, 4, -50); fillG(c);
                ctx.beginPath(); ctx.ellipse(-36, -78, 17, 12, -0.2, 0, 7); fillG(c); tri(-34, -88, -26, -108, -22, -86, '#ffd166'); tri(-44, -86, -46, -104, -34, -86, '#ffd166'); ctx.shadowBlur = 0;
                eye(-34, -82, 4.5, '#f00'); ctx.fillStyle = '#ffb454'; ctx.beginPath(); ctx.ellipse(8, -22, 16, 16, 0, 0, 7); ctx.fill();
                const f = ctx.createRadialGradient(-56, -72, 1, -56, -72, 20 + Math.abs(w) * 8); f.addColorStop(0, 'rgba(255,230,120,.95)'); f.addColorStop(1, 'rgba(255,80,20,0)'); ctx.fillStyle = f; ctx.beginPath(); ctx.arc(-56, -72, 28, 0, 7); ctx.fill();
            }
            ctx.restore();
        }
        function hero(x, y, s, t) {
            ctx.save(); ctx.translate(x, y + Math.sin(t * 2) * 2); ctx.scale(s, s);
            ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(0, 2, 26, 6, 0, 0, 7); ctx.fill();
            const g = ctx.createLinearGradient(0, -60, 0, 0); g.addColorStop(0, '#5b8dff'); g.addColorStop(1, '#6a3bd6'); ctx.fillStyle = g;
            ctx.beginPath(); ctx.moveTo(-9, -52); ctx.lineTo(9, -52); ctx.lineTo(22, 0); ctx.lineTo(-22, 0); ctx.fill();                       // robe
            ctx.fillStyle = '#f2c9a0'; ctx.beginPath(); ctx.arc(0, -62, 11, 0, 7); ctx.fill();                                                  // head
            ctx.fillStyle = '#2c2c6e'; ctx.beginPath(); ctx.moveTo(-17, -68); ctx.lineTo(17, -68); ctx.lineTo(3, -108); ctx.fill();            // hat
            ctx.fillRect(-19, -70, 38, 5); ctx.fillStyle = '#111'; ctx.fillRect(2, -63, 3, 4); ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(4, -86, 3.5, 0, 7); ctx.fill();
            const up = G.cast > 0 ? -0.5 : 0; ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(22, -4); ctx.lineTo(26 + up * 12, -74); ctx.stroke();
            const r = 7 + Math.sin(t * 6) * 1.5 + G.cast * 8; ctx.shadowColor = '#7ee8ff'; ctx.shadowBlur = 18; ctx.fillStyle = '#9ff3ff'; ctx.beginPath(); ctx.arc(26 + up * 12, -78, r, 0, 7); ctx.fill();
            ctx.restore();
        }
        function draw(ts) {
            const t = ts / 1000, gd = gy(), s = u();
            const sky = ctx.createLinearGradient(0, 0, 0, gd); sky.addColorStop(0, '#070b1c'); sky.addColorStop(1, col + '55'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
            for (let i = 0; i < 40; i++) { ctx.globalAlpha = 0.4 + 0.5 * Math.abs(Math.sin(t + i)); ctx.fillStyle = '#fff'; ctx.fillRect((i * 97 % 100) / 100 * W, (i * 53 % 60) / 100 * gd, 1.6, 1.6); } ctx.globalAlpha = 1;
            ctx.fillStyle = '#f4f1ff'; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(W * 0.86, H * 0.18, 18 * s, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
            ctx.fillStyle = '#0d1328'; ctx.beginPath(); ctx.moveTo(0, gd); for (let x = 0; x <= W; x += 12) ctx.lineTo(x, gd - 28 * s - Math.sin(x / 70) * 14 * s - Math.sin(x / 31) * 6 * s); ctx.lineTo(W, gd); ctx.fill();
            ctx.fillStyle = '#0a0f22'; for (let x = 10; x < W; x += 46) { const hh = (24 + (x * 7 % 30)) * s; ctx.beginPath(); ctx.moveTo(x - 12 * s, gd); ctx.lineTo(x, gd - hh - 18 * s); ctx.lineTo(x + 12 * s, gd); ctx.fill(); }
            const fog = ctx.createLinearGradient(0, gd - 40 * s, 0, gd + 6); fog.addColorStop(0, 'rgba(160,180,255,0)'); fog.addColorStop(1, 'rgba(160,180,255,.18)'); ctx.fillStyle = fog; ctx.fillRect(0, gd - 40 * s, W, 46 * s);
            const gr = ctx.createLinearGradient(0, gd, 0, H); gr.addColorStop(0, '#1b2440'); gr.addColorStop(1, '#0a0f1f'); ctx.fillStyle = gr; ctx.fillRect(0, gd, W, H - gd);
            ctx.strokeStyle = 'rgba(255,255,255,.06)'; for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(0, gd + i * (H - gd) / 5); ctx.lineTo(W, gd + i * (H - gd) / 5); ctx.stroke(); }
            for (let i = 0; i < 14; i++) { const fx = (i * 83 + Math.sin(t * 0.6 + i) * 24) % W, fy = gd - 20 * s - (i * 37 % 90) * s + Math.cos(t + i) * 8; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + i); ctx.fillStyle = '#c8ff8a'; ctx.shadowColor = '#c8ff8a'; ctx.shadowBlur = 8; ctx.fillRect(fx, fy, 2.4, 2.4); } ctx.shadowBlur = 0; ctx.globalAlpha = 1;
            ctx.save(); if (G.shake > 0) { ctx.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake); G.shake *= 0.9; }
            const a = alive(), front = G.cur;
            a.slice().reverse().forEach((e) => { const k = a.indexOf(e), tx = e === front ? 0.62 : 0.62 + 0.1 + k * 0.075; e.x += (tx - e.x) * 0.08; if (e.hurt > 0) e.hurt--; monster(e, e.x * W - (e === front ? G.lunge * W * 0.3 : 0), gd, (e === front ? 0.95 : 0.7) * s * 1.1, t); });
            G.q.filter((e) => e.die > 0 && e.hp <= 0 && e.die < 1).forEach((e) => { e.die += 0.04; monster(e, e.x * W, gd, 0.95 * s * 1.1, t); });
            const b = G.boss; if (b.hp > 0 || b.die < 1) { if (b.hp <= 0) b.die += 0.03; if (b.hurt > 0) b.hurt--; const act = G.cur === b; b.x += ((act ? 0.64 : 0.86) - b.x) * 0.06; ctx.globalAlpha = act || b.hp <= 0 ? 1 : 0.3; monster(b, b.x * W - (act ? G.lunge * W * 0.3 : 0), gd, (act ? 1.45 : 0.9) * s * 1.1, t); ctx.globalAlpha = 1; }
            hero(W * 0.14, gd, s * 1.15, t); if (G.cast > 0) G.cast -= 0.05; if (G.lunge > 0) G.lunge = Math.max(0, G.lunge - 0.03);
            G.shots = G.shots.filter((p) => { p.t += 0.045; const k = Math.min(p.t, 1); p.x = p.x0 + (p.tx - p.x0) * k; p.y = p.y0 + (p.ty - p.y0) * k - Math.sin(k * Math.PI) * 30 * s; burst(p.x, p.y, '#9ff3ff', 1);
                ctx.shadowColor = '#7ee8ff'; ctx.shadowBlur = 16; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, 7 * s, 0, 7); ctx.fill(); ctx.shadowBlur = 0; if (k >= 1) { p.hit(); return false; } return true; });
            G.parts = G.parts.filter((p) => { p.x += p.vx; p.y += p.vy; p.vy += 0.25; p.l -= 0.025; ctx.globalAlpha = Math.max(p.l, 0); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, 3, 3); return p.l > 0; }); ctx.globalAlpha = 1;
            ctx.restore();
            if (G.flash > 0) { ctx.fillStyle = 'rgba(255,60,80,' + G.flash + ')'; ctx.fillRect(0, 0, W, H); G.flash -= 0.04; }
            if (front && front.boss && front.hp > 0) { ctx.fillStyle = '#000a'; ctx.fillRect(W * 0.3, 10, W * 0.4, 10); ctx.fillStyle = '#ff5470'; ctx.fillRect(W * 0.3, 10, W * 0.4 * front.hp, 10); }
        }
        const loop = (ts) => { if (!G || !cv.isConnected) return stop(); draw(ts); raf = requestAnimationFrame(loop); };
        raf = requestAnimationFrame(loop);

        function next() {
            const a = alive(); G.busy = false; G.cur = a[0] || (G.boss.hp > 0 ? G.boss : null); setHud();
            if (!G.cur) return end(true); ask(G.cur);
        }
        function hit(e) {
            G.busy = true; G.cast = 1; fx('cast');
            G.shots.push({ x0: W * 0.14 + 26, y0: gy() - 90 * u(), tx: e.x * W - 10, ty: gy() - 40 * u() * (e.boss ? 1.7 : 1), t: 0, x: 0, y: 0, hit() {
                e.hurt = 8; G.shake = 14; fx(e.boss ? 'boss' : 'hit'); burst(e.x * W, gy() - 40 * u(), col, 26); e.hp = 0; e.die = 0.01; if (!e.boss) G.kills++; A.addXp(e.boss ? 40 : 10); setTimeout(next, e.boss ? 1200 : 700); } });
        }
        function miss(e, shown, why) {
            G.busy = true; G.hearts--; G.lunge = 1; fx('wrong'); G.shake = 16; G.flash = 0.45; setHud();
            const nb = el('button', { type: 'button', class: 'btn primary', text: G.hearts ? 'Continue' : 'See result' });
            nb.addEventListener('click', () => { if (!G.hearts) return end(false); if (!e.boss) { G.q.push(G.q.splice(G.q.indexOf(e), 1)[0]); } next(); });
            qbox.append(el('div', { class: 'feedback bad' }, el('strong', { text: 'The monster hit you! Right answer: ' }), el('span', { text: shown }), el('p', { text: why })), nb);
        }
        function ask(e) {
            const q = e.q, body = el('div', { class: 'q-body' }); let locked = false;
            const fin = (ok, shown) => { if (locked) return; locked = true; qbox.querySelectorAll('button,input').forEach((x) => { x.disabled = true; }); if (ok) { fx('right'); qbox.append(el('div', { class: 'feedback ok' }, el('strong', { text: 'Correct! Spell cast.' }), el('p', { text: q.why }))); hit(e); } else miss(e, shown, q.why); };
            body.append(el('div', { class: 'bt-tag' + (e.boss ? ' boss' : ''), text: e.boss ? 'BOSS: ' + BOSS_NAMES[G.tier] + ' - answer this tough one to slay it' : 'Enemy ' + (G.kills + 1) + ' of ' + G.q.length }), el('h3', { class: 'q-text', text: q.q }));
            if (q.code) body.append(el('pre', { class: 'code-block q-code' }, el('code', { text: q.code })));
            if (q.type === 'mcq') { const l = el('div', { class: 'opts' }); shuffle(q.options).forEach((o) => { const b = el('button', { type: 'button', class: 'opt', text: o }); b.addEventListener('click', () => { const ok = o === q.options[0]; b.classList.add(ok ? 'right' : 'wrong'); fin(ok, q.options[0]); }); l.append(b); }); body.append(l); }
            else if (q.type === 'fill') { const i = el('input', { type: 'text', class: 'fill-input', placeholder: 'type here...', autocomplete: 'off', spellcheck: 'false' }), c = el('button', { type: 'button', class: 'btn primary', text: 'Cast spell' });
                const go = () => { const v = i.value.trim().replace(/\s+/g, ' ').toLowerCase(); if (v) fin(q.accept.some((x) => x.toLowerCase() === v), q.accept[0]); }; c.addEventListener('click', go); i.addEventListener('keydown', (k) => { if (k.key === 'Enter') go(); }); body.append(el('div', { class: 'fill-row' }, i, c)); setTimeout(() => i.focus(), 60); }
            else { const pool = el('div', { class: 'chip-pool' }), ans = el('div', { class: 'chip-answer' }), put = [], c = el('button', { type: 'button', class: 'btn primary', text: 'Cast spell', disabled: true });
                shuffle(q.lines.map((text, i) => ({ text, i }))).forEach((ln) => { const ch = el('button', { type: 'button', class: 'line-chip', text: ln.text }); ch.addEventListener('click', () => { if (locked) return; if (ch.parentElement === ans) { put.splice(put.indexOf(ln), 1); pool.append(ch); } else { put.push(ln); ans.append(ch); } c.disabled = put.length !== q.lines.length; }); pool.append(ch); });
                c.addEventListener('click', () => fin(put.every((p, k) => p.i === k), '\n' + q.lines.join('\n'))); body.append(el('small', { class: 'muted', text: 'Tap the lines in the order they should run.' }), ans, pool, c); }
            qbox.replaceChildren(body);
        }
        function end(win) {
            const g = G; fx(win ? 'win' : 'lose'); const stars = win ? (g.hearts === 3 ? 3 : g.hearts === 2 ? 2 : 1) : 0, key = g.lang.id + g.tier;
            if (win && !A.state.battle[key]) { A.state.battle[key] = true; A.addXp(30); } else A.save();
            if (win && SM.confetti) SM.confetti(stars === 3 ? 200 : 100);
            const again = el('button', { type: 'button', class: 'btn' + (win ? '' : ' primary'), text: win ? 'Replay' : 'Try again' }); again.addEventListener('click', () => start(g.lang, g.tier));
            const nxt = win && g.tier < 4 ? el('button', { type: 'button', class: 'btn primary', text: 'Next level: ' + TIERS[g.tier + 1] }) : null; if (nxt) nxt.addEventListener('click', () => start(g.lang, g.tier + 1));
            const home = el('button', { type: 'button', class: 'btn', text: 'All games' }); home.addEventListener('click', () => { stop(); $('arc-play').hidden = true; $('arc-home').hidden = false; });
            qbox.replaceChildren(el('div', { class: 'result-card' }, el('div', { class: 'stars' }, [1, 2, 3].map((n) => el('span', { class: 'star' + (n <= stars ? ' on' : ''), text: '★' }))),
                el('h2', { text: win ? BOSS_NAMES[g.tier] + ' defeated!' : 'You were defeated' }), el('p', { class: 'muted', text: win ? 'Level cleared. The ' + g.lang.name + ' ' + TIERS[g.tier] + ' monster is slain (+30 XP first time).' : 'Read the explanations and try again - the questions get shuffled.' }),
                el('div', { class: 'detail-actions', style: 'justify-content:center' }, nxt, again, home)));
        }
        next();
    }
    renderHome();
})();
