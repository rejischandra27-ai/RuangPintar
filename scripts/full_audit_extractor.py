import fitz
import openpyxl
import re
import collections
import json

def parse_teacher_directory(pdf_path):
    doc = fitz.open(pdf_path)
    page6 = doc[5]
    text = page6.get_text('text')
    
    # We already extracted raw text, let's parse structured teachers
    # Teacher codes 1 to 38
    # Let's inspect Page 6 line by line
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    
    # Let's parse entries based on digit indicators
    teachers = {}
    
    # Hardcoded/regex parsed from Page 6
    # Let's do a robust line parser
    current_idx = None
    current_name = None
    current_subjects = []
    
    # Let's build the verified list of 38 teachers from Page 6
    raw_teachers_list = [
        (1, "Natalia Butarbutar, S.Kom", ["PRAKTIK LAB"], ["X,XI,XII"]),
        (2, "Drs. Rekson Pangaribuan", ["PKKR", "DDTO", "PRAKTIK TO (X TO 1 & 5)"], ["XI", "X", "X"]),
        (3, "Wayan Budi Ismawati, M.Pd", ["PROJEK IPAS"], ["X"]),
        (4, "Suryani, S.Ds", ["DESAIN PUBLIKASI", "TEKNIK PENGELOLAAN AUDIO VIDEO (TPAV)", "PRAKTIK LAB"], ["XI", "XII", "XI,XII"]),
        (5, "Shafara Salsabila, S.Pd", ["BK"], ["XI"]),
        (6, "Ruben D Sihombing, S.Pd", ["KIK"], ["XI"]),
        (7, "Donatus Soeti P, ST", ["PRAKTEK TO (X TO 2,3,4)", "DDTO", "PSPT"], ["X", "X", "XII"]),
        (8, "Parlindungan Siadari, S.Kom", ["INFORMATIKA", "Dasar-dasar Rekayasa Perangkat Lunak (DDRPL)", "Praktik X RPL"], ["X", "X", "X"]),
        (9, "Slamet Riyadi, MT", ["PKKR", "PMKR"], ["XII", "XI,XII"]),
        (10, "Sri Siswati, M.Pd", ["BAHASA INGGRIS"], ["XI,XII"]),
        (11, "Nevada Hasibuan, S.Pd", ["KIK"], ["XII"]),
        (12, "Rajayani Sianturi, A.Md", ["PSPT", "PRAKTIK BENGKEL"], ["XI", "XI"]),
        (13, "Novita Ardiyanti, S.Pd", ["AGAMA KRISTEN"], ["X,XI,XII"]),
        (14, "Anggita Pratiwi F, S.Pd", ["BK"], ["X"]),
        (15, "Meta Pradi Wijayanti, S.Pd", ["BK"], ["XII"]),
        (16, "Ramses Sitorus, S.Kom", ["PRAKTEK TJKT"], ["X,XI,XII"]),
        (17, "Agung Septian, S.Kom, M.Pd", ["Administrasi Sistem Jaringan (ASJ)", "Perencanaan & Pengalamatan Jaringan (PPJ)", "INFORMATIKA", "PKPJ", "KJ"], ["XI,XII", "XI,XII", "X", "XII", "XI"]),
        (18, "Syarif Ahmad Maulana, ST", ["PRODUKTIF TO"], ["XI,XII"]),
        (19, "Nur Azizah Ayunda, S.Kom", ["Basis Data", "Pemrograman Web (Pemweb)", "Pemrograman Berbasis Objek (PBO)", "Praktik LAB", "DDTJKT"], ["XI", "XI", "XI", "XI", "X"]),
        (20, "Muhammad Sopyan, S.Kom", ["Dasar-dasar Desain Komunikasi Visual (DDKV)", "Fotografi & Videografi (Fotvie)", "Animasi", "User Interface & User Experience (UI/UX)", "Komputer Grafis", "Praktik LAB"], ["X", "XI", "XII", "XII", "XI", "X"]),
        (21, "Eri Chandra A, S.Kom", ["Struktur Data", "Pemrograman Berbasis Objek (PBO)", "Pemrograman Perangkat Bergerak (PPB)", "Praktik LAB", "Koding & Kecerdasan Artifisial (KKA)"], ["XII", "XII", "XII", "XII", "X"]),
        (22, "Aprilla Hayati, S.Pd", ["PROJEK IPAS"], ["X"]),
        (23, "Arnah Fajarwati, SE", ["KIK"], ["XI,XII"]),
        (24, "Elanda Widyastuti, M.Pd", ["MATEMATIKA"], ["X"]),
        (25, "Fransina Tresia A, SP, MM", ["MATEMATIKA"], ["X,XI"]),
        (26, "Marhanih, S.Sos.I", ["AGAMA ISLAM"], ["X,XII"]),
        (27, "Rita Yusnita, SE, M.Pd", ["SEJARAH", "PKN"], ["X,XI", "X,XI"]),
        (28, "Nurhayati, S.Pd", ["BAHASA INDONESIA"], ["X"]),
        (29, "Sri Isnawati, S.Pd.I", ["AGAMA ISLAM"], ["X,XI"]),
        (30, "Nengsih, S.Pd", ["BAHASA JEPANG"], ["X,XII"]),
        (31, "Shabrina A Mubiina AL-H, S.Pd", ["BAHASA INDONESIA"], ["XI"]),
        (32, "Febriana Buana Supa, S.Pd", ["PKN"], ["X,XI,XII"]),
        (33, "Andina Try Nurcahyani, S.Pd", ["BAHASA INGGRIS"], ["X"]),
        (34, "Einary Mahsa, S.Pd", ["MATEMATIKA"], ["XII"]),
        (35, "Doni Pratama, S.Pd", ["PENJAS"], ["X,XI"]),
        (36, "Ireen Oktaviyani, S.Pd", ["SENI"], ["X,XII"]),
        (37, "Sri Ayu Ratnaningsih, S.Pd", ["BAHASA JEPANG"], ["X,XI"]),
        (38, "Gifta Septiaman Waruwu, S.Pd", ["BAHASA INGGRIS"], ["X,XI"])
    ]
    
    for item in raw_teachers_list:
        teachers[item[0]] = {
            "code": item[0],
            "name": item[1],
            "subjects": item[2],
            "target_grades": item[3]
        }
    return teachers

