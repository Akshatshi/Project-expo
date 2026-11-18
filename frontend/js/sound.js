(function () {
    let ctx = null, on = true, timer = 0, step = 0;
    try { on = localStorage.getItem('sm_sfx') !== '0'; } catch (e) { /* ignore */ }
    const ac = () => { if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); } if (ctx.state === 'suspended') ctx.resume(); return ctx; };
    function tone(f, d, type, vol, to, at) {
        const c = ac(); if (!c || !on) return; const t0 = c.currentTime + (at || 0), o = c.createOscillator(), g = c.createGain();
        o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0); if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + d);
        g.gain.setValueAtTime(vol || 0.15, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d); o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + d + 0.02);
    }
    function noise(d, vol) {
        const c = ac(); if (!c || !on) return; const b = c.createBuffer(1, c.sampleRate * d, c.sampleRate), x = b.getChannelData(0); for (let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / x.length);
        const s = c.createBufferSource(), g = c.createGain(); s.buffer = b; g.gain.value = vol || 0.2; s.connect(g); g.connect(c.destination); s.start();
    }
    const FX = {
        right: () => { tone(660, 0.12, 'triangle', 0.18); tone(990, 0.2, 'triangle', 0.18, 0, 0.1); },
        wrong: () => { tone(180, 0.35, 'sawtooth', 0.16, 70); noise(0.15, 0.12); },
        cast: () => tone(300, 0.3, 'sine', 0.15, 1400),
        hit: () => { noise(0.25, 0.28); tone(220, 0.25, 'square', 0.15, 60); },
        boss: () => { noise(0.7, 0.35); tone(110, 0.8, 'sawtooth', 0.2, 35); tone(55, 1, 'square', 0.15, 30, 0.1); },
        win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.3, 'triangle', 0.17, 0, i * 0.12)),
        lose: () => [440, 392, 330, 262].forEach((f, i) => tone(f, 0.4, 'sawtooth', 0.12, 0, i * 0.18)),
        click: () => tone(800, 0.05, 'square', 0.08),
    };
    const NOTES = [110, 130.8, 146.8, 164.8, 196, 220, 261.6, 293.7];
    function music(run) {
        clearInterval(timer); timer = 0; if (!run || !on) return; step = 0;
        timer = setInterval(() => { if (!on) return; tone(NOTES[(step % 4 === 0 ? 0 : Math.floor(Math.random() * NOTES.length))], 0.28, 'triangle', 0.045); if (step % 4 === 0) tone(55, 0.4, 'sine', 0.06); step++; }, 260);
    }
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'sfx-btn'; btn.setAttribute('aria-label', 'Toggle sound');
    const show = () => { btn.textContent = on ? '🔊 Sound on' : '🔇 Sound off'; btn.hidden = location.hash !== '#arcade'; };
    btn.addEventListener('click', () => { on = !on; try { localStorage.setItem('sm_sfx', on ? '1' : '0'); } catch (e) { /* ignore */ } if (!on) music(false); else FX.click(); show(); });
    addEventListener('hashchange', () => { show(); if (location.hash !== '#arcade') music(false); });
    document.addEventListener('DOMContentLoaded', () => { document.body.append(btn); show(); });
    window.SM = window.SM || {}; SM.sfx = { play: (n) => { try { if (FX[n]) FX[n](); } catch (e) { /* audio blocked */ } }, music: (r) => { try { music(r); } catch (e) { /* ignore */ } } };
})();
