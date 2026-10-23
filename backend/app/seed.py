"""Small synthetic demo data. No real schools, teachers or children."""

from app import db

SCHOOLS = [
    # name, village, language, % reading beginner, % numeracy beginner
    ("ZP Primary School Wagholi", "Wagholi", "mr", 46, 28),
    ("ZP Primary School Lonikand", "Lonikand", "mr", 31, 39),
    ("ZP Primary School Kesnand", "Kesnand", "mr", 22, 18),
    ("Govt Primary School Rampur", "Rampur", "hi", 52, 35),
    ("Panchayat Union Primary School Melur", "Melur", "ta", 38, 41),
]

TEACHERS = [
    # school index, name, grade
    (0, "Sunita Pawar", 1),
    (0, "Rahul Jadhav", 2),
    (1, "Meena Shinde", 2),
    (2, "Anil Kale", 3),
    (3, "Kavita Verma", 2),
    (4, "Lakshmi Murugan", 2),
]


def seed_if_empty():
    if db.query_one("SELECT id FROM schools LIMIT 1"):
        return

    school_ids = []
    for name, village, language, reading, numeracy in SCHOOLS:
        school_id = db.execute(
            "INSERT INTO schools (name, village, language, pct_reading_beginner, pct_numeracy_beginner)"
            " VALUES (?, ?, ?, ?, ?)",
            (name, village, language, reading, numeracy),
        )
        school_ids.append(school_id)

    for school_index, name, grade in TEACHERS:
        db.execute(
            "INSERT INTO teachers (school_id, name, grade) VALUES (?, ?, ?)",
            (school_ids[school_index], name, grade),
        )
