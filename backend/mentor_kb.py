import difflib
import re

ENTRIES = [
    ("skill test | assessment | verify skill | level test | test kaise | claimed level", "'Skill Test' mein skill aur apna claim kiya level chuno. Har baar random 8 sawal aate hain: 5 theory, 2 code padhna (output batana) aur 1 practical task. Score 7+ = Advanced, 4-6 = Intermediate, baaki Beginner. Result mein dikhta hai ki aapne kya claim kiya aur test ne kya bataya, taaki roadmap sahi level se shuru ho. Galat jawab ke saath explanation bhi milta hai, to wahi seekh lo aur dobara test do."),
    ("resume | ats | cv | resume builder | ats score | resume checker", "'Career Toolkit' mein Resume builder single-column, bina image/table ka resume banata hai (ATS aisa hi padhta hai) aur Print se PDF ban jaata hai. ATS checker aapka resume text aur job description paste karke score deta hai: contact, sections, action verbs, numbers aur keywords check hote hain. Tip: har project line mein ek number likho, jaise '30% faster' ya '200 users'."),
    ("linkedin | linkedin profile | headline | about section", "Toolkit ke LinkedIn tab mein headline aur About paste karo, profile strength % aur tips milte hain. Headline 'Role | Skills | Goal' format mein rakho, About mein 1-2 result (numbers), skills ke keywords aur 'Open to internships' zaroor likho, aur Featured mein 2-3 projects pin karo."),
    ("interview prep | interview questions | interview test | notes | job market | demand", "Toolkit mein Interview prep (Python, JavaScript, SQL, HR) ke sawal-jawab hain, 'Test mode' mein jawab chhup jaate hain taaki khud bol kar practice karo. Notes tab mein har language ke notes likho ya .txt/.md file upload karo. Job market tab dikhata hai ki platform ke roles mein kaunsi skills sabse zyada maangi jaati hain aur aapke paas kaunsi hain."),
    ("hi | hello | hey | namaste | hii | helo", "Hi {name}! Main aapka mentor hoon. Skills, projects, roadmap, internship, resume ya interview - kuch bhi poocho. Jaise: 'internship kaise milegi?' ya 'python kaise seekhu?'"),
    ("thanks | thank you | shukriya | thx | dhanyavad", "Welcome {name}! Aur kuch poochna ho to bina jhijhak poocho. All the best!"),
    ("who are you | tum kaun ho | aap kaun ho | what can you do | help me | madad", "Main SkillMatrix AI ka mentor hoon. Main website use karna, skills seekhne ka plan, projects, resume, GitHub aur interview ki taiyari mein madad karta hoon. Try karo: 'roadmap kaise banta hai?', 'resume tips', 'DSA kaise start karun?'."),

    ("what is skillmatrix | skillmatrix kya hai | what does this website do | features | kya kya hai | is website | platform kya", "SkillMatrix AI ek skill-gap platform hai. Aap apni skills daalte ho, internship chunte ho, ye match % aur missing skills batata hai, phir week-wise roadmap, free YouTube courses, projects, career tracks, focus timer, coding games (Code Arcade) aur AI mentor deta hai."),
    ("how to start | kaise start | shuru kaise | first step | where to begin | kahan se shuru | getting started", "Start karne ke 4 step: 1) 'Analyze My Skills' mein course + skills daalo aur target internship chuno. 2) 'Skill Gap Analysis' mein match % dekho. 3) 'Learning Roadmap' mein roadmap generate karo. 4) Roz 'Focus Timer' se 25 minute padho aur tasks tick karo."),
    ("analyze | analyse | analysis kaise | add skills | skills kaise add | skill add | target internship", "Left menu mein 'Analyze My Skills' kholo. Internship chuno, course/year bharo, skill ka naam likh kar level (Beginner/Intermediate/Advanced) chuno aur '+ Add' dabao. Phir 'Analyze My Skills' button dabao. Result 'Skill Gap Analysis' page par aayega."),
    ("match percent | match percentage | match % | percent kya | percentage kya | job match", "Match % batata hai ki aapki current skills us internship ki required skills se kitni milti hain. {match} Kam % ka matlab hai gaps zyada hain - ghabrao mat, roadmap wahi gaps bharta hai."),
    ("skill gap | gap kya | gaps | missing skills | priority | partial | needs improvement", "Skill gap = internship ko chahiye hui skill jo aapke paas nahi (missing) ya kam level par hai (partial). High priority wali skills pehle seekho. {gaps}"),
    ("roadmap kaise | how roadmap | generate roadmap | roadmap banta | roadmap generate | learning roadmap | weeks hours", "'Learning Roadmap' page par weeks (2-12) aur hours/week chuno aur 'Generate Roadmap' dabao. Roadmap turant dikhta hai aur AI ka personalised version peeche background mein ban kar apne aap update ho jaata hai. Har hafte ke tasks tick karte jao."),
    ("template roadmap | built-in roadmap | ai unavailable | ai offline | ai nahi chal | ai key | fallback", "Agar AI band ya slow ho to built-in template roadmap milta hai - wo bhi aapke skill gaps ke hisaab se bana hota hai. Thodi der baad dobara Generate karo to AI version mil sakta hai."),
    ("tick task | task complete | progress kaise | progress update | mark done | task done", "Roadmap mein har task ke saamne checkbox hai. Tick karte hi progress % update ho jaata hai aur dashboard par dikhta hai. Poora roadmap 100% hone par confetti aur badge milta hai."),
    ("focus timer | pomodoro | focus mode | timer kaise | study timer | streak", "'Focus Timer' mein 25 min focus + 5 min break (Pomodoro) chalta hai. Task chun sakte ho, 'Enter Focus Mode' se full-screen distraction-free ho jaata hai. Roz ek session karoge to streak badhta hai. Space dabane se start/pause hota hai."),
    ("projects section | project kaise | recommended project | start project | project tutorial | projects page", "'Projects' page mein 3 tab hain: Recommended (aapke gaps ke hisaab se), By language (Python, JS, Java, SQL...), My projects. Card par 'Start project' dabao, 'Starter code' se shuruaati code dekho aur 'Tutorial' se YouTube playlists dhundo."),
    ("starter code | basic code | project code | code kaha | sample code", "Har project card par 'Starter code' button hai - usse basic working code khulta hai jise copy karke apne project ki shuruaat kar sakte ho. Code ko samajhkar apne tareeke se badlo - copy-paste se seekhna nahi hota."),
    ("career track | tracks | career path | konsa track | which track", "'Career Tracks' mein 8 tracks hain: Web, Data Science & AI, Backend, Java, Android, Cybersecurity, DevOps & Cloud, DSA & Placements. Track kholo to stages, tools aur har skill ki free playlists milti hain."),
    ("free course | youtube playlist | playlist | free resources | free mein kaise seekhu | free learning", "Roadmap aur Career Tracks mein har skill ke saamne English aur Hindi YouTube playlist links hain. Aap apna pasandida teacher chun sakte ho. Docs ke liye MDN, official documentation, freeCodeCamp aur CS50 bhi free aur achhe hain."),
    ("game | arcade | code arcade | coding game | khelke | play | quiz | practice game", "'Code Arcade' mein Python, HTML, CSS, JavaScript, SQL, Java, C++ aur Git ke games hain: output guess, bug dhundo, blank bharo, lines sahi order mein lagao, aur live HTML/CSS challenges. Sahi jawab par XP milta hai aur level badhta hai."),
    ("profile | badge | badges | name change | naam badlo | my profile", "'My Profile' (top-left aapke naam par click) mein aapka naam badal sakte ho, stats dekh sakte ho aur 9 badges unlock kar sakte ho (analysis, roadmap, focus streak, project done...)."),
    ("login nahi | login problem | cannot login | forgot password | password bhool | password reset | account nahi | logged out | baar baar login", "Password bhool gaye to login page par 'Forgot Password?' dabao. Baar baar logout ho raha ho to login karte waqt 'Remember me' tick rakho. Naya account banana ho to 'Create Account' dabao."),
    ("data safe | privacy | password safe | mera data | secure", "Aapka password hash karke store hota hai (original kabhi save nahi hota). Login token signed hota hai. Data sirf aapke account ke liye hai aur dusre students ko nahi dikhta."),
    ("menu | slider | sidebar | hamburger | menu kaise khole | full screen", "Top-left corner ka button (teen lines) menu ko khol/band karta hai. Band karne par content full screen ho jaata hai. Mobile par menu ke bahar click karne se bhi band ho jaata hai."),
    ("schedule | my schedule | weekly plan | next steps | next step", "'My Schedule' mein is hafte ka din-wise plan hota hai aur 'Next Steps' mein 3 sabse zaroori kaam dikhte hain jo aapko aage badhayenge."),
    ("mentor kaise | ai mentor | mentor use | mentor se kya pooch", "AI Mentor se skills, projects, resume, interview, career - kuch bhi poocho (Hindi/English/Hinglish). Internet/AI na ho tab bhi main built-in jawab deta hoon."),

    ("what is internship | internship kya | internship meaning | internship hoti kya", "Internship ek short training job hoti hai (1-6 mahine) jahan aap company mein real kaam seekhte ho. Isse experience, resume ki value aur kai baar PPO (job offer) milta hai. Stipend paid ya unpaid ho sakta hai."),
    ("first internship | pehli internship | internship kaise milegi | no experience | bina experience | fresher internship | get internship", "Bina experience ke bhi milti hai: 1) 2-3 chhote projects banao aur GitHub par daalo. 2) 1-page resume banao. 3) Roz 5-10 jagah apply karo. 4) LinkedIn par HR/seniors ko chhota message bhejo. Skills dikhao, naam nahi - projects sabse bada saboot hain."),
    ("where to apply | internship kahan | internship platform | internshala | linkedin internship | unstop | wellfound | job portal", "Internship dhundne ke liye: Internshala, LinkedIn, Unstop, Wellfound (startups), company career pages, college placement cell, aur seniors ke referrals. Roz 5-10 applications ki aadat banao."),
    ("resume | cv | biodata | resume kaise | resume tips | resume banao", "Resume 1 page ka rakho. Order: Name + contact + GitHub/LinkedIn, Skills, Projects (2-3, har ek mein kya banaya + kaunsi tech), Education, Achievements. Projects ke saath live link/GitHub dena. Jhooth ya jo nahi aata wo skill mat likho."),
    ("ats | resume shortlist | resume reject | resume select", "ATS ek software hai jo resume mein keywords dhundta hai. Simple format rakho (no tables/images), job description ke keywords (jaise Python, SQL) apni skills mein sach ho to likho, aur PDF bhejo."),
    ("github | github profile | github kaise | github kya | repo | repository", "GitHub aapka coding portfolio hai. 3-4 achhe repos rakho, har repo mein README (kya hai, kaise chalaye, screenshot) likho, aur roz chhote commits karo. Profile par photo + short bio lagao."),
    ("portfolio | portfolio website | personal website", "Portfolio ek simple website hai: tum kaun ho, skills, 3 best projects (screenshot + live link + GitHub), contact. HTML/CSS se bana sakte ho aur GitHub Pages ya Netlify par free host kar sakte ho."),
    ("linkedin | linkedin profile | linkedin kaise", "LinkedIn par achhi photo, headline (jaise 'Python Developer | Learning Web Dev'), About mein 3 line, skills aur projects daalo. Roz 5 alag-alag logon (seniors, HR) ko personalised connect request bhejo."),
    ("cover letter | cold email | hr email | email kaise | mail to hr | message to hr", "Cold email chhoti rakho (5-6 line): 1) Naam + college, 2) kis role mein interest, 3) ek project ka link, 4) resume attach, 5) shukriya. Subject: 'Application for Python Intern - Your Name'. Har company ke liye thoda personalise karo."),
    ("interview | interview preparation | interview kaise | interview tips | interview ki taiyari | technical round", "Interview taiyari: 1) Apne projects achhe se samjho (kyun banaya, kya dikkat aayi). 2) Basics: language ke concepts, OOP, SQL, DSA ke easy sawal. 3) 'Tell me about yourself' 1 minute mein practice karo. 4) Mock interview dost ke saath. Jo nahi aata wo honestly bolo."),
    ("tell me about yourself | introduce yourself | hr question | hr round | common questions", "'Tell me about yourself' formula: Naam + college/year -> kaunsi skills seekhi -> ek project jo banaya -> aapko ye role kyun chahiye. 45-60 second, simple aur sach. Pehle se likh kar bolne ki practice karo."),
    ("stipend | paid internship | unpaid | salary | paisa | kitna milta", "Stipend company aur role par depend karta hai - kai internships unpaid bhi hoti hain. Shuru mein experience aur skill zyada important hai. Sirf paise ke liye achhi seekhne wali internship mat chhodo."),
    ("kitne ghante | hours study | daily study | time management | time kaise | study plan | kitna padhun", "Roz 2-3 focused ghante kaafi hain (Pomodoro: 25 min padho + 5 min break). Pehle 1 ghanta seekho, 1 ghanta practice/project. Weekend par ek mini project. Consistency > ek din mein 10 ghante."),
    ("motivation | consistent | consistency | procrastination | bore | focus nahi | man nahi lagta | demotivated | discipline", "Chhota start karo: roz sirf 25 minute. Phone door rakho, ek hi task chuno, Focus Timer ka streak todna mat. Seekhte waqt jaldi results nahi aate - 3-4 hafte lagatar karoge to farak dikhega."),
    ("certificate | certification | course certificate | certificates worth", "Certificates se zyada projects ki value hai. Free certificates (freeCodeCamp, NPTEL, Google/Microsoft ke free courses) ek achha plus hain, par resume mein projects pehle aane chahiye."),
    ("hackathon | open source | contribute | competition", "Hackathons team-work aur speed sikhate hain, resume mein achhe lagte hain. Open source mein 'good first issue' tag wale issues se shuru karo. Dono se networking aur real experience milta hai."),
    ("first year | 1st year | second year | 2nd year | third year | 3rd year | final year | 4th year | year wise | kis year mein kya", "1st year: programming basics (Python/C), logic, ek language pakki. 2nd year: DSA + web/dev basics, 2-3 projects, GitHub. 3rd year: internships, bade projects, interview prep. Final year: placements, resume, mock interviews. Har year mein ek skill gehri karo."),
    ("ppo | pre placement | job vs internship | placement kaise | campus placement", "PPO = internship ke baad mila job offer. Internship mein achha kaam, time par delivery aur sawal poochna PPO ke chance badhata hai. Placement ke liye DSA, projects aur communication teeno par kaam karo."),
    ("communication | soft skills | english | bolna | confidence | english kaise", "Communication roz practice se aata hai: apne projects ko 2 minute mein explain karo, ek dost ko samjhao, roz kuch likho. Perfect English zaroori nahi, saaf aur sach bolna zaroori hai."),

    ("which language first | pehli language | konsi language | python vs java | language kaun si | programming language chun", "Beginner ke liye Python best hai (simple syntax). Web ke liye HTML + CSS + JavaScript. Java/C++ placements aur DSA ke liye achhe hain. Ek language pakki karo, phir doosri aasani se aa jaati hai."),
    ("dsa | data structures | algorithm | leetcode | dsa kaise | dsa start | dsa kya", "DSA = data structures (array, string, stack, queue, linked list, tree, graph) + algorithms (sorting, searching, recursion). Ek language chuno, arrays/strings se shuru karo, roz 1-2 easy sawal LeetCode/GeeksforGeeks par karo aur code khud likho."),
    ("web development | web dev | web developer | website banana | full stack | frontend | backend | front end | back end", "Web dev path: HTML -> CSS -> JavaScript -> Git/GitHub -> React (frontend) ya Python Flask / Node.js (backend) -> SQL database -> deploy. Frontend = jo user dekhta hai, Backend = server + database, Full stack = dono."),
    ("data science | data analyst | data analysis | ai ml | machine learning kaise | ml roadmap | ml start", "Path: Python -> Statistics basics -> NumPy/Pandas -> Data visualization (Matplotlib) -> SQL -> Machine Learning (scikit-learn) -> projects (house price, EDA). Kaggle par free datasets aur notebooks milte hain."),
    ("android | app development | mobile app | kotlin kaise", "Android path: Kotlin (ya Java) basics -> Android Studio -> layouts/activities -> REST API + Retrofit -> Room/Firebase -> ek notes app aur news app banao -> Play Store par publish."),
    ("cyber security | cybersecurity | ethical hacking | hacking kaise | security", "Cybersecurity path: Networking + Linux basics -> security fundamentals -> Python scripting -> web security basics -> TryHackMe/CTF practice. Sirf legal labs aur apne systems par practice karo."),
    ("devops | cloud | aws | docker kaise | kubernetes", "DevOps path: Linux -> Git -> Docker -> CI/CD (GitHub Actions) -> AWS free tier -> Kubernetes basics. Ek web app ko Docker mein pack karke cloud par deploy karna best mini project hai."),
    ("backend developer | backend kaise | api kaise | server", "Backend path: ek language (Python/Java/Node) -> SQL + database design -> REST API banana -> authentication -> testing -> Docker -> deploy. Pehle ek chhoti Notes API banao."),

    ("html | html kya | html seekhu | html kaise", "HTML webpage ka structure banati hai (headings, paragraph, links, images, forms). Pehle <h1>, <p>, <a>, <img>, <ul>, <form> seekho, phir semantic tags (<header>, <section>). Code Arcade mein HTML live challenges khelo."),
    ("css | css kya | css seekhu | flexbox | grid | styling", "CSS page ko sundar banati hai: colors, fonts, spacing, layout. Seekhne ka order: selectors -> box model -> flexbox -> grid -> responsive (media queries). Flexbox se center karna: display:flex; justify-content:center; align-items:center;"),
    ("javascript | js kya | js seekhu | javascript kaise | dom", "JavaScript webpage ko interactive banati hai. Order: variables, functions, arrays/objects -> DOM (elements badalna) -> events -> fetch/API -> async/await. Pehle chhote projects: counter, to-do, quiz."),
    ("python | python kya | python seekhu | python kaise | python start", "Python simple aur powerful language hai (web, data, AI, automation). Order: variables, if/else, loops, functions, list/dict -> file handling -> OOP -> libraries (requests, pandas, flask). Roz chhote programs khud likho."),
    ("java | java kya | java seekhu | java kaise | oop java", "Java ek strongly-typed OOP language hai (backend, Android, enterprise). Order: syntax, loops, arrays -> classes/objects, inheritance, interfaces -> collections -> exceptions -> Spring Boot."),
    ("c++ | cpp | c plus plus | c language | c programming", "C/C++ speed aur DSA ke liye popular hain. Order: syntax, loops, arrays -> functions, pointers -> OOP (C++) -> STL (vector, map). Competitive programming ke liye C++ bahut use hoti hai."),
    ("sql | database | mysql | postgres | sql kya | sql seekhu | query", "SQL database se data nikalne/badalne ki language hai. Order: SELECT, WHERE, ORDER BY -> INSERT/UPDATE/DELETE -> JOIN -> GROUP BY + HAVING -> subqueries. Ek chhota library ya student database banakar practice karo."),
    ("git | git kya | git commands | git seekhu | version control", "Git code ka history sambhalta hai. Roz ke commands: git init, git add ., git commit -m 'msg', git push, git pull, git status, git branch. GitHub par repo banake push karo - ye resume mein dikhta hai."),
    ("react | react kya | react seekhu | reactjs", "React UI banane ki JavaScript library hai (components, props, state, hooks). Pehle JavaScript pakki karo, phir useState/useEffect, routing, API calls. Task manager aur shopping cart achhe projects hain."),
    ("node | nodejs | node.js | express", "Node.js se JavaScript server par chalti hai. Express framework se REST API banti hai. Order: npm, modules -> Express routes -> database (MongoDB/SQL) -> authentication -> deploy."),
    ("flask | django | python web | flask kya", "Flask chhota aur seekhne mein aasan Python web framework hai (isi website ka backend bhi Flask hai). Routes, templates/JSON, database aur login seekho. Django bada framework hai jisme sab kuch built-in hota hai."),
    ("rest api | api kya | api kaise | json | http | endpoint", "API ek tareeka hai jisse frontend aur backend baat karte hain. REST mein URLs (endpoints) hote hain: GET (data lo), POST (naya banao), PUT (badlo), DELETE (hatao). Data aksar JSON format mein aata hai."),
    ("docker | container | dockerfile", "Docker aapki app ko ek container mein pack karta hai taaki wo har jagah ek jaisi chale. Dockerfile mein base image, dependencies aur start command likhte hain. Commands: docker build, docker run."),
    ("linux | linux commands | terminal | shell | bash", "Basic Linux commands: ls (list), cd (folder badlo), pwd, mkdir, rm, cp, mv, cat, grep, chmod, sudo. Servers aur DevOps ke liye Linux zaroori hai. WSL ya VM mein practice karo."),
    ("oop | object oriented | class object | inheritance | polymorphism | encapsulation", "OOP ke 4 pillars: Encapsulation (data + methods ek jagah), Inheritance (parent se features lena), Polymorphism (ek naam, alag kaam), Abstraction (sirf zaroori cheez dikhana). Class = blueprint, Object = uska copy."),
    ("array | list | stack | queue | linked list | tree | graph | hash map | dictionary", "Array/list: index se data. Stack: last in first out. Queue: first in first out. Linked list: nodes jude hote hain. Tree/graph: relationships. Hash map/dict: key se turant value. Har ek ko khud code karke seekho."),
    ("pandas | numpy | matplotlib | data visualization | seaborn", "NumPy numbers ke arrays par fast maths karta hai. Pandas table (DataFrame) data saaf aur analyze karta hai. Matplotlib/Seaborn graphs banate hain. Kaggle ka koi chhota dataset lekar EDA karo."),
    ("machine learning | ml kya | scikit | model train | training | regression | classification", "Machine learning mein computer data se patterns seekhta hai. Regression = number predict (price). Classification = category predict (spam/not spam). Steps: data saaf karo -> train/test split -> model train -> accuracy check."),
    ("excel | power bi | powerbi | tableau | dashboard", "Excel mein formulas, pivot tables aur charts seekho. Power BI/Tableau data se interactive dashboards banate hain. Ek sales dataset lekar dashboard banana achha beginner project hai."),
    ("networking | tcp | ip address | dns | network basics | ports", "Networking basics: IP address (device ka pata), DNS (naam se IP), TCP/UDP (data bhejne ke rules), HTTP/HTTPS (web), ports (80, 443). Cybersecurity aur DevOps dono ke liye zaroori."),
    ("testing | unit test | pytest | debug | debugging | bug kaise", "Bug milne par: error message dhyan se padho, print/log lagao, chhota example banake test karo, aur ek baar mein ek hi cheez badlo. Unit tests (pytest/JUnit) se bugs jaldi pakde jaate hain."),
    ("typescript | ts kya", "TypeScript = JavaScript + types. Galtiyan code chalane se pehle hi pakad leta hai. JavaScript pakki hone ke baad seekho, React ke saath bahut use hota hai."),
    ("firebase | room database | android sdk", "Firebase se Android app mein login, cloud database aur notifications aasani se milte hain. Room local database hai. Notes app banakar dono seekh sakte ho."),
    ("documentation | docs kaise padhe | read docs | stackoverflow | error search", "Docs padhne ki aadat daalo: official docs / MDN pehle, phir StackOverflow. Error ko Google karo (error ka poora message likho). Samajh na aaye to chhota example khud chalao."),
    ("youtube se kaise seekhu | tutorial hell | sirf dekhna | video dekh kar", "Sirf video dekhna kaafi nahi. Rule: 1 ghanta dekho, phir wahi code bina dekhe khud likho, phir usme ek naya feature jodo. Tutorial hell se nikalne ka yahi tareeka hai."),
    ("free resources | best site | kahan se padhu | website to learn | learning sites", "Free aur achhe: freeCodeCamp, MDN Web Docs, W3Schools (quick reference), CS50 (Harvard), NPTEL, GeeksforGeeks, Kaggle Learn, official docs, aur YouTube channels. Is platform par har skill ke saath playlist links bhi milte hain."),
    ("what to learn | kya seekhun | kya sikhna chahiye | first learn | learn first | pehle kya", "{gaps} Aam salah: ek hi skill pe 2-3 hafte focus karo, har hafte ek mini project banao, aur Roadmap ke tasks tick karte jao."),
    ("project idea | project ideas | kya project banau | mini project | project suggest", "Beginner ideas: to-do app, quiz game, portfolio site, expense tracker, weather app. Intermediate: notes REST API, student management, URL shortener, shopping cart. Projects page mein language-wise ideas aur starter code bhi hain."),
]

