(function () {
    const L = { python: 0, javascript: 1, java: 2, cpp: 3 };
    const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1)), P = (l) => l[R(0, l.length - 1)], sh = (a) => a.slice().sort(() => Math.random() - 0.5);
    function mk(q, code, right, cands, why) {
        right = String(right); const w = [];
        cands.map(String).forEach((c) => { if (c !== right && !w.includes(c)) w.push(c); });
        const n = Number(right);
        for (let d = 1; w.length < 3 && right !== '' && !isNaN(n) && d < 30; d++) [n + d, n - d].forEach((v) => { if (w.length < 3 && String(v) !== right && !w.includes(String(v))) w.push(String(v)); });
        ['Error', 'undefined', 'None', 'null'].forEach((c) => { if (w.length < 3 && c !== right && !w.includes(c)) w.push(c); });
        return { type: 'mcq', q, code, options: [right, ...w.slice(0, 3)], why };
    }
    const near = (v) => [v + 1, v - 1, v + 2, v * 2, v - 3, v + 10];
    const OUT = (l, e) => [`print(${e})`, `console.log(${e})`, `System.out.println(${e});`, `cout << ${e};`][l];

    const K = {
        arith(l, t) {
            const ops = l === 0 ? ['+', '-', '*', '%', '//'] : l === 1 ? ['+', '-', '*', '%'] : ['+', '-', '*', '%', '/'];
            const steps = [1, 2, 2, 3, 4][t], mx = [9, 12, 20, 30, 40][t]; let val = R(2, mx), s = 'x'; const first = val, tr = ['x = ' + val];
            for (let i = 0; i < steps; i++) for (let k = 0; k < 40; k++) {
                const op = P(ops), b = ['%', '//', '/'].includes(op) ? R(2, 9) : R(2, Math.min(mx, 12));
                const nv = op === '+' ? val + b : op === '-' ? val - b : op === '*' ? val * b : op === '%' ? val % b : Math.floor(val / b);
                if (nv < 0 || nv > 9999) continue; s = '(' + s + ' ' + op + ' ' + b + ')'; tr.push(op + ' ' + b + ' gives ' + nv); val = nv; break;
            }
            const e = s.startsWith('(') ? s.slice(1, -1) : s, decl = ['x = ' + first, 'let x = ' + first, 'int x = ' + first + ';', 'int x = ' + first + ';'][l];
            return mk('What does this print?', decl + '\n' + OUT(l, e), val, near(val), 'Work from the left: ' + tr.join(', ') + '.');
        },
        loop(l, t) {
            const N = R(4, [8, 10, 14, 20, 30][t]), Kk = R(2, [4, 5, 7, 9, 12][t]), st = t < 2 ? 1 : t < 3 ? 2 : 3; let v = 0; for (let i = 0; i < N; i += st) v += i * Kk;
            const code = [`total = 0\nfor i in range(0, ${N}, ${st}):\n    total += i * ${Kk}\nprint(total)`, `let total = 0\nfor (let i = 0; i < ${N}; i += ${st}) total += i * ${Kk}\nconsole.log(total)`,
                `int total = 0;\nfor (int i = 0; i < ${N}; i += ${st}) total += i * ${Kk};\nSystem.out.println(total);`, `int total = 0;\nfor (int i = 0; i < ${N}; i += ${st}) total += i * ${Kk};\ncout << total;`][l];
            return mk('What does this print?', code, v, near(v).concat([v - Kk, v + Kk]), 'i takes the values 0, ' + st + ', ' + 2 * st + '... below ' + N + ', and each is multiplied by ' + Kk + ' and added.');
        },
        str(l, t) {
            const w = P(['python', 'coding', 'matrix', 'kernel', 'buffer', 'syntax', 'module', 'socket', 'branch', 'commit', 'object', 'string']), i = R(0, 4), a = R(0, 2), b = R(a + 2, 6);
            const kinds = [['len', w.length, near(w.length), 'Count the letters.'], ['idx', w[i], [w[i + 1], w[i - 1] || 'p', w[0], w[w.length - 1]], 'Indexes start at 0.']];
            if (t >= 2) kinds.push(['slice', w.slice(a, b), [w.slice(a + 1, b), w.slice(a, b + 1), w.slice(a, b - 1), w.slice(a - 1 < 0 ? 0 : a - 1, b)], 'Start index is included, end index is not.']);
            if (t >= 2 && l < 3) kinds.push(['up', w.toUpperCase(), [w, w[0].toUpperCase() + w.slice(1), w.toUpperCase().slice(0, 3), w.slice(0, 3).toUpperCase() + w.slice(3)], 'Every letter becomes capital.']);
            if (t >= 3 && l < 2) kinds.push(['rev', [...w].reverse().join(''), [w, w.slice(1), [...w].sort().join(''), [...w].reverse().join('').slice(1)], 'The text is reversed.']);
            const [kd, val, c, why] = P(kinds);
            const ex = { len: ['len(s)', 's.length', 's.length()', 's.length()'], idx: [`s[${i}]`, `s[${i}]`, `s.charAt(${i})`, `s[${i}]`], slice: [`s[${a}:${b}]`, `s.slice(${a}, ${b})`, `s.substring(${a}, ${b})`, `s.substr(${a}, ${b - a})`],
                up: ['s.upper()', 's.toUpperCase()', 's.toUpperCase()', ''], rev: ['s[::-1]', '[...s].reverse().join("")', '', ''] }[kd][l];
            const decl = [`s = "${w}"`, `const s = "${w}"`, `String s = "${w}";`, `string s = "${w}";`][l];
            return mk('What does this print?', decl + '\n' + OUT(l, ex), val, c, why);
        },
        arr(l, t) {
            const n = R(3, 4 + t), mx = [9, 20, 30, 50, 90][t], a = Array.from({ length: n }, () => R(1, mx)), i = R(0, n - 1), body = a.join(', ');
            const decl = [`nums = [${body}]`, `const nums = [${body}]`, `int[] nums = {${body}};`, `vector<int> nums = {${body}};`][l];
            const ops = [['nums[' + i + ']', a[i], a.filter((x) => x !== a[i]).concat([a[0], a[n - 1]]), 'Indexes start at 0.'], [['len(nums)', 'nums.length', 'nums.length', 'nums.size()'][l], n, near(n), 'Count the items.'],
                [['nums[-1]', 'nums[nums.length - 1]', 'nums[nums.length - 1]', 'nums.back()'][l], a[n - 1], a.slice(0, 3).concat([a[n - 2]]), 'Take the last item.']];
            if (l < 2 && t >= 1) ops.push([['sum(nums)', 'nums.reduce((p, q) => p + q, 0)'][l], a.reduce((p, q) => p + q, 0), near(a.reduce((p, q) => p + q, 0)), 'Add all items.'], [['max(nums)', 'Math.max(...nums)'][l], Math.max(...a), a.concat(near(Math.max(...a))), 'Take the biggest.']);
            const [e, v, c, why] = P(ops); return mk('What does this print?', decl + '\n' + OUT(l, e), v, c, why);
        },
        cond(l, t) {
            const x = R(5, [30, 60, 90, 150, 300][t]), m = R(2, [5, 6, 7, 9, 13][t]), T = R(10, [20, 40, 60, 100, 200][t]), v = x % m === 0 ? 'Fizz' : x > T ? 'Big' : 'Small';
            const p = (w) => [`print("${w}")`, `console.log("${w}")`, `System.out.println("${w}");`, `cout << "${w}";`][l];
            const code = [`x = ${x}\nif x % ${m} == 0:\n    ${p('Fizz')}\nelif x > ${T}:\n    ${p('Big')}\nelse:\n    ${p('Small')}`,
                `let x = ${x}\nif (x % ${m} === 0) ${p('Fizz')}\nelse if (x > ${T}) ${p('Big')}\nelse ${p('Small')}`, `int x = ${x};\nif (x % ${m} == 0) ${p('Fizz')}\nelse if (x > ${T}) ${p('Big')}\nelse ${p('Small')}`,
                `int x = ${x};\nif (x % ${m} == 0) ${p('Fizz')}\nelse if (x > ${T}) ${p('Big')}\nelse ${p('Small')}`][l];
            return mk('Which word is printed?', code, v, ['Fizz', 'Big', 'Small', 'Nothing'], 'Conditions are checked in order. ' + x + ' % ' + m + ' is ' + (x % m) + ' and ' + x + (x > T ? ' is' : ' is not') + ' above ' + T + '.');
        },
        wh(l, t) {
            let n = R(8, [40, 100, 300, 1000, 5000][t]); const n0 = n; let c = 0; while (n > 1) { n = Math.floor(n / 2); c++; }
            const code = [`n = ${n0}\ncount = 0\nwhile n > 1:\n    n //= 2\n    count += 1\nprint(count)`, `let n = ${n0}, count = 0\nwhile (n > 1) { n = Math.floor(n / 2); count++ }\nconsole.log(count)`,
                `int n = ${n0}, count = 0;\nwhile (n > 1) { n /= 2; count++; }\nSystem.out.println(count);`, `int n = ${n0}, count = 0;\nwhile (n > 1) { n /= 2; count++; }\ncout << count;`][l];
            return mk('What does this print?', code, c, near(c), 'n is halved (rounded down) until it is 1; count how many halvings.');
        },
        sql(l, t) {
            const nm = sh(['Asha', 'Ravi', 'Meena', 'Kabir', 'Isha', 'Dev', 'Nisha', 'Arjun']), ct = ['Delhi', 'Pune', 'Jaipur', 'Indore'], ag = sh(Array.from({ length: 20 }, (_, i) => 18 + i)), n = [4, 5, 6, 7, 8][t];
            const rows = Array.from({ length: n }, (_, i) => ({ n: nm[i], a: ag[i], c: P(ct) })), x = R(20, 32), cc = P(rows).c, old = rows.slice().sort((p, q) => q.a - p.a)[0].n;
            const tbl = '-- users(name, age, city)\n' + rows.map((r) => '-- ' + r.n + ', ' + r.a + ', ' + r.c).join('\n') + '\n';
            const qs = [[`SELECT COUNT(*) FROM users WHERE age > ${x};`, rows.filter((r) => r.a > x).length], ['SELECT MAX(age) FROM users;', Math.max(...rows.map((r) => r.a))], ['SELECT SUM(age) FROM users;', rows.reduce((s, r) => s + r.a, 0)],
                ['SELECT COUNT(DISTINCT city) FROM users;', new Set(rows.map((r) => r.c)).size], ['SELECT name FROM users ORDER BY age DESC LIMIT 1;', old]];
            if (t >= 2) qs.push([`SELECT COUNT(*) FROM users WHERE city = '${cc}' AND age >= ${x};`, rows.filter((r) => r.c === cc && r.a >= x).length], [`SELECT MIN(age) FROM users WHERE city = '${cc}';`, Math.min(...rows.filter((r) => r.c === cc).map((r) => r.a))]);
            const [sql, v] = P(qs); return mk('What does this query return?', tbl + sql, v, typeof v === 'number' ? near(v) : rows.map((r) => r.n), 'Apply the WHERE / aggregate to the rows in the comment table.');
        },
        git(l, t) {
            const k = R(0, 2);
            if (k === 0) { const m = 4 + t, cm = 'ABCDEFGHI'.slice(0, m).split(''), nn = R(1, m - 2); return mk('Which commit is HEAD afterwards?', cm.join(' - ') + '  (HEAD = ' + cm[m - 1] + ')\ngit reset --hard HEAD~' + nn, cm[m - 1 - nn], cm, 'HEAD~' + nn + ' means ' + nn + ' commit(s) before HEAD.'); }
            if (k === 1) { const a = R(2, 5 + t), b = R(1, 4 + t); return mk('How many commits are on main afterwards?', `main has ${a} commits.\nYou branch off, add ${b} commits, then run:\ngit checkout main && git merge feature   # fast-forward`, a + b, near(a + b), 'A fast-forward merge just moves main to the new tip.'); }
            const a = R(3, 8), r = R(1, 3); return mk('How many commits are on main afterwards?', `main has ${a} commits.\n` + 'git revert HEAD\n'.repeat(r).trim(), a + r, near(a + r).concat([a - r]), 'Each git revert adds one new commit that undoes an old one.');
        },
        css(l, t) {
            const k = R(0, t >= 3 ? 3 : 2);
            if (k === 0) { const w = R(100, 300), p = R(5, 30), b = R(1, 10), bb = t >= 2 && Math.random() < 0.5; return bb ? mk('How wide is the content area?', `.box { box-sizing: border-box; width: ${w}px; padding: ${p}px; border: ${b}px solid; }`, w - 2 * p - 2 * b, [w, w - p - b, w + 2 * p + 2 * b, w - 2 * p], 'With border-box the width includes padding and border.')
                : mk('What is the total rendered width?', `.box { width: ${w}px; padding: ${p}px; border: ${b}px solid; }`, w + 2 * p + 2 * b, [w, w + p + b, w + 2 * p, w + 2 * b], 'content-box: width + both paddings + both borders.'); }
            if (k === 1) { const c = R(2, 5), m = R(c + 1, c * 4); return mk('How many rows does the grid have?', `.grid { display: grid; grid-template-columns: repeat(${c}, 1fr); }\n/* it contains ${m} items */`, Math.ceil(m / c), near(Math.ceil(m / c)), 'Rows = items / columns, rounded up.'); }
            if (k === 2) { const w = R(20, 60) * 10, n = R(10, 150); return mk('How wide is .child in px?', `.parent { width: ${w}px; }\n.child { width: calc(100% - ${n}px); }`, w - n, [w, w + n, w - 2 * n, n], '100% of the parent, minus the fixed amount.'); }
            const u = R(30, 90), f = R(50, 150), c = R(2, 4); return mk('How wide is each flexible item in px?', `.row { display: flex; width: ${f + c * u}px; }\n.fixed { width: ${f}px; }\n/* the other ${c} items use flex: 1 */`, u, [f, u * 2, Math.round((f + c * u) / c), u + f], 'Free space = total - fixed, shared equally.');
        },
        html(l, t) {
            if (Math.random() < 0.5) { const s = R(2, 20), k = R(3, 4 + t); return mk('What number does the last item show?', `<ol start="${s}">\n` + Array.from({ length: k }, (_, i) => `  <li>Item ${i + 1}</li>`).join('\n') + '\n</ol>', s + k - 1, near(s + k - 1), 'Numbering starts at the start value and counts up.'); }
            const sp = Array.from({ length: R(2, 3 + Math.min(t, 2)) }, () => R(1, 3)), v = sp.reduce((a, b) => a + b, 0);
            return mk('How many columns wide is this row?', '<tr>' + sp.map((x, i) => `<td${x > 1 ? ' colspan="' + x + '"' : ''}>${'ABCDEF'[i]}</td>`).join('') + '</tr>', v, near(v).concat([sp.length]), 'colspan counts as that many columns; a plain td is 1.');
        },
    };
    const PROG = ['arith', 'loop', 'str', 'arr', 'cond', 'wh'];
    const KINDS = { python: PROG, javascript: PROG, java: PROG, cpp: PROG, sql: ['sql'], git: ['git'], css: ['css'], html: ['html'] };
    function make(lang, t, n) {
        const l = L[lang] === undefined ? 0 : L[lang], out = [], seen = new Set();
        for (let i = 0; i < n * 4 && out.length < n; i++) { const q = K[P(KINDS[lang])](l, t); const key = q.q + (q.code || ''); if (!seen.has(key)) { seen.add(key); out.push(q); } }
        return out;
    }
    window.SM_GEN = { make, boss: (lang, t) => { const q = make(lang, Math.min(t + 1, 4), 1)[0]; q.q = 'BOSS: ' + q.q; return q; } };
})();
