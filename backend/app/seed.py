"""Synthetic demo data: one block of 22 Maharashtra schools (Haveli, Pune) with a few weeks of visit history.

No real teachers or children. School numbers are made up (DECISIONS.md #12).
Seeding runs only on an empty database; delete backend/data/visitcoach.db to reseed.

History per school (first teacher only):
- an older visit (about a month ago): approved, and its action checked at the newer visit
- a newer visit (last week or two): approved, its action still open, so the next visit can check it
Sunita Pawar (Wagholi, the demo teacher) also has a visit two months ago. Her three visits are by two
different mentors, so the demo shows the coaching history carrying over when the mentor changes.
Hindi and Tamil stay supported in the code (rubric, packets, teacher page) as the next states.

The newer visits' need areas are skewed on purpose, so the block view shows
"14 of 22 schools need support: Children reading for themselves".
"""

import json
import random
from datetime import datetime, timedelta, timezone

from app import db
from app.services import knowledge

SCHOOLS = [
    # name, village, language, % Beginner in literacy, % Beginner in numeracy
    ("ZP Primary School Wagholi", "Wagholi", "mr", 46, 28),
    ("ZP Primary School Lonikand", "Lonikand", "mr", 31, 39),
    ("ZP Primary School Kesnand", "Kesnand", "mr", 22, 18),
    ("ZP Primary School Lohegaon", "Lohegaon", "mr", 52, 35),
    ("ZP Primary School Avhalwadi", "Avhalwadi", "mr", 38, 41),
    ("ZP Primary School Perne", "Perne", "mr", 41, 33),
    ("ZP Primary School Bakori", "Bakori", "mr", 37, 25),
    ("ZP Primary School Wade Bolhai", "Wade Bolhai", "mr", 49, 30),
    ("ZP Primary School Koregaon Mul", "Koregaon Mul", "mr", 28, 36),
    ("ZP Primary School Ashtapur", "Ashtapur", "mr", 44, 22),
    ("ZP Primary School Bhavadi", "Bhavadi", "mr", 35, 40),
    ("ZP Primary School Burkegaon", "Burkegaon", "mr", 39, 27),
    ("ZP Primary School Pimpri Sandas", "Pimpri Sandas", "mr", 47, 31),
    ("ZP Primary School Dongargaon", "Dongargaon", "mr", 33, 44),
    ("ZP Primary School Kolwadi", "Kolwadi", "mr", 42, 29),
    ("ZP Primary School Theur", "Theur", "mr", 26, 21),
    ("ZP Primary School Kunjirwadi", "Kunjirwadi", "mr", 45, 38),
    ("ZP Primary School Manjari Khurd", "Manjari Khurd", "mr", 30, 34),
    ("ZP Primary School Nhavi Sandas", "Nhavi Sandas", "mr", 50, 26),
    ("ZP Primary School Shindewadi", "Shindewadi", "mr", 36, 42),
    ("ZP Primary School Phulgaon", "Phulgaon", "mr", 48, 37),
    ("ZP Primary School Tulapur", "Tulapur", "mr", 34, 45),
]

TEACHERS = [
    # school index, name, grade
    (0, "Sunita Pawar", 1),
    (0, "Rahul Jadhav", 2),
    (1, "Meena Shinde", 2),
    (2, "Anil Kale", 3),
    (3, "Kavita Sonawane", 2),
    (4, "Lata Bhise", 2),
    (5, "Asha Kulkarni", 1),
    (6, "Vijay More", 2),
    (7, "Rekha Gaikwad", 3),
    (8, "Sandeep Patil", 2),
    (9, "Pooja Deshmukh", 1),
    (10, "Mahesh Bhosale", 3),
    (11, "Shubhangi Salunkhe", 2),
    (12, "Ganesh Kamble", 1),
    (13, "Vaishali Jagtap", 2),
    (14, "Nitin Shirke", 3),
    (15, "Swati Lokhande", 2),
    (16, "Prakash Mane", 1),
    (17, "Jyoti Ghule", 2),
    (18, "Rohini Waghmare", 3),
    (19, "Dattatray Chavan", 2),
    (20, "Ramesh Thorat", 2),
    (21, "Savita Kadam", 2),
]

