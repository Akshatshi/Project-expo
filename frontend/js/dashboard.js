(function () {
    const { api, auth, el, setBusy, showMsg } = SM;
    const $ = (id) => document.getElementById(id);
    const pad = (n) => String(n).padStart(2, '0');
    const LEVEL_WIDTH = { Beginner: 33, Intermediate: 67, Advanced: 100 };
    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const MAX_SKILLS = 40;

    const state = { user: null, profile: null, analysis: null, roadmap: null, internships: [], draftSkills: [] };

    if (!auth.token()) { location.replace('index.html'); return; }

    SM.state = state;
    SM.ytUrl = (q) => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q) + '&sp=EgIQAw%253D%253D';
    SM.emit = (name) => document.dispatchEvent(new CustomEvent(name));

    function countTo(node, target, fmt) {
        const from = parseFloat(node.dataset.v || '0') || 0;
        node.dataset.v = target;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || from === target) { node.textContent = fmt(target); return; }
        const t0 = performance.now(), dur = 900;
        (function tick(now) {
            const k = Math.min((now - t0) / dur, 1), e = 1 - Math.pow(1 - k, 3);
            node.textContent = fmt(Math.round(from + (target - from) * e));
            if (k < 1) requestAnimationFrame(tick);
        })(t0);
    }

    function pageMessage(text, type) {
        const box = $('page-msg');
        box.textContent = text || '';
        box.className = 'page-msg' + (text ? ' show ' + (type || '') : '');
    }
    function emptyNote(text) { return el('p', { class: 'empty', text }); }
    function fmtPercent(n) { return (Math.round(n * 10) / 10) + '%'; }

    function onAuthFailure(err) {
        if (err && err.status === 401) { auth.clear(); location.replace('index.html'); return true; }
        return false;
    }

    function renderHeader() {
        const name = state.user.full_name;
        $('user-name').textContent = name;
        $('user-avatar').textContent = name.trim().charAt(0).toUpperCase() || 'S';
        const first = name.trim().split(/\s+/)[0];
        const a = state.analysis;
        $('welcome-title').textContent = 'Welcome, ' + first + '!';
        if (a) {
            $('welcome-text').textContent = 'You are ' + fmtPercent(a.match_percent) + ' ready for ' + a.target.title + '. Keep going!';
            const btn = $('welcome-btn');
            btn.textContent = 'View My Roadmap';
            btn.setAttribute('href', '#roadmap');
        }
    }
    SM.refreshHeader = () => { renderHeader(); };
    SM.currentWeek = currentWeek;

    function renderStats() {
        const a = state.analysis;
        countTo($('stat-skills'), state.profile.skills.length, pad);
        countTo($('stat-improve'), a ? a.counts.missing + a.counts.partial : 0, pad);
        countTo($('stat-progress'), state.roadmap ? Math.round(state.roadmap.progress.percent) : 0, (n) => n + '%');
        countTo($('stat-projects'), a ? a.projects.length : 0, pad);
    }

    function renderSkills() {
        const skills = state.profile.skills;
        const bars = $('skill-bars'), tags = $('skill-tags');
        bars.replaceChildren(); tags.replaceChildren();
        if (!skills.length) {
            bars.append(emptyNote('No skills yet. Add your skills in "Analyze My Skills" above.'));
            tags.append(emptyNote('No skills added yet.'));
        }
        skills.forEach((s) => {
            const width = LEVEL_WIDTH[s.level] || 50;
            bars.append(el('div', { class: 'skill-progress' },
                el('div', { class: 'progress-heading' }, el('span', { text: s.name }), el('span', { text: s.level })),
                el('div', { class: 'bar' }, el('div', { class: 'fill', style: 'width:' + width + '%' }))));
            tags.append(el('span', { text: s.name }));
        });
        const goal = state.analysis ? state.analysis.target.title : 'Not selected yet';
        $('career-goal').textContent = goal;
    }

    function renderAnalysis() {
        const a = state.analysis, list = $('gap-list'), summary = $('match-summary');
        list.replaceChildren();
        if (!a) { summary.hidden = true; list.append(emptyNote('Run an analysis to see how your skills compare with the internship.')); return; }
        summary.hidden = false;
        $('match-number').textContent = fmtPercent(a.match_percent);
        $('match-label').textContent = a.readiness + ' for ' + a.target.title;
        $('match-fill').style.width = Math.min(a.match_percent, 100) + '%';
        const note = $('verify-note') || el('p', { id: 'verify-note', class: 'muted' });
        note.textContent = a.verification && a.verification.length ? 'Verified by your Skill Test: ' + a.verification.map((v) => v.skill + ' ' + v.claimed + ' → ' + v.assessed).join(', ') + '. The match uses the tested level.' : '';
        $('match-counts').after(note);
        $('match-counts').textContent = a.counts.matched + ' matched · ' + a.counts.partial + ' need improvement · ' + a.counts.missing + ' missing';

        const rows = [
            ...a.matched.map((s) => ({ s, text: 'Good', cls: 'completed', note: 'You: ' + s.your_level })),
            ...a.partial.map((s) => ({ s, text: 'Needs Improvement', cls: 'pending', note: 'You: ' + s.your_level + ' → ' + s.required_level })),
            ...a.missing.map((s) => ({ s, text: 'Not Learned', cls: 'pending', note: 'Need: ' + s.required_level })),
        ];
        rows.forEach(({ s, text, cls, note }) => list.append(el('div', {},
            el('span', {}, s.skill, el('small', { text: note + ' · ' + s.priority + ' priority' }),
                cls === 'completed' ? null : el('a', { class: 'learn-link', href: SM.ytUrl(s.skill + ' full course for beginners'), target: '_blank', rel: 'noopener', text: 'Learn free' })),
            el('span', { class: 'status ' + cls, text }))));
    }

    function currentWeek() {
        if (!state.roadmap) return null;
        return state.roadmap.weeks.find((w) => !w.done) || state.roadmap.weeks[state.roadmap.weeks.length - 1];
    }

    function renderSchedule() {
        const box = $('schedule-list');
        if (!box) return;
        box.replaceChildren();
        const week = currentWeek();
        if (!week) { box.append(emptyNote('Generate a roadmap to get your weekly schedule.')); return; }
        week.tasks.slice(0, DAYS.length).forEach((t, i) => box.append(el('div', {},
            el('span', { text: DAYS[i] }), el('p', { text: (t.completed ? '✓ ' : '') + t.text }))));
        if (week.tasks.length > DAYS.length) {
            box.append(el('div', {}, el('span', { text: 'Weekend' }), el('p', { text: 'Finish: ' + week.tasks.slice(DAYS.length).map((t) => t.text).join(' · ') })));
        }
    }

    function renderNextSteps() {
        const box = $('next-steps'), a = state.analysis;
        box.replaceChildren();
        if (!a) { box.append(emptyNote('Your personalised next steps appear after your first analysis.')); return; }
        if (!a.gaps_priority.length) {
            box.append(el('div', { class: 'small-card' }, el('span', { class: 'number', text: '01' }),
                el('h3', { text: 'You are internship ready!' }),
                el('p', { text: 'Build one of the recommended projects, polish your resume and start applying.' })));
            return;
        }
        a.gaps_priority.slice(0, 3).forEach((skill, i) => {
            const partial = a.partial.find((s) => s.skill === skill);
            const missing = a.missing.find((s) => s.skill === skill);
            const info = partial || missing;
            let text = partial
                ? 'You know the basics (' + partial.your_level + '). Reach ' + partial.required_level + ' level for ' + a.target.title + '.'
                : 'Not learned yet. Start with the basics - ' + info.priority.toLowerCase() + ' priority for ' + a.target.title + '.';
            const week = state.roadmap && state.roadmap.analysis_id === a.id
                ? state.roadmap.weeks.find((w) => w.focus_skills.some((f) => f.toLowerCase() === skill.toLowerCase())) : null;
            if (week) text += ' Covered in Week ' + week.week + ' of your roadmap.';
            box.append(el('div', { class: 'small-card' }, el('span', { class: 'number', text: pad(i + 1) }),
                el('h3', { text: (partial ? 'Improve ' : 'Learn ') + skill }), el('p', { text })));
        });
    }

    function renderProjects() {
        const box = $('project-list'), a = state.analysis;
        box.replaceChildren();
        if (!a) { box.append(emptyNote('Run an analysis to get projects that close your skill gaps. Meanwhile, browse the "By language" tab.')); return; }
        a.projects.forEach((p) => box.append(SM.projectCard ? SM.projectCard({ key: 'rec:' + p.id, icon: p.icon, title: p.title, description: p.description,
            level: p.level, note: p.covers.length ? 'Builds: ' + p.covers.join(', ') : '', recommended: true }) : el('div')));
    }

    function renderCareers() {
        const box = $('career-list'), a = state.analysis;
        box.replaceChildren();
        if (!a) { box.append(emptyNote('Career matches appear after your first analysis.')); return; }
        a.career_matches.forEach((c) => box.append(el('div', { class: 'career-card' },
            el('h3', {}, c.title, el('span', { class: 'pct', text: fmtPercent(c.match_percent) })),
            el('p', { text: c.key_skills.join(', ') }),
            el('span', { class: 'match' + (c.match_percent >= 70 ? '' : ' explore'), text: c.match_percent >= 70 ? 'Good Match' : 'Explore This' }))));
    }

    function renderRoadmap() {
        const box = $('roadmap-list'), r = state.roadmap;
        box.replaceChildren();
        const summary = $('roadmap-summary');
        summary.replaceChildren();
        if (!r) {
            summary.textContent = state.analysis ? 'Choose the number of weeks and press "Generate Roadmap".' : 'Analyze your skills first, then generate your roadmap.';
            box.append(emptyNote('No roadmap yet.'));
            return;
        }
        const changed = state.analysis && r.analysis_id !== state.analysis.id;
        summary.append(r.summary, ' ', el('span', { class: 'tag-ai' + (r.source === 'ai' ? '' : ' fallback'), text: r.source === 'ai' ? 'AI generated' : (r.ai_status === 'pending' ? 'Template - AI version loading...' : 'Template') }));
        if (changed) summary.append(el('br'), 'Your skills changed since this roadmap was made - generate a new one.');
        const current = currentWeek();
        r.weeks.forEach((w) => {
            const cls = w.done ? 'done' : (w === current ? 'current' : '');
            box.append(el('div', {},
                el('span', { class: cls, text: w.done ? '✓' : String(w.week) }),
                el('article', { class: 'week-body' },
                    el('p', { class: 'week-title', text: 'Week ' + w.week + ': ' + w.title }),
                    w.focus_skills.length ? el('em', { class: 'week-meta', text: 'Focus: ' + w.focus_skills.join(', ') + ' · ' + w.completed_tasks + '/' + w.tasks.length + ' tasks done' }) : null,
                    el('p', { class: 'week-goal', text: w.goal }),
                    w.focus_skills.length ? el('div', { class: 'week-links' }, 'Free playlists:',
                        w.focus_skills.slice(0, 3).map((f) => el('a', { class: 'yt', href: SM.ytUrl(f + ' full course for beginners'), target: '_blank', rel: 'noopener', text: '' + f })),
                        w.focus_skills.slice(0, 1).map((f) => el('a', { class: 'yt hi', href: SM.ytUrl(f + ' complete course in hindi'), target: '_blank', rel: 'noopener', text: 'हिन्दी' }))) : null,
                    w.tasks.map((t, i) => {
                        const cb = el("input", { type: "checkbox" });
                        cb.checked = t.completed;
                        cb.addEventListener("change", () => toggleTask(w.week, i, cb));
                        return el('label', { class: 'task' + (t.completed ? ' done' : '') }, cb, el("span", { text: t.text }));
                    }),
                    el('b', { class: 'milestone', text: ' ' + w.milestone }))));
        });
    }

    function renderAll() {
        renderHeader(); renderStats(); renderSkills(); renderAnalysis(); renderSchedule();
        renderNextSteps(); renderProjects(); renderCareers(); renderRoadmap();
        SM.emit('sm:render');
    }

    async function toggleTask(week, index, checkbox) {
        if (!state.roadmap) return;
        const wanted = checkbox.checked;
        checkbox.disabled = true;
        try {
            const data = await api.put('/progress', { roadmap_id: state.roadmap.id, week, task_index: index, completed: wanted });
            state.roadmap = data.roadmap;
            renderStats(); renderSchedule(); renderNextSteps(); renderRoadmap();
            SM.emit('sm:render');
            if (wanted && SM.confetti) SM.confetti(state.roadmap.progress.percent >= 100 ? 220 : 40);
            if (wanted && SM.toast) SM.toast(state.roadmap.progress.percent >= 100 ? ' Roadmap complete! Amazing work!' : ' Task done - keep going!');
        } catch (err) {
            if (onAuthFailure(err)) return;
            checkbox.checked = !wanted; checkbox.disabled = false;
            showMsg($('roadmap-msg'), err.message, 'error');
        }
    }

    SM.completeTask = async (week, index) => {
        const cb = { checked: true, disabled: false };
        await toggleTask(week, index, cb);
    };

    function renderChips() {
        const box = $('skill-chips');
        box.replaceChildren();
        state.draftSkills.forEach((s, i) => box.append(el('span', { class: 'chip' }, s.name, el('em', { text: s.level }),
            el('button', { type: 'button', 'aria-label': 'Remove ' + s.name, text: '✕', onclick: () => { state.draftSkills.splice(i, 1); renderChips(); } }))));
    }

    function addDraftSkill() {
        const input = $('skill-input');
        const name = input.value.replace(/\s+/g, ' ').trim();
        if (!name) return true;
        if (!/^[A-Za-z0-9][A-Za-z0-9 +#./&'\-]{0,39}$/.test(name)) {
            showMsg($('analyze-msg'), '"' + name.slice(0, 40) + '" is not a valid skill name.', 'error');
            return false;
        }
        const level = $('skill-level').value;
        const existing = state.draftSkills.find((s) => s.name.toLowerCase() === name.toLowerCase());
        if (existing) existing.level = level;
        else if (state.draftSkills.length >= MAX_SKILLS) { showMsg($('analyze-msg'), 'You can add at most ' + MAX_SKILLS + ' skills.', 'error'); return false; }
        else state.draftSkills.push({ name, level });
        input.value = '';
        showMsg($('analyze-msg'), '');
        renderChips();
        return true;
    }

    function toggleCustomFields() {
        const custom = $('internship').value === '__custom__';
        $('custom-title-field').hidden = !custom;
        $('custom-skills-field').hidden = !custom;
    }

    function setupAnalyzeForm(skillNames) {
        const select = $('internship');
        select.append(el('option', { value: '', text: 'Select an internship' }));
        state.internships.forEach((i) => select.append(el('option', { value: i.id, text: i.title })));
        select.append(el('option', { value: '__custom__', text: 'Other (enter my own)...' }));
        skillNames.forEach((n) => $('skill-options').append(el('option', { value: n })));

        const p = state.profile;
        state.draftSkills = p.skills.map((s) => ({ ...s }));
        $('course').value = p.course || '';
        $('year').value = p.year || '';
        if (p.custom_internship) {
            select.value = '__custom__';
            $('custom-title').value = p.custom_internship.title;
            $('custom-skills').value = p.custom_internship.required_skills.join(', ');
        } else if (p.internship_id) select.value = p.internship_id;
        toggleCustomFields(); renderChips();

        select.addEventListener('change', toggleCustomFields);
        $('add-skill-btn').addEventListener('click', addDraftSkill);
        $('skill-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addDraftSkill(); } });
        $('analyze-form').addEventListener('submit', submitAnalysis);
    }

    async function submitAnalysis(e) {
        e.preventDefault();
        const msg = $('analyze-msg'), btn = $('analyze-btn');
        showMsg(msg, '');
        if (!addDraftSkill()) return;
        const target = $('internship').value;
        if (!target) { showMsg(msg, 'Please choose a target internship.', 'error'); return; }
        if (!state.draftSkills.length) { showMsg(msg, 'Add at least one skill.', 'error'); return; }

        const payload = { skills: state.draftSkills, course: $('course').value.trim(), year: $('year').value };
        if (target === '__custom__') {
            payload.custom_internship = {
                title: $('custom-title').value.trim(),
                required_skills: $('custom-skills').value.split(',').map((s) => s.trim()).filter(Boolean),
            };
        } else payload.internship_id = target;

        setBusy(btn, true, 'Analyzing...');
        try {
            const data = await api.post('/analysis', payload);
            state.analysis = data.analysis;
            state.profile = {
                ...state.profile, skills: state.draftSkills.map((s) => ({ ...s })), course: payload.course, year: payload.year,
                internship_id: data.analysis.target.internship_id, custom_internship: payload.custom_internship || null,
            };
            renderAll();
            showMsg(msg, 'Done! Your match is ' + fmtPercent(data.analysis.match_percent) + '.', 'success');
            if (SM.confetti && data.analysis.match_percent >= 70) SM.confetti(120);
            setTimeout(() => { location.hash = '#analysis'; }, 700);
        } catch (err) {
            if (onAuthFailure(err)) return;
            const fields = err.fields ? Object.values(err.fields) : [];
            showMsg(msg, fields.length ? fields[0] : err.message, 'error');
        } finally { setBusy(btn, false); }
    }

    let pollTimer = null;
    function watchAiRoadmap() {
        clearInterval(pollTimer);
        const first = state.roadmap, msg = $('roadmap-msg');
        if (!first || first.ai_status !== 'pending') return;
        showMsg(msg, 'Your roadmap is ready. AI is writing a personalised version in the background - you can keep using the app.', 'success');
        let tries = 0;
        pollTimer = setInterval(async () => {
            tries += 1;
            try {
                const latest = (await api.get('/roadmap/latest')).roadmap;
                if (!latest || latest.id !== first.id) { clearInterval(pollTimer); return; }
                if (latest.ai_status !== 'pending') {
                    clearInterval(pollTimer);
                    state.roadmap = latest;
                    renderStats(); renderSchedule(); renderNextSteps(); renderRoadmap();
                    SM.emit('sm:render');
                    if (latest.source === 'ai') {
                        showMsg(msg, '');
                        if (SM.toast) SM.toast('Your AI roadmap is ready');
                        if (SM.confetti) SM.confetti(60);
                    } else {
                        showMsg(msg, 'AI could not finish this time, so you are using the template roadmap.' + (latest.ai_note ? ' [' + latest.ai_note + ']' : ''), 'error');
                    }
                } else if (tries > 70) {
                    clearInterval(pollTimer);
                    showMsg(msg, 'AI is taking too long. Keep using the template or press Generate again.', 'error');
                }
            } catch (e) { clearInterval(pollTimer); }
        }, 3000);
    }

    async function generateRoadmap() {
        const msg = $('roadmap-msg'), btn = $('roadmap-btn');
        showMsg(msg, '');
        if (!state.analysis) { showMsg(msg, 'Analyze your skills first.', 'error'); return; }
        const hours = parseInt($('roadmap-hours').value, 10);
        if (!Number.isInteger(hours) || hours < 1 || hours > 40) { showMsg(msg, 'Hours per week must be between 1 and 40.', 'error'); return; }
        setBusy(btn, true, 'Building your roadmap...');
        try {
            const data = await api.post('/roadmap', { analysis_id: state.analysis.id, weeks: parseInt($('roadmap-weeks').value, 10), hours_per_week: hours });
            state.roadmap = data.roadmap;
            renderStats(); renderSchedule(); renderNextSteps(); renderRoadmap();
            SM.emit('sm:render');
            if (data.warning) showMsg(msg, data.warning, 'error');
            watchAiRoadmap();
        } catch (err) {
            if (onAuthFailure(err)) return;
            const fields = err.fields ? Object.values(err.fields) : [];
            showMsg(msg, fields.length ? fields[0] : err.message, 'error');
        } finally { setBusy(btn, false); }
    }

    async function init() {
        $('logout-link').addEventListener('click', () => auth.clear());
        $('roadmap-btn').addEventListener('click', generateRoadmap);
        try {
            const [dash, internships, skills] = await Promise.all([api.get('/dashboard'), api.get('/internships'), api.get('/skills')]);
            Object.assign(state, { user: dash.user, profile: dash.profile, analysis: dash.analysis, roadmap: dash.roadmap, internships: internships.internships });
            if (state.roadmap) { $('roadmap-hours').value = state.roadmap.hours_per_week; $('roadmap-weeks').value = String(state.roadmap.weeks.length); }
            setupAnalyzeForm(skills.skills);
            SM.setupDone = true;
            renderAll();
            watchAiRoadmap();
        } catch (err) {
            if (onAuthFailure(err)) return;
            pageMessage(err.message, 'error');
        }
    }
    init();
})();