def parse_schedule_grid(pdf_path, teacher_dir):
    doc = fitz.open(pdf_path)
    days = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT']
    
    # We will extract word boxes with coordinates and assign them to:
    # 1. Day
    # 2. Table (Fase E vs Fase F)
    # 3. Time Slot / Jam
    # 4. Class Column
    
    fase_e_cols = [
        ("X TO 1", 135, 185),
        ("X TO 2", 195, 255),
        ("X TO 3", 265, 325),
        ("X TO 4", 335, 390),
        ("X TO 5", 400, 455),
        ("X TJKT 1", 465, 520),
        ("X TJKT 2", 530, 590),
        ("X DKV 1", 605, 665),
        ("X DKV 2", 675, 735),
        ("X RPL", 745, 805)
    ]
    
    fase_f_cols = [
        ("XI TO 1", 120, 165),
        ("XI TO 2", 175, 220),
        ("XI TO 3", 230, 280),
        ("XI TJKT", 295, 345),
        ("XI DKV", 360, 410),
        ("XI RPL", 420, 470),
        ("XII TKRO 1", 485, 535),
        ("XII TKRO 2", 545, 595),
        ("XII TKJ 1", 605, 650),
        ("XII DKV 1", 660, 710),
        ("XII RPL", 720, 770)
    ]
    
    all_entries = []
    
    for day_idx in range(5):
        day_name = days[day_idx]
        page = doc[day_idx]
        blocks = page.get_text('blocks')
        
        # Sort blocks by y0
        blocks.sort(key=lambda b: b[1])
        
        # We can extract text words to map exactly to slots
        words = page.get_text('words')
        words.sort(key=lambda w: (w[1], w[0]))
        
        # Separate words into Fase E (y < 320) and Fase F (y >= 320)
        words_e = [w for w in words if 135 <= w[1] < 325]
        words_f = [w for w in words if w[1] >= 345]
        
        # Let's inspect time slot rows for Fase E
        # Time slot labels are on the left (x < 125)
        slot_words_e = [w for w in words_e if w[0] < 125]
        slot_rows_e = []
        for w in slot_words_e:
            # check if it's a jam number (1 to 11)
            if w[4].isdigit() and 1 <= int(w[4]) <= 11 and w[0] > 90:
                slot_rows_e.append((int(w[4]), w[1]))
                
        # Deduplicate slot rows
        unique_slots_e = []
        for s, y in sorted(slot_rows_e, key=lambda x: x[1]):
            if not any(abs(y - uy) < 8 for us, uy in unique_slots_e):
                unique_slots_e.append((s, y))
                
        # Now for each slot and each class column, find matching words
        for slot_no, slot_y in unique_slots_e:
            for cls_name, x_min, x_max in fase_e_cols:
                # Find words within y range [slot_y - 6, slot_y + 10] and x range [x_min, x_max]
                cell_words = [w for w in words_e if abs(w[1] - slot_y) < 8 and x_min <= w[0] <= x_max]
                if cell_words:
                    cell_text = " ".join([w[4] for w in sorted(cell_words, key=lambda w: w[0])])
                    # Parse mapel and teacher code
                    # Usually: MAPEL CODE or MAPEL CODE/CODE
                    all_entries.append({
                        "day": day_name,
                        "fase": "FASE E",
                        "slot": slot_no,
                        "class": cls_name,
                        "raw_text": cell_text
                    })
                    
        # Same for Fase F
        slot_words_f = [w for w in words_f if w[0] < 120]
        slot_rows_f = []
        for w in slot_words_f:
            if w[4].isdigit() and 1 <= int(w[4]) <= 11 and w[0] > 80:
                slot_rows_f.append((int(w[4]), w[1]))
                
        unique_slots_f = []
        for s, y in sorted(slot_rows_f, key=lambda x: x[1]):
            if not any(abs(y - uy) < 8 for us, uy in unique_slots_f):
                unique_slots_f.append((s, y))
                
        for slot_no, slot_y in unique_slots_f:
            for cls_name, x_min, x_max in fase_f_cols:
                cell_words = [w for w in words_f if abs(w[1] - slot_y) < 8 and x_min <= w[0] <= x_max]
                if cell_words:
                    cell_text = " ".join([w[4] for w in sorted(cell_words, key=lambda w: w[0])])
                    all_entries.append({
                        "day": day_name,
                        "fase": "FASE F",
                        "slot": slot_no,
                        "class": cls_name,
                        "raw_text": cell_text
                    })
                    
    return all_entries

