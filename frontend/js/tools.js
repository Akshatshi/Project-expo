(function () {
    if (!window.SM || !SM.auth.token()) return;
    const { el, api } = SM, $ = (id) => document.getElementById(id);
    const store = SM.sync;
    const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
    const LEVELS = ['Beginner', 'Intermediate', 'Advanced'], NS = 'http://www.w3.org/2000/svg';
    const field = (label, node, cls) => el('div', { class: 'field ' + (cls || '') }, el('label', { text: label }), node);
    const input = (ph, val, on) => el('input', { type: 'text', placeholder: ph, value: val || '', oninput: on });
    const area = (ph, rows, val, on) => { const t = el('textarea', { class: 'k-area', rows, placeholder: ph, oninput: on }); t.value = val || ''; return t; };
    const btn = (text, on, cls) => el('button', { type: 'button', class: 'btn ' + (cls || ''), text, onclick: on });
    const colour = (p) => p >= 75 ? 'var(--green)' : p >= 45 ? 'var(--amber)' : 'var(--red)';
    const download = (name, text) => { const a = el('a', { href: URL.createObjectURL(new Blob([text], { type: 'text/plain' })), download: name }); document.body.append(a); a.click(); a.remove(); };
    const mentorCtx = { section: '' };

    function ring(pct, label) {
        const r = 52, c = 2 * Math.PI * r, s = document.createElementNS(NS, 'svg');
        s.setAttribute('viewBox', '0 0 130 130'); s.setAttribute('class', 'k-ring');
        const mk = (t, a) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); return n; };
        s.append(mk('circle', { cx: 65, cy: 65, r, fill: 'none', stroke: 'var(--line2)', 'stroke-width': 11 }),
            mk('circle', { cx: 65, cy: 65, r, fill: 'none', stroke: colour(pct), 'stroke-width': 11, 'stroke-linecap': 'round', 'stroke-dasharray': (c * pct / 100) + ' ' + c, transform: 'rotate(-90 65 65)' }));
        const t = mk('text', { x: 65, y: 72, 'text-anchor': 'middle', 'font-size': 26, 'font-weight': 700, fill: 'var(--text)' }); t.textContent = Math.round(pct) + '%';
        s.append(t);
        return el('div', { class: 'k-ring-wrap' }, s, el('small', { text: label }));
    }
    const hbars = (rows) => el('div', { class: 'k-bars' }, ...rows.map(([name, pct, note]) => el('div', { class: 'k-bar' },
        el('div', { class: 'k-bar-head' }, el('span', { text: name }), el('b', { text: note || Math.round(pct) + '%' })),
        el('div', { class: 'k-track' }, el('i', { style: 'width:' + Math.max(2, Math.min(pct, 100)) + '%;background:' + colour(pct) })))));
    const card = (title, ...kids) => el('div', { class: 'panel k-card' }, title ? el('h3', { text: title }) : null, ...kids);
    const hint = (t) => el('p', { class: 'muted', text: t });

    const loaded = {};
    const lib = (url) => loaded[url] || (loaded[url] = new Promise((ok, no) => { const s = el('script', { src: url }); s.onload = ok; s.onerror = () => no(new Error('Could not load reader library (check internet).')); document.head.append(s); }));
    async function readFile(f) {
        const ext = (f.name.split('.').pop() || '').toLowerCase();
        if (f.size > 8e6) throw new Error('File is larger than 8 MB.');
        if (ext === 'pdf') {
            await lib('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            const pdf = await pdfjsLib.getDocument({ data: await f.arrayBuffer() }).promise; let out = '';
            for (let i = 1; i <= Math.min(pdf.numPages, 8); i++) out += (await (await pdf.getPage(i)).getTextContent()).items.map((x) => x.str).join(' ') + '\n';
            return out;
        }
        if (ext === 'docx') { await lib('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js'); return (await mammoth.extractRawText({ arrayBuffer: await f.arrayBuffer() })).value; }
        return f.text();
    }
    const uploader = (target, note) => el('label', { class: 'k-drop' }, el('span', { text: 'Upload PDF, DOCX or TXT' }),
        el('input', { type: 'file', accept: '.pdf,.docx,.txt,.md', hidden: true, onchange: async (e) => {
            const f = e.target.files[0]; if (!f) return;
            note.textContent = 'Reading ' + f.name + '...';
            try { target.value = await readFile(f); note.textContent = f.name + ' loaded (' + target.value.split(/\s+/).length + ' words). Edit if the text looks wrong.'; } catch (err) { note.textContent = err.message; }
        } }));

    function viewTest(root) {
        const lang = el('select', {}, ...SM_ARCADE.langs.filter((l) => ['python', 'javascript', 'html', 'css', 'sql', 'java', 'cpp', 'git'].includes(l.id)).map((l) => el('option', { value: l.id, text: l.name })));
        const claim = el('select', {}, ...LEVELS.map((l, i) => el('option', { value: i + 1, text: l, selected: i === 1 })));
        const stage = el('div'), side = el('div'), msg = el('p', { class: 'muted' });
        root.append(card('Verify your skill level', hint('Questions are drawn at random on the server from a large bank, by the level you claim, and are never repeated back to back. Answers are checked on the server, and your assessed level is applied in your next skill analysis.'),
            el('div', { class: 'k-grid' }, field('Skill', lang), field('You claim', claim)),
            btn('Start test', async (e) => { msg.textContent = ''; e.target.disabled = true; try { run(stage, await api.post('/assessment/start', { lang: lang.value, claim: +claim.value }), drawSide); } catch (err) { msg.textContent = err.message; } e.target.disabled = false; }, 'primary'), msg), stage, practiceCard(), side);
        function drawSide() {
            side.replaceChildren();
            api.get('/assessment/summary').then(({ skills }) => { if (skills.length) side.append(card('Claimed vs assessed', hbars(skills.map((t) => [t.skill + ': claimed ' + t.claimed + ', assessed ' + t.assessed, t.pct, t.pct + '%'])))); }).catch(() => {});
            side.append(qualityCard());
            api.get('/leaderboard').then(({ leaderboard }) => { if (leaderboard.length) side.append(card('Leaderboard (best test score)', ...leaderboard.map((u, i) => el('div', { class: 'k-bar-head', style: 'padding:7px 0;border-bottom:1px solid var(--line)' + (u.you ? ';color:var(--blue)' : '') }, el('span', { text: (i + 1) + '. ' + u.name + (u.you ? ' (you)' : '') }), el('b', { text: u.best + '%  ·  ' + u.tests + ' tests' }))))); }).catch(() => {});
        }
        drawSide();
    }
    function run(stage, paper, done) {
        const picks = [], ta = area('Write your answer here...', 6), qs = paper.questions;
        let wait = paper.min_seconds;
        const submit = btn('Submit test', async () => {
            submit.disabled = true;
            try {
                const { result } = await api.post('/assessment/' + paper.id + '/submit', { answers: qs.map((q, i) => (picks[i] === undefined ? null : picks[i])), practical: ta.value });
                showResult(stage, result, paper, () => run(stage, null, done)); done();
                if (SM.confetti && result.pct >= 75) SM.confetti();
            } catch (err) { submit.disabled = false; submit.textContent = err.message; }
        }, 'primary');
        submit.disabled = true;
        const timer = setInterval(() => { if (!submit.isConnected) return clearInterval(timer); wait--; submit.textContent = wait > 0 ? 'Submit test (' + wait + 's)' : 'Submit test'; if (wait <= 0) { submit.disabled = false; clearInterval(timer); } }, 1000);
        submit.textContent = 'Submit test (' + wait + 's)';
        stage.replaceChildren(card(SM_ARCADE.langs.find((l) => l.id === paper.lang).name + ' test (' + qs.length + ' questions + 1 practical)', ...qs.map((q, n) => el('div', { class: 'k-q' },
            el('p', {}, el('span', { class: 'k-lvl l' + q.level, text: LEVELS[q.level] }), ' ' + q.n + '. ' + q.q), q.code ? el('pre', { text: q.code }) : null,
            ...q.options.map((o, oi) => el('label', {}, el('input', { type: 'radio', name: 'q' + n, onchange: () => { picks[n] = oi; } }), ' ' + o)))),
            el('div', { class: 'k-q' }, el('p', { text: 'Practical: ' + paper.task }), ta), submit));
    }
    function showResult(stage, r, paper, again) {
        const name = SM_ARCADE.langs.find((l) => l.id === paper.lang).name;
        const cert = () => { const old = $('certificate'); if (old) old.remove(); document.body.append(el('div', { id: 'certificate' }, el('h1', { text: 'Certificate of Skill Assessment' }), el('p', { text: 'This certifies that' }), el('h2', { text: SM.state.user.full_name }),
            el('p', { text: 'scored ' + r.pct + '% in the ' + name + ' assessment on SkillMatrix AI and is assessed at' }), el('h2', { text: r.level_label + ' level' }), el('small', { text: new Date().toDateString() + '  ·  Test #' + paper.id }))); window.print(); };
        stage.replaceChildren(card('Your result', el('div', { class: 'k-result' }, ring(r.pct, 'score'),
            el('div', {}, el('h2', { text: 'Assessed level: ' + r.level_label }), el('p', { class: 'muted', text: r.level_label === r.claimed ? 'Your claim matches the test.' : 'You claimed ' + r.claimed + '. Your next analysis uses the tested level if it is lower.' }))),
            el('h4', { class: 'subheading', text: 'Accuracy by difficulty' }), hbars(r.by_level.map((b, l) => [LEVELS[l] + ' questions', b[1] ? b[0] / b[1] * 100 : 0, b[0] + '/' + b[1]])),
            el('h4', { class: 'subheading', text: 'Practical task (' + (r.practical.source === 'ai' ? 'graded by AI' : 'checked against key concepts') + ')' }), hbars([['Practical score', r.practical.score]]), el('p', { class: 'muted', text: r.practical.feedback }),
            el('h4', { class: 'subheading', text: 'Review' }), ...r.review.map((x) => el('p', { class: x.ok ? '' : 'muted', text: (x.ok ? '✓ ' : '✗ ') + x.q + ' → ' + x.answer + '. ' + x.why })),
            el('div', { class: 'k-toolbar' }, btn('Take another random test', () => stage.replaceChildren(), 'primary'), r.pct >= 45 ? btn('Print certificate', cert) : null)));
    }

    const RB = { edu: ['Degree / course', 'College / school', 'Year', 'CGPA / %'], proj: ['Project title', 'Tech used', 'Link (GitHub / live)', 'What you built and the result'], exp: ['Role', 'Company', 'Duration', 'What you did (add numbers)'], cert: ['Certificate / achievement', 'Issuer', 'Year', ''] };
    const PERSONAL = [['name', 'Full name'], ['email', 'Email'], ['phone', 'Phone'], ['city', 'City, State'], ['linkedin', 'LinkedIn URL'], ['github', 'GitHub URL'], ['site', 'Portfolio (optional)']];
    function portfolio(s) {
        const e = (t) => String(t || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
        const projects = s.proj.filter((p) => p[0]).map((p) => '<div class="c"><h3>' + e(p[0]) + '</h3><small>' + e(p[1]) + '</small><p>' + e(p[3]) + '</p>' + (p[2] ? '<a href="' + e(p[2]) + '">View project</a>' : '') + '</div>').join('');
        const chips = (s.tech || '').split(',').map((x) => x.trim()).filter(Boolean).map((x) => '<span>' + e(x) + '</span>').join('');
        const links = [[s.p.github, 'GitHub'], [s.p.linkedin, 'LinkedIn'], [s.p.email && 'mailto:' + s.p.email, 'Email']].filter((l) => l[0]).map((l) => '<a href="' + e(l[0]) + '">' + l[1] + '</a>').join(' ');
        download((s.p.name || 'portfolio').replace(/\W+/g, '-') + '-portfolio.html', '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + e(s.p.name) + '</title><style>body{margin:0;font:16px/1.6 system-ui;background:#0b1020;color:#e8ecf8}main{max-width:860px;margin:auto;padding:48px 20px}h1{font-size:40px;margin:0}a{color:#6cc4ff;margin-right:14px}.c{background:#131a33;border:1px solid #243058;border-radius:14px;padding:18px;margin:14px 0}span{display:inline-block;background:#1c2750;border-radius:20px;padding:4px 12px;margin:4px 6px 0 0;font-size:14px}small{color:#9aa6c8}</style></head><body><main><h1>' + e(s.p.name) + '</h1><p>' + e(s.summary) + '</p><p>' + links + '</p><h2>Skills</h2>' + chips + '<h2>Projects</h2>' + projects + '</main></body></html>');
    }
    function viewResume(root) {
        const s = store.get('sm_resume', null) || { p: { name: SM.state.user.full_name, email: SM.state.user.email }, summary: '', tech: SM.state.profile.skills.map((x) => x.name).join(', '), tools: '', soft: '', edu: [['', '', '', '']], proj: [['', '', '', '']], exp: [], cert: [], tpl: 'classic' };
        const sheet = el('div', { id: 'resume-sheet' }), save = () => { store.set('sm_resume', s); draw(); };
        function draw() {
            const t = s.tpl, p = s.p, H = (x) => el('h4', { class: 'rs-h', text: x });
            const rows = (arr, f) => arr.filter((r) => r.some(Boolean)).map(f);
            const links = [p.email, p.phone, p.city, p.linkedin, p.github, p.site].filter(Boolean).join('  |  ');
            sheet.className = 'rs-' + t;
            sheet.replaceChildren(...[el('h1', { class: 'rs-name', text: p.name || 'Your Name' }), el('p', { class: 'rs-contact', text: links }),
                s.summary ? H('Summary') : null, s.summary ? el('p', { text: s.summary }) : null,
                rows(s.edu, (r) => r).length ? H('Education') : null, ...rows(s.edu, (r) => el('div', { class: 'rs-row' }, el('b', { text: r[0] }), el('span', { text: [r[1], r[2], r[3] && 'CGPA/%: ' + r[3]].filter(Boolean).join(' | ') }))),
                (s.tech || s.tools || s.soft) ? H('Skills') : null, s.tech ? el('p', {}, el('b', { text: 'Technical: ' }), s.tech) : null, s.tools ? el('p', {}, el('b', { text: 'Tools: ' }), s.tools) : null, s.soft ? el('p', {}, el('b', { text: 'Soft skills: ' }), s.soft) : null,
                rows(s.proj, (r) => r).length ? H('Projects') : null, ...rows(s.proj, (r) => el('div', { class: 'rs-row' }, el('b', { text: r[0] + (r[1] ? ' (' + r[1] + ')' : '') }), r[2] ? el('span', { text: r[2] }) : null, r[3] ? el('p', { text: '• ' + r[3] }) : null)),
                rows(s.exp, (r) => r).length ? H('Experience') : null, ...rows(s.exp, (r) => el('div', { class: 'rs-row' }, el('b', { text: r[0] + (r[1] ? ', ' + r[1] : '') }), el('span', { text: r[2] }), r[3] ? el('p', { text: '• ' + r[3] }) : null)),
                rows(s.cert, (r) => r).length ? H('Certifications & Achievements') : null, ...rows(s.cert, (r) => el('p', { text: '• ' + [r[0], r[1], r[2]].filter(Boolean).join(' | ') }))].filter(Boolean));
        }
        const group = (key) => {
            const box = el('div'), labels = RB[key];
            const paint = () => { box.replaceChildren(...s[key].map((row, i) => el('div', { class: 'k-rowset' }, el('div', { class: 'k-grid' }, ...labels.map((lab, c) => lab ? (c === 3 && key !== 'edu' && key !== 'cert' ? field(lab, area('', 2, row[c], (e) => { row[c] = e.target.value; save(); }), 'wide') : field(lab, input('', row[c], (e) => { row[c] = e.target.value; save(); }))) : null)),
                btn('Remove', () => { s[key].splice(i, 1); paint(); save(); }, 'k-small'))), btn('+ Add another', () => { s[key].push(['', '', '', '']); paint(); }, 'k-small')); };
            paint(); return box;
        };
        const sec = (n, t, ...k) => card(n + '. ' + t, ...k);
        const form = el('div', { class: 'k-form' },
            sec(1, 'Personal details', el('div', { class: 'k-grid' }, ...PERSONAL.map(([k, l]) => field(l, input('', s.p[k], (e) => { s.p[k] = e.target.value; save(); }))))),
            sec(2, 'Career summary', area('2-3 lines: who you are, your strongest skills, what role you want', 3, s.summary, (e) => { s.summary = e.target.value; save(); })),
            sec(3, 'Academics', group('edu')),
            sec(4, 'Skills', el('div', { class: 'k-grid' }, field('Technical (comma separated)', input('Python, SQL, React', s.tech, (e) => { s.tech = e.target.value; save(); })), field('Tools', input('Git, VS Code, Figma', s.tools, (e) => { s.tools = e.target.value; save(); })), field('Soft skills', input('Teamwork, Communication', s.soft, (e) => { s.soft = e.target.value; save(); })))),
            sec(5, 'Projects', group('proj')), sec(6, 'Internships / experience', group('exp')), sec(7, 'Certifications & achievements', group('cert')));
        const tpl = el('select', { onchange: (e) => { s.tpl = e.target.value; save(); } }, el('option', { value: 'classic', text: 'Classic (best for ATS)', selected: s.tpl === 'classic' }), el('option', { value: 'modern', text: 'Modern accent', selected: s.tpl === 'modern' }));
        root.append(el('div', { class: 'k-split' }, form, el('div', { class: 'k-sticky' }, el('div', { class: 'k-toolbar' }, tpl, btn('Print / Save PDF', () => window.print(), 'primary'), btn('Download .txt', () => download('resume.txt', sheet.innerText)), btn('Portfolio page (.html)', () => portfolio(s))), sheet)));
        draw();
    }

    const VERBS = ['built', 'developed', 'designed', 'implemented', 'created', 'improved', 'reduced', 'led', 'optimized', 'launched', 'automated', 'deployed', 'analyzed', 'managed', 'increased'];
    const STOP = new Set('the and for with you are will our have from that this your who work able team role job must can all any not but use used using about into more other than such'.split(' '));
    function viewAts(root) {
        const r = area('Paste your resume text, or upload a file above', 10), jd = area('Paste the job description (optional, enables keyword matching)', 5), note = el('p', { class: 'muted' }), out = el('div');
        root.append(card('ATS resume checker', hint('Upload your resume (PDF, DOCX, TXT) or paste it. Nothing is sent to a server; the file is read in your browser.'), uploader(r, note), note, field('Resume text', r), field('Job description', jd),
            btn('Check my resume', () => {
                const t = r.value.toLowerCase(); if (t.trim().length < 80) { note.textContent = 'Add your resume text first.'; return; }
                const words = t.split(/\s+/).filter(Boolean).length, verbs = VERBS.filter((v) => t.includes(v)).length, nums = (t.match(/\d+\s?%|\d+\+|\b\d{2,}\b/g) || []).length;
                const secs = ['education', 'skills', 'project', 'experience', 'summary', 'certif'].filter((s) => t.includes(s)).length;
                const cats = [['Contact details', (/@/.test(t) ? 40 : 0) + (/\d{10}|\+\d{2}/.test(t.replace(/[\s-]/g, '')) ? 30 : 0) + (/linkedin|github/.test(t) ? 30 : 0)],
                    ['Sections found', Math.min(secs / 4, 1) * 100], ['Action verbs', Math.min(verbs / 5, 1) * 100], ['Numbers / impact', Math.min(nums / 5, 1) * 100], ['Length (150-700 words)', words >= 150 && words <= 700 ? 100 : words < 150 ? words / 150 * 60 : 60]];
                const tips = [], raw = r.value, multi = (raw.match(/\S {3,}\S|\t/g) || []).length, pipes = (raw.match(/\|/g) || []).length, odd = (raw.match(/[^\x00-\x7F\u2022\u2013\u2014\u2019\u2018\u201c\u201d]/g) || []).length, longLines = raw.split('\n').filter((l) => l.length > 160).length, dates = new Set((raw.match(/\b(0?\d\/\d{4}|\d{4}-\d{2}|[A-Z][a-z]{2,8} \d{4})/g) || []).map((d) => (/\//.test(d) ? 'a' : /-/.test(d) ? 'b' : 'c')));
                let fmt = 100; if (multi > 8) fmt -= 30; if (pipes > 12) fmt -= 15; if (odd > 10) fmt -= 20; if (longLines > 6) fmt -= 10; if (dates.size > 1) fmt -= 10;
                cats.push(['Format (single column, clean text)', Math.max(fmt, 20)]);
                if (multi > 8) tips.push('Wide gaps suggest columns or a table. Many ATS read these in the wrong order, so use one column.');
                if (pipes > 12) tips.push('Too many | separators. Use simple lines or commas.');
                if (odd > 10) tips.push('Unusual symbols or icons found. Use plain bullets and no icon fonts.');
                if (dates.size > 1) tips.push('Use one date format everywhere, e.g. Jan 2025 - Mar 2025.');
                if (cats[0][1] < 100) tips.push('Add a professional email, a 10-digit phone number and LinkedIn / GitHub links.');
                if (secs < 4) tips.push('Use clear headings: Education, Skills, Projects, Experience.');
                if (verbs < 5) tips.push('Start bullets with action verbs such as built, designed, improved, automated.');
                if (nums < 5) tips.push('Add numbers: users, % improvement, time saved, dataset size.');
                if (words < 150 || words > 700) tips.push('Keep it between one concise page (about 300-500 words) and two pages.');
                if (jd.value.trim()) {
                    const kw = [...new Set(jd.value.toLowerCase().match(/[a-z+#.]{3,}/g) || [])].filter((w) => !STOP.has(w)), miss = kw.filter((w) => !t.includes(w));
                    const pct = kw.length ? (1 - miss.length / kw.length) * 100 : 100; cats.push(['Job keyword match', pct]);
                    if (miss.length) tips.push('Missing keywords from the job post: ' + miss.slice(0, 15).join(', ') + '. Add the ones you genuinely know.');
                }
                const total = cats.reduce((s, c) => s + c[1], 0) / cats.length;
                out.replaceChildren(card('Result', el('div', { class: 'k-result' }, ring(total, 'ATS score'), hbars(cats)), el('h4', { class: 'subheading', text: tips.length ? 'Fix these first' : 'Looks strong' }), ...tips.map((x) => el('p', { text: '• ' + x }))));
            }, 'primary')), out);
    }

    const LI_TIPS = [['Photo & banner', 'Clear face photo, plain background, smile. Banner showing your field (code, design, data).'], ['Headline', 'Not just "Student". Use Role | 2-3 skills | goal, e.g. "CSE Student | Python, SQL, React | Seeking Data Internship".'], ['About', 'First 2 lines matter most. Say who you are, what you build, one result with a number, and "Open to internships".'], ['Experience & projects', 'List projects as experience with 2-3 bullet results and links. Add the tech stack in every entry.'], ['Skills & endorsements', 'Pin your top 3 skills, add 15+, ask classmates and seniors to endorse them.'], ['Featured & posts', 'Feature your best GitHub repo or live demo. Post one learning note a week.'], ['Network', 'Connect with 100+ people in your field, send a short note, follow target companies, engage before you ask.']];

    function linkedinBuilder() {
        const res = store.get('sm_resume', null), prof = SM.state.profile, name = SM.state.user.full_name;
        const f = {}, out = el('div');
        const inp = (k, label, ph, val) => field(label, el('input', { type: 'text', placeholder: ph, value: val || '', oninput: (e) => { f[k] = e.target.value.trim(); } }));
        const skillsVal = prof.skills.map((x) => x.name).join(', ');
        const proj = (n) => [inp('p' + n, 'Project ' + n + ' name', 'Expense Tracker', res && res.proj[n - 1] ? res.proj[n - 1][0] : ''), inp('d' + n, 'What it does and the result', 'tracks spending, 150 users, 30% less manual work', res && res.proj[n - 1] ? res.proj[n - 1][3] : '')];
        const form = [inp('role', 'Target role', 'Data Analyst Intern'), inp('skills', 'Top skills (comma separated)', 'Python, SQL, Power BI', skillsVal), inp('course', 'Course and year', 'B.Tech CSE, 3rd year', prof.course ? prof.course + (prof.year ? ', ' + prof.year : '') : ''),
            inp('college', 'College', 'Your college name'), inp('city', 'City', 'Jabalpur'), ...proj(1), ...proj(2), inp('cert', 'Certificate or achievement (optional)', 'Python for Everybody, Coursera')];
        form.forEach((n) => { const i = n.querySelector('input'), k = ['role', 'skills', 'course', 'college', 'city', 'p1', 'd1', 'p2', 'd2', 'cert'][form.indexOf(n)]; f[k] = i.value.trim(); });
        const copy = (t) => btn('Copy', (e) => { navigator.clipboard && navigator.clipboard.writeText(t); e.target.textContent = 'Copied ✓'; setTimeout(() => { e.target.textContent = 'Copy'; }, 1200); }, 'k-small');
        const block = (title, text) => el('div', { class: 'k-gen' }, el('div', { class: 'k-gen-head' }, el('b', { text: title }), copy(text)), el('p', { text }));
        const generate = () => {
            const sk = (f.skills || '').split(',').map((x) => x.trim()).filter(Boolean), top = sk.slice(0, 3), role = f.role || 'Software Intern', first = name.split(' ')[0];
            const projs = [[f.p1, f.d1], [f.p2, f.d2]].filter((p) => p[0]);
            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            const heads = [(f.course || 'Student') + ' | ' + top.join(', ') + ' | Seeking ' + role + ' role', role + ' Aspirant | ' + top.join(' • ') + (projs[0] ? ' | Built ' + projs[0][0] : ''), top.join(' | ') + ' | Open to Internships | ' + (f.course || '').split(',')[0]];
            const about = 'I am a ' + (f.course || 'student') + (f.college ? ' at ' + f.college : '') + ' focused on ' + top.join(', ') + '.\n\n' +
                (projs.length ? 'What I have built:\n' + projs.map((p) => '• ' + p[0] + (p[1] ? ': ' + p[1] : '')).join('\n') + '\n\n' : '') +
                'Skills: ' + sk.join(', ') + '.\n\nI am looking for a ' + role + ' opportunity where I can learn from a team and ship real work. Open to internships' + (f.city ? ' in ' + f.city + ' or remote' : '') + '. Message me or write to ' + SM.state.user.email + '.';
            const entries = projs.map((p) => 'Title: ' + p[0] + '\nDescription: ' + (p[1] || 'Describe what you built and the result.') + '\nTech: ' + sk.slice(0, 5).join(', ') + '\nLink: add your GitHub or live demo URL');
            out.replaceChildren(el('h4', { class: 'subheading', text: 'Your ready-to-paste profile' }), ...heads.map((h, i) => block('Headline option ' + (i + 1), h)), block('About section', about),
                ...entries.map((e, i) => block('Projects entry ' + (i + 1) + ' (Add to Projects or Experience)', e)), block('Skills to add (in this order)', sk.concat(['Problem Solving', 'Communication', 'Teamwork']).join(', ')),
                block('Custom URL', 'linkedin.com/in/' + slug), block('Banner text', top.join('  •  ') + '  |  ' + role),
                block('Connection note (under 300 characters)', 'Hi, I am ' + first + ', a ' + (f.course || 'student') + ' interested in ' + role + ' roles. I admire your work at your company and would love to learn from your journey. Thank you for connecting!'),
                block('Message to a recruiter', 'Hello, I am ' + first + '. I have built ' + (projs[0] ? projs[0][0] : 'projects') + ' using ' + top.join(', ') + ' and am applying for the ' + role + ' role. My resume and GitHub are attached. Could you guide me on the next step?'),
                f.cert ? block('Licenses and certifications', f.cert) : null);
        };
        const ai = async (e) => {
            e.target.disabled = true; const old = e.target.textContent; e.target.textContent = 'Writing...';
            const projects = [[f.p1, f.d1], [f.p2, f.d2]].filter((p) => p[0]).map((p) => ({ name: p[0], detail: p[1] }));
            try {
                const d = await api.post('/linkedin/draft', { role: f.role, skills: (f.skills || '').split(',').map((x) => x.trim()).filter(Boolean), course: f.course, college: f.college, city: f.city, projects, certificate: f.cert });
                out.replaceChildren(el('h4', { class: 'subheading', text: 'AI-written from your facts (edit before posting)' }), ...d.headlines.map((h, i) => block('Headline option ' + (i + 1), h)), block('About section', d.about), ...d.project_bullets.map((b, i) => block('Project bullet ' + (i + 1), b)));
            } catch (err) { out.prepend(el('p', { class: 'muted', text: err.message })); }
            e.target.disabled = false; e.target.textContent = old;
        };
        return card('Build my LinkedIn profile', hint('Fill a few facts (prefilled from your account and resume). You get headline options, a full About, project entries, skills, URL and messages to paste.'), el('div', { class: 'k-grid' }, ...form), el('div', { class: 'k-toolbar' }, btn('Generate (template)', generate, 'primary'), btn('Rewrite with AI (more personal)', ai)), out);
    }
    function linkedinAnalyzer() {
        const files = [], thumbs = el('div', { class: 'k-thumbs' }), note = el('p', { class: 'muted' }), out = el('div');
        const OK = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'], isPdf = (f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
        const b64 = (f) => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = () => no(new Error('Could not read ' + f.name)); r.readAsDataURL(f); });
        const shrink = (f) => new Promise((ok, no) => {
            const img = new Image(), u = URL.createObjectURL(f);
            img.onload = () => { const k = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u); ok(c.toDataURL('image/jpeg', 0.85).split(',')[1]); };
            img.onerror = () => no(new Error('Could not open ' + f.name)); img.src = u;
        });
        const draw = () => thumbs.replaceChildren(...files.map((f, i) => el('div', { class: 'k-thumb' },
            isPdf(f) ? el('span', { class: 'k-pdf', text: 'PDF: ' + f.name.slice(0, 24) }) : el('img', { src: f.url, alt: 'Profile photo ' + (i + 1) }),
            btn('✕', () => { files.splice(i, 1); draw(); }, 'k-small'))));
        const add = (list) => {
            note.textContent = '';
            for (const f of list) {
                const type = isPdf(f) ? 'application/pdf' : f.type;
                if (!OK.includes(type)) { note.textContent = f.name + ' skipped: use a JPG, PNG or WEBP photo, or a PDF.'; continue; }
                if (f.size > (isPdf(f) ? 6e6 : 12e6)) { note.textContent = f.name + ' skipped: file is too large (PDF max 6 MB, photo max 12 MB).'; continue; }
                if (isPdf(f) && files.some(isPdf)) { note.textContent = 'Only one PDF at a time.'; continue; }
                if (files.length >= 4) { note.textContent = 'Maximum 4 files.'; break; }
                f.url = isPdf(f) ? '' : URL.createObjectURL(f); files.push(f);
            }
            draw();
        };
        const drop = el('label', { class: 'k-drop k-drop-big' }, el('span', { text: 'Upload profile photos (screenshots) or the LinkedIn PDF' }),
            el('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp,application/pdf,.pdf', multiple: true, hidden: true, onchange: (e) => { add([...e.target.files]); e.target.value = ''; } }));
        drop.ondragover = (e) => e.preventDefault();
        drop.ondrop = (e) => { e.preventDefault(); add([...e.dataTransfer.files]); };

        const copy = (text) => btn('Copy', (e) => { navigator.clipboard.writeText(text).then(() => { e.target.textContent = 'Copied'; }).catch(() => { e.target.textContent = 'Copy failed'; }); }, 'k-small');
        const list = (title, arr, mark) => arr.length ? [el('h4', { class: 'subheading', text: title }), ...arr.map((s) => el('p', { text: mark + ' ' + s }))] : [];
        const show = (d, extra) => {
            if (!d.is_profile) { out.replaceChildren(card('This does not look like a LinkedIn profile', hint('Upload screenshots of your own LinkedIn profile page (top section, About, Experience, Skills) or the PDF from Profile > More > Save to PDF.'))); return; }
            out.replaceChildren(card('Profile strength' + (d.name ? ' for ' + d.name : ''), extra ? hint(extra) : null,
                el('div', { class: 'k-result' }, ring(d.score, 'profile score'), hbars(d.categories.map((c) => [c.name, c.score]))),
                ...d.categories.filter((c) => c.note).map((c) => el('p', { class: 'muted', text: c.name + ': ' + c.note })),
                ...list('What is working', d.strengths || [], '✓'), ...list('Improve first', d.improvements || [], '•'),
                d.headline_suggestion ? el('div', { class: 'k-tip' }, el('b', { text: 'Suggested headline' }), el('p', { text: d.headline_suggestion }), copy(d.headline_suggestion)) : null,
                d.about_suggestion ? el('div', { class: 'k-tip' }, el('b', { text: 'Suggested About section' }), el('p', { text: d.about_suggestion }), copy(d.about_suggestion)) : null));
        };
        // used only when the AI is switched off and a PDF was uploaded: a plain keyword check on the PDF text
        const localScan = (text) => {
            const t = text.toLowerCase(), has = (re) => re.test(t) ? 100 : 0, n = (re) => (t.match(re) || []).length;
            const cats = [['About section', Math.min(text.length / 600, 1) * 100], ['Experience & projects', Math.min(n(/\b(intern|project|developer|engineer|built|developed)\b/g) / 4, 1) * 100],
                ['Skills', Math.min(n(/python|java|sql|react|html|css|javascript|excel|git|aws|c\+\+|machine learning|data/g) / 6, 1) * 100], ['Results with numbers', Math.min(n(/\d+\s?%|\d+\+|\b\d{2,}\b/g) / 3, 1) * 100],
                ['Education', has(/education|b\.?tech|b\.?e\b|bca|mca|bsc|university|college/)], ['Open to work / goal', has(/open to|seeking|looking for|internship/)], ['Certifications & links', has(/certif|github\.com|coursera|nptel|udemy/)]];
            const score = cats.reduce((s, c) => s + c[1], 0) / cats.length;
            return { is_profile: true, score, categories: cats.map(([name, s]) => ({ name, score: s, note: '' })), strengths: [], improvements: cats.filter((c) => c[1] < 60).map((c) => c[0] + ': add more detail here.') };
        };
        const go = btn('Analyze my profile', async (e) => {
            if (!files.length) { note.textContent = 'Add at least one photo or the PDF first.'; return; }
            e.target.disabled = true; note.textContent = 'Reading your profile... this can take up to a minute.'; out.replaceChildren();
            try {
                const payload = await Promise.all(files.map(async (f) => isPdf(f) ? { mime: 'application/pdf', data: await b64(f) } : { mime: 'image/jpeg', data: await shrink(f) }));
                show(await api.post('/linkedin/analyze', { files: payload })); note.textContent = '';
            } catch (err) {
                const pdf = files.find(isPdf);
                if (err.status === 503 && pdf) {
                    try { show(localScan(await readFile(pdf)), 'AI is offline, so this is a basic keyword check of your PDF. Photos need the AI.'); note.textContent = ''; } catch (e2) { note.textContent = e2.message; }
                } else note.textContent = err.message;
            }
            e.target.disabled = false;
        }, 'primary');
        return el('div', {}, card('Profile analyzer (photo or PDF)', hint('Upload up to 4 clear screenshots or photos of your LinkedIn profile (top section, About, Experience, Skills), or the PDF from Profile > More > Save to PDF. Files are sent to the AI only to read this profile and are not stored.'),
            drop, thumbs, note, go), out);
    }
    function viewLinkedin(root) {
        root.append(el('div', { class: 'k-split even' },
            card('Tips and tricks', ...LI_TIPS.map(([h, t]) => el('div', { class: 'k-tip' }, el('b', { text: h }), el('p', { text: t })))),
            el('div', {}, linkedinBuilder(), linkedinAnalyzer())));
    }

    function voiceBox(question) {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition, ta = area('Speak or type your answer, then ask the mentor for feedback', 3), fb = el('p', { class: 'k-answer' });
        const mic = SR ? btn('🎤 Speak', () => { const r = new SR(); r.lang = 'en-IN'; r.onresult = (ev) => { ta.value = ev.results[0][0].transcript; }; r.start(); }) : null;
        return el('div', {}, ta, el('div', { class: 'k-toolbar', style: 'margin-top:8px' }, mic, btn('Get mentor feedback', async (e) => {
            if (!ta.value.trim()) return; e.target.disabled = true; fb.textContent = 'Mentor is reading your answer...';
            try { fb.textContent = (await api.post('/mentor', { question: ('[Interview prep] Question: ' + question + ' My answer: ' + ta.value + ' Give feedback and a better answer.').slice(0, 500) })).reply; } catch (err) { fb.textContent = err.message; }
            e.target.disabled = false; }, 'primary')), fb);
    }
    function viewInterview(root) {
        const topics = Object.keys(SM_IV); let on = topics[0], mock = null;
        const tabs = el('div', { class: 'tabs' }), body = el('div');
        const paint = () => {
            [...tabs.children].forEach((b) => b.classList.toggle('active', b.textContent === on)); body.replaceChildren();
            if (mock) { body.append(...mockCard()); return; }
            body.append(el('div', { class: 'k-toolbar' }, btn('Start mock interview (random 5)', () => { mock = { qs: shuffle(SM_IV[on].slice()).slice(0, 5), i: 0, known: 0, shown: false }; mentorCtx.section = 'Interview prep'; paint(); }, 'primary'),
                btn('Download ' + on + ' Q&A', () => download(on + '-interview.md', SM_IV[on].map(([q, a], i) => '## ' + (i + 1) + '. ' + q + '\n' + a).join('\n\n')))),
                ...SM_IV[on].map(([q, a], i) => el('details', { class: 'panel k-qa', open: i === 0 }, el('summary', { text: (i + 1) + '. ' + q }), el('p', { text: a }))));
        };
        const mockCard = () => {
            if (mock.i >= mock.qs.length) { const pct = mock.known / mock.qs.length * 100; return [card('Mock interview result', el('div', { class: 'k-result' }, ring(pct, mock.known + ' of ' + mock.qs.length + ' confident'), el('p', { text: pct >= 60 ? 'Good. Revise the ones you missed and try again.' : 'Read the answers once more, then retry a new random set.' })), btn('Back to questions', () => { mock = null; paint(); }, 'primary'))]; }
            const [q, a] = mock.qs[mock.i];
            return [card('Question ' + (mock.i + 1) + ' of ' + mock.qs.length, el('h3', { text: q }), hint('Answer out loud first, then reveal.'),
                voiceBox(q), mock.shown ? el('p', { class: 'k-answer', text: a }) : btn('Reveal answer', () => { mock.shown = true; paint(); }, 'primary'),
                mock.shown ? el('div', { class: 'k-toolbar' }, btn('I knew it', () => { mock.known++; mock.i++; mock.shown = false; paint(); }), btn('Need revision', () => { mock.i++; mock.shown = false; paint(); })) : null)];
        };
        topics.forEach((t) => tabs.append(el('button', { class: 'tab', type: 'button', text: t, onclick: () => { on = t; mock = null; paint(); } })));
        root.append(tabs, body); paint();
    }

    function viewNotes(root) {
        const names = Object.keys(SM_NOTES); let on = names[0];
        const tabs = el('div', { class: 'tabs' }), ta = area('Your notes', 20), key = () => 'sm_note_' + on.toLowerCase().replace(/\W+/g, '_');
        const load = () => { ta.value = store.get(key(), null) ?? SM_NOTES[on]; [...tabs.children].forEach((b) => b.classList.toggle('active', b.textContent === on)); };
        ta.oninput = () => store.set(key(), ta.value);
        names.forEach((n) => tabs.append(el('button', { class: 'tab', type: 'button', text: n, onclick: () => { on = n; load(); } })));
        const note = el('p', { class: 'muted', text: 'Edits save automatically in this browser.' });
        root.append(card('Study notes', hint('Ready-made notes for languages, DSA, CS basics, web, data science, aptitude and interviews. Edit them, add your own, upload a file, or download.'), tabs, ta,
            el('div', { class: 'k-toolbar' }, btn('Download .md', () => download(on.replace(/\W+/g, '-') + '-notes.md', ta.value), 'primary'), uploader(ta, note), btn('Reset to original', () => { store.del(key()); load(); }))), note);
        load();
    }

    function viewMarket(root) {
        Promise.all([api.get('/market'), api.get('/internships')]).then(([m, { internships }]) => {
            const mine = [...SM.state.profile.skills.map((x) => x.name.toLowerCase())], has = (n) => mine.some((k) => n.toLowerCase().includes(k) || k.includes(n.toLowerCase().split(/[ /]/)[0]));
            const snap = m.snapshot, live = m.live, tierPct = [0, 40, 70, 100];
            const need = snap.skills.filter((x) => !has(x.skill) && x.tier >= 2).slice(0, 5).map((x) => x.skill);
            const demand = {}; internships.forEach((i) => i.required_skills.forEach((r) => { demand[r.skill] = (demand[r.skill] || 0) + r.weight; }));
            const roles = internships.map((i) => { let got = 0, tot = 0; i.required_skills.forEach((r) => { const need2 = LEVELS.indexOf(r.required_level) + 1, k = r.skill.toLowerCase(), mineLvl = SM.state.profile.skills.find((x) => x.name.toLowerCase() === k); const have = mineLvl ? LEVELS.indexOf(mineLvl.level) + 1 : 0; tot += r.weight; got += r.weight * Math.min(have / need2, 1); }); return [i.title, tot ? got / tot * 100 : 0]; }).sort((p, q) => q[1] - p[1]);
            const owned = snap.skills.filter((x) => has(x.skill)).length;
            root.append(el('div', { class: 'k-stats' }, ...[['Skills tracked', snap.skills.length], ['You already cover', owned + ' of ' + snap.skills.length], ['Live jobs read', live ? live.total_jobs : 'offline'], ['Learn next', need[0] || 'nothing urgent']].map(([l, v]) => el('div', { class: 'panel k-stat' }, el('small', { text: l }), el('h2', { text: String(v) })))),
                el('div', { class: 'k-split even' },
                    card('Skills companies ask for', hint(snap.note + ' Updated ' + snap.updated + '.'), hbars(snap.skills.map((x) => [x.skill + (has(x.skill) ? ' ✓' : '') + (x.trend === 'rising' ? ' ↑' : ''), tierPct[x.tier], ['', 'Nice to have', 'Often asked', 'Must have'][x.tier]]))),
                    el('div', {}, card('Live job feed', live ? el('div', {}, hint('Counted from ' + live.total_jobs + ' real remote software jobs (' + live.source + '), fetched ' + live.fetched_at + '.'), hbars(live.skills.map(([n, c]) => [n + (has(n) ? ' ✓' : ''), c / live.skills[0][1] * 100, c + ' jobs']))) : hint('The live feed could not be reached right now. The curated snapshot still works.')),
                        card('What you should learn next', ...(need.length ? need.map((n, i) => el('p', { text: (i + 1) + '. ' + n })) : [hint('You cover the high-demand skills. Deepen them with projects.')])))),
                el('div', { class: 'k-split even' },
                    card('AI internship checklist', ...snap.ai_internship.map((x) => el('div', { class: 'k-tip' }, el('b', { text: (has(x.skill) ? '✓ ' : '○ ') + x.skill }), el('p', { text: x.why })))),
                    card('Emerging technologies', el('div', { class: 'chips' }, ...snap.emerging.map((t) => el('span', { class: 'chip', text: t }))))),
                card('Role readiness (your skills vs roles on this platform)', hbars(roles)));
        }).catch((e) => root.append(card('', hint('Could not load market data: ' + e.message))));
    }

    function viewTracker(root) {
        const STAT = ['Wishlist', 'Applied', 'Interview', 'Offer', 'Rejected']; let list = store.get('sm_apps', []);
        const co = input('Company'), role = input('Role'), link = input('Job link (optional)'), st = el('select', {}, ...STAT.map((x) => el('option', { text: x, selected: x === 'Applied' }))), body = el('div'), chart = el('div');
        const save = () => { store.set('sm_apps', list); paint(); };
        function paint() {
            chart.replaceChildren(hbars(STAT.map((x) => [x, list.length ? list.filter((a) => a.s === x).length / list.length * 100 : 0, String(list.filter((a) => a.s === x).length)])));
            body.replaceChildren(...list.map((a, i) => el('div', { class: 'panel k-card', style: 'display:flex;gap:12px;align-items:center;flex-wrap:wrap' }, el('div', { style: 'flex:1;min-width:180px' }, el('b', { text: a.c }), el('p', { class: 'muted', text: a.r + '  ·  ' + a.d })),
                el('select', { onchange: (e) => { a.s = e.target.value; save(); } }, ...STAT.map((x) => el('option', { text: x, selected: x === a.s }))), btn('Remove', () => { list.splice(i, 1); save(); }, 'k-small'))));
        }
        root.append(card('Application tracker', hint('Keep every application in one place. Saved in this browser.'), el('div', { class: 'k-grid' }, field('Company', co), field('Role', role), field('Link', link), field('Status', st)),
            el('div', { class: 'k-toolbar' }, btn('Add application', () => { if (!co.value.trim()) return; list.unshift({ c: co.value.trim(), r: role.value.trim() || 'Role', l: link.value.trim(), s: st.value, d: new Date().toLocaleDateString() }); co.value = role.value = link.value = ''; save(); }, 'primary'),
                btn('Download CSV', () => download('applications.csv', 'Company,Role,Status,Date,Link\n' + list.map((a) => [a.c, a.r, a.s, a.d, a.l].map((x) => '"' + String(x).replace(/"/g, '""') + '"').join(',')).join('\n'))))), card('Pipeline', chart), body);
        paint();
    }

    const genBlock = (title, text) => el('div', { class: 'k-gen' }, el('div', { class: 'k-gen-head' }, el('b', { text: title }), btn('Copy', (e) => { navigator.clipboard && navigator.clipboard.writeText(text); e.target.textContent = 'Copied ✓'; setTimeout(() => { e.target.textContent = 'Copy'; }, 1200); }, 'k-small')), el('p', { text }));

    function viewSimulator(root) {
        const sel = el('select'), out = el('div'), msg = el('p', { class: 'muted' }), skillIn = el('input', { type: 'text', list: 'sim-skills', placeholder: 'e.g. JavaScript' }), lvl = el('select', {}, ...LEVELS.map((l, i) => el('option', { value: i + 1, text: l, selected: i === 1 })));
        const payload = (extra) => ({ internship_id: sel.value, skills: SM.state.profile.skills.map((s) => ({ name: s.name, level: s.level })), ...extra });
        api.get('/internships').then(({ internships }) => {
            internships.forEach((i) => sel.append(el('option', { value: i.id, text: i.title })));
            const names = [...new Set(internships.flatMap((i) => i.required_skills.map((r) => r.skill)))];
            root.append(el('datalist', { id: 'sim-skills' }, ...names.map((n) => el('option', { value: n }))));
            const byId = Object.fromEntries(internships.map((i) => [i.id, i]));
            root.append(card('What if I learn one more skill?', hint('Pick a target role and a skill. You see how your match percentage would change, using the same formula as your analysis. Your verified test levels are not changed here.'), el('div', { class: 'k-grid' }, field('Target role', sel), field('Skill to learn', skillIn), field('At level', lvl)),
                el('div', { class: 'k-toolbar' }, btn('Simulate', async () => {
                    msg.textContent = ''; if (!skillIn.value.trim()) { msg.textContent = 'Type a skill first.'; return; }
                    try { const d = await api.post('/simulate', payload({ add: { name: skillIn.value.trim(), level: +lvl.value } }));
                        out.replaceChildren(card('Result for ' + d.target, el('div', { class: 'k-result' }, ring(d.after, 'after learning ' + d.skill), hbars([['Now', d.before], ['After ' + d.skill + ' (' + d.level + ')', d.after]]), el('p', { text: d.gain > 0 ? 'Gain: +' + d.gain + ' percentage points.' : 'No gain: this role does not ask for that skill, or you already have it at that level.' })))); } catch (err) { msg.textContent = err.message; }
                }, 'primary'), btn('Find my biggest jump', async () => {
                    msg.textContent = 'Checking every missing skill...';
                    try { const need = [...new Set(byId[sel.value].required_skills.map((r) => r.skill))], mine = new Set(SM.state.profile.skills.map((s) => s.name.toLowerCase()));
                        const res = await Promise.all(need.filter((n) => !mine.has(n.toLowerCase())).slice(0, 8).map((n) => api.post('/simulate', payload({ add: { name: n, level: 2 } }))));
                        res.sort((a, b) => b.gain - a.gain); msg.textContent = '';
                        out.replaceChildren(card('Skills ranked by match gain (at Intermediate)', res.length ? hbars(res.map((d) => [d.skill, d.after, '+' + d.gain])) : hint('You already have every required skill for this role.'))); } catch (err) { msg.textContent = err.message; }
                })), msg), out);
        }).catch((e) => root.append(card('', hint(e.message))));
    }

    function viewCompany(root) {
        const names = Object.keys(SM_COMPANY); let on = names[0]; const tabs = el('div', { class: 'tabs' }), body = el('div');
        const paint = () => { const c = SM_COMPANY[on]; [...tabs.children].forEach((b) => b.classList.toggle('active', b.textContent === on));
            body.replaceChildren(card(on, hint('General patterns seen across companies of this type, not official hiring rules. Always read the actual job post.'), el('h4', { class: 'subheading', text: 'Skills to have' }), el('div', { class: 'chips' }, ...c.skills.map((x) => el('span', { class: 'chip', text: x }))),
                el('h4', { class: 'subheading', text: 'Usual selection process' }), el('p', { text: c.pattern }), el('h4', { class: 'subheading', text: 'What interviewers look for' }), el('p', { text: c.focus }),
                el('h4', { class: 'subheading', text: '4-week plan' }), ...c.plan.map((p) => el('p', { text: '• ' + p })),
                el('div', { class: 'k-toolbar' }, ...c.langs.map((l) => btn('Take ' + l + ' test', () => { location.hash = '#skilltest'; }, 'primary')), btn('Interview questions', () => { location.hash = '#interview'; })))); };
        names.forEach((n) => tabs.append(el('button', { class: 'tab', type: 'button', text: n.split(' (')[0], onclick: () => { on = n; paint(); } })));
        tabs.querySelectorAll('button').forEach((b, i) => { b.dataset.n = names[i]; }); root.append(tabs, body);
        tabs.addEventListener('click', () => { [...tabs.children].forEach((b) => b.classList.toggle('active', b.dataset.n === on)); }); paint(); [...tabs.children][0].classList.add('active');
    }

    function viewCover(root) {
        const res = store.get('sm_resume', null), saved = store.get('sm_cover', {}), f = {};
        const inp = (k, label, ph, val) => { f[k] = saved[k] || val || ''; return field(label, el('input', { type: 'text', placeholder: ph, value: f[k], oninput: (e) => { f[k] = e.target.value.trim(); saved[k] = f[k]; store.set('sm_cover', saved); } })); };
        const out = el('div'), name = SM.state.user.full_name, first = name.split(' ')[0];
        const proj = res && res.proj[0] && res.proj[0][0] ? res.proj[0][0] + (res.proj[0][3] ? ': ' + res.proj[0][3] : '') : '';
        const form = [inp('company', 'Company', 'Acme Technologies'), inp('role', 'Role', 'Data Analyst Intern'), inp('person', 'Hiring manager / recruiter (optional)', 'Ms. Sharma'), inp('why', 'Why this company (one real reason)', 'I use your app every day and noticed...'), inp('proj', 'Your best project and result', 'Expense Tracker: 150 users', proj),
            inp('skills', 'Your key skills', 'Python, SQL', SM.state.profile.skills.map((s) => s.name).join(', '))];
        root.append(card('Cover letter, cold email and referral request', hint('Fill the facts once. You get three ready messages to edit. Keep the real reason for the company, that is what makes it read as yours.'), el('div', { class: 'k-grid' }, ...form),
            btn('Write my messages', () => {
                const c = f.company || 'your company', r = f.role || 'the role', hi = f.person ? 'Dear ' + f.person + ',' : 'Dear Hiring Team,', sk = (f.skills || '').split(',').slice(0, 3).join(', ');
                out.replaceChildren(genBlock('Cover letter', hi + '\n\nI am writing to apply for the ' + r + ' position at ' + c + '. ' + (f.why ? f.why + '\n\n' : '\n') + (f.proj ? 'Recently I built ' + f.proj + '. This taught me to ' + 'plan, build and test something real with ' + (sk || 'my core tools') + '.\n\n' : '') + 'I would value the chance to contribute and learn from your team. My resume is attached, and I am happy to do a short task or call.\n\nThank you for your time.\n' + name),
                    genBlock('Cold email to a recruiter', 'Subject: ' + r + ' application: ' + name + '\n\nHello' + (f.person ? ' ' + f.person : '') + ',\n\nI am ' + name + ', a ' + (SM.state.profile.course || 'student') + '. I am applying for the ' + r + ' role at ' + c + '. ' + (f.proj ? 'I built ' + f.proj + '. ' : '') + 'My strongest skills are ' + (sk || 'listed in my resume') + '. Resume attached. Could you tell me if there is a next step I should take?\n\nThanks,\n' + first),
                    genBlock('Referral request to someone at the company', 'Hi, I am ' + name + ', a ' + (SM.state.profile.course || 'student') + '. I saw an opening for ' + r + ' at ' + c + ' and my skills in ' + (sk || 'this area') + ' match it. ' + (f.proj ? 'I recently built ' + f.proj + '. ' : '') + 'If you feel I am a good fit, could you please refer me? I will send my resume and a short note you can forward. Thank you for considering it.'));
            }, 'primary')), out);
    }

    function viewPrivacy(root) {
        const msg = el('p', { class: 'muted' }), pw = el('input', { type: 'password', placeholder: 'Your password' });
        root.append(card('Your data', hint('We store your account (name, email), your skills and analyses, roadmaps, test results and the notes, resume and tracker you save. LinkedIn photos or PDFs you upload for analysis are sent to the AI service to be read and are not stored. Test question papers expire in use and are never shared. Your name appears on the leaderboard only as a first name and initial.'),
            el('div', { class: 'k-toolbar' }, btn('Export all my data (.json)', async () => { try { download('my-skillmatrix-data.json', JSON.stringify(await api.get('/account/export'), null, 2)); msg.textContent = 'Downloaded.'; } catch (e) { msg.textContent = e.message; } }, 'primary'))),
            card('Delete my account', hint('This permanently removes your account and everything saved. It cannot be undone. Export first if you want a copy.'), field('Confirm with password', pw),
                btn('Delete my account', async () => { if (!pw.value) { msg.textContent = 'Enter your password first.'; return; } if (!confirm('Delete your account and all data permanently?')) return;
                    try { await api.del('/account', { password: pw.value }); SM.auth.clear(); localStorage.clear(); location.href = 'index.html'; } catch (e) { msg.textContent = e.message; } })), msg);
    }

    function practiceCard() {
        const box = el('div'), msg = el('p', { class: 'muted' });
        const open = async () => {
            msg.textContent = '';
            try {
                const d = await api.get('/practice/daily'); if (d.done) { box.replaceChildren(hint('You finished today\'s practice. Come back tomorrow.')); return; }
                const picks = [];
                box.replaceChildren(hint(d.from_weak ? d.from_weak + ' of these come from questions you missed before.' : 'Random mix. Missed questions will show up here next time.'), ...d.questions.map((q, n) => el('div', { class: 'k-q' }, el('p', { text: q.n + '. ' + q.q }), q.code ? el('pre', { text: q.code }) : null,
                    ...q.options.map((o, oi) => el('label', {}, el('input', { type: 'radio', name: 'pq' + n, onchange: () => { picks[n] = oi; } }), ' ' + o)))),
                    btn('Check answers', async () => { try { const r = await api.post('/practice/check', { answers: d.questions.map((_, i) => (picks[i] === undefined ? null : picks[i])) });
                        box.replaceChildren(el('h3', { text: 'Score ' + r.score + ' / ' + r.total }), ...r.review.map((x) => el('p', { class: x.ok ? '' : 'muted', text: (x.ok ? '✓ ' : '✗ ') + x.q + ' → ' + x.answer + '. ' + x.why }))); } catch (e) { msg.textContent = e.message; } }, 'primary'));
            } catch (e) { msg.textContent = e.message; }
        };
        return card('Daily practice', hint('5 questions a day, picked from topics you got wrong. Answer them right and they leave your weak list.'), btn('Start today\'s practice', open, 'primary'), msg, box);
    }
    function qualityCard() {
        const box = el('div');
        return card('Question health', hint('Questions that students almost always get right or wrong, so the bank can be tuned. Needs at least 5 attempts per question.'), btn('Show', async () => { try { const d = await api.get('/assessment/quality'); box.replaceChildren(d.questions.length ? hbars(d.questions.filter((x) => x.flag).slice(0, 10).map((x) => [x.q.slice(0, 60) + ' (' + x.flag + ')', x.correct_pct, x.correct_pct + '% correct'])) : hint('Not enough attempts yet.')); } catch (e) { box.textContent = e.message; } }), box);
    }

    const VIEWS = { skilltest: ['Skill Test', viewTest], resume: ['Resume builder', viewResume], ats: ['ATS checker', viewAts], linkedin: ['LinkedIn', viewLinkedin], interview: ['Interview prep', viewInterview], notes: ['Notes', viewNotes], market: ['Job market', viewMarket], tracker: ['Application tracker', viewTracker], simulator: ['Skill simulator', viewSimulator], company: ['Company prep', viewCompany], cover: ['Cover letter', viewCover], privacy: ['Privacy', viewPrivacy] };
    function route() {
        const id = location.hash.slice(1), v = VIEWS[id]; mentorCtx.section = v ? v[0] : (id || 'Dashboard');
        const root = v && $('v-' + id); if (root && !root.dataset.ok) { root.dataset.ok = 1; try { v[1](root); } catch (e) { root.append(el('p', { class: 'muted', text: 'Something went wrong: ' + e.message })); } }
    }
    function floatingMentor() {
        const log = el('div', { class: 'fm-log' }), q = input('Ask about this section...'), panel = el('div', { class: 'fm-panel', hidden: true },
            el('div', { class: 'fm-head' }, el('b', { text: 'AI Mentor' }), btn('✕', () => { panel.hidden = true; }, 'k-small')), log,
            el('form', { class: 'fm-form', onsubmit: async (e) => {
                e.preventDefault(); const text = q.value.trim(); if (!text) return; q.value = '';
                log.append(el('p', { class: 'fm-me', text })); const bot = el('p', { class: 'fm-bot', text: 'Thinking...' }); log.append(bot); log.scrollTop = log.scrollHeight;
                try { const r = await api.post('/mentor', { question: ('[' + mentorCtx.section + '] ' + text).slice(0, 500) }); bot.textContent = r.reply; } catch (err) { bot.textContent = err.message; }
                log.scrollTop = log.scrollHeight;
            } }, q, btn('Send', null, 'primary')));
        panel.querySelector('form button').type = 'submit';
        document.body.append(panel, el('button', { class: 'fm-fab', type: 'button', title: 'Ask the AI mentor', text: '✦', onclick: () => { panel.hidden = !panel.hidden; if (!panel.hidden) { log.children.length || log.append(el('p', { class: 'fm-bot', text: 'Hi! Ask me anything about ' + mentorCtx.section + ', explain a concept, or tell me where you are stuck.' })); q.focus(); } } }));
    }
    floatingMentor();
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
    window.addEventListener('hashchange', route);
    const wait = setInterval(() => { if (SM.state && SM.state.user && SM.state.profile) { clearInterval(wait); SM.sync.ready.then(route); } }, 200);
})();
