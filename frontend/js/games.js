(function () {
    if (!window.SM || !SM.auth.token()) return;
    const { el } = SM, $ = (id) => document.getElementById(id), W = 640, H = 420;
    const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
    const best = { get: (k) => +SM.sync.get('sm_best_' + k, 0) || 0, set: (k, v) => SM.sync.set('sm_best_' + k, v) };
    let stop = null;

    function deck(lang) {
        const fresh = (SM_QB || []).filter((r) => r[0] === lang).map((r) => ({ q: r[2], code: r[3], right: r[4], wrong: [r[5], r[6], r[7]] }));
        const old = (SM_ARCADE.questions[lang] || []).filter((q) => q.type === 'mcq').map((q) => ({ q: q.q, code: q.code, right: q.options[0], wrong: q.options.slice(1, 4) }));
        const fits = (q) => [q.right, ...q.wrong].every((o) => o.length <= 22);
        const all = fresh.concat(old), short = all.filter(fits);
        return shuffle((short.length >= 8 ? short : all).slice());
    }
    const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
    function round(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

    function shell(root, game, lang) {
        const cards = deck(lang); let at = 0;
        const qbox = el('div', { class: 'g-q' }), cv = el('canvas', { width: W, height: H, class: 'g-canvas' }), hud = el('div', { class: 'g-hud' });
        const next = () => { const q = cards[at++ % cards.length]; qbox.replaceChildren(el('b', { text: q.q }), q.code ? el('pre', { text: q.code }) : null); return { ...q, opts: shuffle([q.right, ...q.wrong]) }; };
        const bar = el('div', { class: 'g-bar' }, el('button', { class: 'btn', type: 'button', text: '← Back', onclick: () => { stop && stop(); root.replaceChildren(); home(root); } }), hud);
        root.replaceChildren(bar, qbox, cv, el('p', { class: 'muted g-help', text: game.help }));
        const ctx = cv.getContext('2d');
        const api = { ctx, cv, next, hud: (t) => { hud.textContent = t; }, over: (score) => {
            const b = Math.max(best.get(game.id), score); best.set(game.id, b);
            const box = el('div', { class: 'g-over' }, el('h2', { text: 'Game over' }), el('p', { text: 'Score ' + score + '   Best ' + b }), el('button', { class: 'btn primary', type: 'button', text: 'Play again', onclick: () => shell(root, game, lang) }));
            cv.parentNode.insertBefore(box, cv.nextSibling);
        } };
        stop = game.start(api);
    }

    const space = { id: 'space', help: 'Move with mouse, finger or ← → keys. Your ship fires automatically: shoot the asteroid with the RIGHT answer. Wrong hit = lose a life.', start(g) {
        const c = g.ctx, stars = Array.from({ length: 90 }, () => ({ x: Math.random() * W, y: Math.random() * H, z: 0.3 + Math.random() * 1.2 }));
        let ship = { x: W / 2, tx: W / 2 }, shots = [], rocks = [], fx = [], score = 0, lives = 3, q, last = performance.now(), fire = 0, alive = true, raf, t = 0;
        const keys = {}, spawn = () => { q = g.next(); const lane = shuffle([0, 1, 2, 3]); rocks = q.opts.map((o, i) => ({ x: 80 + lane[i] * 160 + Math.random() * 20, y: -30 - Math.random() * 60, vy: 0.04 + Math.min(score, 200) / 4000, r: 38, label: o, ok: o === q.right, seed: Math.random() * 6 })); };
        const boom = (x, y, col) => { for (let i = 0; i < 26; i++) { const a = Math.random() * 6.28, s = 0.05 + Math.random() * 0.25; fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 600, col }); } };
        const onMove = (e) => { const r = g.cv.getBoundingClientRect(), p = e.touches ? e.touches[0] : e; ship.tx = (p.clientX - r.left) / r.width * W; };
        const kd = (e) => { keys[e.key] = true; }, ku = (e) => { keys[e.key] = false; };
        g.cv.addEventListener('mousemove', onMove); g.cv.addEventListener('touchmove', (e) => { e.preventDefault(); onMove(e); }, { passive: false }); document.addEventListener('keydown', kd); document.addEventListener('keyup', ku);
        spawn();
        function draw() {
            const bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#05030f'); bg.addColorStop(1, '#14083a'); c.fillStyle = bg; c.fillRect(0, 0, W, H);
            const neb = c.createRadialGradient(480, 120, 10, 480, 120, 220); neb.addColorStop(0, 'rgba(138,92,246,.35)'); neb.addColorStop(1, 'rgba(138,92,246,0)'); c.fillStyle = neb; c.fillRect(0, 0, W, H);
            const neb2 = c.createRadialGradient(120, 320, 10, 120, 320, 200); neb2.addColorStop(0, 'rgba(39,176,255,.25)'); neb2.addColorStop(1, 'rgba(39,176,255,0)'); c.fillStyle = neb2; c.fillRect(0, 0, W, H);
            stars.forEach((s) => { c.fillStyle = 'rgba(255,255,255,' + (0.35 + s.z / 2.2) + ')'; c.fillRect(s.x, s.y, s.z * 1.6, s.z * 1.6); });
            rocks.forEach((r) => {
                c.save(); c.translate(r.x, r.y); c.rotate(Math.sin(t / 900 + r.seed) * 0.25);
                const gr = c.createRadialGradient(-10, -12, 4, 0, 0, r.r); gr.addColorStop(0, '#9aa6c4'); gr.addColorStop(1, '#2c3552'); c.fillStyle = gr; c.strokeStyle = '#51608a'; c.lineWidth = 2;
                c.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28, rr = r.r * (0.86 + 0.14 * Math.sin(i * 2.3 + r.seed)); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.fill(); c.stroke(); c.restore();
                c.font = '700 13px DM Sans, Arial'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.shadowColor = '#000'; c.shadowBlur = 6; c.fillText(clip(r.label, 14), r.x, r.y + 5); c.shadowBlur = 0;
            });
            shots.forEach((b) => { const lg = c.createLinearGradient(0, b.y, 0, b.y + 18); lg.addColorStop(0, '#9fe8ff'); lg.addColorStop(1, 'rgba(39,176,255,0)'); c.fillStyle = lg; c.fillRect(b.x - 2, b.y, 4, 18); });
            fx.forEach((p) => { c.globalAlpha = Math.max(p.life / 600, 0); c.fillStyle = p.col; c.fillRect(p.x, p.y, 3, 3); }); c.globalAlpha = 1;
            const sx = ship.x, sy = H - 46, fl = 10 + Math.random() * 8;
            c.fillStyle = '#ffb454'; c.beginPath(); c.moveTo(sx - 7, sy + 18); c.lineTo(sx, sy + 18 + fl); c.lineTo(sx + 7, sy + 18); c.fill();
            const sg = c.createLinearGradient(sx - 22, sy, sx + 22, sy); sg.addColorStop(0, '#27b0ff'); sg.addColorStop(0.5, '#e8f3ff'); sg.addColorStop(1, '#8a5cf6'); c.fillStyle = sg;
            c.beginPath(); c.moveTo(sx, sy - 26); c.lineTo(sx + 24, sy + 20); c.lineTo(sx + 8, sy + 14); c.lineTo(sx, sy + 20); c.lineTo(sx - 8, sy + 14); c.lineTo(sx - 24, sy + 20); c.closePath(); c.fill();
            c.fillStyle = '#0b1530'; c.beginPath(); c.ellipse(sx, sy - 2, 5, 9, 0, 0, 6.28); c.fill();
            c.textAlign = 'left'; c.font = '700 15px DM Sans, Arial'; c.fillStyle = '#fff'; c.fillText('Score ' + score, 14, 24); c.fillStyle = '#ff6b7a'; c.fillText('♥'.repeat(lives), W - 14 - lives * 16, 24);
        }
        function tick(now) {
            const dt = Math.min(now - last, 40); last = now; t += dt;
            if (alive) {
                if (keys.ArrowLeft || keys.a) ship.tx -= dt * 0.5; if (keys.ArrowRight || keys.d) ship.tx += dt * 0.5;
                ship.tx = Math.max(24, Math.min(W - 24, ship.tx)); ship.x += (ship.tx - ship.x) * Math.min(dt * 0.02, 1);
                if ((fire -= dt) <= 0) { shots.push({ x: ship.x, y: H - 80 }); fire = 260; }
                stars.forEach((s) => { s.y += s.z * dt * 0.05; if (s.y > H) { s.y = 0; s.x = Math.random() * W; } });
                shots.forEach((b) => { b.y -= dt * 0.55; }); shots = shots.filter((b) => b.y > -20);
                rocks.forEach((r) => { r.y += r.vy * dt * 4; });
                for (const r of rocks.slice()) {
                    const b = shots.find((s) => Math.hypot(s.x - r.x, s.y - r.y) < r.r); if (!b) continue;
                    shots.splice(shots.indexOf(b), 1);
                    if (r.ok) { score += 10; boom(r.x, r.y, '#3ddc97'); spawn(); break; }
                    lives--; boom(r.x, r.y, '#ff6b7a'); rocks.splice(rocks.indexOf(r), 1);
                }
                if (rocks.some((r) => r.ok && r.y > H - 10)) { lives--; spawn(); }
                rocks = rocks.filter((r) => r.y < H + 50 || r.ok);
                if (lives <= 0) { alive = false; g.over(score); }
            }
            fx.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }); fx = fx.filter((p) => p.life > 0);
            draw(); g.hud('Space Defender');
            if (location.hash === '#games' && alive) raf = requestAnimationFrame(tick); else if (!alive) draw();
        }
        raf = requestAnimationFrame(tick);
        return () => { alive = false; cancelAnimationFrame(raf); document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku); };
    } };

    const racer = { id: 'racer', help: 'Press ← → (or tap the left / right side) to change lane. Drive through the board with the RIGHT answer. Wrong board = lose a life.', start(g) {
        const c = g.ctx, HY = 150, RW0 = 80, RW1 = 600;
        let lane = 1, vx = 1, gate, score = 0, lives = 3, speed = 0.00022, off = 0, last = performance.now(), alive = true, raf, flash = 0, shake = 0;
        const rw = (y) => RW0 + (RW1 - RW0) * (y - HY) / (H - HY), lx = (l, y) => W / 2 + (l - 1) * rw(y) / 3;
        const make = () => { const q = g.next(); gate = { z: 0.02, opts: q.opts.slice(0, 3), ok: q.opts.slice(0, 3).indexOf(q.right) }; if (gate.ok < 0) { gate.opts[2] = q.right; gate.ok = 2; } };
        const go = (d) => { lane = Math.max(0, Math.min(2, lane + d)); };
        const kd = (e) => { if (e.key === 'ArrowLeft' || e.key === 'a') go(-1); if (e.key === 'ArrowRight' || e.key === 'd') go(1); };
        const tap = (e) => { const r = g.cv.getBoundingClientRect(), p = e.touches ? e.touches[0] : e; go(p.clientX - r.left < r.width / 2 ? -1 : 1); };
        document.addEventListener('keydown', kd); g.cv.addEventListener('pointerdown', tap); make();
        function draw() {
            const sky = c.createLinearGradient(0, 0, 0, HY); sky.addColorStop(0, '#1b1450'); sky.addColorStop(1, '#ff7a59'); c.fillStyle = sky; c.fillRect(0, 0, W, HY);
            c.fillStyle = '#ffd36b'; c.beginPath(); c.arc(W / 2, HY - 20, 44, 0, 6.28); c.fill();
            c.fillStyle = '#2a1b5e'; c.beginPath(); c.moveTo(0, HY); for (let x = 0; x <= W; x += 40) c.lineTo(x, HY - 28 - 22 * Math.abs(Math.sin(x * 0.021 + off * 0.2))); c.lineTo(W, HY); c.fill();
            for (let i = 0; i < 14; i++) { const a = (i + off) % 14 / 14, y = HY + (H - HY) * a * a, y2 = HY + (H - HY) * Math.min((a + 1 / 14), 1) ** 2; c.fillStyle = (Math.floor(i + off) % 2) ? '#1f7a4d' : '#26a063'; c.fillRect(0, y, W, y2 - y + 1); }
            c.fillStyle = '#2b2f42'; c.beginPath(); c.moveTo(W / 2 - RW0 / 2, HY); c.lineTo(W / 2 + RW0 / 2, HY); c.lineTo(W / 2 + RW1 / 2, H); c.lineTo(W / 2 - RW1 / 2, H); c.fill();
            for (let i = 0; i < 14; i++) { const a = (i + off) % 14 / 14, y = HY + (H - HY) * a * a, y2 = HY + (H - HY) * Math.min(a + 0.035, 1) ** 2;
                [1, 2].forEach((l) => { c.fillStyle = '#e8ecf8'; c.beginPath(); c.moveTo(lx(l, y) - 1 - a * 3, y); c.lineTo(lx(l, y) + 1 + a * 3, y); c.lineTo(lx(l, y2) + 1 + a * 3, y2); c.lineTo(lx(l, y2) - 1 - a * 3, y2); c.fill(); });
                c.fillStyle = (Math.floor(i + off) % 2) ? '#ff4d6d' : '#fff'; [-1, 1].forEach((s) => c.fillRect(W / 2 + s * rw(y) / 2 - (s < 0 ? 6 + a * 8 : 0), y, 6 + a * 8, Math.max(y2 - y, 1))); }
            const y = HY + (H - HY) * gate.z * gate.z, sc = 0.15 + gate.z * 0.85;
            gate.opts.forEach((o, i) => { const bw = rw(y) / 3 * 0.88, bh = 70 * sc, x = lx(i, y) - bw / 2;
                c.fillStyle = '#0d1530'; round(c, x, y - bh, bw, bh, 8 * sc); c.fill(); c.strokeStyle = ['#27b0ff', '#8a5cf6', '#ffb454'][i]; c.lineWidth = 3 * sc + 1; c.stroke();
                c.fillStyle = '#fff'; c.font = '700 ' + Math.max(8, 17 * sc) + 'px DM Sans, Arial'; c.textAlign = 'center'; c.fillText(clip(o, 16), x + bw / 2, y - bh / 2 + 5 * sc); });
            const cx = lx(1, H) + (vx - 1) * rw(H) / 3 + (shake ? (Math.random() - 0.5) * 8 : 0), cy = H - 44;
            c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(cx, cy + 40, 46, 9, 0, 0, 6.28); c.fill();
            c.fillStyle = '#111'; [-1, 1].forEach((s) => { round(c, cx + s * 40 - 8, cy + 14, 16, 30, 4); c.fill(); });
            const bd = c.createLinearGradient(cx - 40, 0, cx + 40, 0); bd.addColorStop(0, '#d7263d'); bd.addColorStop(0.5, '#ff5a6e'); bd.addColorStop(1, '#a1182b'); c.fillStyle = bd; round(c, cx - 38, cy - 8, 76, 50, 12); c.fill();
            c.fillStyle = '#1c2540'; round(c, cx - 26, cy - 22, 52, 24, 9); c.fill(); c.fillStyle = '#7fd4ff'; round(c, cx - 22, cy - 19, 44, 14, 6); c.fill();
            c.fillStyle = '#ffe9a8'; c.fillRect(cx - 32, cy + 36, 12, 5); c.fillRect(cx + 20, cy + 36, 12, 5);
            if (flash) { c.fillStyle = 'rgba(255,60,80,' + flash / 400 + ')'; c.fillRect(0, 0, W, H); }
            c.textAlign = 'left'; c.font = '700 15px DM Sans, Arial'; c.fillStyle = '#fff'; c.fillText('Score ' + score, 14, 24); c.fillStyle = '#ff6b7a'; c.fillText('♥'.repeat(lives), W - 14 - lives * 16, 24);
        }
        function tick(now) {
            const dt = Math.min(now - last, 40); last = now;
            if (alive) {
                vx += (lane - vx) * Math.min(dt * 0.012, 1); off = (off + dt * speed * 14) % 14; gate.z += dt * speed; flash = Math.max(flash - dt, 0); shake = flash > 0;
                if (gate.z >= 0.93) { if (lane === gate.ok) { score += 10; speed = Math.min(speed + 0.000012, 0.0004); } else { lives--; flash = 400; } make(); }
                if (lives <= 0) { alive = false; g.over(score); }
            }
            draw(); g.hud('Code Racer');
            if (location.hash === '#games' && alive) raf = requestAnimationFrame(tick);
        }
        raf = requestAnimationFrame(tick);
        return () => { alive = false; cancelAnimationFrame(raf); document.removeEventListener('keydown', kd); };
    } };

    const GAMES = [[space, 'Space Defender', 'Blast the asteroid carrying the right answer. Parallax stars, nebula, particle explosions.', 'linear-gradient(135deg,#05030f,#3a1c8f)'], [racer, 'Code Racer', 'Steer through the right answer gate at rising speed on a sunset road.', 'linear-gradient(135deg,#1b1450,#ff7a59)']];
    function home(root) {
        const lang = el('select', {}, ...SM_ARCADE.langs.map((l) => el('option', { value: l.id, text: l.name })));
        root.append(el('div', { class: 'panel' }, el('h3', { text: 'Pick a language, then a game' }), el('p', { class: 'muted', text: 'Questions come from the same bank as the Skill Test, so you learn while you play.' }), lang),
            el('div', { class: 'g-grid' }, ...GAMES.map(([g, name, text, bg]) => el('div', { class: 'g-card', style: 'background:' + bg },
                el('h3', { text: name }), el('p', { text }), el('small', { text: 'Best score: ' + best.get(g.id) }), el('button', { class: 'btn primary', type: 'button', text: 'Play', onclick: () => shell(root, g, lang.value) })))));
    }
    const mount = () => { const root = $('v-games'); if (location.hash === '#games' && root && !root.dataset.ok) { root.dataset.ok = 1; home(root); } if (location.hash !== '#games' && stop) { stop(); stop = null; const r = $('v-games'); if (r) { r.replaceChildren(); delete r.dataset.ok; } } };
    window.addEventListener('hashchange', mount); setTimeout(mount, 700);
})();
