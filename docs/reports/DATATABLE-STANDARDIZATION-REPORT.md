# RUANG PINTAR SAAS — STAGE 19 DELIVERABLE
# DATATABLE STANDARDIZATION REPORT

| Metadata | Nilai |
| :--- | :--- |
| **Stage** | STAGE 19 — UI STABILIZATION, NAVIGATION REPAIR & UX HARDENING |
| **Workstream** | WS 02 (Global DataTable Standard) |
| **Status** | `COMPLETED` |
| **Komponen Master** | `src/shared/components/ui/academic-data-table.tsx` |

---

## 1. Latar Belakang & Spesifikasi Desain

Sebelum Stage 19, penyajian data tabel di seluruh modul platform tidak seragam: sebagian tabel tidak memiliki pagination sehingga memanjang tanpa batas pada data besar, pencarian dilakukan secara ad-hoc, ketiadaan toggle visibilitas kolom, serta tidak tersedianya fitur ekspor data.

Komponen `AcademicDataTable` dibangun sebagai standar tabel tunggal canonical untuk seluruh ekosistem Ruang Pintar SaaS dengan prinsip **Academic Glass UI v2.0**.

---

## 2. Fitur & Kapabilitas `AcademicDataTable`

```typescript
export interface AcademicDataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  keyExtractor: (item: T) => string;
  title?: string;
  description?: string;
  searchPlaceholder?: string;
  searchableKeys?: (keyof T | string)[];
  filters?: DataTableFilterOption<T>[];
  defaultPageSize?: number; // 10 (default), 25, 50, 100
  enableColumnVisibility?: boolean;
  enableExport?: boolean;
  exportFilename?: string;
  onRefresh?: () => Promise<void> | void;
  isLoading?: boolean;
  emptyState?: {
    icon?: React.ReactNode;
    title: string;
    description: string;
    action?: React.ReactNode;
  };
  cardRenderer?: (item: T) => React.ReactNode;
  headerActions?: React.ReactNode;
}
```

### 2.1. Toolbar Multifungsi
- **Search Bar Responsif:** Dilengkapi tombol hapus cepat (`Clear`), pencarian multi-kolom client-side yang efisien.
- **Dynamic Filters:** Dropdown filter multi-kondisi dengan badge indikator filter aktif.
- **Ekspor CSV Terformat:** Mengekspor baris data yang sedang difilter/ditampilkan langsung ke file `.csv` dengan escaping tanda petik dan koma yang aman.
- **Column Visibility Toggler:** Memungkinkan pengguna memilih kolom mana yang ingin ditampilkan atau disembunyikan.
- **Refresh Action:** Animasi indikator sinkronisasi data yang elegan.

### 2.2. Pagination & Footer Informatif
- Pilihan ukuran halaman: **10 (default)**, 25, 50, 100 baris.
- Teks ringkasan standar:
  `"Menampilkan 1–10 dari 45 data"` (dilengkapi atribut accessibility `data-testid="data-table-pagination-info"`).
- Navigasi halaman cepat: Prev, Next, nomor halaman, dan auto-clamp saat filter berubah.

### 2.3. Sorting Interaktif
- Kolom bertipe `sortable: true` dapat diklik untuk mengubah urutan (Ascending / Descending).
- Mendukung kustomisasi accessor pengurutan via `sortAccessor`.

### 2.4. Mobile View Responsif (Card Mode)
- Pada viewport perangkat mobile (`sm:hidden`), tabel otomatis beralih menjadi format kartu (card-based layout) sehingga menghindari horizontal overflow yang merusak pengalaman pengguna.

### 2.5. Academic Glass Empty State
- Desain kartu transparan dengan latar `backdrop-blur`, aksen border halus, ikon tematik, dan instruksi tindakan saat data kosong atau hasil pencarian tidak ditemukan.

---

## 3. Implementasi & Rollout

Komponen telah diimplementasikan dan diuji pada view produksi utama:
1. **SuperAdminSchoolDirectoryView** (`src/modules/school/presentation/super-admin-school-directory-view.tsx`): Menampilkan direktori sekolah terdaftar dengan filter status aktif, filter jenjang, pencarian multi-kunci, dan export CSV.
2. **SuperAdminTeacherDirectoryView** (`src/modules/teacher/presentation/super-admin-teacher-directory-view.tsx`): Menampilkan direktori guru platform dengan filter sekolah, filter status aktif, sorting nama, dan kartu mobile.
3. **SuperAdminDashboardView** (`src/shared/components/dashboard/role-views/super-admin-dashboard-view.tsx`): Menampilkan Audit Trail Explorer interaktif dengan filter jenis aksi (`CREATE`, `UPDATE`, `DELETE`), pencarian peran aktor, dan modal inspeksi snapshot JSON.

---

## 4. Bukti Verifikasi Pengujian

Pengujian unit `src/test/ui/academic-data-table.test.tsx` (5 skenario Vitest) lulus 100%:
1. Render data awal dengan benar (`PASS`).
2. Pencarian data memfilter baris dengan benar (`PASS`).
3. Pengurutan kolom (sorting ASC/DESC) berfungsi akurat (`PASS`).
4. Pagination membagi halaman dan memperbarui label footer dengan tepat (`PASS`).
5. Menampilkan Academic Glass empty state saat hasil pencarian nihil (`PASS`).