def parse_excel_students(xlsx_path):
    wb = openpyxl.load_workbook(xlsx_path, data_only=True)
    ws = wb['KKA Kelas X']
    
    classes = {}
    current_class_name = None
    
    class_headers = [
        (6, "X TO 1", "Teknik Otomotif (TO)", "Febriana Buana Supa, S.Pd"),
        (67, "X TO 2", "Teknik Otomotif (TO)", "Febriana Buana Supa, S.Pd"),
        (132, "X TO 3", "Teknik Otomotif (TO)", "Marhanih, S.Sos.I"),
        (193, "X TO 4", "Teknik Otomotif (TO)", "Nengsih, S.Pd"),
        (253, "X TO 5", "Teknik Otomotif (TO)", "Nevada Hasibuan, S.Pd"),
        (315, "X TJKT 1", "Teknik Jaringan Komputer dan Telekomunikasi (TJKT)", "Elanda Widyastuti, M.Pd"),
        (365, "X TJKT 2", "Teknik Jaringan Komputer dan Telekomunikasi (TJKT)", "Agung Septian, S.Kom, M.Pd"),
        (415, "X DKV 1", "Desain Komunikasi Visual (DKV)", "Andina Try Nurcahyani, S.Pd"),
        (461, "X DKV 2", "Desain Komunikasi Visual (DKV)", "Rita Yusnita, SE, M.Pd"),
        (506, "X RPL", "Rekayasa Perangkat Lunak (RPL)", "Parlindungan S, S.Kom")
    ]
    
    for idx, (h_row, c_name, prog, walas) in enumerate(class_headers):
        next_h_row = class_headers[idx+1][0] if idx+1 < len(class_headers) else ws.max_row + 1
        students = []
        for r in range(h_row + 5, next_h_row):
            c1 = ws.cell(r, 1).value
            c2 = ws.cell(r, 2).value
            if (isinstance(c1, int) or (isinstance(c1, str) and c1.strip().isdigit())):
                if c2 and isinstance(c2, str) and len(c2.strip()) > 1 and 'NAMA' not in c2.upper():
                    s_no = int(c1) if isinstance(c1, int) else int(c1.strip())
                    s_name = c2.strip()
                    students.append({
                        "no": s_no,
                        "name": s_name,
                        "row": r
                    })
        classes[c_name] = {
            "name": c_name,
            "program": prog,
            "walas": walas,
            "students": students,
            "student_count": len(students)
        }
        
    # Sheet2
    sheet2_students = []
    ws2 = wb['Sheet2']
    for r in range(6, ws2.max_row + 1):
        c1 = ws2.cell(r, 1).value
        c2 = ws2.cell(r, 2).value
        if c1 and c2:
            sheet2_students.append({
                "no": int(c1) if str(c1).strip().isdigit() else c1,
                "name": str(c2).strip(),
                "row": r
            })
            
    return classes, sheet2_students

if __name__ == '__main__':
    xlsx_path = r'C:\Users\vitam\Documents\FORM NILAI ATS GANJIL.xlsx'
    pdf_path = r'C:\Users\vitam\Downloads\JADWAL PELAJARAN YES 2026.2027 (19 AGUSTUS 2026) (Recovered) (Recovered).pdf'
    
    teachers = parse_teacher_directory(pdf_path)
    classes, sheet2_students = parse_excel_students(xlsx_path)
    schedule_entries = parse_schedule_grid(pdf_path, teachers)
    
    print(f"Teachers count: {len(teachers)}")
    total_x_students = sum(c['student_count'] for c in classes.values())
    print(f"Total Kelas X students: {total_x_students}")
    print(f"Total Sheet2 students: {len(sheet2_students)}")
    print(f"Total schedule entries parsed: {len(schedule_entries)}")
    
    # Save parsed data to a json file for further inspection
    output = {
        "teachers": teachers,
        "classes": classes,
        "sheet2_students": sheet2_students,
        "schedule_entries": schedule_entries
    }
    with open("scripts/parsed_school_data.json", "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    print("Saved scripts/parsed_school_data.json successfully")
