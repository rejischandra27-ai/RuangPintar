# PLAN-19: UI STABILIZATION, NAVIGATION REPAIR & UX HARDENING
## Execution Roadmap, Verification Milestones & Workstream Breakdown

| Metadata | Nilai |
| :--- | :--- |
| **Stage** | STAGE 19 — UI STABILIZATION, NAVIGATION REPAIR & UX HARDENING |
| **Status** | `completed` (Ready for Human Review) |
| **Tipe Task** | UI / UX Hardening & Navigation Repair |
| **Dependencies** | Stage 01–18 |

---

## 1. Workstream Breakdown & Verification

### Task 1: Navigation & Route Repair (WS 01 & WS 06) — DONE
1. Perbaiki `src/app/struktur-akademik/page.tsx`:
   - Deteksi `SUPER_ADMIN`.
   - Fallback resolusi `sekolahId` dari query param `?sekolahId=...` atau sekolah pertama di database.
   - Tambahkan School Switcher Bar untuk Super Admin.
   - Buka izin akses `canViewStructure = true` dan `canManageStructure = true` untuk Super Admin.
2. Perbaiki `src/app/data-siswa/page.tsx`:
   - Deteksi `SUPER_ADMIN`.
   - Resolusi `sekolahId` dan School Switcher Bar.
   - Buka izin akses `canViewStudents = true` dan `canManageStudents = true` untuk Super Admin.
3. Perbaiki `src/modules/reporting/application/leadership-analytics-service.ts` & `src/app/pimpinan/page.tsx`:
   - Izinkan Super Admin mengakses analitik kepemimpinan meskipun `user.sekolah_id` null (fallback ke sekolah pertama di platform atau query param `sekolahId`).
   - Ubah error view 403 menjadi Academic Glass Empty State / School Selector yang ramah.
4. Audit `src/shared/components/shell/navigation-config.ts` dan pastikan seluruh item navigasi mengarah ke rute aktif.

### Task 2: Global DataTable Component (WS 02) — DONE
1. Bangun `src/shared/components/ui/academic-data-table.tsx`:
   - Search input dengan debouncing & clear.
   - Filter dropdowns.
   - Interactive column sorting.
   - Column visibility toggle menu.
   - Export to CSV action.
   - Pagination (10, 25, 50, 100) dengan footer standar `"Menampilkan 1–10 dari 700 data"`.
   - Academic Glass Empty State.
   - Mobile-friendly responsive card rendering.
2. Terapkan `AcademicDataTable` pada:
   - Direktori Sekolah (`src/modules/school/presentation/super-admin-school-directory-view.tsx`)
   - Direktori Guru (`src/modules/teacher/presentation/super-admin-teacher-directory-view.tsx`)
   - Audit Trail Explorer (`src/shared/components/dashboard/role-views/super-admin-dashboard-view.tsx`)

### Task 3: Dashboard Hardening & Design Tokens (WS 03 & WS 04) — DONE
1. Perbarui `src/shared/components/dashboard/role-views/super-admin-dashboard-view.tsx`:
   - Hero Header konsisten dengan status tenant aktif dan indikator sistem.
   - KPI Cards 24px radius (`rounded-3xl`) dengan padding 24px (`p-6`) dan Count-Up animation (`AnimatedCounter`).
   - Operational Widgets dengan gap 16px dan Section gap 24px.
   - Audit Log table menggunakan `AcademicDataTable` dengan modal preview snapshot JSON.
   - Recent Activities & Quick Actions bar terpadu.

### Task 4: Motion System Integration (WS 05) — DONE
1. Terapkan utility animasi ringan pada page layout dan card wrappers (`animate-in fade-in`, hover elevations, button tactile taps).

### Task 5: Responsive Audit & Testing (WS 07) — DONE
1. Buat test suite Vitest untuk komponen navigasi dan DataTable (`src/test/ui/academic-data-table.test.tsx` dan `src/test/ui/navigation-repair.test.ts`).
2. Jalankan seluruh Quality Gate:
   - `npm run typecheck` (0 errors)
   - `npm run lint` (0 errors)
   - `npm run format:check` (100% clean)
   - `npm run test` (110 files / 675 tests PASS)
   - `npm run build` (Next.js 16.3.3 Turbopack build 100% PASS)

### Task 6: Deliverable Reports & Stop Gate — DONE
1. Terbitkan 5 dokumen laporan wajib:
   - `docs/reports/UI-STABILIZATION-AUDIT.md`
   - `docs/reports/NAVIGATION-REPAIR-REPORT.md`
   - `docs/reports/DATATABLE-STANDARDIZATION-REPORT.md`
   - `docs/reports/DASHBOARD-HARDENING-REPORT.md`
   - `docs/reports/ACADEMIC-GLASS-CONSISTENCY-REPORT.md`
2. Pindahkan spec & plan ke folder `done/`.
3. Stop Gate menunggu Human Review.