# Kendra Pramukhs (cluster mentors) who made the past visits. The demo mentor is someone new.
MENTORS = ["Vandana Joshi", "Kiran Bhagat"]
DEMO_MENTOR = "Sachin Gore"

# need area -> (rubric item, practice) used for seeded packets.
NEEDS = {
    "early_reading": ("children_read", "paired_reading"),
    "concrete_maths": ("concrete_first", "bead_sharing"),
    "inclusion": ("every_child_turn", "name_sticks"),
    "writing": ("own_writing", "shared_writing"),
}

# Latest need area per school, in school order: 14 reading, 5 maths, 2 inclusion, 1 writing.
LATEST_NEEDS = [
    "early_reading",   # Wagholi
    "early_reading",   # Lonikand
    "early_reading",   # Kesnand
    "early_reading",   # Lohegaon
    "concrete_maths",  # Avhalwadi
    "early_reading",   # Perne
    "inclusion",       # Bakori
    "early_reading",   # Wade Bolhai
    "concrete_maths",  # Koregaon Mul
    "early_reading",   # Ashtapur
    "concrete_maths",  # Bhavadi
    "early_reading",   # Burkegaon
    "early_reading",   # Pimpri Sandas
    "concrete_maths",  # Dongargaon
    "early_reading",   # Kolwadi
    "writing",         # Theur
    "early_reading",   # Kunjirwadi
    "concrete_maths",  # Manjari Khurd
    "early_reading",   # Nhavi Sandas
    "inclusion",       # Shindewadi
    "early_reading",   # Phulgaon
    "early_reading",   # Tulapur
]

