# TYPOGRAPHY SYSTEM — TEACHER WORKSPACE

## Status

Implementation approved and locked for Teacher Workspace only.

## Objective

Mengunci tipografi seluruh Teacher Workspace agar konsisten dengan system yang sudah disetujui tanpa mengubah flow bisnis, onboarding, subject provisioning, maupun authorization.

## Font System

### Display / Hero
- Monorama

### Heading
- Monorama

### Statistics
- Monorama

### Body
- Andale Mono

### Sidebar
- Andale Mono

### Table
- Andale Mono

### Form
- Andale Mono

### Wizard
- Andale Mono

### Buttons
- Andale Mono

## Scope

- Teacher Dashboard
- Teacher Workspace
- Teacher Onboarding Wizard
- Attendance
- Gradebook
- CBT Teacher
- Schedule
- Student Management
- Class Management

## Out of Scope

- Landing Page
- Authentication
- School Discovery
- Parent Portal
- Student Portal
- Admin Portal

## Locked Rules

1. Font display utama untuk headline dan hero memakai Monorama.
2. Body text, label, input, table, sidebar, tombol, dan form memakai Andale Mono.
3. Sistem hanya aktif pada route Teacher Workspace.
4. Non-teacher route tetap mengikuti font bawaan platform.
5. Tidak mengubah business flow, onboarding flow, subject provisioning, dan authorization.

## Implementation Contract

- Typography system berlaku untuk seluruh UI teacher-only route.
- Semua perubahan dibatasi pada styling/visual lock.
- Tidak ada perubahan logika, mutation, izin, atau alur data.
- Setiap elemen visual tetap mengikuti existing component structure dan layout yang sudah ada.

## Font Asset Note

Font Monorama dan Andale Mono belum tersedia sebagai file font di repository. Implementasi menggunakan font lokal yang terpasang pada perangkat, lalu fallback sistem. Untuk hasil identik lintas perangkat, tambahkan file font berlisensi yang disetujui ke asset aplikasi.

## Verification Notes

Aplikasi harus menjaga konsistensi tipografi pada dashboard guru, workspace kelas, jadwal, presensi, penilaian, CBT, serta modul pembelajaran yang dibuka oleh peran TEACHER.
