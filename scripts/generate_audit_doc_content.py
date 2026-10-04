import json
import collections

with open('scripts/parsed_school_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

teachers = data['teachers']
classes = data['classes']
sheet2_students = data['sheet2_students']
schedule_entries = data['schedule_entries']

print("=== GURU TABLE ===")
for code, t in sorted(teachers.items(), key=lambda x: int(x[0])):
    subjs = ", ".join(t['subjects'])
    grades = ", ".join(t['target_grades'])
    print(f"| {code} | {t['name']} | {subjs} | {grades} |")

print("\n=== ROMBEL TABLE ===")
for cname, c in classes.items():
    print(f"| {cname} | Fase E | 10 | {c['program']} | {c['walas']} | {c['student_count']} Siswa |")

print("\n=== MAPEL SUMMARY ===")
mapel_counts = collections.Counter()
for e in schedule_entries:
    raw = e['raw_text'].strip()
    import re
    m = re.match(r'^([A-Z\s]+)', raw)
    if m:
        mapel_counts[m.group(1).strip()] += 1

for m, cnt in mapel_counts.most_common():
    print(f"| {m} | {cnt} slot |")
