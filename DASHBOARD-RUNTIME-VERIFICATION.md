# Dashboard Runtime Verification

**Tanggal verifikasi:** 2026-09-29
**Database:** `prisma/data/ruang-pintar.db` dari `.env`
**Scope:** Tenant aktif akun yang menampilkan 22 rombel dan 700 siswa
**Status:** VERIFIED

## VERIFIKASI-01 - Identity and Active Tenant

The runtime account matching the dashboard values is:

| Field | Runtime value |
| --- | --- |
| `user.id` | `01M2XXYD26H385F6RAW5PB6FBK` |
| `user.name` | `Eri Chandra A S.Kom` |
| `active_sekolah_id` | `01M2XXYD227F9S3H985FH53GMF` |
| Tenant name | `SMK OTOMINDO` |
| `is_owner_tenant` | `true` |
| Base role | `TEACHER` |

The database contains active, unexpired sessions for this user, and all observed `sekolah_aktif_id` values resolve to `01M2XXYD227F9S3H985FH53GMF`. The active membership is owner membership for the same tenant.

## VERIFIKASI-02 - Runtime Tenant Aggregates

Read-only Prisma queries were executed against the active database with `sekolah_id = 01M2XXYD227F9S3H985FH53GMF`:

| Metric | Query condition | Result |
| --- | --- | ---: |
| Active rombel | `rombel.sekolah_id = tenant` and `status = AKTIF` | **22** |
| Active students | `siswa.sekolah_id = tenant` and `status_akademik = AKTIF` | **700** |
| Active teaching assignments | `penugasan_mengajar.sekolah_id = tenant` and `status = AKTIF` | **324** |
| Active placements | `penempatan_rombel.sekolah_id = tenant` and `status = AKTIF` | **700** |
| Distinct students in active placements | distinct `keikutsertaan.siswa_id` through active placements | **700** |
| Distinct rombel IDs in tenant assignments | distinct `penugasan_mengajar.rombel_id` | **21** |

The 22 active rombel are real rows in the tenant, including `X DKV 1`, `X DKV 2`, `X RPL`, `X TJKT 1`, `X TJKT 2`, `X TO 1` through `X TO 5`, the active XI classes, and the active XII classes.

## VERIFIKASI-03 - Dashboard Versus Database

The controlling code path is `TeacherFacade.getTeacherDashboardData`.

For `isTenantOwner = true`, the dashboard uses:

```ts
prisma.rombel.count({
  where: { sekolah_id: teacher.sekolah_id, status: "AKTIF" },
});

prisma.siswa.count({
  where: { sekolah_id: teacher.sekolah_id, status_akademik: "AKTIF" },
});
```

The runtime comparison is exact:

| Dashboard value | Database query value | Match |
| ---: | ---: | --- |
| 22 Rombel | 22 active `Rombel` rows | **YES** |
| 700 Siswa Workspace | 700 active `Siswa` rows | **YES** |

The owner branch counts canonical tenant entities directly. It does not join teaching assignments, subjects, enrollments, or placements, so these two displayed values are not inflated by join duplication.

For context, the screenshot user's own teacher scope is smaller:

| Teacher-scoped metric | Result |
| --- | ---: |
| Active assignments for Eri | 14 |
| Distinct assigned rombel for Eri | 11 |
| Weekly teaching hours for Eri | 40 |

## VERIFIKASI-04 - Root Cause of 22 and 700

### Why the dashboard shows 22 rombel

The account is an owner of the active tenant. The dashboard label is `Total Kelas` for an owner, and the owner branch counts every active rombel in `SMK OTOMINDO`. That count is 22.

The value around 11 is also valid, but it answers a different question: it is the number of distinct rombel IDs in Eri's own active teaching assignments. It is not the workspace total.

One tenant assignment detail is worth noting: 324 active teaching assignments cover 21 distinct rombel IDs. This does not contradict the 22 workspace rombel because the workspace total is based on all active rombel rows, including a rombel that currently has no active teaching assignment in the assignment table.

### Why the dashboard shows 700 students

The owner dashboard counts all active `Siswa` records in the active tenant. The database returns 700. Active placements also return 700 rows and resolve to 700 distinct students, so there is no evidence of double counting in the current dataset.

## Conclusion

The displayed values **22 Rombel** and **700 Siswa** are correct for the active owner workspace and come from the active tenant `01M2XXYD227F9S3H985FH53GMF`. No query bug or join duplication was found.

The UX risk is semantic labeling: a teacher-owner may expect “Rombel Diajar” to mean their own 11 assigned classes, while the owner dashboard intentionally shows the full workspace total. The current labels already distinguish `Total Kelas` and `Siswa Workspace`; this distinction should remain explicit in any future dashboard copy or tooltip.

## Verification Boundaries

- No data was modified.
- No Google OIDC or avatar persistence work was performed.
- The report uses the local runtime database configured by `.env`, not the test database.
