# Dashboard Data Validation Report

**Scope:** INVESTIGASI-01 and INVESTIGASI-02
**Status:** VALIDATED FROM CODE - RUNTIME DATA CHECK PENDING

## INVESTIGASI-01 - Total Kelas / Rombel

### Source

The teacher dashboard calls `TeacherFacade.getTeacherDashboardData`. For a tenant owner, the value is obtained from:

```ts
prisma.rombel.count({
  where: { sekolah_id: teacher.sekolah_id, status: "AKTIF" },
})
```

For a regular teacher, the value is derived from a `Set` of active teaching assignment `rombel_id` values.

### Finding

The dashboard query does not join teaching assignments or subjects for the owner statistic, so the query itself cannot double count a rombel because of assignment duplication. The regular-teacher branch explicitly deduplicates `rombel_id`.

### Root-cause candidates for 22 versus 11

1. The viewed account may not resolve as `is_owner_tenant`, causing the assignment branch to be used.
2. The active tenant context may differ from the tenant used for the manual count.
3. Archived/non-active records may be included in an external comparison.
4. The 22 value may come from a stale browser/server render or another dashboard surface.

The next runtime check should log only non-sensitive aggregate evidence: `user.id`, active `sekolah_id`, `is_owner_tenant`, active rombel count, and distinct assignment rombel count. Do not log OAuth tokens or personal data.

## INVESTIGASI-02 - Siswa Workspace

### Source

For a tenant owner, the dashboard uses:

```ts
prisma.siswa.count({
  where: { sekolah_id: teacher.sekolah_id, status_akademik: "AKTIF" },
})
```

For a regular teacher, it counts active `penempatanRombel` rows for the deduplicated assigned rombel IDs.

### Finding

The owner query counts the canonical `Siswa` entity directly and does not join placement, enrollment, subject, or assignment tables. There is no join duplication in this query and `DISTINCT` is not required for this owner branch.

The regular-teacher branch intentionally counts active placements, so one student can be counted once per active placement if bad data contains multiple simultaneous placements. That is a data invariant issue and should be guarded with a distinct student ID query if the branch is used for the disputed number.

### Recommendation

Add a runtime aggregate comparison before changing the owner query. If regular-teacher data is confirmed as the source, replace placement row counting with a distinct `keikutsertaan.siswa_id`-based count scoped to active placement and tenant. Do not alter the owner count without a failing data example.

## Conclusion

No dashboard aggregation bug is proven from the current code. The code paths are tenant-scoped and owner counts use canonical entities. The discrepancy is most likely context selection, stale data, or the wrong dashboard branch; production-like aggregate evidence is required before a query change.
