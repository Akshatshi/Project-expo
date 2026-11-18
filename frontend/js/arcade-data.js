// Questions for the Code Arcade. "options[0]" is the right answer (the game shuffles them).
window.SM_ARCADE = {
 "langs": [
  {
   "id": "python",
   "name": "Python",
   "code": "PY",
   "color": "#3b8fd9",
   "blurb": "Output guessing, bugs and loops",
   "count": 12
  },
  {
   "id": "html",
   "name": "HTML",
   "code": "HT",
   "color": "#e8743b",
   "blurb": "Tags, links, lists, structure",
   "count": 9
  },
  {
   "id": "css",
   "name": "CSS",
   "code": "CS",
   "color": "#3b6cff",
   "blurb": "Selectors, flexbox, colours",
   "count": 8
  },
  {
   "id": "javascript",
   "name": "JavaScript",
   "code": "JS",
   "color": "#e6c229",
   "blurb": "Variables, arrays, DOM",
   "count": 10
  },
  {
   "id": "sql",
   "name": "SQL",
   "code": "SQL",
   "color": "#2f9e86",
   "blurb": "Queries, joins, grouping",
   "count": 9
  },
  {
   "id": "java",
   "name": "Java",
   "code": "JV",
   "color": "#c2543a",
   "blurb": "OOP basics and syntax",
   "count": 8
  },
  {
   "id": "cpp",
   "name": "C++",
   "code": "C++",
   "color": "#8a5cf6",
   "blurb": "Pointers, STL, basics",
   "count": 8
  },
  {
   "id": "git",
   "name": "Git",
   "code": "GIT",
   "color": "#d9527a",
   "blurb": "Commands every dev uses",
   "count": 8
  }
 ],
 "questions": {
  "python": [
   {
    "type": "mcq",
    "q": "What will this code print?",
    "code": "print(3 * \"ab\")",
    "options": [
     "ababab",
     "ab3",
     "aaabbb",
     "Error"
    ],
    "why": "A string multiplied by a number repeats the string."
   },
   {
    "type": "mcq",
    "q": "What will this code print?",
    "code": "x = [1, 2, 3]\nx.append(4)\nprint(len(x))",
    "options": [
     "4",
     "3",
     "5",
     "[1, 2, 3, 4]"
    ],
    "why": "append adds one item, so the list now has 4 items."
   },
   {
    "type": "mcq",
    "q": "What will this code print?",
    "code": "print(10 // 3, 10 % 3)",
    "options": [
     "3 1",
     "3.33 1",
     "3 3",
     "1 3"
    ],
    "why": "// gives the whole-number quotient (3) and % gives the remainder (1)."
   },
   {
    "type": "mcq",
    "q": "What will this code print?",
    "code": "name = \"Asha\"\nprint(name[1:3])",
    "options": [
     "sh",
     "As",
     "sha",
     "Ash"
    ],
    "why": "Slicing starts at index 1 and stops before index 3, so you get \"sh\"."
   },
   {
    "type": "mcq",
    "q": "What will this code print?",
    "code": "d = {\"a\": 1}\nd[\"b\"] = 2\nprint(list(d.keys()))",
    "options": [
     "['a', 'b']",
     "['a']",
     "['b']",
     "[1, 2]"
    ],
    "why": "Assigning to a new key adds it to the dictionary."
   },
   {
    "type": "mcq",
    "q": "What will this code print?",
    "code": "print(5 / 2)",
    "options": [
     "2.5",
     "2",
     "2.0",
     "3"
    ],
    "why": "In Python 3, / always gives a float."
   },
   {
    "type": "mcq",
    "q": "Which keyword defines a function in Python?",
    "options": [
     "def",
     "function",
     "fun",
     "define"
    ],
    "why": "Functions start with the def keyword."
   },
   {
    "type": "mcq",
    "q": "Which data type is immutable (cannot be changed after creation)?",
    "options": [
     "tuple",
     "list",
     "dict",
     "set"
    ],
    "why": "Tuples cannot be modified; lists, dicts and sets can."
   },
   {
    "type": "mcq",
    "q": "Find the bug",
    "options": [
     "A colon (:) is missing after the condition",
     "A semicolon is missing",
     "It needs curly braces",
     "It needs the word then"
    ],
    "why": "In Python an if line must end with a colon, and the body is indented.",
    "code": "score = 72\nif score > 50\n    print(\"pass\")"
   },
   {
    "type": "fill",
    "q": "Type the missing word",
    "code": "for i in ____(5):\n    print(i)",
    "accept": [
     "range"
    ],
    "why": "range(5) gives 0, 1, 2, 3, 4."
   },
   {
    "type": "fill",
    "q": "Type the missing word",
    "code": "names = [\"Asha\", \"Ravi\"]\nprint(____(names))   # prints 2",
    "accept": [
     "len"
    ],
    "why": "len() returns the number of items."
   },
   {
    "type": "order",
    "q": "Put the lines in the right order",
    "lines": [
     "def greet(name):",
     "    message = 'Hello ' + name",
     "    return message",
     "print(greet('Asha'))"
    ],
    "why": "Define the function first, then call it."
   }
  ],
  "javascript": [
   {
    "type": "mcq",
    "q": "What will this code print?",
    "code": "console.log(typeof null)",
    "options": [
     "object",
     "null",
     "undefined",
     "number"
    ],
    "why": "A famous JavaScript quirk: typeof null is \"object\"."
   },
   {
    "type": "mcq",
    "q": "What will this code print?",
    "code": "console.log([1, 2, 3].map(n => n * 2).join(\",\"))",
    "options": [
     "2,4,6",
     "1,2,3",
     "2,4",
     "6"
    ],
    "why": "map runs the function on every item and returns a new array."
   },
   {
    "type": "mcq",
    "q": "What will this code print?",
    "code": "let a = \"5\";\nlet b = 2;\nconsole.log(a + b);",
    "options": [
     "52",
     "7",
     "5 2",
     "NaN"
    ],
    "why": "With a string, + joins text, so \"5\" + 2 becomes \"52\"."
   },
   {
    "type": "mcq",
    "q": "What will this code print?",
    "code": "console.log(0.1 + 0.2 === 0.3)",
    "options": [
     "false",
     "true",
     "undefined",
     "NaN"
    ],
    "why": "Decimal numbers are stored in binary, so 0.1 + 0.2 is 0.30000000000000004."
   },
   {
    "type": "mcq",
    "q": "What will this code print?",
    "code": "console.log([...\"abc\"].reverse().join(\"\"))",
    "options": [
     "cba",
     "abc",
     "bac",
     "undefined"
    ],
    "why": "Spread the text into letters, reverse them, then join them back."
   },
   {
    "type": "mcq",
    "q": "Which keyword declares a block-scoped variable you can change later?",
    "options": [
     "let",
     "var",
     "int",
     "dim"
    ],
    "why": "let is block scoped; const is block scoped but cannot be reassigned."
   },
   {
    "type": "mcq",
    "q": "How do you select the element that has id=\"box\"?",
    "options": [
     "document.getElementById(\"box\")",
     "document.getElement(\"box\")",
     "document.id(\"box\")",
     "select(\"#box\")"
    ],
    "why": "getElementById (or querySelector(\"#box\")) finds an element by its id."
   },
   {
    "type": "mcq",
    "q": "Why does this code fail?",
    "options": [
     "const variables cannot be reassigned",
     "5 is too small",
     "x needs var",
     "a semicolon is missing"
    ],
    "why": "Use let if the value must change.",
    "code": "const x = 5;\nx = 10;"
   },
   {
    "type": "fill",
    "q": "Type the missing word",
    "code": "const nums = [1, 2, 3];\nconst total = nums.____((a, b) => a + b, 0);",
    "accept": [
     "reduce"
    ],
    "why": "reduce folds an array into a single value."
   },
   {
    "type": "order",
    "q": "Put the lines in the right order",
    "lines": [
     "const add = (a, b) => {",
     "  return a + b;",
     "};",
     "console.log(add(2, 3));"
    ],
    "why": "Create the function before calling it."
   }
  ],
  "html": [
   {
    "type": "mcq",
    "q": "Which tag creates the biggest heading?",
    "options": [
     "<h1>",
     "<head>",
     "<h6>",
     "<title>"
    ],
    "why": "<h1> is the top-level heading, <h6> the smallest."
   },
   {
    "type": "mcq",
    "q": "Which attribute gives alternate text for an image?",
    "options": [
     "alt",
     "title",
     "src",
     "text"
    ],
    "why": "alt is read by screen readers and shown if the image fails to load."
   },
   {
    "type": "mcq",
    "q": "Which tag creates a link?",
    "options": [
     "<a href=\"...\">",
     "<link>",
     "<url>",
     "<href>"
    ],
    "why": "The anchor tag <a> with an href attribute makes a link."
   },
   {
    "type": "mcq",
    "q": "Find the bug",
    "options": [
     "An <a> link uses href, not src",
     "The text is too short",
     "There is no closing tag",
     "It needs a <br> tag"
    ],
    "why": "Use <a href=\"https://example.com\">Visit</a>.",
    "code": "<a src=\"https://example.com\">Visit</a>"
   },
   {
    "type": "mcq",
    "q": "Which tag holds the text shown on the browser tab?",
    "options": [
     "<title>",
     "<h1>",
     "<header>",
     "<tab>"
    ],
    "why": "<title> goes inside <head>."
   },
   {
    "type": "mcq",
    "q": "Which semantic tag is meant for navigation links?",
    "options": [
     "<nav>",
     "<menu-bar>",
     "<links>",
     "<div>"
    ],
    "why": "Semantic tags like <nav>, <header>, <main>, <footer> describe the content."
   },
   {
    "type": "fill",
    "q": "Type the missing word",
    "code": "<____ src=\"logo.png\" alt=\"Logo\">",
    "accept": [
     "img"
    ],
    "why": "The image tag is <img> and it needs no closing tag."
   },
   {
    "type": "fill",
    "q": "Type the missing word",
    "code": "<____>\n  <li>Python</li>\n  <li>HTML</li>\n</ul>",
    "accept": [
     "ul"
    ],
    "why": "<ul> is an unordered (bullet) list."
   },
   {
    "type": "order",
    "q": "Put the lines in the right order",
    "lines": [
     "<!DOCTYPE html>",
     "<html>",
     "<body>",
     "<h1>Hello</h1>",
     "</body>",
     "</html>"
    ],
    "why": "The doctype comes first, then html, then body, and tags close in reverse order."
   }
  ],
  "css": [
   {
    "type": "mcq",
    "q": "Which property changes the text colour?",
    "options": [
     "color",
     "font-color",
     "text-color",
     "background"
    ],
    "why": "color sets text colour; background-color sets the background."
   },
   {
    "type": "mcq",
    "q": "Which property adds space INSIDE an element, between content and border?",
    "options": [
     "padding",
     "margin",
     "gap",
     "spacing"
    ],
    "why": "padding is inside the border, margin is outside."
   },
   {
    "type": "mcq",
    "q": "Which selector targets elements with class=\"card\"?",
    "options": [
     ".card",
     "#card",
     "card",
     "*card"
    ],
    "why": "A dot means class, a hash means id."
   },
   {
    "type": "mcq",
    "q": "Which unit is relative to the width of the screen?",
    "options": [
     "vw",
     "px",
     "cm",
     "pt"
    ],
    "why": "1vw is 1% of the viewport width."
   },
   {
    "type": "mcq",
    "q": "What colour will this paragraph be?",
    "options": [
     "red",
     "blue",
     "black",
     "purple"
    ],
    "why": "The class selector is more specific than the tag selector, so it wins.",
    "code": "p { color: blue; }\n.note { color: red; }\n\n<p class=\"note\">Hi</p>"
   },
   {
    "type": "mcq",
    "q": "Which property gives rounded corners?",
    "options": [
     "border-radius",
     "corner-round",
     "round",
     "border-curve"
    ],
    "why": "border-radius: 50% makes a circle from a square."
   },
   {
    "type": "fill",
    "q": "Type the missing word",
    "code": ".box {\n  display: ____;\n  justify-content: center;\n}",
    "accept": [
     "flex"
    ],
    "why": "display: flex turns on Flexbox, which justify-content and align-items need."
   },
   {
    "type": "fill",
    "q": "Type the missing word",
    "code": "@media (max-width: 600px) {\n  .menu { ____: none; }\n}",
    "accept": [
     "display"
    ],
    "why": "display: none hides the element on small screens."
   }
  ],
  "sql": [
   {
    "type": "mcq",
    "q": "What will this code print?",
    "code": "SELECT COUNT(*) FROM students;",
    "options": [
     "3",
     "2",
     "4",
     "90"
    ],
    "why": "COUNT(*) counts the rows."
   },
   {
    "type": "mcq",
    "q": "What will this code print?",
    "code": "SELECT name FROM students\nWHERE marks > 70\nORDER BY marks DESC;",
    "options": [
     "Meera\nAsha",
     "Asha\nMeera",
     "Meera",
     "Ravi"
    ],
    "why": "Only Asha (80) and Meera (90) pass the filter; DESC puts the highest first."
   },
   {
    "type": "mcq",
    "q": "What will this code print?",
    "code": "SELECT MAX(marks) FROM students;",
    "options": [
     "90",
     "60",
     "80",
     "230"
    ],
    "why": "MAX returns the biggest value in the column."
   },
   {
    "type": "mcq",
    "q": "Which clause filters groups AFTER GROUP BY?",
    "options": [
     "HAVING",
     "WHERE",
     "ORDER BY",
     "LIMIT"
    ],
    "why": "WHERE filters rows before grouping; HAVING filters the groups."
   },
   {
    "type": "mcq",
    "q": "Which JOIN returns only the rows that match in both tables?",
    "options": [
     "INNER JOIN",
     "LEFT JOIN",
     "CROSS JOIN",
     "OUTER JOIN"
    ],
    "why": "INNER JOIN keeps only matching rows."
   },
   {
    "type": "mcq",
    "q": "Which statement adds a new row?",
    "options": [
     "INSERT INTO",
     "ADD ROW",
     "UPDATE",
     "CREATE ROW"
    ],
    "why": "INSERT INTO table (cols) VALUES (...)."
   },
   {
    "type": "mcq",
    "q": "Why does this query return nothing?",
    "options": [
     "NULL must be checked with IS NULL",
     "The table is empty",
     "name must be quoted",
     "marks cannot be compared"
    ],
    "why": "Use WHERE marks IS NULL, because NULL is never equal to anything.",
    "code": "SELECT name FROM students\nWHERE marks = NULL;"
   },
   {
    "type": "fill",
    "q": "Type the missing word",
    "code": "SELECT * FROM students ____ BY marks DESC;",
    "accept": [
     "order"
    ],
    "why": "ORDER BY sorts the result."
   },
   {
    "type": "order",
    "q": "Put the lines in the right order",
    "lines": [
     "SELECT name, marks",
     "FROM students",
     "WHERE marks > 60",
     "ORDER BY marks DESC;"
    ],
    "why": "SELECT, FROM, WHERE, then ORDER BY."
   }
  ],
  "java": [
   {
    "type": "mcq",
    "q": "What will this code print?",
    "code": "int a = 7, b = 2;\nSystem.out.println(a / b);",
    "options": [
     "3",
     "3.5",
     "4",
     "3.0"
    ],
    "why": "Dividing two ints gives an int, so 7 / 2 is 3."
   },
   {
    "type": "mcq",
    "q": "What will this code print?",
    "code": "String s = \"Java\";\nSystem.out.println(s.length());",
    "options": [
     "4",
     "3",
     "5",
     "0"
    ],
    "why": "length() counts the characters."
   },
   {
    "type": "mcq",
    "q": "What will this code print?",
    "code": "int[] a = {4, 5, 6};\nSystem.out.println(a[1]);",
    "options": [
     "5",
     "4",
     "6",
     "Error"
    ],
    "why": "Array indexes start at 0, so a[1] is the second item."
   },
   {
    "type": "mcq",
    "q": "Which keyword makes a class inherit from another class?",
    "options": [
     "extends",
     "implements",
     "inherits",
     "super"
    ],
    "why": "class Dog extends Animal. implements is for interfaces."
   },
   {
    "type": "mcq",
    "q": "Which method is the entry point of a Java program?",
    "options": [
     "public static void main(String[] args)",
     "void start()",
     "static run()",
     "public main()"
    ],
    "why": "The JVM looks for exactly this signature."
   },
   {
    "type": "mcq",
    "q": "What is wrong with this line?",
    "options": [
     "Text needs double quotes; single quotes are for one char",
     "Name is a reserved word",
     "It needs the new keyword",
     "Nothing, it is fine"
    ],
    "why": "Write String name = \"Asha\"; or char c = 'A';",
    "code": "String name = 'Asha';"
   },
   {
    "type": "mcq",
    "q": "Which collection keeps only unique elements?",
    "options": [
     "HashSet",
     "ArrayList",
     "LinkedList",
     "Stack"
    ],
    "why": "A Set does not allow duplicates."
   },
   {
    "type": "fill",
    "q": "Type the missing word",
    "code": "System.out.____(\"Hello\");",
    "accept": [
     "println",
     "print"
    ],
    "why": "System.out.println prints a line of text."
   }
  ],
  "cpp": [
   {
    "type": "mcq",
    "q": "What will this code print?",
    "code": "int x = 5;\nint *p = &x;\n*p = 9;\ncout << x;",
    "options": [
     "9",
     "5",
     "&x",
     "Error"
    ],
    "why": "p points to x, so changing *p changes x."
   },
   {
    "type": "mcq",
    "q": "What will this code print?",
    "code": "cout << 7 / 2 << \" \" << 7 % 2;",
    "options": [
     "3 1",
     "3.5 1",
     "4 1",
     "3 3"
    ],
    "why": "Integer division gives 3 and % gives the remainder 1."
   },
   {
    "type": "mcq",
    "q": "What will this code print?",
    "code": "string s = \"abc\";\ns += \"d\";\ncout << s.size();",
    "options": [
     "4",
     "3",
     "5",
     "abcd"
    ],
    "why": "+= appends, so the string has 4 characters."
   },
   {
    "type": "mcq",
    "q": "Which header do you need for cout?",
    "options": [
     "#include <iostream>",
     "#include <stdio.h>",
     "#include <string>",
     "#include <cout>"
    ],
    "why": "iostream gives cin and cout."
   },
   {
    "type": "mcq",
    "q": "Which symbol gives the address of a variable?",
    "options": [
     "&",
     "*",
     "#",
     "@"
    ],
    "why": "&x is the address of x, *p is the value at address p."
   },
   {
    "type": "mcq",
    "q": "What is the problem here?",
    "options": [
     "Index 3 is out of range (valid: 0 to 2)",
     "Arrays cannot hold ints",
     "cout cannot print arrays",
     "Nothing"
    ],
    "why": "An array of size 3 has indexes 0, 1, 2.",
    "code": "int arr[3] = {1, 2, 3};\ncout << arr[3];"
   },
   {
    "type": "mcq",
    "q": "Which STL container is a dynamic array?",
    "options": [
     "vector",
     "map",
     "set",
     "pair"
    ],
    "why": "vector grows automatically when you push_back."
   },
   {
    "type": "fill",
    "q": "Type the missing word",
    "code": "for (int i = 0; i < 3; ____) cout << i;",
    "accept": [
     "i++",
     "++i",
     "i += 1",
     "i = i + 1",
     "i=i+1"
    ],
    "why": "i++ increases i by 1 each time."
   }
  ],
  "git": [
   {
    "type": "mcq",
    "q": "Which command saves your staged changes with a message?",
    "options": [
     "git commit -m \"message\"",
     "git save",
     "git push -m \"message\"",
     "git stage \"message\""
    ],
    "why": "Commit records a snapshot in your local history."
   },
   {
    "type": "mcq",
    "q": "Which command stages all changed files?",
    "options": [
     "git add .",
     "git stage all",
     "git commit .",
     "git push ."
    ],
    "why": "git add . stages everything in the current folder."
   },
   {
    "type": "mcq",
    "q": "Which command downloads a repository from GitHub?",
    "options": [
     "git clone <url>",
     "git download <url>",
     "git pull <url>",
     "git copy <url>"
    ],
    "why": "Clone copies the whole repo to your computer."
   },
   {
    "type": "mcq",
    "q": "Which command shows what has changed?",
    "options": [
     "git status",
     "git show-all",
     "git diffall",
     "git list"
    ],
    "why": "git status lists modified and staged files."
   },
   {
    "type": "mcq",
    "q": "Which command sends your commits to GitHub?",
    "options": [
     "git push",
     "git send",
     "git upload",
     "git commit"
    ],
    "why": "git push uploads local commits to the remote."
   },
   {
    "type": "mcq",
    "q": "Which file tells Git to ignore files such as .env?",
    "options": [
     ".gitignore",
     ".gitskip",
     "ignore.txt",
     ".env.git"
    ],
    "why": "List secrets and big folders (node_modules) in .gitignore."
   },
   {
    "type": "fill",
    "q": "Type the missing word",
    "code": "git ____ -b feature-login",
    "accept": [
     "checkout",
     "switch"
    ],
    "why": "git checkout -b creates and opens a new branch."
   },
   {
    "type": "order",
    "q": "Put the lines in the right order",
    "lines": [
     "git add .",
     "git commit -m 'Add login page'",
     "git push origin main"
    ],
    "why": "Stage, commit, then push."
   }
  ]
 },
 "sqlNote": "Table used in the output questions: students(name, marks) = (Asha, 80), (Ravi, 60), (Meera, 90)"
};
