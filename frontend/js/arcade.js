(function () {
    const { el } = SM;
    if (!SM.auth.token() || !window.SM_ARCADE) return;
    const $ = (id) => document.getElementById(id);
    const DATA = window.SM_ARCADE;
    const KEY = 'sm_arcade';
    const TITLES = ['Rookie', 'Apprentice', 'Coder', 'Builder', 'Hacker', 'Architect', 'Master'];
    const ROUND = 6, XP_PER_LEVEL = 120;

    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { saved = {}; }
    const state = Object.assign({ qtier: -1, xp: 0, best: {}, labs: [], played: 0, perfect: 0 }, saved);
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage blocked */ } };
    const levelOf = (xp) => Math.floor(xp / XP_PER_LEVEL) + 1;
    SM.arcade = { state, level: () => levelOf(state.xp), addXp: (n) => addXp(n), save: () => save() };

    const shuffle = (list) => { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const say = (text) => { if (SM.toast) SM.toast(text); };
    const party = (n) => { if (SM.confetti) SM.confetti(n); };

    function addXp(n) {
        const before = levelOf(state.xp);
        state.xp += n; save(); renderStats();
        if (levelOf(state.xp) > before) { say('Level up! You are now level ' + levelOf(state.xp) + ' - ' + TITLES[Math.min(levelOf(state.xp) - 1, TITLES.length - 1)]); party(100); }
    }

    /* ---------------------------------------------------------------- header stats */
    function renderStats() {
        const lvl = levelOf(state.xp), into = state.xp % XP_PER_LEVEL;
        const solvedLabs = state.labs.length;
        $('arc-stats').replaceChildren(
            el('div', { class: 'arc-level' },
                el('div', { class: 'arc-badge', text: String(lvl) }),
                el('div', {}, el('strong', { text: TITLES[Math.min(lvl - 1, TITLES.length - 1)] }), el('small', { text: state.xp + ' XP total' })),
                el('div', { class: 'arc-xp' },
                    el('div', { class: 'bar' }, el('div', { class: 'fill', style: 'width:' + Math.round(into * 100 / XP_PER_LEVEL) + '%' })),
                    el('small', { text: (XP_PER_LEVEL - into) + ' XP to level ' + (lvl + 1) }))),
            el('div', { class: 'arc-mini' },
                el('div', {}, el('b', { text: String(state.played) }), el('small', { text: 'rounds played' })),
                el('div', {}, el('b', { text: String(state.perfect) }), el('small', { text: 'perfect rounds' })),
                el('div', {}, el('b', { text: solvedLabs + '/' + LABS.length }), el('small', { text: 'labs solved' }))));
    }

    /* ---------------------------------------------------------------- home */
    function renderHome() {
        $('arc-play').hidden = true; $('arc-home').hidden = false;
        const grid = $('arc-langs');
        grid.replaceChildren(...DATA.langs.map((l) => {
            const best = state.best[l.id];
            const card = el('button', { type: 'button', class: 'game-card', style: '--tc:' + l.color },
                el('span', { class: 't-mono', text: l.code }), el('h3', { text: l.name }), el('p', { text: l.blurb }),
                el('div', { class: 'game-foot' }, el('small', { text: best !== undefined ? 'Best: ' + best + '/' + ROUND : l.count + ' questions' }), el('b', { text: 'Play' })));
            card.addEventListener('click', () => startRound(l.id));
            return card;
        }));
        $('arc-labs').replaceChildren(...LABS.map((lab) => {
            const done = state.labs.includes(lab.id);
            const card = el('button', { type: 'button', class: 'game-card lab-card' + (done ? ' done' : ''), style: '--tc:' + (lab.kind === 'css' ? '#3b6cff' : '#e8743b') },
                el('span', { class: 't-mono', text: lab.kind.toUpperCase() }), el('h3', { text: lab.title }), el('p', { text: lab.goal }),
                el('div', { class: 'game-foot' }, el('small', { text: done ? 'Solved' : '+25 XP' }), el('b', { text: done ? 'Replay' : 'Start' })));
            card.addEventListener('click', () => openLab(lab));
            return card;
        }));
        renderStats();
        if (SM.arcade.onHome) SM.arcade.onHome();
    }

    /* ---------------------------------------------------------------- quiz round */
    let round = null;
    function startRound(langId) {
        const lang = DATA.langs.find((l) => l.id === langId);
        round = { lang, questions: shuffle(window.SM_BANK && state.qtier >= 0 ? SM_BANK.pool(langId, state.qtier) : DATA.questions[langId]).slice(0, ROUND), index: 0, correct: 0, answered: false };
        $('arc-home').hidden = true; $('arc-play').hidden = false;
        scrollTo({ top: 0, behavior: 'smooth' });
        renderQuestion();
    }

    function exitButton() {
        const b = el('button', { type: 'button', class: 'btn', text: '< All games' });
        b.addEventListener('click', renderHome);
        return b;
    }

    function renderQuestion() {
        const q = round.questions[round.index];
        round.answered = false;
        const box = $('arc-play');
        const feedback = el('div', { class: 'feedback', hidden: true });
        const next = el('button', { type: 'button', class: 'btn primary', text: round.index + 1 === round.questions.length ? 'See result' : 'Next question', hidden: true });
        next.addEventListener('click', () => { round.index += 1; if (round.index < round.questions.length) renderQuestion(); else finishRound(); });

        function settle(ok, shownAnswer) {
            if (round.answered) return;
            round.answered = true;
            if (ok) { round.correct += 1; } if (SM.sfx) SM.sfx.play(ok ? 'right' : 'wrong');
            feedback.hidden = false; feedback.className = 'feedback ' + (ok ? 'ok' : 'bad');
            feedback.replaceChildren(el('strong', { text: ok ? 'Correct! +10 XP' : 'Not quite.' }),
                ok ? null : el('span', { text: ' Right answer: ' + shownAnswer }), el('p', { text: q.why }));
            if (ok) addXp(10);
            next.hidden = false; next.focus();
        }

        const body = el('div', { class: 'q-body' });
        body.append(el('h3', { class: 'q-text', text: q.q }));
        if (q.code) body.append(el('pre', { class: 'code-block q-code' }, el('code', { text: q.code })));

        if (q.type === 'mcq') {
            const list = el('div', { class: 'opts' });
            shuffle(q.options).forEach((opt) => {
                const b = el('button', { type: 'button', class: 'opt', text: opt });
                b.addEventListener('click', () => {
                    if (round.answered) return;
                    const ok = opt === q.options[0];
                    b.classList.add(ok ? 'right' : 'wrong');
                    if (!ok) [...list.children].forEach((c) => { if (c.textContent === q.options[0]) c.classList.add('right'); });
                    settle(ok, q.options[0]);
                });
                list.append(b);
            });
            body.append(list);
        } else if (q.type === 'fill') {
            body.append(el('pre', { class: 'code-block q-code' }, el('code', { text: q.code })));
            const input = el('input', { type: 'text', class: 'fill-input', placeholder: 'type here...', autocomplete: 'off', spellcheck: 'false' });
            const check = el('button', { type: 'button', class: 'btn primary', text: 'Check' });
            const go = () => {
                if (round.answered || !input.value.trim()) return;
                const given = input.value.trim().replace(/\s+/g, ' ').toLowerCase();
                const ok = q.accept.some((a) => a.toLowerCase() === given);
                input.disabled = true; check.disabled = true;
                settle(ok, q.accept[0]);
            };
            check.addEventListener('click', go);
            input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
            body.append(el('div', { class: 'fill-row' }, input, check));
            setTimeout(() => input.focus(), 50);
        } else if (q.type === 'order') {
            const pool = el('div', { class: 'chip-pool' }), answer = el('div', { class: 'chip-answer' });
            const placed = [];
            const lines = shuffle(q.lines.map((text, i) => ({ text, i })));
            const check = el('button', { type: 'button', class: 'btn primary', text: 'Check order', disabled: true });
            const sync = () => { check.disabled = placed.length !== q.lines.length; };
            lines.forEach((ln) => {
                const chip = el('button', { type: 'button', class: 'line-chip', text: ln.text });
                chip.addEventListener('click', () => {
                    if (round.answered) return;
                    const inAnswer = chip.parentElement === answer;
                    if (inAnswer) { placed.splice(placed.indexOf(ln), 1); pool.append(chip); } else { placed.push(ln); answer.append(chip); }
                    sync();
                });
                pool.append(chip);
            });
            check.addEventListener('click', () => {
                if (round.answered) return;
                const ok = placed.every((p, idx) => p.i === idx);
                [...answer.children].forEach((c, idx) => c.classList.add(placed[idx].i === idx ? 'right' : 'wrong'));
                check.disabled = true;
                settle(ok, '\n' + q.lines.join('\n'));
            });
            body.append(el('small', { class: 'muted', text: 'Tap the lines in the order they should run. Tap a placed line to take it back.' }), answer, pool, check);
        }

        box.replaceChildren(
            el('div', { class: 'play-top' }, exitButton(),
                el('div', { class: 'play-meta' }, el('b', { text: round.lang.name }), el('span', { text: 'Question ' + (round.index + 1) + ' of ' + round.questions.length }), el('span', { text: 'Score ' + round.correct }))),
            el('div', { class: 'bar play-bar' }, el('div', { class: 'fill', style: 'width:' + Math.round(round.index * 100 / round.questions.length) + '%' })),
            el('div', { class: 'panel q-card' }, body, feedback, el('div', { class: 'q-next' }, next)));
    }

    function finishRound() {
        const total = round.questions.length, ok = round.correct, perfect = ok === total;
        state.played += 1; if (SM.sfx) SM.sfx.play(round.correct >= 4 ? 'win' : 'lose');
        if (perfect) { state.perfect += 1; }
        state.best[round.lang.id] = Math.max(state.best[round.lang.id] || 0, ok);
        save();
        if (perfect) { addXp(20); party(160); } else if (ok >= 4) { party(50); }
        const stars = ok === total ? 3 : ok >= 4 ? 2 : 1;
        const again = el('button', { type: 'button', class: 'btn primary', text: 'Play again' });
        again.addEventListener('click', () => startRound(round.lang.id));
        const home = el('button', { type: 'button', class: 'btn', text: 'All games' });
        home.addEventListener('click', renderHome);
        $('arc-play').replaceChildren(el('div', { class: 'panel result-card' },
            el('div', { class: 'stars' }, [1, 2, 3].map((n) => el('span', { class: 'star' + (n <= stars ? ' on' : ''), text: '\u2605', style: 'animation-delay:' + (n * 0.2) + 's' }))),
            el('h2', { text: perfect ? 'Perfect round!' : ok >= 4 ? 'Great job!' : 'Keep practising' }),
            el('p', { class: 'muted', text: round.lang.name + ': ' + ok + ' of ' + total + ' correct' + (perfect ? ' (+20 bonus XP)' : '') }),
            el('p', { text: 'XP earned this round: ' + (ok * 10 + (perfect ? 20 : 0)) }),
            el('div', { class: 'detail-actions', style: 'justify-content:center' }, again, home)));
        renderStats();
    }

    /* ---------------------------------------------------------------- live labs (HTML / CSS in a safe preview) */
    const BASE = 'body{font-family:Arial,sans-serif;margin:10px;color:#111;background:#fff}';
    const rectOf = (doc, sel) => doc.querySelector(sel).getBoundingClientRect();
    const LABS = [
        { id: 'h-heading', kind: 'html', title: 'Add a heading', goal: 'Write an <h1> that says Hello.', starter: '<!-- write your HTML here -->\n', hint: '<h1>Hello</h1>',
          check: (doc) => { const h = doc.querySelector('h1'); return h && h.textContent.trim().toLowerCase() === 'hello' ? true : 'You need an <h1> whose text is exactly Hello.'; } },
        { id: 'h-link', kind: 'html', title: 'Make a link', goal: 'Create a link to https://example.com with the text Visit.', starter: '<!-- write your HTML here -->\n', hint: '<a href="https://example.com">Visit</a>',
          check: (doc) => { const a = doc.querySelector('a[href="https://example.com"]'); return a && a.textContent.trim().toLowerCase() === 'visit' ? true : 'Use an <a> tag with href="https://example.com" and the text Visit.'; } },
        { id: 'h-list', kind: 'html', title: 'Build a list', goal: 'Make a bullet list (<ul>) with 3 items (<li>).', starter: '<!-- write your HTML here -->\n', hint: '<ul><li>One</li><li>Two</li><li>Three</li></ul>',
          check: (doc) => doc.querySelectorAll('ul > li').length >= 3 ? true : 'Put at least 3 <li> items inside a <ul>.' },
        { id: 'h-image', kind: 'html', title: 'Add an image', goal: 'Add an <img> with a src and a meaningful alt text.', starter: '<!-- write your HTML here -->\n', hint: '<img src="photo.jpg" alt="A student coding">',
          check: (doc) => { const i = doc.querySelector('img[src]'); return i && i.getAttribute('alt') && i.getAttribute('alt').trim() ? true : 'Add <img src="..." alt="describe the image">.'; } },
        { id: 'h-form', kind: 'html', title: 'Email form', goal: 'Add an email input (type="email") and a button.', starter: '<!-- write your HTML here -->\n', hint: '<input type="email" placeholder="Email"> <button>Send</button>',
          check: (doc) => doc.querySelector('input[type="email"]') && doc.querySelector('button') ? true : 'You need <input type="email"> and a <button>.' },
        { id: 'c-red', kind: 'css', title: 'Paint it red', goal: 'Make the .box background red.', scene: '<div class="box"></div>', base: '.box{width:80px;height:80px;background:#ccc}',
          starter: '.box {\n  /* your CSS here */\n}\n', hint: 'background: red;',
          check: (doc, win) => win.getComputedStyle(doc.querySelector('.box')).backgroundColor === 'rgb(255, 0, 0)' ? true : 'Set background to pure red (background: red;).' },
        { id: 'c-center', kind: 'css', title: 'Center with Flexbox', goal: 'Center the blue square inside the frame, both horizontally and vertically.', scene: '<div class="stage"><div class="box"></div></div>',
          base: '.stage{width:300px;height:180px;border:2px solid #444}.box{width:50px;height:50px;background:#4f6bff}', starter: '.stage {\n  /* your CSS here */\n}\n', hint: 'display: flex; justify-content: center; align-items: center;',
          check: (doc) => { const s = rectOf(doc, '.stage'), b = rectOf(doc, '.box'); const dx = Math.abs((s.left + s.width / 2) - (b.left + b.width / 2)), dy = Math.abs((s.top + s.height / 2) - (b.top + b.height / 2)); return dx < 3 && dy < 3 ? true : 'The square is not centered yet. Try display:flex with justify-content and align-items.'; } },
        { id: 'c-circle', kind: 'css', title: 'Make a circle', goal: 'Turn the orange square into a circle.', scene: '<div class="box"></div>', base: '.box{width:90px;height:90px;background:#e8743b}',
          starter: '.box {\n  /* your CSS here */\n}\n', hint: 'border-radius: 50%;',
          check: (doc, win) => { const r = win.getComputedStyle(doc.querySelector('.box')).borderTopLeftRadius; const v = parseFloat(r); return (r.endsWith('%') ? v >= 50 : v >= 45) ? true : 'Use border-radius: 50%.'; } },
        { id: 'c-between', kind: 'css', title: 'Space between', goal: 'Put A, B, C in one row with the first at the left edge and the last at the right edge.', scene: '<div class="row"><span class="item">A</span><span class="item">B</span><span class="item">C</span></div>',
          base: '.row{width:360px;border:2px solid #444;padding:6px}.item{width:50px;height:40px;background:#2f9e86;display:inline-block}', starter: '.row {\n  /* your CSS here */\n}\n', hint: 'display: flex; justify-content: space-between;',
          check: (doc) => { const r = rectOf(doc, '.row'), items = [...doc.querySelectorAll('.item')].map((i) => i.getBoundingClientRect()); const first = items[0], last = items[2];
              return Math.abs(items[0].top - items[2].top) < 2 && first.left - r.left < 14 && r.right - last.right < 14 && items[1].left - first.right > 20 ? true : 'Use display:flex and justify-content:space-between on .row.'; } },
        { id: 'c-title', kind: 'css', title: 'Big bold title', goal: 'Make the title at least 32px and bold.', scene: '<h1 class="title">SkillMatrix</h1>', base: '.title{font-size:16px;font-weight:400;margin:0}',
          starter: '.title {\n  /* your CSS here */\n}\n', hint: 'font-size: 36px; font-weight: bold;',
          check: (doc, win) => { const s = win.getComputedStyle(doc.querySelector('.title')); return parseFloat(s.fontSize) >= 32 && parseInt(s.fontWeight, 10) >= 700 ? true : 'Set font-size to 32px or more and font-weight to bold.'; } },
    ];

    function srcdocFor(lab, text) {
        if (lab.kind === 'html') return '<!doctype html><html><head><meta charset="utf-8"><style>' + BASE + '</style></head><body>' + text + '</body></html>';
        return '<!doctype html><html><head><meta charset="utf-8"><style>' + BASE + lab.base + '\n' + text.replace(/<\/style/gi, '') + '</style></head><body>' + lab.scene + '</body></html>';
    }

    function openLab(lab) {
        $('arc-home').hidden = true; $('arc-play').hidden = false;
        scrollTo({ top: 0, behavior: 'smooth' });
        const area = el('textarea', { class: 'lab-code', spellcheck: 'false', 'aria-label': 'Your code' });
        area.value = lab.starter;
        const frame = el('iframe', { class: 'lab-frame', sandbox: 'allow-same-origin', title: 'Live preview' });
        const msg = el('div', { class: 'feedback', hidden: true });
        const run = () => { frame.srcdoc = srcdocFor(lab, area.value); };
        const show = (ok, text) => { msg.hidden = false; msg.className = 'feedback ' + (ok ? 'ok' : 'bad'); msg.replaceChildren(el('strong', { text: ok ? 'Solved!' : 'Not yet.' }), el('p', { text })); };

        const runBtn = el('button', { type: 'button', class: 'btn', text: 'Run' });
        const checkBtn = el('button', { type: 'button', class: 'btn primary', text: 'Check my answer' });
        const hintBtn = el('button', { type: 'button', class: 'btn', text: 'Hint' });
        runBtn.addEventListener('click', run);
        hintBtn.addEventListener('click', () => show(false, 'Hint: ' + lab.hint));
        checkBtn.addEventListener('click', () => {
            frame.onload = () => {
                frame.onload = null;
                let result;
                try { result = lab.check(frame.contentDocument, frame.contentWindow); } catch (e) { result = 'Could not check yet - press Run and try again.'; }
                if (result === true) {
                    show(true, state.labs.includes(lab.id) ? 'Nice, you already had this one.' : 'You earned 25 XP.');
                    if (!state.labs.includes(lab.id)) { state.labs.push(lab.id); save(); addXp(25); party(90); }
                } else { show(false, result); }
            };
            run();
        });
        area.addEventListener('keydown', (e) => {          // Tab inserts spaces instead of leaving the box
            if (e.key === 'Tab') { e.preventDefault(); const s = area.selectionStart; area.setRangeText('  ', s, area.selectionEnd, 'end'); }
        });
        $('arc-play').replaceChildren(
            el('div', { class: 'play-top' }, exitButton(), el('div', { class: 'play-meta' }, el('b', { text: lab.kind.toUpperCase() + ' lab' }), el('span', { text: lab.title }))),
            el('div', { class: 'panel lab-panel' },
                el('h3', { text: lab.goal }),
                el('div', { class: 'lab-grid' }, el('div', {}, el('small', { class: 'muted', text: 'Your ' + lab.kind.toUpperCase() }), area), el('div', {}, el('small', { class: 'muted', text: 'Live preview' }), frame)),
                el('div', { class: 'detail-actions' }, runBtn, checkBtn, hintBtn), msg));
        run();
    }

    addEventListener('hashchange', () => { if (location.hash === '#arcade') renderHome(); });
    renderHome();
})();
