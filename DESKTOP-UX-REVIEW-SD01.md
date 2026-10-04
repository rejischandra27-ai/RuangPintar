# DESKTOP UX REVIEW — SCHOOL DISCOVERY SD-01

**Status:** Review only; no UI code changed  
**Surface:** Teacher registration / School Discovery  
**Evidence:** Existing desktop browser capture and current component/layout source

## Screenshot Analysis

The desktop registration shell uses a full-viewport illustration, an empty left grid column, and a form column aligned to the far right. In the captured browser session, the CSS viewport reported 2160 × 1500; the form content measured about 372px wide inside a 500px column, with a `max-width` of 440px. The large illustration/blank canvas dominates the interaction area. The form also grows vertically because School Discovery is followed by Google/manual registration controls and the remaining account fields.

The capture was taken after the form hydrated, but the local development server stopped responding while the search action was pending. Therefore, the screenshot does not show a loaded school result card. The result-card assessment below is based on its current markup: school name and metadata occupy one compact left block while the join CTA shares the same horizontal row. Metadata currently includes level, a long `Kota/Kabupaten:` prefix, optional NPSN, and a location icon; the action has little visual separation from this block.

## Findings

1. **Panel is undersized for this workflow.** The effective content width is ~372px at the captured wide desktop viewport, despite the parent column being 500px. Dense discovery details and a separate action compete in that narrow space.
2. **The canvas-to-interaction ratio is unbalanced.** A full-screen illustration and empty left column consume most of the viewport while the school selection task occupies a narrow strip at the right edge.
3. **Result hierarchy is compressed.** The school name is legible, but level, location, and NPSN are placed in a single small-text metadata line that can wrap unpredictably. The visible “Ajukan Bergabung” button shares the row with the information block and has insufficient separation at narrow card widths.
4. **Discovery does not lead strongly enough.** “Cari Sekolah” is currently a small 14px section heading under the registration heading. The input and result list should become the visual focus of this stage.

## Recommendations

### 1. Desktop Panel Width and Placement

- Give the registration surface a desktop content width of approximately **640–700px**, with `max-width` around **680px**. Keep a practical minimum near 560px when space permits.
- Rebalance the shell so the usable content region receives roughly **55–60%** of the desktop composition and the supporting artwork receives the remainder. Avoid retaining a fixed 500px right track at very wide viewports.
- Keep the illustration as a brand cue, but reduce its visual dominance behind the operational form; the main task should sit closer to the visual center instead of being pinned to the far-right edge.
- Keep the existing compact max-width behavior below the desktop breakpoint. Do not apply the larger desktop width to phones.

### 2. School Result Layout

- Use a row with two clearly separated zones: school identity/details on the left and an action area on the right. Reserve **20–24px** between these zones and align the CTA consistently across results.
- Give each result around **16–20px** padding and a minimum height around **88–100px**. Use the existing list/divider language rather than adding a card inside a card.
- Use a clear information hierarchy:
  - School name: 16px semibold, first line.
  - Level and city/regency: 13–14px secondary line, e.g. `SMP · Kota Bandung`.
  - NPSN: quiet tertiary metadata, only when available.
- Remove the repeated `Kota/Kabupaten:` prefix from every result; location can be introduced once in the search explanation or represented by a compact location icon with an accessible label.
- Keep “Ajukan Bergabung” as a distinct action, with a stable width and 44px minimum height. Do not squeeze it beside a wrapping metadata line.
- At desktop, show a manageable initial set of results and provide a clear continuation action if more results are available, rather than making a long result list dominate the page.

### 3. Visual Hierarchy

- Make `Cari Sekolah` the task-stage heading at **18–20px** and supporting guidance **14px**. Keep the page-level registration title secondary to the immediate selection task once the teacher flow is active.
- Make the search control the first prominent control, at roughly **48px** height. Keep loading, empty, error, selected, and results states in the same content flow so the interaction does not jump between unrelated regions.
- In the no-results state, keep only the required school-name and level fields. On desktop, arrange them in a balanced two-column row where space allows, with “Buat Sekolah Baru” aligned as the single primary action. Keep that state visually connected to the query that produced it.

## Mockup Description

```text
┌─────────────────────────────────────────────────────────────┐
│ Cari Sekolah                                                 │
│ Cari dengan nama atau NPSN                                   │
│ [ Search: nama sekolah atau NPSN                         ]   │
│                                                             │
│ ┌───────────────────────────────────────────┬─────────────┐ │
│ │ SMP Negeri 4 Bandung                      │             │ │
│ │ SMP · Kota Bandung                        │ Ajukan      │ │
│ │ NPSN 12345678                              │ Bergabung   │ │
│ ├───────────────────────────────────────────┼─────────────┤ │
│ │ SMA Cendekia                               │             │ │
│ │ SMA · Kabupaten Bandung                   │ Ajukan      │ │
│ │ NPSN 87654321                              │ Bergabung   │ │
│ └───────────────────────────────────────────┴─────────────┘ │
│                                                             │
│                                   Sudah memiliki akun? Masuk │
└─────────────────────────────────────────────────────────────┘
```

The panel is about 680px wide and remains paired with the existing auth artwork, but the operational panel is not pushed to the viewport edge. Result action alignment is stable; metadata remains grouped and easy to scan.

## Mobile Impact

- Preserve the current single-column auth panel and existing page gutters on mobile; do not widen the phone layout as part of the desktop fix.
- Keep each result stacked: school name, metadata, then a full-width “Ajukan Bergabung” action with at least a 44px touch target.
- Keep city/regency and NPSN wrapping safely. Avoid a fixed side-by-side result/action layout below tablet widths.
- Prefer a breakpoint based on available card width; the current `sm` breakpoint can create a horizontal result row too early on narrow tablets. Retain the stacked layout until there is enough room for both readable metadata and the action.
- Keep the create-school fields stacked on phones; do not introduce horizontal scrolling or compress the select/input controls.

**Recommendation:** Resolve the panel/canvas balance first, then restructure the result row and promote School Discovery in the hierarchy. This addresses the reported desktop issues while preserving the current mobile flow and Academic Glass visual language.
