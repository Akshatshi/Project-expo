/* SkillMatrix AI UI layer: views router, sidebar slider, animations, focus timer, tracks, projects, mentor, profile.
   Needs js/api.js + js/dashboard.js. Uses textContent only (no innerHTML). */
(function () {
    const { api, el, showMsg } = SM;
    if (!SM.auth.token()) return;
    const $ = (id) => document.getElementById(id);
    const state = SM.state;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const store = {
        get(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } },
        set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage full / blocked */ } },
    };
    const todayKey = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

    const SVGNS = 'http://www.w3.org/2000/svg';
    function icon(name) {
        const svg = document.createElementNS(SVGNS, 'svg'), use = document.createElementNS(SVGNS, 'use');
        svg.setAttribute('class', 'ic'); use.setAttribute('href', '#i-' + name); svg.append(use);
        return svg;
    }

    /* ============================================================ toast + confetti + ripple */
    SM.toast = (text) => {
        const t = el('div', { class: 'toast', text });
        document.body.append(t);
        requestAnimationFrame(() => t.classList.add('show'));
        setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 500); }, 2600);
    };

    SM.confetti = (count = 100) => {
        if (reduceMotion) return;
        const cv = $('confetti-canvas'), ctx = cv.getContext('2d');
        cv.width = innerWidth; cv.height = innerHeight;
        const colors = ['#27b0ff', '#8a5cf6', '#3ddc97', '#ffb454', '#60a5fa', '#ffffff'];
        const parts = Array.from({ length: count }, () => ({
            x: innerWidth / 2 + (Math.random() - .5) * 200, y: innerHeight * .35,
            vx: (Math.random() - .5) * 14, vy: -Math.random() * 12 - 4, r: Math.random() * 6 + 3,
            c: colors[Math.floor(Math.random() * colors.length)], rot: Math.random() * 6, vr: (Math.random() - .5) * .4,
        }));
        let frames = 0;
        (function draw() {
            ctx.clearRect(0, 0, cv.width, cv.height);
            parts.forEach((p) => {
                p.x += p.vx; p.y += p.vy; p.vy += .35; p.vx *= .99; p.rot += p.vr;
                ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
                ctx.fillStyle = p.c; ctx.globalAlpha = Math.max(0, 1 - frames / 110);
                ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); ctx.restore();
            });
            if (++frames < 115) requestAnimationFrame(draw); else ctx.clearRect(0, 0, cv.width, cv.height);
        })();
    };

    document.addEventListener('click', (e) => {
        const b = e.target.closest('.btn');
        if (!b || reduceMotion || b.disabled) return;
        const rect = b.getBoundingClientRect(), size = Math.max(rect.width, rect.height);
        const r = el('span', { class: 'ripple', style: `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px` });
        b.append(r); setTimeout(() => r.remove(), 650);
    });

    /* ============================================================ particle background */
    (function particles() {
        const cv = $('bg-canvas');
        if (!cv || reduceMotion) return;
        const ctx = cv.getContext('2d');
        let w, h, dots = [];
        const resize = () => {
            w = cv.width = innerWidth; h = cv.height = innerHeight;
            dots = Array.from({ length: Math.min(60, Math.floor(w * h / 24000)) }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35, r: Math.random() * 1.6 + .6 }));
        };
        resize(); addEventListener('resize', resize);
        (function loop() {
            if (!document.hidden) {
                ctx.clearRect(0, 0, w, h);
                dots.forEach((d, i) => {
                    d.x += d.vx; d.y += d.vy;
                    if (d.x < 0 || d.x > w) d.vx *= -1; if (d.y < 0 || d.y > h) d.vy *= -1;
                    ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.283); ctx.fillStyle = 'rgba(47,162,255,.7)'; ctx.fill();
                    for (let j = i + 1; j < dots.length; j++) {
                        const o = dots[j], dist = Math.hypot(d.x - o.x, d.y - o.y);
                        if (dist < 130) { ctx.strokeStyle = `rgba(80,140,255,${.2 * (1 - dist / 130)})`; ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(o.x, o.y); ctx.stroke(); }
                    }
                });
            }
            requestAnimationFrame(loop);
        })();
    })();

    /* ============================================================ sidebar slider () */
    const body = document.body, toggle = $('menu-toggle'), mq = window.matchMedia('(max-width: 900px)');
    function setNav(open, persist) {
        body.classList.toggle('nav-open', open);
        toggle.setAttribute('aria-expanded', String(open));
        if (persist && !mq.matches) store.set('sm_nav', open ? 1 : 0);
    }
    setNav(mq.matches ? false : store.get('sm_nav', 1) !== 0);
    toggle.addEventListener('click', () => setNav(!body.classList.contains('nav-open'), true));
    $('scrim').addEventListener('click', () => setNav(false));
    mq.addEventListener('change', () => setNav(mq.matches ? false : store.get('sm_nav', 1) !== 0));
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && mq.matches) setNav(false); });
    $('logout-link').addEventListener('click', () => SM.auth.clear());

    /* ============================================================ router: one section per page */
    const views = [...document.querySelectorAll('.view')];
    const ids = views.map((v) => v.id);
    const alias = { skills: 'progress' };
    function route() {
        let id = location.hash.slice(1);
        id = alias[id] || id;
        if (!ids.includes(id)) id = 'overview';
        if (id !== 'focus' && body.classList.contains('focus-mode')) leaveFocusMode();
        views.forEach((v) => { v.classList.remove('active', 'enter'); });
        const v = $(id);
        v.classList.add('active'); void v.offsetWidth; v.classList.add('enter');
        document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('active', a.dataset.view === id));
        $('view-title').textContent = v.dataset.title || 'SkillMatrix AI';
        $('view-sub').textContent = v.dataset.sub || '';
        document.title = 'SkillMatrix AI - ' + (v.dataset.title || '');
        scrollTo({ top: 0 });
        if (mq.matches) setNav(false);
    }
    addEventListener('hashchange', route);

    /* ============================================================ focus data (streak, minutes) */
    const focusLog = () => store.get('sm_focus', { days: {} });
    function addSession(minutes) {
        const log = focusLog(), k = todayKey(), d = log.days[k] || { sessions: 0, minutes: 0 };
        d.sessions += 1; d.minutes += minutes; log.days[k] = d; store.set('sm_focus', log);
    }
    function focusTotals() {
        const log = focusLog(), t = log.days[todayKey()] || { sessions: 0, minutes: 0 };
        let sessions = 0, minutes = 0;
        Object.values(log.days).forEach((d) => { sessions += d.sessions; minutes += d.minutes; });
        let streak = 0;
        const d = new Date();
        if (!log.days[todayKey(d)]) d.setDate(d.getDate() - 1);   // today may not be done yet
        while (log.days[todayKey(d)]) { streak++; d.setDate(d.getDate() - 1); }
        return { todaySessions: t.sessions, todayMinutes: t.minutes, sessions, minutes, streak };
    }

    /* ============================================================ projects */
    const projectStore = () => store.get('sm_projects', {});
    const STATES = ['todo', 'doing', 'done'];
    const STATE_LABEL = { todo: 'Start project', doing: ' In progress', done: '✓ Done' };

    SM.projectCard = (p) => {
        const saved = projectStore()[p.key];
        let st = saved ? saved.state : 'todo';
        const btn = el('button', { type: 'button', class: 'p-state s-' + st, text: STATE_LABEL[st] });
        btn.addEventListener('click', () => {
            st = STATES[(STATES.indexOf(st) + 1) % 3];
            const all = projectStore();
            if (st === 'todo') delete all[p.key]; else all[p.key] = { state: st, data: p };
            store.set('sm_projects', all);
            btn.className = 'p-state s-' + st; btn.textContent = STATE_LABEL[st];
            if (st === 'done') { SM.confetti(70); SM.toast(' Project completed! Add it to your resume.'); }
            renderMyProjects(); renderProfile();
        });
        return el('div', { class: 'project-card' },
            el('div', { class: 'p-top' }, el('span', { class: 'level', text: p.level }), p.recommended ? el('span', { class: 'badge-rec', text: 'Recommended' }) : null),
            el('h3', { text: p.title }), el('p', { text: p.description }),
            p.note ? el('small', { text: p.note }) : null,
            p.features && p.features.length ? el('ul', { class: 'p-features' }, p.features.map((f) => el('li', { text: f }))) : null,
            el('div', { class: 'p-foot' },
                el('a', { class: 'p-link', href: SM.ytUrl(p.title + ' project tutorial'), target: '_blank', rel: 'noopener', text: 'Tutorial' }),
                btn));
    };

    let languages = [], activeLang = null;
    const LANG_KEYWORDS = {
        'Python': ['python', 'flask', 'django', 'pandas', 'numpy', 'machine learning', 'scikit'],
        'JavaScript': ['javascript', 'node', 'express', 'react'],
        'HTML / CSS': ['html', 'css', 'responsive', 'web'],
        'Java': ['java', 'spring', 'oop', 'object oriented'],
        'C / C++': ['c++', 'cpp', 'data structures'],
        'SQL': ['sql', 'mysql', 'database', 'postgres'],
        'Kotlin': ['kotlin', 'android'],
        'TypeScript / React': ['typescript', 'react'],
    };
    const langProject = (l, p) => ({ key: 'lang:' + l.language + ':' + p.title, icon: l.icon, title: p.title, description: p.description, level: l.language + ' · ' + p.level, features: p.features });

    function renderLanguages() {
        const chips = $('lang-chips'), box = $('lang-projects');
        chips.replaceChildren(); box.replaceChildren();
        if (!languages.length) { box.append(el('p', { class: 'muted empty', text: 'Loading sample projects...' })); return; }
        languages.forEach((l) => {
            const c = el('button', { type: 'button', class: 'lang-chip' + (l.language === activeLang ? ' active' : ''), text: l.language });
            c.addEventListener('click', () => { activeLang = l.language; renderLanguages(); });
            chips.append(c);
        });
        const lang = languages.find((l) => l.language === activeLang) || languages[0];
        lang.projects.forEach((p) => box.append(SM.projectCard(langProject(lang, p))));
    }

    function renderMoreProjects() {
        const box = $('project-more');
        if (!languages.length) return;
        box.replaceChildren();
        const known = ((state.profile && state.profile.skills) || []).map((s) => s.name.toLowerCase());
        let matched = languages.filter((l) => (LANG_KEYWORDS[l.language] || []).some((k) => known.some((s) => s === k || s.includes(k))));
        if (!matched.length) matched = languages.filter((l) => ['Python', 'JavaScript', 'HTML / CSS'].includes(l.language));
        const picks = [];
        matched.forEach((l) => { const p = l.projects.find((x) => x.level !== 'Advanced'); if (p) picks.push(langProject(l, p)); });
        matched.forEach((l) => { const p = l.projects.filter((x) => x.level !== 'Beginner')[0]; if (p && picks.length < 6) picks.push(langProject(l, p)); });
        picks.slice(0, 6).forEach((p) => box.append(SM.projectCard({ ...p, recommended: false })));
    }

    function renderMyProjects() {
        const box = $('my-projects'), all = Object.values(projectStore());
        box.replaceChildren();
        if (!all.length) { box.append(el('p', { class: 'muted empty', text: 'Projects you start will be tracked here. Press "Start project" on any card.' })); return; }
        all.sort((a, b) => (a.state === 'done') - (b.state === 'done'));
        all.forEach((x) => box.append(SM.projectCard(x.data)));
    }

    document.querySelectorAll('#project-tabs .tab').forEach((t) => t.addEventListener('click', () => {
        document.querySelectorAll('#project-tabs .tab').forEach((x) => x.classList.toggle('active', x === t));
        ['rec', 'lang', 'mine'].forEach((n) => { $('tab-' + n).hidden = n !== t.dataset.tab; });
        if (t.dataset.tab === 'mine') renderMyProjects();
    }));

    api.get('/catalog/projects').then((d) => { languages = d.languages; activeLang = languages[0].language; renderLanguages(); renderMoreProjects(); })
        .catch(() => { $('lang-projects').replaceChildren(el('p', { class: 'muted empty', text: 'Could not load sample projects. Is the backend running?' })); });

    /* ============================================================ career tracks */
    let tracks = [], openTrack = null;
    const knownSkills = () => new Set(((state.profile && state.profile.skills) || []).map((s) => s.name.toLowerCase()));

    const TRACK_CODE = { web: 'WD', data: 'DS', backend: 'BE', java: 'JV', android: 'AN', security: 'SEC', devops: 'DO', dsa: 'DSA' };
    function trackProgress(t) {
        const known = knownSkills(), skills = t.stages.flatMap((s) => s.skills);
        const have = skills.filter((s) => known.has(s.toLowerCase())).length;
        return { have, total: skills.length, pct: skills.length ? Math.round(have * 100 / skills.length) : 0 };
    }

    function renderTracks() {
        const grid = $('track-grid');
        grid.replaceChildren();
        tracks.forEach((t) => {
            const pr = trackProgress(t);
            const card = el('button', { type: 'button', class: 'track-card' + (openTrack === t.id ? ' active' : ''), style: '--tc:' + t.color },
                el('span', { class: 't-mono', text: TRACK_CODE[t.id] || t.title.slice(0, 2).toUpperCase() }), el('h3', { text: t.title }), el('p', { text: t.summary }),
                el('div', { class: 't-prog', text: pr.have + ' of ' + pr.total + ' skills you already know' }),
                el('div', { class: 'bar' }, el('div', { class: 'fill', style: 'width:' + pr.pct + '%' })));
            card.addEventListener('click', () => { openTrack = openTrack === t.id ? null : t.id; renderTracks(); if (openTrack) $('track-detail').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
            grid.append(card);
        });
        renderTrackDetail();
    }

    function renderTrackDetail() {
        const box = $('track-detail'), t = tracks.find((x) => x.id === openTrack);
        box.replaceChildren();
        box.hidden = !t;
        if (!t) return;
        box.style.setProperty('--tc', t.color);
        const known = knownSkills();
        const goal = el('button', { type: 'button', class: 'btn primary', text: ' Analyze my skills for this track' });
        goal.addEventListener('click', () => {
            const sel = $('internship');
            if (sel && [...sel.options].some((o) => o.value === t.internship_id)) { sel.value = t.internship_id; sel.dispatchEvent(new Event('change')); }
            SM.toast('Target set: ' + t.title + '. Press "Analyze My Skills".');
            location.hash = '#analyzer';
        });
        box.append(el('h3', { text: t.title + ' roadmap' }), el('p', { class: 'muted', text: t.summary }),
            el('div', { class: 'stage-list' }, t.stages.map((st, i) => el('div', { class: 'stage', style: 'animation-delay:' + (i * 0.1) + 's' },
                el('h4', {}, st.name, el('small', { text: st.weeks })),
                st.resources.map((r) => el('div', { class: 'skill-row' },
                    el('span', { class: 'sk-name' + (known.has(r.skill.toLowerCase()) ? ' known' : ''), text: r.skill }),
                    el('a', { class: 'yt', href: r.english, target: '_blank', rel: 'noopener', text: 'English playlists' }),
                    el('a', { class: 'yt hi', href: r.hindi, target: '_blank', rel: 'noopener', text: 'हिन्दी playlists' })))))),
            el('h4', { class: 'subheading', text: 'Tools to install' }),
            el('div', { class: 'tool-row' }, t.tools.map((x) => el('span', { text: x }))),
            el('div', { class: 'detail-actions' }, goal));
    }

    api.get('/catalog/tracks').then((d) => { tracks = d.tracks; renderTracks(); })
        .catch(() => { $('track-grid').replaceChildren(el('p', { class: 'muted empty', text: 'Could not load career tracks. Is the backend running?' })); });

    /* ============================================================ free courses for roadmap */
    let courseKey = '';
    async function renderCourses() {
        const panel = $('free-courses'), r = state.roadmap;
        if (!r) { panel.hidden = true; courseKey = ''; return; }
        const skills = [...new Set(r.weeks.flatMap((w) => w.focus_skills))].slice(0, 12);
        if (!skills.length) { panel.hidden = true; return; }
        const key = skills.join('|');
        if (key === courseKey) return;
        courseKey = key;
        try {
            const d = await api.get('/catalog/resources?skills=' + encodeURIComponent(skills.join(',')));
            const list = $('course-list');
            list.replaceChildren(...d.resources.map((g) => el('div', { class: 'course-row' }, el('strong', { text: g.skill }),
                g.items.map((it) => el('a', { class: 'yt' + (it.language === 'Hindi' ? ' hi' : ''), href: it.url, target: '_blank', rel: 'noopener', text: '' + it.title.replace(g.skill + ' - ', '') })))));
            panel.hidden = false;
        } catch (e) { courseKey = ''; panel.hidden = true; }
    }

    /* ============================================================ focus timer (pomodoro) + focus mode */
    const RING = 2 * Math.PI * 104;
    const MODES = { focus: 'Focus', short: 'Short break', long: 'Long break' };
    const cfg = Object.assign({ focus: 25, short: 5, long: 15 }, store.get('sm_timer_cfg', {}));
    const T = Object.assign({ mode: 'focus', running: false, endAt: 0, remaining: cfg.focus * 60, task: '' }, store.get('sm_timer', {}));
    let tick = null, audioCtx = null, noiseNode = null;
    const total = () => cfg[T.mode] * 60;
    const fmt = (s) => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    const saveTimer = () => store.set('sm_timer', T);

    function paint() {
        const rem = Math.max(0, T.running ? Math.ceil((T.endAt - Date.now()) / 1000) : T.remaining);
        $('timer-text').textContent = fmt(rem);
        $('timer-mode').textContent = MODES[T.mode];
        $('ring-fg').style.strokeDashoffset = String(RING * (1 - rem / total()));
        document.querySelector('.ring').classList.toggle('running', T.running);
        $('timer-start').textContent = T.running ? ' Pause' : (T.remaining < total() ? 'Resume' : 'Start');
        document.querySelectorAll('#mode-tabs .tab').forEach((b) => b.classList.toggle('active', b.dataset.mode === T.mode));
        const mini = $('mini-timer');
        mini.hidden = !T.running || location.hash === '#focus';
        $('mini-timer-text').textContent = fmt(rem);
        const base = 'SkillMatrix AI - ' + (($(location.hash.slice(1)) || $('overview')).dataset.title || '');
        document.title = T.running ? fmt(rem) + ' · ' + MODES[T.mode] + ' | SkillMatrix AI' : base;
        return rem;
    }

    function beep() {
        try {
            audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
            [0, .3, .6].forEach((d) => {
                const o = audioCtx.createOscillator(), g = audioCtx.createGain();
                o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination);
                g.gain.setValueAtTime(.15, audioCtx.currentTime + d); g.gain.exponentialRampToValueAtTime(.001, audioCtx.currentTime + d + .25);
                o.start(audioCtx.currentTime + d); o.stop(audioCtx.currentTime + d + .26);
            });
        } catch (e) { /* audio blocked */ }
    }

    function finish() {
        clearInterval(tick); tick = null; T.running = false;
        beep();
        if (T.mode === 'focus') {
            addSession(cfg.focus); SM.confetti(90);
            SM.toast(' Focus session complete! Take a short break.');
            $('timer-done').hidden = !T.task;
            setMode(focusTotals().sessions % 4 === 0 ? 'long' : 'short');
            renderFocusStats(); renderStreak(); renderProfile(); renderOverviewCards();
        } else { SM.toast('Break over - ready for the next focus session?'); setMode('focus'); }
    }

    function loop() { if (paint() <= 0) finish(); }
    function start() {
        if (T.running) { T.remaining = Math.max(0, Math.ceil((T.endAt - Date.now()) / 1000)); T.running = false; clearInterval(tick); tick = null; saveTimer(); paint(); return; }
        T.endAt = Date.now() + T.remaining * 1000; T.running = true;
        $('timer-done').hidden = true;
        saveTimer(); clearInterval(tick); tick = setInterval(loop, 250); paint();
    }
    function setMode(m) { T.mode = m; T.running = false; clearInterval(tick); tick = null; T.remaining = cfg[m] * 60; saveTimer(); paint(); }
    $('timer-start').addEventListener('click', start);
    $('timer-reset').addEventListener('click', () => { setMode(T.mode); $('timer-done').hidden = true; });
    document.querySelectorAll('#mode-tabs .tab').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
    ['focus', 'short', 'long'].forEach((k) => {
        const inp = $('opt-' + k);
        inp.value = cfg[k];
        inp.addEventListener('change', () => {
            const v = Math.min(+inp.max, Math.max(+inp.min, parseInt(inp.value, 10) || cfg[k]));
            inp.value = v; cfg[k] = v; store.set('sm_timer_cfg', cfg);
            if (T.mode === k && !T.running) setMode(k);
        });
    });
    $('focus-task').addEventListener('change', (e) => { T.task = e.target.value; saveTimer(); });

    $('timer-done').addEventListener('click', async () => {
        const [w, i] = (T.task || '').split(':').map(Number);
        if (!Number.isInteger(w) || !Number.isInteger(i)) return;
        $('timer-done').hidden = true; T.task = ''; saveTimer();
        await SM.completeTask(w, i);
    });

    function renderTaskPicker() {
        const sel = $('focus-task'), keep = T.task;
        sel.replaceChildren(el('option', { value: '', text: 'Free study (no specific task)' }));
        const wk = SM.currentWeek && SM.currentWeek();
        if (wk) wk.tasks.forEach((t, i) => { if (!t.completed) sel.append(el('option', { value: wk.week + ':' + i, text: 'Week ' + wk.week + ' · ' + t.text.slice(0, 70) })); });
        sel.value = [...sel.options].some((o) => o.value === keep) ? keep : '';
        T.task = sel.value;
    }

    function renderFocusStats() {
        const f = focusTotals(), box = $('focus-stats');
        box.replaceChildren(...[['Today', f.todayMinutes + ' min'], ['Sessions today', f.todaySessions], ['Streak', f.streak + ' '], ['All-time focus', Math.round(f.minutes / 6) / 10 + ' h']]
            .map(([l, v]) => el('div', { class: 'stat-card' }, el('p', { text: l }), el('h2', { text: String(v) }))));
    }
    function renderStreak() { $('streak-count').textContent = focusTotals().streak; }

    /* focus mode = full-screen distraction-free timer */
    function enterFocusMode() {
        body.classList.add('focus-mode');
        if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => { /* user denied */ });
    }
    function leaveFocusMode() {
        body.classList.remove('focus-mode');
        if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    }
    $('enter-focus').addEventListener('click', enterFocusMode);
    $('exit-focus').addEventListener('click', leaveFocusMode);
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) body.classList.remove('focus-mode'); });
    addEventListener('keydown', (e) => {
        if (e.target.matches('input, select, textarea')) return;
        if (e.code === 'Space' && location.hash === '#focus') { e.preventDefault(); start(); }
    });

    /* soft brown-noise for concentration */
    $('opt-noise').addEventListener('change', (e) => {
        try {
            audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
            if (!e.target.checked) { if (noiseNode) { noiseNode.stop(); noiseNode = null; } return; }
            const len = audioCtx.sampleRate * 2, buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate), data = buf.getChannelData(0);
            let last = 0;
            for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + .02 * w) / 1.02; data[i] = last * 3.5; }
            noiseNode = audioCtx.createBufferSource(); noiseNode.buffer = buf; noiseNode.loop = true;
            const g = audioCtx.createGain(); g.gain.value = .5; noiseNode.connect(g); g.connect(audioCtx.destination); noiseNode.start();
        } catch (err) { e.target.checked = false; SM.toast('Sound is not supported in this browser.'); }
    });

    // resume a running timer after refresh
    if (T.running) {
        if (T.endAt <= Date.now()) { T.running = false; T.remaining = 0; setTimeout(finish, 0); } else tick = setInterval(loop, 250);
    }

    /* ============================================================ dashboard cards */
    const TIPS = [
        'Small steps every day beat big plans on Sunday.',
        'Build one tiny project per skill - recruiters trust things you have actually made.',
        'Study 45 minutes, practise 45 minutes. Reading alone does not stick.',
        'Stuck for more than 20 minutes? Write the question down and ask the AI Mentor.',
        'Push your code to GitHub every day, even if it is small - consistency shows.',
        'A 25 minute focus session with the phone away beats two distracted hours.',
    ];
    let tipIdx = Math.floor(Math.random() * TIPS.length);
    function rotateTip() {
        const p = $('quote-text'), s = $('quote-by');
        p.style.opacity = s.style.opacity = 0;
        setTimeout(() => { p.textContent = '“' + TIPS[tipIdx] + '”'; s.textContent = 'Daily tip'; p.style.opacity = s.style.opacity = 1; tipIdx = (tipIdx + 1) % TIPS.length; }, 350);
    }
    rotateTip(); setInterval(rotateTip, 12000);

    function ringSvg(pct) {
        const ns = 'http://www.w3.org/2000/svg', C = 2 * Math.PI * 40;
        const svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', '0 0 100 100');
        const mk = (cls, extra) => { const c = document.createElementNS(ns, 'circle'); c.setAttribute('class', cls); c.setAttribute('cx', 50); c.setAttribute('cy', 50); c.setAttribute('r', 40); c.setAttribute('fill', 'none'); c.setAttribute('style', 'stroke-width:9;' + (extra || '')); return c; };
        svg.append(mk('ring-bg'), mk('ring-fg', 'stroke-linecap:round;stroke-dasharray:' + C + ';stroke-dashoffset:' + (C * (1 - pct / 100)) + ';filter:none;transition:none'));
        return svg;
    }

    function renderOverviewCards() {
        const c = $('continue-card'), t = $('today-card'), r = state.roadmap;
        c.replaceChildren(); t.replaceChildren();
        c.append(el('h3', { text: ' Continue learning' }));
        if (r) {
            const wk = SM.currentWeek(), task = wk && wk.tasks.find((x) => !x.completed), pct = Math.round(r.progress.percent);
            c.append(el('div', { class: 'big-ring' }, ringSvg(pct),
                el('div', {}, el('strong', { text: pct + '% complete' }), el('p', { class: 'muted', text: wk ? 'Week ' + wk.week + ': ' + wk.title : '' }))));
            if (task) c.append(el('div', { class: 'mini-task', text: ' Next: ' + task.text }));
            c.append(el('div', { class: 'detail-actions' }, el('a', { class: 'btn primary', href: '#roadmap', text: 'Open roadmap' }), el('a', { class: 'btn', href: '#focus', text: ' Focus on it' })));
        } else if (state.analysis) {
            c.append(el('p', { class: 'muted', text: 'You are ' + Math.round(state.analysis.match_percent) + '% matched. Generate a week-by-week roadmap to close the gap.' }),
                el('div', { class: 'detail-actions' }, el('a', { class: 'btn primary', href: '#roadmap', text: ' Create my roadmap' })));
        } else {
            c.append(el('p', { class: 'muted', text: 'Add your skills and choose an internship - your personal plan starts there.' }),
                el('div', { class: 'detail-actions' }, el('a', { class: 'btn primary', href: '#analyzer', text: ' Analyze my skills' }), el('a', { class: 'btn', href: '#career', text: ' Explore tracks' })));
        }
        const f = focusTotals();
        t.append(el('h3', { text: ' Today\'s focus' }),
            el('div', { class: 'today-nums' },
                el('div', {}, el('strong', { text: String(f.todayMinutes) }), el('small', { text: 'minutes today' })),
                el('div', {}, el('strong', { text: String(f.todaySessions) }), el('small', { text: 'sessions' })),
                el('div', {}, el('strong', { text: String(f.streak) }), el('small', { text: 'day streak' }))),
            el('p', { class: 'muted', style: 'margin-top:14px', text: f.todaySessions ? 'Nice work today - one more session?' : 'No session yet today. Start with just 25 minutes.' }),
            el('div', { class: 'detail-actions' }, el('a', { class: 'btn primary', href: '#focus', text: 'Start a session' })));
    }

    /* ============================================================ AI mentor */
    const history = [];
    const cleanReply = (t) => t.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^\s*[*-]\s+/gm, '• ').replace(/`/g, '');
    function addMsg(who, text, tag) {
        const m = el('div', { class: 'msg ' + who }, text, tag ? el('small', { text: tag }) : null);
        $('chat-log').append(m); $('chat-log').scrollTop = $('chat-log').scrollHeight;
        return m;
    }
    async function ask(q) {
        q = q.trim(); if (!q) return;
        addMsg('me', q); $('chat-input').value = ''; $('chat-send').disabled = true;
        const typing = addMsg('bot typing', ''); typing.append(el('span'), el('span'), el('span'));
        try {
            const d = await api.post('/mentor', { question: q });
            typing.remove();
            addMsg('bot', cleanReply(d.reply), d.source === 'ai' ? ' Gemini AI' : 'Built-in tip (AI offline)');
        } catch (err) {
            typing.remove(); addMsg('bot', ' ' + err.message);
        } finally { $('chat-send').disabled = false; $('chat-input').focus(); }
    }
    $('chat-form').addEventListener('submit', (e) => { e.preventDefault(); ask($('chat-input').value); });
    ['What should I learn first?', 'Explain my skill gaps simply', 'Suggest a weekend project', 'How do I prepare for internship interviews?']
        .forEach((q) => { const b = el('button', { type: 'button', text: q }); b.addEventListener('click', () => ask(q)); $('chat-suggest').append(b); });
    let greeted = false;
    function greet() {
        if (greeted || !state.user) return; greeted = true;
        addMsg('bot', 'Hi ' + state.user.full_name.split(' ')[0] + '! I am your SkillMatrix AI mentor. Ask me about skills, projects, roadmaps or interviews - Hindi, English or Hinglish, all fine.');
    }

    /* ============================================================ profile + badges */
    function renderProfile() {
        const box = $('profile-panel');
        if (!state.user || !state.profile) return;
        const u = state.user, p = state.profile, a = state.analysis, f = focusTotals();
        const done = Object.values(projectStore()).filter((x) => x.state === 'done').length;
        const pct = state.roadmap ? Math.round(state.roadmap.progress.percent) : 0;
        const nameInput = el('input', { type: 'text', value: u.full_name, maxlength: 80, 'aria-label': 'Full name' });
        const save = el('button', { type: 'button', class: 'btn primary', text: 'Save name' });
        const msg = el('p', { class: 'form-msg', role: 'alert' });
        save.addEventListener('click', async () => {
            save.disabled = true;
            try {
                const d = await api.put('/profile', { full_name: nameInput.value });
                state.user = d.user; SM.refreshHeader(); SM.toast('Name updated ✓'); renderProfile();
            } catch (err) { showMsg(msg, err.message, 'error'); save.disabled = false; }
        });
        const info = [['EMAIL', u.email || '-'], ['COURSE', p.course || 'Not set'], ['YEAR', p.year || 'Not set'],
            ['CAREER GOAL', a ? a.target.title : 'Not selected'], ['SKILLS ADDED', String(p.skills.length)], ['JOB MATCH', a ? Math.round(a.match_percent) + '%' : '-']];
        const BADGE_ICONS = ['target', 'layers', 'map', 'check', 'medal', 'timer', 'flame', 'sparkle', 'code'];
        const badges = [
            ['', 'First Analysis', 'Analyze your skills', !!a], ['', 'Skill Collector', 'Add 5+ skills', p.skills.length >= 5],
            ['', 'Roadmap Builder', 'Generate a roadmap', !!state.roadmap], ['', 'Halfway There', 'Reach 50% progress', pct >= 50],
            ['', 'Roadmap Master', 'Reach 100% progress', pct >= 100], ['', 'Focus Starter', 'Finish a focus session', f.sessions >= 1],
            ['', '3-Day Streak', 'Focus 3 days in a row', f.streak >= 3], ['', 'Deep Worker', '2 hours of focus', f.minutes >= 120],
            ['', 'Builder', 'Finish a project', done >= 1]];
        box.replaceChildren(
            el('div', { class: 'profile-hero' },
                el('div', { class: 'avatar', text: u.full_name.trim().charAt(0).toUpperCase() || 'S' }),
                el('div', {}, el('h3', { text: u.full_name }), el('p', { text: (p.course || 'Student') + (p.year ? ' · ' + p.year : '') })),
                el('div', { class: 'profile-edit' }, nameInput, save), msg),
            el('div', { class: 'info-grid' }, info.map(([k, v]) => el('div', { class: 'small-card' }, el('small', { text: k }), el('b', { text: v })))),
            el('h3', { class: 'sub-title', text: 'Focus & progress' }),
            el('div', { class: 'info-grid' }, [['FOCUS TIME', Math.round(f.minutes / 6) / 10 + ' h'], ['SESSIONS', f.sessions], ['STREAK', f.streak + ' days'], ['PROJECTS DONE', done]]
                .map(([k, v]) => el('div', { class: 'small-card' }, el('small', { text: k }), el('b', { text: String(v) })))),
            el('h3', { class: 'sub-title', text: 'Badges (' + badges.filter((b) => b[3]).length + '/' + badges.length + ')' }),
            el('div', { class: 'badges' }, badges.map(([ico, name, how, ok]) => el('div', { class: 'badge' + (ok ? ' earned' : '') },
                el('span', { class: 'b-ico' }, icon(BADGE_ICONS[badges.findIndex((b) => b[1] === name)] || 'medal')), el('strong', { text: name }), el('small', { text: ok ? 'Unlocked!' : how })))));
    }

    /* ============================================================ glue */
    document.addEventListener('sm:render', () => {
        renderOverviewCards(); renderProfile(); renderTracks(); renderMoreProjects(); renderTaskPicker(); renderFocusStats(); renderStreak(); renderCourses(); greet();
    });
    addEventListener('hashchange', paint);
    renderFocusStats(); renderStreak(); renderLanguages(); renderMyProjects(); paint();
    route();
})();