# The agreed action and how to check it, in the teacher's language (what the next-visit card shows).
FOLLOW_UPS = {
    "paired_reading": {
        "mr": ("पुढच्या भेटीपर्यंत रोज ५ मिनिटे त्या दिवसाच्या पाठातून जोडीने वाचन घेणे.",
               "पुढच्या भेटीत कोणत्याही तीन मुलांना त्या दिवसाच्या पाठातील एक ओळ वाचायला सांगणे."),
        "hi": ("अगली मुलाक़ात तक हर दिन 5 मिनट उस दिन के पाठ से जोड़ी में पढ़ना।",
               "अगली बार किन्हीं तीन बच्चों से उस दिन के पाठ की एक पंक्ति पढ़वाना।"),
        "ta": ("அடுத்த வருகை வரை தினமும் 5 நிமிடம் அன்றைய பாடத்திலிருந்து இணையாகப் படித்தல்.",
               "அடுத்த முறை ஏதேனும் மூன்று குழந்தைகளை அன்றைய பாடத்திலிருந்து ஒரு வரி படிக்கச் சொல்லுதல்."),
    },
    "bead_sharing": {
        "mr": ("गणिताच्या तासाला रोज काड्या किंवा मणी मुलांच्या हातात देऊन वाटणीचे प्रश्न सोडवणे.",
               "पुढच्या भेटीत गणिताच्या तासाला काड्या किंवा मणी मुलांच्या बाकांवर आहेत का ते पाहणे."),
        "hi": ("गणित के पीरियड में हर दिन तीलियाँ या मोती बच्चों के हाथ में देकर बाँटने के सवाल हल करवाना।",
               "अगली बार देखना कि गणित के पीरियड में तीलियाँ या मोती बच्चों की मेज़ों पर हैं या नहीं।"),
        "ta": ("கணக்கு வகுப்பில் தினமும் குச்சிகள் அல்லது மணிகளைக் குழந்தைகள் கையில் கொடுத்துப் பகிர்வுக் கணக்குகள் செய்தல்.",
               "அடுத்த முறை கணக்கு வகுப்பில் குச்சிகள் அல்லது மணிகள் குழந்தைகளின் மேசைகளில் உள்ளனவா என்று பார்த்தல்."),
    },
    "name_sticks": {
        "mr": ("प्रश्न विचारताना नावाच्या काड्या वापरून रोज वेगवेगळ्या मुलांना संधी देणे.",
               "पुढच्या भेटीत नावाच्या काड्या वापरल्या जातात का आणि मागच्या बाकावरच्या मुलांना संधी मिळते का ते पाहणे."),
        "hi": ("सवाल पूछते समय नाम की पर्चियों से हर दिन अलग-अलग बच्चों को मौका देना।",
               "अगली बार देखना कि नाम की पर्चियाँ इस्तेमाल हो रही हैं और पीछे बैठे बच्चों को भी बारी मिल रही है।"),
        "ta": ("கேள்வி கேட்கும்போது பெயர்க் குச்சிகளைப் பயன்படுத்தி தினமும் வெவ்வேறு குழந்தைகளுக்கு வாய்ப்பு தருதல்.",
               "அடுத்த முறை பெயர்க் குச்சிகள் பயன்படுத்தப்படுகின்றனவா, பின் வரிசைக் குழந்தைகளுக்கும் வாய்ப்பு கிடைக்கிறதா என்று பார்த்தல்."),
    },
    "shared_writing": {
        "mr": ("आठवड्यातून तीन वेळा मुलांनी फळ्यावरून न उतरवता स्वतःचे एक वाक्य लिहिणे.",
               "पुढच्या भेटीत तीन मुलांच्या वह्यांमध्ये त्यांनी स्वतः लिहिलेली वाक्ये पाहणे."),
        "hi": ("हफ़्ते में तीन बार बच्चे बोर्ड से उतारे बिना अपना एक वाक्य खुद लिखें।",
               "अगली बार तीन बच्चों की कॉपियों में उनके खुद लिखे वाक्य देखना।"),
        "ta": ("வாரத்தில் மூன்று முறை குழந்தைகள் கரும்பலகையிலிருந்து பார்த்து எழுதாமல், தாங்களே ஒரு வாக்கியம் எழுதுதல்.",
               "அடுத்த முறை மூன்று குழந்தைகளின் நோட்டுகளில் அவர்களே எழுதிய வாக்கியங்களைப் பார்த்தல்."),
    },
}


def seed_if_empty():
    if db.query_one("SELECT id FROM schools LIMIT 1"):
        return

    school_ids = [
        db.execute(
            "INSERT INTO schools (name, village, language, pct_reading_beginner, pct_numeracy_beginner)"
            " VALUES (?, ?, ?, ?, ?)",
            school,
        )
        for school in SCHOOLS
    ]

    first_teacher = {}
    for school_index, name, grade in TEACHERS:
        teacher_id = db.execute(
            "INSERT INTO teachers (school_id, name, grade) VALUES (?, ?, ?)",
            (school_ids[school_index], name, grade),
        )
        first_teacher.setdefault(school_index, teacher_id)

    seed_history(school_ids, first_teacher)


def seed_history(school_ids, first_teacher):
    rng = random.Random(7)  # same history every time
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    for index, school_id in enumerate(school_ids):
        language = SCHOOLS[index][2]
        teacher_id = first_teacher[index]
        older_seen = today - timedelta(days=rng.randint(28, 40), hours=-rng.randint(4, 7))
        newer_seen = today - timedelta(days=rng.randint(4, 12), hours=-rng.randint(4, 7))
        # Mentors change between visits at some schools, as they do in real clusters.
        older_mentor, newer_mentor = rng.choice(MENTORS), rng.choice(MENTORS)

        if index == 0:  # the demo teacher: one more visit, two months ago
            oldest_seen = today - timedelta(days=62, hours=-5)
            oldest = add_visit(rng, school_id, teacher_id, language, "inclusion", oldest_seen, "Kiran Bhagat")
            check_action(rng, oldest, older_seen, "done")
            older_mentor, newer_mentor = "Kiran Bhagat", "Vandana Joshi"

        older = add_visit(rng, school_id, teacher_id, language, rng.choice(list(NEEDS)), older_seen, older_mentor)
        add_visit(rng, school_id, teacher_id, language, LATEST_NEEDS[index], newer_seen, newer_mentor)

        # The older visit's action was checked at the newer visit.
        check_action(rng, older, newer_seen, "partly" if index == 0 else None)


