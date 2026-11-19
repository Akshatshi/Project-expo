(function () {
    const { el } = SM, $ = (id) => document.getElementById(id);
    const KEY = 'sm_sched', p2 = (n) => String(n).padStart(2, '0');
    let S = { days: 7, hours: 2, start: '18:00', len: 45, done: {} };
    try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* ignore */ }
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* blocked */ } };

    function pool() {
        const st = SM.state, out = [];
        if (st.roadmap) st.roadmap.weeks.forEach((w) => w.tasks.forEach((t) => { if (!t.completed) out.push(t.text); }));
        if (!out.length && st.analysis) st.analysis.gaps_priority.forEach((g) => out.push('Learn the basics of ' + g, 'Practice ' + g + ' with small exercises', 'Build a mini task using ' + g));
        return out.length ? out : ['Add your skills in Analyze My Skills, then generate a roadmap'];
    }

    function renderSchedule() {
        const box = $('plan-box'); if (!box || !SM.state) return;
        const num = (k, label, min, max) => { const i = el('input', { type: 'number', min, max, value: S[k] }); i.addEventListener('change', () => { S[k] = Math.max(min, Math.min(max, +i.value || min)); save(); renderSchedule(); }); return el('label', { class: 'field' }, el('span', { text: label }), i); };
        const sel = (k, label, opts) => { const s = el('select', {}, opts.map((o) => el('option', { value: o, text: o + (k === 'len' ? ' min' : '') }))); s.value = S[k]; s.addEventListener('change', () => { S[k] = +s.value; save(); renderSchedule(); }); return el('label', { class: 'field' }, el('span', { text: label }), s); };
        const t = el('input', { type: 'time', value: S.start }); t.addEventListener('change', () => { S.start = t.value || '18:00'; save(); renderSchedule(); });
        const cfg = el('div', { class: 'panel pl-cfg' }, num('days', 'Plan for how many days?', 1, 30), sel('hours', 'Study hours per day', [1, 2, 3, 4, 5, 6]),
            sel('len', 'Session length', [25, 45, 60, 90]), el('label', { class: 'field' }, el('span', { text: 'Start time' }), t));
        const tasks = pool(), per = Math.max(1, Math.floor(S.hours * 60 / (S.len + 10))), [h0, m0] = S.start.split(':').map(Number);
        const arc = (SM_ARCADE.langs || []).map((l) => l.name);
        let n = 0, total = 0, done = 0; const days = [];
        for (let d = 0; d < S.days; d++) {
            const date = new Date(); date.setDate(date.getDate() + d);
            const rows = [];
            for (let s = 0; s < per; s++) {
                const m = h0 * 60 + m0 + s * (S.len + 10), id = d + '-' + s, last = per >= 3 && s === per - 1;
                const text = last ? 'Revise + play a Code Arcade round (' + arc[d % arc.length] + ')' : tasks[n++ % tasks.length];
                const cb = el('input', { type: 'checkbox' }); cb.checked = !!S.done[id]; total++; if (cb.checked) done++;
                cb.addEventListener('change', () => { S.done[id] = cb.checked; save(); renderSchedule(); });
                rows.push(el('label', { class: 'pl-slot' + (cb.checked ? ' done' : '') }, cb, el('b', { text: p2(Math.floor(m / 60) % 24) + ':' + p2(m % 60) }), el('span', { text })));
            }
            days.push(el('div', { class: 'panel pl-day' + (d === 0 ? ' today' : '') }, el('h4', { text: (d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : 'Day ' + (d + 1)) + ' - ' + date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) }), rows));
        }
        box.replaceChildren(cfg, el('p', { class: 'muted pl-sum', text: done + ' of ' + total + ' sessions done. Tasks come from your roadmap and are spread across your days.' }), el('div', { class: 'pl-days' }, days));
    }

    const NEXT = { html: 'CSS|JavaScript', css: 'JavaScript|Responsive Design', javascript: 'React|Node.js|TypeScript', react: 'Next.js|TypeScript', 'node.js': 'Express|MongoDB', python: 'SQL|Flask|Pandas', sql: 'Data Analysis|PostgreSQL', pandas: 'Machine Learning', 'machine learning': 'Deep Learning', java: 'Spring Boot|DSA', 'c++': 'DSA|STL', c: 'C++|DSA', git: 'GitHub|Docker', dsa: 'System Design|LeetCode Practice', flask: 'REST API|Docker', django: 'REST API|PostgreSQL', kotlin: 'Android Jetpack Compose', docker: 'Kubernetes|CI/CD', typescript: 'Next.js|Node.js' };
    function renderReco() {
        const box = $('next-reco'), st = SM.state; if (!box || !st) return;
        const have = new Set(st.profile.skills.map((s) => s.name.toLowerCase())), a = st.analysis;
        const gaps = a ? a.gaps_priority.map((g) => g.toLowerCase()) : [], seen = new Set(), list = [];
        st.profile.skills.forEach((s) => (NEXT[s.name.toLowerCase()] || '').split('|').filter(Boolean).forEach((n) => {
            if (have.has(n.toLowerCase()) || seen.has(n)) return; seen.add(n);
            list.push({ n, from: s.name, gap: gaps.includes(n.toLowerCase()) });
        }));
        list.sort((x, y) => y.gap - x.gap);
        box.replaceChildren(el('h3', { class: 'sub-title', text: 'Recommended skills to learn next' }),
            list.length ? el('div', { class: 'three-column' }, list.slice(0, 6).map((r) => {
                const game = (SM_ARCADE.langs || []).find((l) => l.name.toLowerCase() === r.n.toLowerCase());
                return el('div', { class: 'small-card' }, el('h3', { text: r.n }),
                    el('p', { text: 'You already know ' + r.from + ', so ' + r.n + ' is the natural next step.' + (r.gap ? ' It is also a gap for your target role.' : '') }),
                    el('div', { class: 'week-links' }, el('a', { class: 'yt', href: SM.ytUrl(r.n + ' full course for beginners'), target: '_blank', rel: 'noopener', text: 'Free course' }),
                        el('a', { class: 'yt hi', href: SM.ytUrl(r.n + ' complete course in hindi'), target: '_blank', rel: 'noopener', text: 'हिन्दी' }),
                        game ? el('a', { class: 'yt', href: '#arcade', text: 'Play ' + r.n }) : null));
            })) : el('p', { class: 'empty', text: 'Add skills in Analyze My Skills to get recommendations for what to learn after them.' }));
    }

    // Roadmap tabs: Roadmap | My Schedule | Next Steps
    const RT = { road: 'rtab-road', sched: 'rtab-sched', next: 'rtab-next' }, FROM_HASH = { schedule: 'sched', nextsteps: 'next' };
    function setTab(t, fromClick) {
        if (!RT[t]) t = 'road';
        document.querySelectorAll('#roadmap-tabs .tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === t));
        Object.keys(RT).forEach((k) => { const p = $(RT[k]); if (p) p.hidden = k !== t; });
        if (fromClick && (location.hash === '#schedule' || location.hash === '#nextsteps')) history.replaceState(null, '', '#roadmap');
    }
    document.querySelectorAll('#roadmap-tabs .tab').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab, true)));
    const fromHash = () => { const t = FROM_HASH[location.hash.slice(1)]; if (t) setTab(t); };
    addEventListener('hashchange', fromHash); fromHash();

    SM.planner = { schedule: renderSchedule, reco: renderReco };
    document.addEventListener('sm:render', () => { renderSchedule(); renderReco(); });
})();