_COMPILED = [([k.strip().lower() for k in keys.split("|") if k.strip()], text) for keys, text in ENTRIES]
_NOISE = re.compile(r"[^a-z0-9+#.%\s]")


def _normalize(text):
    return " ".join(_NOISE.sub(" ", str(text).lower()).split())


def _score(keys, norm, tokens):
    total = 0
    for key in keys:
        if " " in key or len(key) <= 2:
            if re.search(r"(?<![a-z0-9])" + re.escape(key) + r"(?![a-z0-9])", norm):
                total += 3 if " " in key else 2
        elif key in tokens:
            total += 2
        elif any(t.startswith(key) or key.startswith(t) for t in tokens if len(t) >= 4 and len(key) >= 4):
            total += 1
    return total


def _fill(text, context):
    gaps = context.get("top_gaps") or []
    name = context.get("name") or "dost"
    gaps_text = ("Aapki top gaps: " + ", ".join(gaps[:4]) + ".") if gaps else "Pehle 'Analyze My Skills' chalao, phir main exact gaps bata paunga."
    match = ("Aapka current match {}% hai.".format(round(context["match_percent"]))) if context.get("match_percent") is not None else "Analysis chalane par aapka match % dikhega."
    return (text.replace("{name}", name).replace("{gaps}", gaps_text)
            .replace("{match}", match).replace("{target}", context.get("target") or "your target internship"))


def find_answer(question, context=None):
    context = context or {}
    norm = _normalize(question)
    if not norm:
        return None, None
    tokens = set(norm.split())
    best, best_score = None, 0
    for keys, text in _COMPILED:
        score = _score(keys, norm, tokens)
        if score > best_score:
            best, best_score = text, score
    if best_score >= 4:
        return _fill(best, context), "high"
    if best_score >= 2:
        return _fill(best, context), "low"
    words = [w for w in tokens if len(w) >= 4]
    for word in words:
        for keys, text in _COMPILED:
            if difflib.get_close_matches(word, [k for k in keys if " " not in k], n=1, cutoff=0.82):
                return _fill(text, context), "low"
    return None, None


def menu_text(context=None):
    return ("Is sawal ka exact jawab mere paas nahi hai. Aap ye try kar sakte ho: 'internship kaise milegi', 'resume tips', "
            "'python kaise seekhu', 'dsa kaise start karun', 'roadmap kaise banta hai', 'focus timer', 'github kaise use karun', "
            "'interview ki taiyari'. Ya apna sawal thoda chhota aur clear likho.")