def check_action(rng, visit_id, checked, status=None):
    status = status or rng.choices(["done", "partly", "not_done"], weights=[55, 30, 15])[0]
    db.execute(
        "INSERT INTO followups (visit_id, status, note, teacher_rating, checked_at) VALUES (?, ?, ?, ?, ?)",
        (visit_id, status, "", rng.choices([3, 4, 5], weights=[2, 5, 3])[0], sql_time(checked)),
    )


def add_visit(rng, school_id, teacher_id, language, need_area, observed, mentor):
    rubric_item, practice_id = NEEDS[need_area]
    subject = "numeracy" if need_area == "concrete_maths" else "literacy"
    approved = observed + timedelta(minutes=rng.randint(25, 240))

    visit_id = db.execute(
        "INSERT INTO visits (client_id, school_id, teacher_id, subject, language, rubric_json, typed_note,"
        " mentor_name, observed_at, status, created_at) VALUES (?, ?, ?, ?, ?, ?, '', ?, ?, 'approved', ?)",
        (
            f"seed-{school_id}-{observed:%Y%m%d}",
            school_id,
            teacher_id,
            subject,
            language,
            json.dumps({rubric_item: "no", "encouraging_feedback": "yes"}),
            mentor,
            observed.strftime("%Y-%m-%dT%H:%M:%SZ"),
            sql_time(observed),
        ),
    )

    packet = seed_packet(rubric_item, practice_id, language, need_area)
    edited = None
    if rng.random() < 0.35:  # about a third of mentors changed something before approving
        edited = json.dumps({**packet, "strength": packet["strength"] + " (edited by the mentor)"}, ensure_ascii=False)
    db.execute(
        "INSERT INTO packets (visit_id, original_json, edited_json, share_token, approved_at, created_at)"
        " VALUES (?, ?, ?, ?, ?, ?)",
        (
            visit_id,
            json.dumps(packet, ensure_ascii=False),
            edited,
            f"seed{visit_id}",
            sql_time(approved),
            sql_time(observed + timedelta(minutes=1)),
        ),
    )
    return visit_id


def seed_packet(rubric_item, practice_id, language, need_area):
    """A complete packet built from the practice library. Only the action lines are in the teacher's language."""
    practice = knowledge.practices()[practice_id]
    follow_up, follow_up_check = FOLLOW_UPS[practice_id][language]
    source_ids = practice["source_ids"][:3]
    return {
        "strength": "Demo data: the teacher's read-aloud held the children's attention.",
        "priority_rubric_item": rubric_item,
        "priority": f"Demo data: work on \"{knowledge.rubric_items()[rubric_item]['text']['en']}\".",
        "practice_id": practice_id,
        "practice_steps": practice["steps"],
        "materials": practice["materials"],
        "demo_script": practice["demo_tip"],
        "follow_up": follow_up,
        "follow_up_check": follow_up_check,
        "evidence": ["Demo data, not a real visit."],
        "english_gloss": f"Demo data. Priority: {practice['title']}.",
        "grounded_in": source_ids,
        "need_area": need_area,
        "sources": [knowledge.source_label(source_id) for source_id in source_ids],
    }


def sql_time(moment):
    """The format SQLite's CURRENT_TIMESTAMP uses (UTC), so seeded and real rows sort together."""
    return moment.strftime("%Y-%m-%d %H:%M:%S")
