# Dashboard UX Recommendation

**Status:** RECOMMENDED

## INVESTIGASI-03 - Sesi Sedang Berlangsung

### Assessment

The live-session banner has unique value only while a session is actually `DIMULAI`: it exposes live state, room, subject, attendance status, and immediate operational controls. When no session is live, the banner becomes a second presentation of the next schedule item and competes with `Jadwal Mengajar`.

### Final recommendation

- Keep the banner only for a genuinely live session.
- Remove the non-live “Sesi Mengajar Berikutnya Hari Ini” variant and let `Jadwal Mengajar` own upcoming schedule information.
- Keep Presensi as the primary visible action while live.
- Put Materi, Tugas, and Jurnal into an overflow action menu on the corresponding `Jadwal Mengajar` card. This keeps the card scannable while preserving the actions.
- Do not delete the live component without replacing its live operational status and attendance action.

This recommendation is intentionally a behavior decision first; implementation should follow after the Architect accepts the interaction contract.

## INVESTIGASI-04 - Rekap Presensi Harian

### Final recommendation

Use one compact filter row with this priority:

1. Hari, defaulting to all available days.
2. Kelas, populated from the current teacher/admin dataset.
3. Mata Pelajaran, populated from the same dataset.

Keep the existing text search for quick lookup. Apply the filters to both session rows and class recap cards where the field exists. Do not add separate pages or a multi-step filter dialog; teachers with many classes need a single glanceable control row.

### Implemented slice

`ClassAttendanceOverview` now includes the three filters and retains the existing search and tabs. Day matching uses the session date; class and subject matching use canonical IDs rather than display names.
