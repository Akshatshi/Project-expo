(function () {
    const R = {
        python: [[
            ['What does this print?', 'print(len("code"))', '4', '3|5|code', 'len() counts the characters in a string.'],
            ['What does this print?', 'x = 5\nx += 2\nprint(x)', '7', '5|52|Error', '+= adds to the variable in place.'],
            ['What does this print?', 'print(type(3.0))', "<class 'float'>", "<class 'int'>|<class 'str'>|<class 'double'>", '3.0 has a decimal point, so it is a float.'],
            ['BOSS: what does this print?', 'print("5" + "5")', '55', '10|Error|5 5', '+ joins strings, it does not add them.']], [
            ['What does this print?', 'print([i*i for i in range(4)])', '[0, 1, 4, 9]', '[1, 4, 9, 16]|[0, 1, 4]|[0, 2, 4, 6]', 'range(4) gives 0 to 3 and each is squared.'],
            ['What does this print?', 'd = {"a": 1}\nprint(d.get("b", 0))', '0', 'None|KeyError|"b"', 'get() returns the default when the key is missing.'],
            ['What does this print?', 'print("hello"[::-1])', 'olleh', 'hello|oll|Error', '[::-1] reverses a sequence.'],
            ['BOSS: what does this print?', 'a = [1, 2, 3]\nb = a\nb.append(4)\nprint(len(a))', '4', '3|7|Error', 'b and a point to the same list object.']], [
            ['What does this print?', 'print(sum(x for x in range(10) if x % 3 == 0))', '18', '15|12|9', '0 + 3 + 6 + 9 = 18.'],
            ['What does this print?', 'print(bool([]) or "empty")', 'empty', 'False|[]|True', 'An empty list is falsy, so "or" returns the right side.'],
            ['What does this print?', 'def f(x, l=[]):\n    l.append(x)\n    return l\nf(1)\nprint(f(2))', '[1, 2]', '[2]|[1]|[]', 'The default list is created once and shared between calls.'],
            ['BOSS: what does this print?', 'fs = [lambda: i for i in range(3)]\nprint([f() for f in fs])', '[2, 2, 2]', '[0, 1, 2]|[0, 0, 0]|Error', 'Lambdas look up i later (late binding), when i is already 2.']]],
        javascript: [[
            ['What does this print?', 'console.log(typeof 42)', 'number', 'string|int|undefined', 'JavaScript has one number type.'],
            ['What does this print?', 'let a = 2\na *= 3\nconsole.log(a)', '6', '5|23|Error', '*= multiplies and assigns.'],
            ['What does this print?', 'console.log("5" + 2)', '52', '7|NaN|Error', 'With a string, + joins instead of adding.'],
            ['BOSS: what does this print?', 'console.log(0 == "0")', 'true', 'false|undefined|Error', '== converts types, so "0" becomes the number 0.']], [
            ['What does this print?', 'console.log([1, 2, 3].map(n => n * 2))', '[2, 4, 6]', '[1, 2, 3]|6|[2, 4]', 'map() builds a new array from each item.'],
            ['What does this print?', 'console.log(typeof null)', 'object', 'null|undefined|number', 'A famous old JavaScript quirk.'],
            ['What does this print?', 'const o = { a: 1 }\no.a = 2\nconsole.log(o.a)', '2', '1|Error|undefined', 'const stops reassigning o, but the object can still change.'],
            ['BOSS: what does this print?', 'console.log(1 + +"2" + "3")', '33', '6|123|NaN', '+"2" becomes 2, so 1 + 2 = 3, then "3" is joined: "33".']], [
            ['What does this print?', 'console.log([..."abc"].reverse().join(""))', 'cba', 'abc|cab|Error', 'Spread splits the string into letters, reverse flips them.'],
            ['What does this print?', 'console.log(0.1 + 0.2 === 0.3)', 'false', 'true|NaN|Error', 'Floating point rounding makes the sum 0.30000000000000004.'],
            ['In which order is this printed?', 'setTimeout(() => console.log("A"))\nPromise.resolve().then(() => console.log("B"))\nconsole.log("C")', 'C, B, A', 'C, A, B|A, B, C|B, C, A', 'Sync code first, then microtasks (promises), then timers.'],
            ['BOSS: what does this print?', 'for (var i = 0; i < 3; i++) setTimeout(() => console.log(i))', '3 3 3', '0 1 2|2 2 2|undefined x3', 'var is shared; the loop ends with i = 3 before the timers run.']]],
        html: [[
            ['Which tag makes the biggest heading?', '', '<h1>', '<head>|<header>|<big>', '<h1> is the top-level heading.'],
            ['Which tag creates a link?', '', '<a>', '<link>|<href>|<url>', 'The anchor tag <a> with an href attribute.'],
            ['Which tag makes a numbered list?', '', '<ol>', '<ul>|<li>|<nl>', 'ol = ordered list.'],
            ['BOSS: which tag holds the visible page content?', '', '<body>', '<head>|<main>|<title>', '<head> is for metadata, <body> is what people see.']], [
            ['How do you open a link in a new tab?', '', 'target="_blank"', 'href="_new"|open="new"|rel="tab"', 'target="_blank" opens a new tab.'],
            ['What does required do here?', '<input type="email" required>', 'The browser checks it is a filled-in email', 'Nothing, it is only style|It sends an email|It hides the field', 'required blocks form submit until the value is valid.'],
            ['Best tag for a group of navigation links?', '', '<nav>', '<div>|<menu>|<section>', '<nav> is the semantic tag for navigation.'],
            ['BOSS: what is the difference between id and class?', '', 'An id must be unique, a class can repeat', 'A class must be unique, an id can repeat|They are the same|id is only for CSS', 'Use id for one element, class for many.']], [
            ['What is the viewport meta tag for?', '<meta name="viewport" content="width=device-width, initial-scale=1">', 'Making the page scale properly on phones', 'Loading fonts|Blocking zoom|Adding SEO keywords', 'Without it phones show a zoomed-out desktop page.'],
            ['What does defer do on a script?', '<script src="app.js" defer></script>', 'Runs it after the HTML is parsed', 'Blocks parsing until it runs|Runs it before the DOM exists|Never runs it', 'defer downloads in parallel and runs in order after parsing.'],
            ['Why is alt on images important?', '<img src="a.png" alt="...">', 'Screen readers and broken images use it', 'It makes the image load faster|It resizes the image|It is required for CSS', 'Alt text helps accessibility and SEO.'],
            ['BOSS: what does the for attribute do?', '<label for="x">Name</label>', 'Links the label to the element with id="x"', 'Links it to name="x"|Links it to class="x"|Sets placeholder text', 'Clicking the label focuses the matching input.']]],
        css: [[
            ['Which property changes text colour?', '', 'color', 'font-color|text-color|fg', 'color sets the text colour.'],
            ['Which selector targets a class named card?', '', '.card', '#card|card|*card', 'Classes use a dot, ids use a hash.'],
            ['What does margin: 0 auto do on a block with a width?', '', 'Centers it horizontally', 'Centers it vertically|Removes its width|Adds a border', 'Auto side margins share the free space equally.'],
            ['BOSS: box model order from inside to outside?', '', 'content, padding, border, margin', 'content, margin, border, padding|padding, content, margin, border|border, padding, content, margin', 'Content, then padding, border and margin.']], [
            ['What does this do?', '.row { display: flex; justify-content: space-between; }', 'Pushes items apart with space between them', 'Stacks items vertically|Centers one item|Hides overflow', 'space-between puts free space between items.'],
            ['An absolutely positioned element is placed relative to...', '', 'Its nearest positioned ancestor', 'The viewport always|Its previous sibling|The body only', 'It looks for the nearest ancestor with position set.'],
            ['What does z-index control?', '', 'Which element sits on top', 'Zoom level|Font size|Element width', 'Higher z-index stacks above lower.'],
            ['BOSS: which rule wins for <div id="a" class="a">?', '#a { color: red; }\n.a.a.a { color: blue; }', 'red', 'blue|Whichever is last|Neither', 'An id selector beats any number of class selectors.']], [
            ['1rem is relative to...', '', 'The root (html) font size', "The parent's font size|The viewport width|The element's width", 'rem = root em.'],
            ['Which elements does this select?', 'li:nth-child(2n) { }', 'Every even list item', 'The first two items|Every odd item|Only the last item', '2n matches 2, 4, 6...'],
            ['What does border-box change?', '* { box-sizing: border-box; }', 'Width includes padding and border', 'Width excludes the content|Borders disappear|Margins collapse', 'It makes sizing predictable.'],
            ['BOSS: what does this create?', 'display: grid;\ngrid-template-columns: repeat(3, 1fr);', 'Three equal columns', 'Three rows|Columns 3px wide|One column repeated 3 times', '1fr means one share of free space.']]],
        sql: [[
            ['What does this return?', 'SELECT * FROM users;', 'All rows and columns', 'Only the first row|Only column names|Nothing', '* means every column.'],
            ['Which clause filters rows?', '', 'WHERE', 'HAVING|FILTER|IF', 'WHERE filters rows before grouping.'],
            ['How do you count rows?', '', 'COUNT(*)', 'SUM(*)|TOTAL()|LEN(*)', 'COUNT(*) counts rows.'],
            ['BOSS: sort users by age, oldest first.', '', 'SELECT * FROM users ORDER BY age DESC;', 'SELECT * FROM users SORT BY age;|SELECT * FROM users GROUP BY age;|SELECT * FROM users ORDER age DESC;', 'ORDER BY ... DESC sorts high to low.']], [
            ['What does this return?', 'SELECT city, COUNT(*) FROM users GROUP BY city;', 'The number of users per city', 'The total users|Every user row|Only one city', 'GROUP BY makes one row per city.'],
            ['INNER JOIN returns...', '', 'Only rows that match in both tables', 'All rows of the left table|All rows of both tables|Only unmatched rows', 'Rows without a match are dropped.'],
            ['HAVING is used to...', '', 'Filter groups after aggregation', 'Filter rows before grouping|Sort results|Join tables', 'WHERE runs before GROUP BY, HAVING after.'],
            ['BOSS: which rows come back?', 'SELECT * FROM t ORDER BY id LIMIT 3 OFFSET 3;', 'Rows 4 to 6', 'Rows 1 to 3|Rows 3 to 6|Rows 4 to 7', 'OFFSET skips 3 rows, LIMIT takes the next 3.']], [
            ['LEFT JOIN keeps...', '', 'All left rows, with NULL where nothing matches', 'Only matching rows|All right rows only|Only NULL rows', 'Unmatched right-side columns become NULL.'],
            ['Why does this return nothing?', 'SELECT * FROM t WHERE x = NULL;', 'NULL needs IS NULL, = never matches', 'x must be quoted|NULL is not allowed|It needs HAVING', 'Comparing with NULL gives unknown, not true.'],
            ['An index mainly...', '', 'Speeds up reads, slows writes a little', 'Speeds up writes only|Encrypts data|Removes duplicates', 'The database must also update the index on writes.'],
            ['BOSS: what does this count?', 'SELECT COUNT(DISTINCT city) FROM users;', 'Unique non-NULL cities', 'All rows|Rows where city is NULL|Cities including duplicates', 'DISTINCT removes duplicates, COUNT(col) ignores NULL.']]],
        java: [[
            ['What does this print?', 'int x = 7 / 2;\nSystem.out.println(x);', '3', '3.5|4|Error', 'Integer division drops the decimal part.'],
            ['Which keyword creates an object?', '', 'new', 'create|make|object', 'new allocates an object.'],
            ['What is the program entry point?', '', 'public static void main(String[] args)', 'public void start()|static int main()|void run()', 'The JVM looks for main.'],
            ['BOSS: what does this print?', 'String a = new String("hi");\nString b = new String("hi");\nSystem.out.println(a == b);', 'false', 'true|hi|Error', '== compares references, equals() compares text.']], [
            ['What does this print?', 'System.out.println(10 + 5 + "x");', '15x', '105x|x15|Error', 'Left to right: 10 + 5 = 15, then "x" is joined.'],
            ['What does final on a variable mean?', '', 'It cannot be reassigned', 'It is deleted after use|It is private|It is shared by all objects', 'final = assigned once.'],
            ['ArrayList vs array?', '', 'ArrayList can grow, arrays have fixed size', 'Arrays can grow|They are identical|ArrayList only holds numbers', 'ArrayList resizes itself.'],
            ['BOSS: what does this print?', 'int[] a = new int[3];\nSystem.out.println(a[0]);', '0', 'null|Error|garbage value', 'int arrays are filled with 0 by default.']], [
            ['What does this print?', 'Integer a = 200, b = 200;\nSystem.out.println(a == b);', 'false', 'true|200|Error', 'Only -128 to 127 are cached; larger Integers are different objects.'],
            ['A static method belongs to...', '', 'The class, not an object', 'Every object separately|The JVM only|A thread', 'Call it as ClassName.method().'],
            ['What prints?', 'try { return 1; } finally { System.out.println("F"); }', 'F is printed, then 1 is returned', 'Only 1|Nothing|F is never printed', 'finally always runs.'],
            ['BOSS: HashMap and null keys?', '', 'It allows one null key', 'No null keys|Many null keys|Only null values', 'HashMap allows one null key, Hashtable allows none.']]],
        cpp: [[
            ['What does this print?', 'cout << 5 / 2;', '2', '2.5|3|Error', 'Both are ints, so the result is an int.'],
            ['What does this print?', 'int x = 3;\nint* p = &x;\ncout << *p;', '3', 'The address of x|p|Error', '*p reads the value at the address.'],
            ['What does & give you here?', 'int* p = &x;', 'The address of x', 'The value of x|A copy of x|A reference type', '& gets the address.'],
            ['BOSS: what does this print?', 'cout << 7 % 3;', '1', '2|0|2.33', '% is the remainder.']], [
            ['What does this print?', 'vector<int> v = {1, 2, 3};\nv.push_back(4);\ncout << v.size();', '4', '3|5|Error', 'push_back adds one element.'],
            ['What does this do to the caller?', 'void f(int &a) { a++; }', 'Changes the original variable', 'Nothing, it is a copy|Deletes the variable|Does not compile', '& makes a reference, not a copy.'],
            ['What does this print?', 'int a[3] = {1, 2, 3};\ncout << *(a + 1);', '2', '1|3|The address', 'a + 1 points to the second element.'],
            ['BOSS: what does const do on a parameter reference?', 'void f(const string& s)', 'Avoids a copy and forbids changing s', 'Makes a copy|Allows changes|Deletes s after', 'It is the standard way to pass big objects.']], [
            ['What pairs with new[]?', '', 'delete[]', 'delete|free|remove[]', 'Arrays must be freed with delete[].'],
            ['What does this print?', 'int x = 5;\nint &r = x;\nr = 9;\ncout << x;', '9', '5|Error|r', 'r is another name for x.'],
            ['When does a destructor run?', '', 'When the object goes out of scope', 'Only when you call it|At program start|Never', 'This is RAII, the base of safe C++.'],
            ['BOSS: unique_ptr can be...', '', 'Moved but not copied', 'Copied freely|Neither moved nor copied|Shared by many', 'It models single ownership.']]],
        git: [[
            ['Which command starts a new repository?', '', 'git init', 'git start|git new|git create', 'init creates the .git folder.'],
            ['How do you stage all changes?', '', 'git add .', 'git stage all|git commit .|git push .', 'add moves changes into the staging area.'],
            ['How do you save a commit with a message?', '', 'git commit -m "msg"', 'git save "msg"|git push -m "msg"|git add -m "msg"', '-m gives the message inline.'],
            ['BOSS: how do you see changed files?', '', 'git status', 'git log|git diff --stat only|git show', 'status shows staged and unstaged files.']], [
            ['git pull is basically...', '', 'git fetch + git merge', 'git push + git merge|git clone|git add + commit', 'It downloads and merges remote changes.'],
            ['Create and switch to a new branch?', '', 'git checkout -b feature', 'git branch feature|git new feature|git switch feature', '-b creates the branch and switches to it.'],
            ['What does git stash do?', '', 'Saves uncommitted changes aside', 'Deletes changes|Pushes changes|Creates a branch', 'Use git stash pop to bring them back.'],
            ['BOSS: undo the last commit but keep the changes staged?', '', 'git reset --soft HEAD~1', 'git reset --hard HEAD~1|git revert HEAD|git checkout HEAD~1', '--soft moves HEAD back and keeps your work.']], [
            ['What does rebase do?', '', 'Replays your commits on top of another base', 'Deletes a branch|Merges without history|Pushes to remote', 'It gives a linear history.'],
            ['What does cherry-pick do?', '', 'Applies one chosen commit to the current branch', 'Deletes a commit|Merges a whole branch|Renames a branch', 'Give it the commit hash.'],
            ['Which command shows who changed each line?', '', 'git blame', 'git who|git log -p only|git annotate-all', 'blame shows author and commit per line.'],
            ['BOSS: safest way to undo a commit already pushed to a shared branch?', '', 'git revert', 'git reset --hard + force push|git rebase -i|git stash', 'revert adds a new commit and keeps history intact.']]],
    };
    const cvt = (r) => ({ type: 'mcq', q: r[0], code: r[1] || undefined, options: [r[2], ...r[3].split('|')], why: r[4] });
    const heat = (q) => (q.type === 'order' ? 3 : q.type === 'fill' ? 2 : q.code ? 1 : 0) + (q.code ? q.code.length / 90 : 0);
    function legacy(lang, t) {
        const all = ((window.SM_ARCADE && window.SM_ARCADE.questions[lang]) || []).slice().sort((a, b) => heat(a) - heat(b)), n = all.length;
        return [all.slice(0, Math.ceil(n * 0.5)), all.slice(Math.floor(n * 0.25), Math.ceil(n * 0.75)), all.slice(Math.floor(n * 0.5))][Math.min(t, 2)];
    }
    window.SM_BANK = {
        tagged: (lang, t) => R[lang][Math.min(t, 2)].map(cvt),
        boss: (lang, t) => (t < 3 || !window.SM_GEN ? cvt(R[lang][Math.min(t, 2)][3]) : SM_GEN.boss(lang, t)),
        pool: (lang, t) => R[lang][Math.min(t, 2)].map(cvt).concat(legacy(lang, t), window.SM_GEN ? SM_GEN.make(lang, t, 14) : []),
        total: () => '168 written + unlimited random: ' + Object.values(R).reduce((s, l) => s + l.length * 4, 0) + Object.values(window.SM_ARCADE.questions).reduce((s, l) => s + l.length, 0),
    };
})();
