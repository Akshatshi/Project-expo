// Ready-made study notes shown in the Notes section. Loaded after kit-data.js, so these replace the short starter notes.
// Notes a student has already edited stay untouched (they are saved per topic name in the browser).
window.SM_NOTES = Object.assign(window.SM_NOTES || {}, {
'Python': `# Python notes

## Basics
- Types: int, float, str, bool, list, tuple, dict, set, None
- Indentation defines blocks; # starts a comment
- f"{name} is {age}" for formatting; input() always returns a string
- Truthy/falsy: 0, "", [], {}, None are falsy

## Control flow
- if / elif / else; for x in range(n); while cond:
- break, continue, pass; for ... else runs if no break happened
- enumerate(items), zip(a, b), reversed(x), sorted(x, key=len)

## Collections
- list: ordered, mutable  [1, 2]  -> append, extend, insert, pop, remove, sort
- tuple: ordered, fixed   (1, 2)
- dict: key to value      {"a": 1} -> get, items, keys, values, setdefault
- set: unique items       {1, 2}   -> union |, intersection &, difference -
- Slicing: a[1:4], a[::-1], a[-1]
- Comprehension: [x*x for x in nums if x % 2 == 0]; {k: v for k, v in pairs}

## Functions
- def add(a, b=0, *args, **kwargs): return a + b
- Never use a mutable default (def f(x=[])); use None and create inside
- lambda x: x * 2; map, filter; sorted(people, key=lambda p: p["age"])
- Scope: local, enclosing, global, built-in (LEGB)

## OOP
- class Dog: def __init__(self, name): self.name = name
- Inheritance: class Puppy(Dog); super().__init__(name)
- Dunder methods: __str__, __repr__, __len__, __eq__
- @staticmethod, @classmethod, @property

## Errors and files
- try / except ValueError as e / else / finally; raise ValueError("msg")
- with open("f.txt") as f: text = f.read()   (closes the file for you)
- json.loads / json.dumps, csv module

## Useful modules and tools
- collections (Counter, defaultdict, deque), itertools, datetime, random, os, pathlib
- venv + pip: python -m venv .venv ; pip install requests
- Data: pandas (DataFrame, groupby, merge), numpy (arrays, vectorised maths), matplotlib

## Interview quick answers
- list vs tuple: mutable vs immutable; tuples can be dict keys
- is vs ==: identity vs equality
- Generator: function with yield; lazy, saves memory
- Decorator: function that wraps another function to add behaviour
- GIL: only one thread runs Python bytecode at a time; use multiprocessing for CPU work
`,
'JavaScript': `# JavaScript notes

## Basics
- const (cannot be reassigned), let (block scoped); avoid var
- Types: string, number, boolean, null, undefined, symbol, bigint, object
- == converts types, === does not; always use ===
- Template string: \`Hi \${name}\`

## Functions
- function f(a) {}  |  const f = (a) => a * 2
- Closures: an inner function remembers the variables around it
- this: depends on how a function is called; arrow functions keep the outer this
- Default and rest: function f(a = 1, ...rest) {}

## Arrays and objects
- map (transform), filter (keep), reduce (combine), find, some, every, includes, sort
- Spread: [...a, ...b], {...obj, x: 1}; destructuring: const {name, age} = user
- Object.keys / values / entries; optional chaining user?.address?.city; nullish a ?? "default"

## Async
- Callback -> Promise -> async/await
- const data = await fetch(url).then(r => r.json()) inside an async function
- try { await ... } catch (e) {}; Promise.all([a, b]) runs in parallel
- Event loop: call stack runs first, then microtasks (promises), then timers

## DOM and browser
- document.querySelector(".x"), el.addEventListener("click", fn), el.classList.toggle("on")
- Event delegation: one listener on the parent, check event.target
- localStorage.setItem(key, value) stores strings only; use JSON.stringify

## Modern JS and tools
- import / export modules; npm install, package.json scripts
- Node.js runs JS on the server; Express for APIs
- React: components, props, state (useState), effects (useEffect), keys in lists

## Interview quick answers
- Hoisting: declarations move to the top of their scope; let/const stay in the temporal dead zone
- Debounce vs throttle: wait until typing stops vs run at most once per interval
- Shallow vs deep copy: spread copies one level; structuredClone copies deeply
- var vs let vs const: function scope vs block scope vs block scope + no reassign
`,
'SQL': `# SQL notes

## Query order
SELECT cols FROM table WHERE cond GROUP BY col HAVING cond ORDER BY col LIMIT n
(The database runs it as FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY, LIMIT.)

## Filtering
- =, <>, <, >, BETWEEN 1 AND 5, IN ('a','b'), LIKE 'A%', IS NULL
- AND / OR / NOT; use brackets when mixing them
- DISTINCT removes duplicate rows

## Joins
- INNER: matching rows only
- LEFT: all left rows + matching right (no match gives NULL)
- RIGHT / FULL OUTER: the same idea from the other side / both
- Example: SELECT c.name, o.total FROM customers c JOIN orders o ON o.cid = c.id
- Self join: a table joined to itself (employee and manager)

## Aggregates
- COUNT(*), SUM, AVG, MIN, MAX; COUNT(col) skips NULL
- WHERE filters rows before grouping; HAVING filters groups after
- SELECT dept, COUNT(*) FROM emp GROUP BY dept HAVING COUNT(*) > 5

## Subqueries, CTEs, windows
- Subquery: WHERE salary > (SELECT AVG(salary) FROM emp)
- CTE: WITH top AS (SELECT ...) SELECT * FROM top
- Window: ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC)
- RANK vs DENSE_RANK: RANK leaves gaps after ties, DENSE_RANK does not
- Nth highest salary: DENSE_RANK() in a subquery, then filter rank = N

## Changing data and design
- INSERT INTO t (a, b) VALUES (1, 2); UPDATE t SET a = 1 WHERE id = 5; DELETE FROM t WHERE id = 5
- Always test a WHERE with SELECT first
- Keys: PRIMARY KEY (unique row id), FOREIGN KEY (links tables), UNIQUE, NOT NULL
- Normalisation: 1NF atomic values, 2NF no partial dependency, 3NF no transitive dependency
- Index: speeds up reads, slows writes slightly; create on columns used in WHERE and JOIN
- Transactions: ACID = Atomicity, Consistency, Isolation, Durability; COMMIT / ROLLBACK

## Interview quick answers
- DELETE vs TRUNCATE vs DROP: remove rows (can filter) / remove all rows fast / remove the table
- UNION removes duplicates, UNION ALL keeps them (faster)
- Find duplicates: SELECT col, COUNT(*) FROM t GROUP BY col HAVING COUNT(*) > 1
`,
'HTML & CSS': `# HTML and CSS notes

## HTML
- Structure: header, nav, main, section, article, aside, footer (semantic tags help SEO and accessibility)
- Forms: form, label (for=id), input (type, required, placeholder), select, textarea, button
- Always add alt on images and <meta name="viewport" content="width=device-width, initial-scale=1">
- Block vs inline: div/p are blocks; span/a are inline

## CSS selectors and cascade
- tag, .class, #id, a:hover, ul > li, h2 + p, [type="text"]
- Specificity: inline > #id > .class > tag; later rule wins on a tie
- Use variables: :root { --blue: #2fa2ff } then color: var(--blue)

## Box model and layout
- content + padding + border + margin; box-sizing: border-box makes width include padding
- Flexbox (one direction): display:flex; justify-content (main axis); align-items (cross axis); gap; flex-wrap
- Grid (two directions): display:grid; grid-template-columns: repeat(3, 1fr); gap: 16px
- Position: static, relative, absolute (to nearest positioned parent), fixed, sticky
- Centering: display:grid; place-items:center

## Responsive design
- Mobile first: write the small screen, then @media (min-width: 768px) { ... }
- Relative units: rem, %, vw, fr; max-width: 100% on images
- clamp(1rem, 2vw, 1.5rem) for fluid text

## Polish
- transition: .2s; transform: translateY(-2px); @keyframes for animation
- Accessibility: visible focus outline, colour contrast, label every input, keyboard navigation

## Interview quick answers
- id vs class: one per page vs reusable
- em vs rem: relative to parent font vs root font
- display:none vs visibility:hidden: removes space vs keeps space
- Flex vs Grid: one dimension vs two dimensions
`,
'Git & GitHub': `# Git and GitHub notes

## Daily flow
git status | git add . | git commit -m "message" | git push
- Write commits in the present tense: "Add login form", not "changes"
- Commit small and often; one idea per commit

## Branches
- git switch -c feature   (create and move)
- git switch main | git merge feature | git branch -d feature
- Merge conflict: open the file, keep the right lines, remove <<<<<<< ======= >>>>>>>, then git add and commit

## Remote
- git clone url | git pull | git push -u origin feature | git fetch
- Fork (your copy of someone's repo) -> branch -> push -> Pull Request -> review -> merge

## Undo
- git restore file (discard edits) | git restore --staged file (unstage)
- git revert <commit> (safe undo, adds a new commit)
- git reset --hard <commit> (rewrites history; never on shared branches)
- git stash / git stash pop (park work for later)

## Inspect
- git log --oneline --graph | git diff | git blame file | git show <commit>

## Good GitHub profile
- Pin 4 to 6 best projects, each with a README: what it does, screenshot, how to run, tech used
- .gitignore: never commit .env, passwords, node_modules, or API keys
- Commit regularly (a green graph shows consistency)

## Interview quick answers
- merge vs rebase: keeps history with a merge commit vs replays commits for a straight line
- fetch vs pull: download only vs download and merge
- If you pushed a secret: rotate the key first, then remove it from history
`,
'Java & C++': `# Java and C++ notes

## Java
- public static void main(String[] args); compiled to bytecode and run on the JVM (write once, run anywhere)
- OOP: class, object, interface, abstract class, extends, implements; encapsulation, inheritance, polymorphism, abstraction
- Strings are immutable; compare with equals(), not ==; StringBuilder for many edits
- Collections: ArrayList (fast index), LinkedList, HashMap (key to value), HashSet, TreeMap (sorted), PriorityQueue
- Exceptions: checked (must handle) vs unchecked; try / catch / finally; throw vs throws
- JDK = tools + compiler, JRE = runtime, JVM = executes bytecode
- Overloading: same name, different parameters (compile time); overriding: child replaces parent method (run time)

## C++
- #include <iostream>; std::cout << x; std::cin >> x;
- Pointers: int *p = &x; *p is the value; reference: int &r = x;
- Memory: new / delete (or smart pointers unique_ptr, shared_ptr); no garbage collector
- STL: vector, string, map, unordered_map, set, stack, queue, sort(), algorithms
- Class: constructor, destructor, public / private / protected; virtual functions give run-time polymorphism
- Pass big objects by const reference: void f(const vector<int>& v)

## Java vs C++
- Java: garbage collected, no pointers, one class inheritance (many interfaces), platform independent
- C++: manual memory, pointers, multiple inheritance, compiled to machine code (faster, lower level)

## Interview quick answers
- Abstract class vs interface: can hold state and code vs a contract of methods
- HashMap works with hashing: hashCode picks the bucket, equals resolves collisions
- Stack vs heap: local variables and calls vs objects created with new
`,
'DSA & Problem Solving': `# Data structures and algorithms notes

## Complexity (Big O)
- O(1) < O(log n) < O(n) < O(n log n) < O(n^2) < O(2^n)
- Always state time AND space; drop constants and smaller terms

## Data structures
- Array: index O(1), insert in the middle O(n)
- Linked list: insert/delete at a known node O(1), search O(n)
- Stack (LIFO): push, pop; used for brackets, undo, DFS
- Queue (FIFO): enqueue, dequeue; used for BFS, scheduling
- Hash map: average O(1) get/put; used for counting and lookups
- Heap / priority queue: get min or max O(1), insert O(log n)
- Tree / BST: search O(log n) when balanced; traversals inorder, preorder, postorder, level order
- Graph: adjacency list; BFS (shortest path in unweighted graphs), DFS (explore, cycles)

## Patterns that solve most questions
- Two pointers: sorted arrays, pair sum, remove duplicates
- Sliding window: longest/shortest subarray or substring with a condition
- Hash map for counts: two sum, anagrams, first unique character
- Binary search: sorted data or "minimum value that works"
- Recursion and backtracking: subsets, permutations, N-Queens
- Dynamic programming: overlapping subproblems; define state, write recurrence, base case (fibonacci, knapsack, LCS)
- Greedy: take the best local choice (intervals, coin change on nice coins)

## Sorting and searching
- Bubble / insertion O(n^2); merge sort O(n log n) stable; quick sort O(n log n) average; heap sort O(n log n)
- Binary search: lo, hi, mid = lo + (hi - lo) // 2; loop while lo <= hi

## How to answer in an interview
1. Repeat the problem and ask about input size and edge cases
2. Start with the brute force, say its complexity
3. Improve it with a pattern above
4. Code cleanly, then test with a small example and an edge case (empty, one item, duplicates)

## Practice plan
- 2 problems a day for 30 days: arrays and strings -> hashing -> two pointers -> binary search -> trees -> graphs -> DP
`,
'CS Fundamentals (OS, DBMS, Networks)': `# CS fundamentals notes

## Operating system
- Process = running program with its own memory; thread = lightweight unit inside a process
- Scheduling: FCFS, SJF, Round Robin, priority
- Deadlock needs 4 conditions: mutual exclusion, hold and wait, no preemption, circular wait
- Paging and virtual memory: memory split into fixed pages; page fault loads a page from disk
- Synchronisation: mutex, semaphore; race condition = result depends on timing

## DBMS
- ACID: Atomicity, Consistency, Isolation, Durability
- Normal forms: 1NF, 2NF, 3NF, BCNF
- Indexing (B-tree) speeds up search; transaction isolation levels reduce dirty/non-repeatable/phantom reads
- SQL vs NoSQL: fixed schema and joins vs flexible schema and easy horizontal scale

## Computer networks
- OSI layers: Physical, Data link, Network, Transport, Session, Presentation, Application
- TCP: reliable, ordered, connection based; UDP: fast, no guarantee (video calls, games)
- What happens when you type a URL: DNS lookup -> TCP/TLS handshake -> HTTP request -> server response -> browser renders
- HTTP methods: GET read, POST create, PUT replace, PATCH update, DELETE remove
- Status codes: 200 OK, 201 Created, 301 redirect, 400 bad request, 401 not logged in, 403 forbidden, 404 not found, 500 server error
- HTTPS = HTTP + TLS encryption; IP address identifies a machine, port identifies a program

## OOP principles
- Encapsulation, Abstraction, Inheritance, Polymorphism
- SOLID: Single responsibility, Open/closed, Liskov substitution, Interface segregation, Dependency inversion
`,
'Web & APIs (React, Node, REST)': `# Web development and API notes

## How the web app is built
- Frontend (what the user sees) + Backend (logic) + Database (storage) + API (the bridge)
- REST API: URLs are nouns (/users/5), HTTP methods are verbs, responses are JSON
- Status codes: 200, 201, 400, 401, 403, 404, 422, 500

## React
- Component = function that returns UI; props go in, state lives inside
- const [count, setCount] = useState(0); never change state directly
- useEffect(() => { fetchData(); }, []) runs after render; the list at the end controls when it re-runs
- Lists need a stable key; lift state up to the nearest common parent
- Controlled input: value + onChange

## Node and Express
- app.get("/api/items", (req, res) => res.json(items))
- Middleware: functions that run before the route (logging, auth, JSON body parsing)
- Use environment variables for secrets (.env), never commit them
- Python alternative: Flask or FastAPI

## Auth and security
- Never store plain passwords; hash with bcrypt/argon2
- Session cookie vs JWT token sent in the Authorization header
- Validate input on the server; use parameterised queries to stop SQL injection
- XSS: escape user text before showing it; CORS controls which sites may call your API

## Deploying
- Frontend: Netlify, Vercel, GitHub Pages; backend: Render, Railway, PythonAnywhere
- Add a README with a live link, screenshots, and run steps

## Interview quick answers
- Authentication = who you are; authorization = what you may do
- PUT replaces a whole record; PATCH changes part of it
- Virtual DOM: React compares a lightweight copy to update only what changed
`,
'Data Science & ML': `# Data science and machine learning notes

## Workflow
1. Define the question and the metric  2. Collect data  3. Clean  4. Explore (EDA)  5. Model  6. Evaluate  7. Explain and deploy

## Python tools
- pandas: df.head(), df.info(), df.describe(), df.isna().sum(), df.groupby("col").agg(...), df.merge(other, on="id")
- numpy: arrays, vectorised maths (faster than loops), mean, std, reshape
- matplotlib / seaborn: histogram (distribution), scatter (relationship), bar (compare), box plot (outliers)
- scikit-learn: train_test_split, fit, predict, Pipeline

## Cleaning
- Missing values: drop, fill with mean/median/mode, or flag them
- Outliers: check with box plot or IQR; decide before removing
- Encode categories (one-hot), scale numbers (StandardScaler) for distance based models

## Statistics basics
- Mean vs median (median is safer with outliers); standard deviation; correlation is not causation
- Probability, normal distribution, hypothesis test and p-value (small p-value = result unlikely by chance)

## Models
- Regression (predict a number): linear regression, random forest regressor
- Classification (predict a class): logistic regression, decision tree, random forest, KNN
- Clustering (no labels): k-means
- Overfitting: great on training data, poor on new data; fix with more data, simpler model, cross-validation, regularisation

## Metrics
- Regression: MAE, RMSE, R2
- Classification: accuracy, precision (of predicted positives how many are right), recall (of real positives how many found), F1, confusion matrix
- Imbalanced data: accuracy misleads; use precision, recall, F1

## Interview quick answers
- Bias vs variance: too simple vs too sensitive to training data
- Train / validation / test: learn / tune / final honest score
- Supervised vs unsupervised: with labels vs without labels
- Data leakage: information from the test set sneaks into training
`,
'Aptitude & Reasoning': `# Aptitude and reasoning notes

## Percentages, profit and loss
- Percent change = (new - old) / old x 100
- Profit % = profit / cost price x 100; selling price = cost x (1 + profit%)
- Successive discounts a% and b%: total = a + b - ab/100

## Ratio, average, mixtures
- Average = sum / count; adding a number above the average raises the average
- Ratio a:b with total T gives a = T x a/(a+b)

## Time, speed, work
- Speed = distance / time; km/h to m/s: multiply by 5/18
- Relative speed: same direction subtract, opposite direction add
- Work: if A does a job in a days and B in b days, together = ab/(a+b) days
- Pipes and cisterns are the same idea (filling +, emptying -)

## Interest and number system
- Simple interest = PRT/100; compound amount = P(1 + R/100)^T
- Divisibility: 3 and 9 by digit sum, 4 by last two digits, 11 by alternating digit sum
- Prime check: test divisors up to the square root

## Permutation and probability
- nPr = n!/(n-r)!; nCr = n!/(r!(n-r)!)
- Probability = favourable / total; P(A or B) = P(A) + P(B) - P(A and B)

## Logical reasoning
- Series: look at differences, ratios, alternating patterns
- Coding-decoding: find the shift or position rule (A=1, B=2)
- Blood relations: draw a family tree; seating: draw the circle or row and place the sure facts first
- Syllogism: draw Venn diagrams

## Verbal
- Subject-verb agreement, tenses, articles, prepositions
- Reading comprehension: read the questions first, then scan the passage

## Speed tips
- Do easy questions first; skip anything over 2 minutes; use elimination on options
`,
'Interview & HR Prep': `# Interview and HR notes

## Before the interview
- Read the job post: list the 5 skills it asks for and match one project or example to each
- Research the company: product, users, recent news; prepare 2 questions to ask
- Keep your resume, GitHub and LinkedIn consistent; be ready to explain every line

## Tell me about yourself (60 seconds)
Present (who you are now) -> Past (key projects and skills) -> Future (why this role)
Example: "I am a third-year CSE student who builds web apps with Python and SQL. My expense tracker has 200 users. I want to grow as a backend intern with your team."

## STAR for behavioural questions
- Situation, Task, Action, Result (use a number in the result)
- Prepare 5 stories: teamwork, conflict, failure, leadership, learning something fast

## Technical rounds
- Think aloud; ask clarifying questions; start simple, then improve
- Explain your project: problem, tech choices and why, hardest bug, what you would improve
- If you do not know: say what you know, how you would find out, and keep going

## HR round
- Strengths with proof, weaknesses with a fix, why this company, salary (give a range after research, or "as per company norms")
- Questions to ask: "What does success look like in 3 months?" and "How does the team review code?"

## Resume and ATS
- One page, simple layout, keywords from the job post, measurable results ("cut load time by 40%")
- Sections: Summary, Skills, Projects, Education, Certifications

## Day of
- Test your internet, camera and mic; keep water and a notepad; join 5 minutes early
- Send a short thank-you message within 24 hours
`,
});
