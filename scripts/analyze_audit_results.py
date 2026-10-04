import json
import collections
import re

with open("scripts/parsed_school_data.json", "r", encoding="utf-8") as f:
    data = json.load(f)

teachers = data["teachers"]
classes = data["classes"]
sheet2_students = data["sheet2_students"]
schedule_entries = data["schedule_entries"]

print("=== 1. TEACHER ANALYSIS ===")
print(f"Total Guru Terdaftar: {len(teachers)}")
all_subjects_set = set()
for tid, t in teachers.items():
    for s in t["subjects"]:
        all_subjects_set.add(s)

print(f"Total Mapel di Direktori Guru: {len(all_subjects_set)}")

print("\n=== 2. ROMBEL ANALYSIS ===")
print(f"Total Rombel Kelas X di Excel: {len(classes)}")
for cname, cinfo in classes.items():
    print(f"  {cname}: {cinfo['student_count']} siswa | Wali Kelas: {cinfo['walas']} | Program: {cinfo['program']}")

total_x_students = sum(cinfo['student_count'] for cinfo in classes.values())
print(f"Total Siswa Kelas X: {total_x_students}")
print(f"Total Siswa Sheet2: {len(sheet2_students)}")
print(f"Total Siswa Keseluruhan: {total_x_students + len(sheet2_students)}")

print("\n=== 3. STUDENT DUPLICATION & ANOMALY CHECK ===")
student_names_map = collections.defaultdict(list)
for cname, cinfo in classes.items():
    for s in cinfo["students"]:
        norm_name = re.sub(r'\s+', ' ', s["name"].strip().upper())
        student_names_map[norm_name].append((cname, s["no"]))

duplicates = {k: v for k, v in student_names_map.items() if len(v) > 1}
print(f"Nama Duplikat Antar Kelas X: {len(duplicates)}")
for name, occurrences in duplicates.items():
    print(f"  DUPLIKAT: '{name}' ditemukan di: {occurrences}")

# Check Sheet2 students against Kelas X
sheet2_overlap = []
for s in sheet2_students:
    norm_name = re.sub(r'\s+', ' ', s["name"].strip().upper())
    if norm_name in student_names_map:
        sheet2_overlap.append((s["name"], student_names_map[norm_name]))

print(f"Overlap Siswa Sheet2 dengan Kelas X: {len(sheet2_overlap)}")
for name, occ in sheet2_overlap:
    print(f"  Sheet2 OVERLAP: '{name}' matches Kelas X: {occ}")

print("\n=== 4. SCHEDULE ANALYSIS & CONFLICT DETECTION ===")
print(f"Total Schedule Entries Parsed: {len(schedule_entries)}")

# Parse mapel & teacher code from raw_text
# raw_text format examples: "DDTO 2", "BING 33", "AGAMA 26/13", "SENI 36", "MTK 24", "PRAKTIK BENGKEL 12"
parsed_schedules = []
unparsed_schedules = []

for entry in schedule_entries:
    text = entry["raw_text"].strip()
    if not text:
        continue
    
    # Check for teacher code (trailing numbers or numbers in text)
    # Match pattern: NAME CODE or NAME CODE/CODE
    m = re.search(r'^(.*?)\s*(\d+(?:/\d+)?)$', text)
    if m:
        mapel = m.group(1).strip()
        code = m.group(2).strip()
        codes = code.split('/')
        for c in codes:
            parsed_schedules.append({
                "day": entry["day"],
                "fase": entry["fase"],
                "slot": entry["slot"],
                "class": entry["class"],
                "mapel": mapel,
                "teacher_code": int(c) if c.isdigit() else c,
                "raw": text
            })
    else:
        # Text without code (e.g. PIKET, ISTIRAHAT, or WALAS)
        unparsed_schedules.append(entry)

print(f"Successfully parsed schedule entries with teacher codes: {len(parsed_schedules)}")
print(f"Entries without direct teacher code (e.g. Piket/Walas/Khusus): {len(unparsed_schedules)}")

# Unique Mapel in Schedule
unique_schedule_mapel = set(p["mapel"] for p in parsed_schedules)
print(f"Total Mapel Unik di Jadwal: {len(unique_schedule_mapel)}")
print("Daftar Mapel di Jadwal:", sorted(list(unique_schedule_mapel)))

# CONFLICT DETECTION:
# Check if any teacher is scheduled in more than 1 class on the same (Day, Slot)
teacher_time_slots = collections.defaultdict(list)
for p in parsed_schedules:
    key = (p["teacher_code"], p["day"], p["slot"])
    teacher_time_slots[key].append(p)

conflicts = {k: v for k, v in teacher_time_slots.items() if len(v) > 1}
print(f"\n=== POTENSI BENTROK JADWAL (TEACHER CONFLICTS): {len(conflicts)} ===")
for (tcode, day, slot), entries in sorted(conflicts.items(), key=lambda x: (x[0][1], x[0][2], x[0][0])):
    tname = teachers.get(str(tcode), {}).get("name", f"Guru Kode {tcode}")
    classes_involved = [f"{e['class']} ({e['mapel']})" for e in entries]
    print(f"  BENTROK: Guru [{tcode}] {tname} pada {day} Jam ke-{slot}: Mengajar sekaligus di {', '.join(classes_involved)}")
