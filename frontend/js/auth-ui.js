(function () {
    const EYE = '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
    const EYE_OFF = '<svg viewBox="0 0 24 24"><path d="M3 3l18 18"/><path d="M10.6 6.1A9.8 9.8 0 0112 6c6.4 0 10 6 10 6a17 17 0 01-3.2 3.9M6.6 6.6A17 17 0 002 12s3.6 7 10 7c1.6 0 3-.4 4.3-1"/><path d="M9.9 9.9a3 3 0 004.2 4.2"/></svg>';
    document.querySelectorAll('input[type="password"]').forEach((input) => {
        const wrap = document.createElement('div');
        wrap.className = 'pw-wrap';
        input.parentNode.insertBefore(wrap, input);
        wrap.append(input);
        const btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'pw-toggle'; btn.innerHTML = EYE;   // static markup, no user data
        btn.setAttribute('aria-label', 'Show password');
        btn.addEventListener('click', () => {
            const show = input.type === 'password';
            input.type = show ? 'text' : 'password';
            btn.innerHTML = show ? EYE_OFF : EYE;
            btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
        });
        wrap.append(btn);
    });

    const left = document.querySelector('.left');
    if (!left || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cv = document.createElement('canvas');
    cv.className = 'matrix-bg';
    left.prepend(cv);
    const ctx = cv.getContext('2d');
    const GAP = 32;
    let w = 0, h = 0, cols = 0, rows = 0, ripples = [], last = 0;
    function resize() {
        const r = left.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
        w = r.width; h = r.height; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cols = Math.ceil(w / GAP) + 1; rows = Math.ceil(h / GAP) + 1;
    }
    resize(); addEventListener('resize', resize);
    const mix = (t) => `${Math.round(47 + (138 - 47) * t)},${Math.round(162 + (92 - 162) * t)},${Math.round(255 + (246 - 255) * t)}`;
    function spawn() { ripples.push({ x: Math.random() * w, y: Math.random() * h, t: 0 }); if (ripples.length > 5) ripples.shift(); }
    spawn(); spawn();
    (function frame(now) {
        if (!document.hidden) {
            const dt = Math.min((now - last) / 1000 || 0, .05); last = now;
            ctx.clearRect(0, 0, w, h);
            ripples.forEach((r) => { r.t += dt; });
            ripples = ripples.filter((r) => r.t < 3.2);
            if (Math.random() < dt * 0.9) spawn();
            for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
                const x = i * GAP + 4, y = j * GAP + 4;
                let glow = 0;
                for (const r of ripples) {
                    const d = Math.hypot(x - r.x, y - r.y), ring = r.t * 150;
                    glow = Math.max(glow, Math.exp(-Math.pow((d - ring) / 26, 2)) * (1 - r.t / 3.2));
                }
                ctx.fillStyle = glow > .04 ? `rgba(${mix(x / w)},${.14 + glow * .85})` : 'rgba(150,170,210,.13)';
                ctx.beginPath(); ctx.arc(x, y, 1.1 + glow * 2.1, 0, 6.2832); ctx.fill();
            }
        }
        requestAnimationFrame(frame);
    })(0);
})();
