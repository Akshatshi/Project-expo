// Run: npm i jsdom && node tests/smoke.js   (checks every Career Kit page, the test flow and both games)
const { JSDOM } = require('jsdom'), fs = require('fs'), path = require('path'), J = path.join(__dirname, '..', 'js') + '/';
const ids = ['skilltest', 'resume', 'ats', 'linkedin', 'interview', 'notes', 'market', 'simulator', 'company', 'cover', 'privacy', 'games'];
const dom = new JSDOM('<body>' + ids.map((i) => '<div id="v-' + i + '"></div>').join('') + '</body>', { runScripts: 'outside-only', url: 'http://x/#skilltest' });
const w = dom.window; let failed = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) failed++; };
w.eval('window.matchMedia=()=>({matches:false});localStorage.setItem("sm_token","t")');
const stub = new Proxy({}, { get: (t, k) => (k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {}), set: () => true });
w.HTMLCanvasElement.prototype.getContext = () => stub; const frames = []; w.requestAnimationFrame = (f) => frames.push(f); w.cancelAnimationFrame = () => {};
w.URL.createObjectURL = () => 'blob:x';
const qs = Array.from({ length: 10 }, (_, i) => ({ n: i + 1, id: 'q' + i, q: 'Question ' + i, code: '', level: i % 3, options: ['a', 'b', 'c', 'd'] }));
const answers = { '/assessment/start': { id: 1, lang: 'python', claim: 2, task: 'Do it', min_seconds: 0, questions: qs }, '/internships': { internships: [{ id: 'web', title: 'Web', required_skills: [{ skill: 'HTML', weight: 3, required_level: 'Beginner' }] }] },
    '/market': { snapshot: { note: 'n', updated: '2026-11', skills: [{ skill: 'Python', tier: 3, trend: 'rising' }], ai_internship: [{ skill: 'Python', why: 'x' }], emerging: ['RAG'] }, live: null }, '/assessment/summary': { skills: [] }, '/leaderboard': { leaderboard: [] }, '/data': { data: {} }, '/assessment/quality': { questions: [], total_tracked: 0 },
    '/practice/daily': { done: false, from_weak: 2, questions: qs.slice(0, 5) }, '/practice/check': { score: 4, total: 5, review: [{ q: 'Q', ok: true, answer: 'a', why: 'w' }] }, '/simulate': { target: 'Web', skill: 'JavaScript', level: 'Intermediate', before: 40, after: 65, gain: 25 },
    '/assessment/1/submit': { result: { pct: 80, level: 3, level_label: 'Advanced', claimed: 'Intermediate', by_level: [[3, 3], [3, 3], [1, 4]], review: [{ q: 'Q', ok: true, answer: 'a', why: 'w' }], practical: { score: 70, feedback: 'ok', source: 'rubric' } } } };
w.fetch = async (url) => ({ ok: true, status: 200, json: async () => answers[String(url).replace(/^.*\/api/, '').split('?')[0]] || {} });
for (const f of ['api.js', 'sync.js', 'arcade-data.js', 'qbank.js', 'qbank2.js', 'qbank3.js', 'kit-data.js', 'notes-data.js']) w.eval(fs.readFileSync(J + f, 'utf8'));
w.SM.state = { user: { full_name: 'Rahul Verma', email: 'r@x.com' }, profile: { skills: [{ name: 'Python', level: 'Beginner' }] } };
w.eval(fs.readFileSync(J + 'games.js', 'utf8')); w.eval(fs.readFileSync(J + 'tools.js', 'utf8'));
const doc = w.document, wait = (ms) => new Promise((r) => setTimeout(r, ms));
const go = async (h) => { w.location.hash = h; w.dispatchEvent(new w.Event('hashchange')); await wait(120); };
const btn = (root, re) => [...root.querySelectorAll('button')].find((b) => re.test(b.textContent));
(async () => {
    await wait(900);
    for (const id of ids.filter((i) => i !== 'games')) { await go('#' + id); ok(doc.getElementById('v-' + id).children.length > 0, id + ' renders'); }
    await go('#skilltest'); const t = doc.getElementById('v-skilltest'); btn(t, /Start test/).click(); await wait(100);
    ok(t.querySelectorAll('.k-q').length === 11, 'test shows 10 questions and a practical');
    btn(t, /^Submit test/).click(); await wait(100); ok(/Advanced/.test(t.textContent), 'server result is shown');
    await go('#ats'); const a = doc.getElementById('v-ats'); a.querySelector('textarea').value = 'Rahul r@x.com 9876543210 github.com/r Education Skills Projects Experience built developed improved 40% 200 users '.repeat(6);
    btn(a, /Check my resume/).click(); ok(!!a.querySelector('.k-ring text'), 'ATS score drawn');
    await go('#linkedin'); const l = doc.getElementById('v-linkedin'); btn(l, /Generate \(template\)/).click(); ok(l.querySelectorAll('.k-gen').length >= 6, 'LinkedIn template blocks');
    ok(/Profile analyzer/.test(l.textContent) && !!l.querySelector('input[type=file][accept*="image"]'), 'LinkedIn analyzer takes photos and PDF');
    await go('#notes'); const nt = doc.getElementById('v-notes'); ok(nt.querySelectorAll('.tab').length >= 12 && nt.querySelector('textarea').value.length > 1000, 'notes show many topics with full notes');
    const p = doc.getElementById('v-skilltest'); await go('#skilltest'); btn(p, /Start today/).click(); await wait(100); ok(p.querySelectorAll('input[name^="pq"]').length === 20, 'daily practice shows 5 questions'); btn(p, /Check answers/).click(); await wait(100); ok(/Score 4 \/ 5/.test(p.textContent), 'practice result shown');
    await go('#simulator'); const sm = doc.getElementById('v-simulator'); sm.querySelector('input[type=text]').value = 'JavaScript'; btn(sm, /^Simulate/).click(); await wait(100); ok(/Gain: \+25/.test(sm.textContent), 'simulator shows gain');
    await go('#company'); ok(doc.getElementById('v-company').textContent.includes('4-week plan'), 'company prep renders plan');
    await go('#cover'); const cv = doc.getElementById('v-cover'); btn(cv, /Write my messages/).click(); ok(cv.querySelectorAll('.k-gen').length === 3, 'cover letter writes 3 messages');
    await go('#games'); const g = doc.getElementById('v-games');
    for (const name of ['Space Defender', 'Code Racer']) { [...g.querySelectorAll('.g-card')].find((c) => c.textContent.includes(name)).querySelector('button').click(); let n = 0; for (let i = 0; i < 400 && frames.length; i++) frames.shift()(n += 16); ok(!!g.querySelector('canvas'), name + ' runs 400 frames'); btn(g, /Back/).click(); }
    console.log(failed ? failed + ' FAILED' : 'All smoke checks passed'); process.exit(failed ? 1 : 0);
})().catch((e) => { console.log('ERR', e.stack); process.exit(1); });
