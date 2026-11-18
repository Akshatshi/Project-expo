from urllib.parse import quote_plus

PLAYLIST_FILTER = "&sp=EgIQAw%253D%253D"  # YouTube search filter: Playlists only


def yt_playlist_search(query: str) -> str:
    return "https://www.youtube.com/results?search_query=" + quote_plus(query) + PLAYLIST_FILTER


def resources_for(skill: str) -> list:
    return [
        {"title": f"{skill} - full course (English)", "type": "YouTube playlist", "language": "English",
         "url": yt_playlist_search(f"{skill} full course for beginners")},
        {"title": f"{skill} - complete course (Hindi)", "type": "YouTube playlist", "language": "Hindi",
         "url": yt_playlist_search(f"{skill} complete course in hindi")},
        {"title": f"{skill} - projects & practice", "type": "YouTube playlist", "language": "English",
         "url": yt_playlist_search(f"{skill} project tutorial playlist")},
    ]


TRACKS = [
    {"id": "web", "title": "Web Development", "icon": "🌐", "internship_id": "web-developer", "color": "#7555e8",
     "summary": "Build websites and web apps - from static pages to full-stack products.",
     "stages": [
         {"name": "Foundation", "weeks": "Weeks 1-4", "skills": ["HTML", "CSS", "Responsive Design", "Git"]},
         {"name": "Core", "weeks": "Weeks 5-10", "skills": ["JavaScript", "REST APIs", "Problem Solving"]},
         {"name": "Framework", "weeks": "Weeks 11-16", "skills": ["React", "TypeScript"]},
         {"name": "Job-ready", "weeks": "Weeks 17-20", "skills": ["Node.js", "SQL", "Deployment"]}],
     "tools": ["VS Code", "GitHub", "Chrome DevTools", "Vercel / Netlify"]},
    {"id": "data", "title": "Data Science & AI", "icon": "🤖", "internship_id": "data-science-ml", "color": "#2f9e86",
     "summary": "Turn data into decisions - analysis, visualisation and machine learning.",
     "stages": [
         {"name": "Foundation", "weeks": "Weeks 1-4", "skills": ["Python", "Statistics", "Excel"]},
         {"name": "Data skills", "weeks": "Weeks 5-9", "skills": ["Pandas", "NumPy", "SQL", "Data Visualization"]},
         {"name": "Machine learning", "weeks": "Weeks 10-16", "skills": ["Machine Learning", "scikit-learn"]},
         {"name": "Job-ready", "weeks": "Weeks 17-20", "skills": ["Deep Learning", "Power BI", "Git"]}],
     "tools": ["Jupyter / Colab", "Kaggle", "GitHub", "Power BI"]},
    {"id": "backend", "title": "Backend Development", "icon": "⚙️", "internship_id": "backend-developer", "color": "#d98a2b",
     "summary": "Design APIs, databases and the server logic behind every app.",
     "stages": [
         {"name": "Foundation", "weeks": "Weeks 1-4", "skills": ["Python", "Data Structures", "Git"]},
         {"name": "Core", "weeks": "Weeks 5-9", "skills": ["SQL", "REST APIs", "Flask"]},
         {"name": "Production", "weeks": "Weeks 10-14", "skills": ["Docker", "Unit Testing", "Object Oriented Programming"]},
         {"name": "Job-ready", "weeks": "Weeks 15-18", "skills": ["System Design basics", "Authentication", "Deployment"]}],
     "tools": ["Postman", "SQLite / PostgreSQL", "Docker", "GitHub"]},
    {"id": "java", "title": "Java & Spring", "icon": "☕", "internship_id": "java-developer", "color": "#c2543a",
     "summary": "Enterprise-grade development used by banks and big product companies.",
     "stages": [
         {"name": "Foundation", "weeks": "Weeks 1-5", "skills": ["Java", "Object Oriented Programming"]},
         {"name": "Core", "weeks": "Weeks 6-10", "skills": ["Data Structures", "SQL", "Git"]},
         {"name": "Framework", "weeks": "Weeks 11-16", "skills": ["Spring Boot", "REST APIs"]},
         {"name": "Job-ready", "weeks": "Weeks 17-20", "skills": ["Problem Solving", "Microservices basics"]}],
     "tools": ["IntelliJ IDEA", "Maven", "Postman", "GitHub"]},
    {"id": "android", "title": "Android Development", "icon": "📱", "internship_id": "android-developer", "color": "#3b8fd9",
     "summary": "Build mobile apps used by millions of people.",
     "stages": [
         {"name": "Foundation", "weeks": "Weeks 1-4", "skills": ["Kotlin", "Java", "Git"]},
         {"name": "Core", "weeks": "Weeks 5-10", "skills": ["Android SDK", "REST APIs"]},
         {"name": "Backend services", "weeks": "Weeks 11-14", "skills": ["Firebase", "Room database"]},
         {"name": "Job-ready", "weeks": "Weeks 15-18", "skills": ["Problem Solving", "Play Store publishing"]}],
     "tools": ["Android Studio", "Firebase", "GitHub", "Figma"]},
    {"id": "security", "title": "Cybersecurity", "icon": "🛡️", "internship_id": "cybersecurity", "color": "#a33bd9",
     "summary": "Learn how systems get attacked - and how to defend them.",
     "stages": [
         {"name": "Foundation", "weeks": "Weeks 1-4", "skills": ["Networking", "Linux"]},
         {"name": "Core", "weeks": "Weeks 5-9", "skills": ["Security Fundamentals", "Python", "Cryptography"]},
         {"name": "Hands-on", "weeks": "Weeks 10-15", "skills": ["Web security basics", "Problem Solving"]},
         {"name": "Job-ready", "weeks": "Weeks 16-20", "skills": ["CTF practice", "Security tools"]}],
     "tools": ["Kali Linux (VM)", "Wireshark", "TryHackMe", "GitHub"]},
    {"id": "devops", "title": "DevOps & Cloud", "icon": "☁️", "internship_id": "devops-cloud", "color": "#2b9ed9",
     "summary": "Ship software faster with automation, containers and the cloud.",
     "stages": [
         {"name": "Foundation", "weeks": "Weeks 1-4", "skills": ["Linux", "Networking", "Shell Scripting"]},
         {"name": "Core", "weeks": "Weeks 5-9", "skills": ["Git", "Docker", "Python"]},
         {"name": "Automation", "weeks": "Weeks 10-14", "skills": ["CI/CD", "AWS"]},
         {"name": "Job-ready", "weeks": "Weeks 15-18", "skills": ["Kubernetes basics", "Terraform basics"]}],
     "tools": ["Docker", "GitHub Actions", "AWS Free Tier", "Linux VM"]},
    {"id": "dsa", "title": "DSA & Placements", "icon": "🧠", "internship_id": "python-developer", "color": "#d9527a",
     "summary": "Crack coding rounds with strong problem-solving and fundamentals.",
     "stages": [
         {"name": "Foundation", "weeks": "Weeks 1-4", "skills": ["Python", "Problem Solving"]},
         {"name": "Core", "weeks": "Weeks 5-12", "skills": ["Data Structures", "Object Oriented Programming"]},
         {"name": "Practice", "weeks": "Weeks 13-18", "skills": ["SQL", "Unit Testing", "Git"]},
         {"name": "Job-ready", "weeks": "Weeks 19-22", "skills": ["Mock interviews", "Resume building"]}],
     "tools": ["LeetCode", "GeeksforGeeks", "GitHub", "HackerRank"]},
]


def _p(title, level, desc, features):
    return {"title": title, "level": level, "description": desc, "features": features}


LANGUAGE_PROJECTS = [
    {"language": "Python", "icon": "🐍", "projects": [
        _p("Number Guessing & Quiz CLI", "Beginner", "Terminal games that teach loops, conditions and functions.", ["Random numbers", "Score tracking", "Input validation"]),
        _p("Expense Tracker", "Beginner", "Add expenses, categorise them and see monthly totals saved in a CSV file.", ["File handling", "Dictionaries", "Simple reports"]),
        _p("Weather CLI with API", "Intermediate", "Fetch live weather from a free public API and print a clean summary.", ["requests library", "JSON parsing", "Error handling"]),
        _p("Flask Blog with Login", "Intermediate", "A multi-user blog with signup, login and CRUD posts using SQLite.", ["Flask", "SQLite", "Sessions"]),
        _p("Resume Screener (ML)", "Advanced", "Rank resumes against a job description using TF-IDF and cosine similarity.", ["scikit-learn", "Text processing", "Streamlit UI"])]},
    {"language": "JavaScript", "icon": "🟨", "projects": [
        _p("Digital Clock & Stopwatch", "Beginner", "Learn DOM and timers by building a clock, stopwatch and countdown.", ["setInterval", "DOM updates", "Buttons & events"]),
        _p("To-Do App with LocalStorage", "Beginner", "Add, edit, delete and filter tasks that survive a page refresh.", ["Arrays", "LocalStorage", "Event delegation"]),
        _p("Movie Search App", "Intermediate", "Search movies using a public API with loading and error states.", ["fetch + async/await", "Debounced search", "Responsive grid"]),
        _p("Expense Splitter (Chat-style)", "Intermediate", "Split bills among friends and show who owes whom.", ["Algorithms", "Form validation", "Charts"]),
        _p("Real-time Chat (Node + Socket.io)", "Advanced", "A multi-room chat with usernames and typing indicators.", ["Node.js", "WebSockets", "Express"])]},
    {"language": "HTML / CSS", "icon": "🎨", "projects": [
        _p("Personal Portfolio", "Beginner", "A responsive multi-section portfolio with a contact form.", ["Flexbox", "Grid", "Media queries"]),
        _p("Restaurant Landing Page", "Beginner", "Hero, menu cards, gallery and footer with smooth hover effects.", ["Typography", "Transitions", "Image optimisation"]),
        _p("Animated Pricing Page", "Intermediate", "Pricing cards with toggle, gradients and CSS animations.", ["CSS variables", "Keyframes", "Dark mode"]),
        _p("Clone a Popular Website", "Intermediate", "Recreate a real site's homepage pixel-perfectly and make it mobile-ready.", ["Layout skills", "Accessibility", "Cross-browser tests"])]},
    {"language": "Java", "icon": "☕", "projects": [
        _p("Bank Account Simulator", "Beginner", "Deposit, withdraw and transfer money using classes and exceptions.", ["OOP", "Exceptions", "Collections"]),
        _p("Library Management (Console)", "Intermediate", "Books, members and issue/return flow with file persistence.", ["Inheritance", "File I/O", "ArrayList / HashMap"]),
        _p("Student REST API (Spring Boot)", "Intermediate", "CRUD API for students with validation and an H2/MySQL database.", ["Spring Boot", "JPA", "REST"]),
        _p("Online Quiz Platform", "Advanced", "Role-based quiz app with JWT login and score analytics.", ["Spring Security", "MySQL", "Layered architecture"])]},
    {"language": "C / C++", "icon": "🧩", "projects": [
        _p("Tic-Tac-Toe & Snake in Console", "Beginner", "Practice arrays, loops and functions with classic games.", ["Arrays", "Functions", "Game loop"]),
        _p("Student Record System", "Beginner", "Store, search and sort student records using structs and files.", ["Structs", "File handling", "Sorting"]),
        _p("Mini DSA Library", "Intermediate", "Implement linked list, stack, queue and BST from scratch with tests.", ["Pointers", "STL comparison", "Time complexity"]),
        _p("Text-based Bank with OOP", "Intermediate", "Use classes, inheritance and operator overloading to model accounts.", ["OOP", "Encapsulation", "Templates"])]},
    {"language": "SQL", "icon": "🗄️", "projects": [
        _p("Library Database Design", "Beginner", "Design tables, keys and relationships, then write 20 useful queries.", ["ER diagrams", "JOINs", "Constraints"]),
        _p("Sales Analytics Queries", "Intermediate", "Answer business questions with GROUP BY, window functions and CTEs.", ["Aggregations", "Window functions", "CTEs"]),
        _p("Hospital Management Schema", "Intermediate", "Normalised schema with triggers, views and stored procedures.", ["Normalisation", "Views", "Indexes"])]},
    {"language": "Kotlin", "icon": "📱", "projects": [
        _p("Notes App", "Beginner", "Create, edit and delete notes stored locally with Room.", ["RecyclerView", "Room DB", "MVVM"]),
        _p("News Reader", "Intermediate", "Fetch headlines from a free news API with images and pull-to-refresh.", ["Retrofit", "Coroutines", "Coil / Glide"]),
        _p("Habit Tracker with Firebase", "Advanced", "Sign in with Google, sync habits to the cloud and send reminders.", ["Firebase Auth", "Firestore", "WorkManager"])]},
    {"language": "TypeScript / React", "icon": "⚛️", "projects": [
        _p("Task Manager (React)", "Beginner", "Components, props and state with filters and drag-to-reorder.", ["useState / useEffect", "Component design", "LocalStorage"]),
        _p("E-commerce Cart", "Intermediate", "Product listing, cart, coupon logic and checkout summary.", ["Context API", "Routing", "Mock API"]),
        _p("Typed Kanban Board", "Advanced", "Drag-and-drop board with TypeScript types and persistent state.", ["TypeScript", "Reducers", "Testing Library"])]},
]


def track_by_id(track_id):
    return next((t for t in TRACKS if t["id"] == track_id), None)


def tracks_with_resources():
    out = []
    for t in TRACKS:
        stages = []
        for st in t["stages"]:
            stages.append({**st, "resources": [
                {"skill": s, "title": f"{s} - free playlists",
                 "english": yt_playlist_search(f"{s} full course for beginners"),
                 "hindi": yt_playlist_search(f"{s} complete course in hindi")} for s in st["skills"]]})
        out.append({**t, "stages": stages})
    return out
