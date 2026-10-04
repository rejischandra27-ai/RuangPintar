"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  GraduationCap,
  LoaderCircle,
  Plus,
  School,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  completeTeacherOnboardingAction,
  createFirstTeacherClassAction,
  createTeacherOnboardingSubjectAction,
  deferTeacherOnboardingStepAction,
  getTeacherOnboardingSnapshotAction,
  requestJoinSchoolAction,
  saveTeacherOnboardingStepAction,
  saveTeacherRolePreferencesAction,
  saveTeacherSubjectPreferencesAction,
  searchRegisteredSchoolsAction,
  updateTeacherSchoolNameAction,
} from "@/app/actions/teacher-onboarding-actions";
import { createTeacherInitialScheduleAction } from "@/app/actions/smart-onboarding-actions";
import {
  TeacherGradeChoice,
  TeacherOnboardingSnapshot,
} from "@/modules/teacher/application/teacher-onboarding-service";

const wizardSteps = [
  {
    key: "peran",
    title: "Peran Mengajar",
    shortTitle: "Peran",
    subtitle: "Pilih fokus kerja mengajar Anda.",
  },
  {
    key: "mapel",
    title: "Pilih Mata Pelajaran",
    shortTitle: "Mata pelajaran",
    subtitle: "Pilih mata pelajaran yang relevan untuk Anda.",
  },
  {
    key: "kelas",
    title: "Buat Kelas Pertama",
    shortTitle: "Kelas",
    subtitle: "Buat satu kelas untuk memulai.",
  },
  {
    key: "siswa",
    title: "Tambah Siswa Pertama",
    shortTitle: "Siswa",
    subtitle: "Tambahkan roster sekarang atau lanjutkan nanti.",
  },
  {
    key: "jadwal",
    title: "Atur Jadwal Pertama",
    shortTitle: "Jadwal",
    subtitle: "Tentukan hari dan jam mengajar untuk kelas pertama Anda.",
  },
] as const;

export function TeacherOnboardingWizard({
  initialSnapshot,
}: {
  initialSnapshot: TeacherOnboardingSnapshot;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [wizardStep, setWizardStep] = useState(initialSnapshot.wizardStep);
  const [wizardOpen, setWizardOpen] = useState(
    initialSnapshot.onboardingEligible && !initialSnapshot.onboardingCompleted
  );
  const [rolePreferences, setRolePreferences] = useState(initialSnapshot.preferences);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState(initialSnapshot.selectedSubjectIds);
  const [className, setClassName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [subjectFormOpen, setSubjectFormOpen] = useState(false);
  const [classGrade, setClassGrade] = useState<TeacherGradeChoice>(
    (initialSnapshot.gradeChoices && initialSnapshot.gradeChoices[0]) ?? "X"
  );
  const [hasManuallySetGrade, setHasManuallySetGrade] = useState(false);

  const detectGradeFromClassName = (name: string): TeacherGradeChoice | null => {
    const trimmed = name.trim().toUpperCase();
    if (/^(XII\b|12\b|XII[\s\-_])/i.test(trimmed)) return "XII";
    if (/^(XI\b|11\b|XI[\s\-_])/i.test(trimmed)) return "XI";
    if (/^(X\b|10\b|X[\s\-_])/i.test(trimmed)) return "X";
    if (/^(IX\b|9\b|IX[\s\-_])/i.test(trimmed)) return "IX";
    if (/^(VIII\b|8\b|VIII[\s\-_])/i.test(trimmed)) return "VIII";
    if (/^(VII\b|7\b|VII[\s\-_])/i.test(trimmed)) return "VII";
    if (/^(VI\b|6\b|VI[\s\-_])/i.test(trimmed)) return "VI";
    if (/^(V\b|5\b|V[\s\-_])/i.test(trimmed)) return "V";
    if (/^(IV\b|4\b|IV[\s\-_])/i.test(trimmed)) return "IV";
    if (/^(III\b|3\b|III[\s\-_])/i.test(trimmed)) return "III";
    if (/^(II\b|2\b|II[\s\-_])/i.test(trimmed)) return "II";
    if (/^(I\b|1\b|I[\s\-_])/i.test(trimmed)) return "I";
    return null;
  };

  const handleClassNameChange = (val: string) => {
    setClassName(val);
    if (!hasManuallySetGrade) {
      const detected = detectGradeFromClassName(val);
      if (
        detected &&
        (!snapshot.gradeChoices?.length || snapshot.gradeChoices.includes(detected))
      ) {
        setClassGrade(detected);
      }
    }
  };
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(
    initialSnapshot.scheduleAssignments[0]?.id ?? ""
  );
  const [scheduleSessions, setScheduleSessions] = useState([
    { id: 1, jamKe: 1, hari: "SENIN", jamMulai: "08:00", jamSelesai: "09:30" },
  ]);
  const nextScheduleSessionId = useRef(2);
  const [scheduleEditorOpen, setScheduleEditorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  // Initial school setup state
  const [schoolConfigured, setSchoolConfigured] = useState(!initialSnapshot.needsSchoolSetup);
  const [schoolQuery, setSchoolQuery] = useState(
    initialSnapshot.schoolName && initialSnapshot.schoolName !== "Guru Mandiri"
      ? initialSnapshot.schoolName
      : ""
  );
  const [selectedRegisteredSchool, setSelectedRegisteredSchool] = useState<{
    id: string;
    nama: string;
    jenjang: string;
    lokasi: string | null;
    npsn: string | null;
    isSubscribed: boolean;
  } | null>(null);
  const [schoolSearchResults, setSchoolSearchResults] = useState<
    Array<{
      id: string;
      nama: string;
      jenjang: string;
      lokasi: string | null;
      npsn: string | null;
      isSubscribed: boolean;
    }>
  >([]);
  const [isSearchingSchool, setIsSearchingSchool] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    if (wizardOpen) closeButtonRef.current?.focus();
  }, [wizardOpen]);

  useEffect(() => {
    if (schoolConfigured) return;
    const term = schoolQuery.trim();

    const timer = setTimeout(async () => {
      if (term.length < 2) {
        setSchoolSearchResults([]);
        setIsDropdownOpen(false);
        return;
      }
      if (selectedRegisteredSchool && selectedRegisteredSchool.nama === term) {
        setIsDropdownOpen(false);
        return;
      }

      setIsSearchingSchool(true);
      try {
        const res = await searchRegisteredSchoolsAction(term);
        if (res.success && res.data) {
          setSchoolSearchResults(res.data);
          setIsDropdownOpen(res.data.length > 0);
        }
      } catch {
        // ignore search errors
      } finally {
        setIsSearchingSchool(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [schoolQuery, schoolConfigured, selectedRegisteredSchool]);

  if (!isMounted) return null;
  if (!snapshot.onboardingEligible || snapshot.onboardingCompleted || !wizardOpen) return null;

  const refreshSnapshot = async () => {
    const result = await getTeacherOnboardingSnapshotAction();
    if (result.success && result.data) {
      setSnapshot(result.data);
      setRolePreferences(result.data.preferences);
      setSelectedSubjectIds(result.data.selectedSubjectIds);
      setWizardStep(result.data.wizardStep);
      if (!selectedAssignmentId && result.data.scheduleAssignments[0]?.id) {
        setSelectedAssignmentId(result.data.scheduleAssignments[0].id);
      }
    }
  };

  const reportError = (message?: string) => {
    setErrorMessage(message ?? "Perubahan belum dapat disimpan. Silakan coba lagi.");
  };

  const runAction = async (operation: () => Promise<{ success: boolean; error?: string }>) => {
    setIsPending(true);
    setErrorMessage(null);
    try {
      const result = await operation();
      if (!result.success) {
        reportError(result.error);
        return false;
      }
      return true;
    } catch {
      reportError();
      return false;
    } finally {
      setIsPending(false);
    }
  };

  const handleSaveCustomSchool = async () => {
    const trimmed = schoolQuery.trim();
    if (trimmed.length < 3) {
      reportError("Nama sekolah minimal 3 karakter.");
      return;
    }
    const saved = await runAction(() => updateTeacherSchoolNameAction(trimmed));
    if (saved) {
      setSchoolConfigured(true);
      setSnapshot((current) => ({
        ...current,
        schoolName: trimmed,
        needsSchoolSetup: false,
      }));
    }
  };

  const handleJoinRegisteredSchool = async () => {
    if (!selectedRegisteredSchool) return;
    setIsPending(true);
    setErrorMessage(null);
    try {
      const result = await requestJoinSchoolAction(selectedRegisteredSchool.id);
      if (!result.success) {
        reportError(result.error);
        return;
      }
      setWizardOpen(false);
      router.push(result.data?.redirectUrl || "/onboarding/menunggu-persetujuan");
    } catch {
      reportError();
    } finally {
      setIsPending(false);
    }
  };

  const moveToStep = async (nextStep: number) => {
    const saved = await runAction(() => saveTeacherOnboardingStepAction(nextStep));
    if (saved) {
      setWizardStep(nextStep);
      setScheduleEditorOpen(false);
    }
  };

  const handleRoleToggle = (role: "guruMapelAktif" | "waliKelasAktif") => {
    setRolePreferences((current) => ({ ...current, [role]: !current[role] }));
  };

  const handleSaveRolePreferences = async () => {
    const saved = await runAction(() => saveTeacherRolePreferencesAction(rolePreferences));
    if (saved) {
      await refreshSnapshot();
      setWizardStep(1);
    }
  };

  const handleSaveSubjects = async () => {
    if (snapshot.subjectChoices.length > 0 && selectedSubjectIds.length === 0) {
      reportError("Pilih setidaknya satu mata pelajaran.");
      return;
    }

    const saved = await runAction(() =>
      saveTeacherSubjectPreferencesAction({ subjectIds: selectedSubjectIds })
    );
    if (saved) {
      await refreshSnapshot();
      setWizardStep(2);
    }
  };

  const handleCreateSubject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void (async () => {
      let createdSubjectId: string | undefined;
      const saved = await runAction(async () => {
        const result = await createTeacherOnboardingSubjectAction({
          kode: subjectCode,
          nama: subjectName,
        });
        createdSubjectId = result.data?.id;
        return { success: result.success, error: result.error };
      });
      if (!saved) return;

      setSubjectCode("");
      setSubjectName("");
      setSubjectFormOpen(false);
      await refreshSnapshot();
      if (createdSubjectId) {
        setSelectedSubjectIds((current) =>
          current.includes(createdSubjectId!) ? current : [...current, createdSubjectId!]
        );
      }
    })();
  };

  const handleCreateClass = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void (async () => {
      const saved = await runAction(() =>
        createFirstTeacherClassAction({ name: className, grade: classGrade })
      );
      if (!saved) return;
      setClassName("");
      await refreshSnapshot();
      setWizardStep(3);
    })();
  };

  const handleAddStudentsNow = async () => {
    const saved = await runAction(() => saveTeacherOnboardingStepAction(3));
    if (!saved) return;
    setWizardOpen(false);
    router.push("/data-siswa");
  };

  const handleSkipStudents = async () => {
    const saved = await runAction(() => deferTeacherOnboardingStepAction("students"));
    if (saved) {
      await refreshSnapshot();
      setWizardStep(4);
    }
  };

  const finishOnboarding = async () => {
    const completed = await runAction(() => completeTeacherOnboardingAction());
    if (!completed) return;
    setWizardOpen(false);
    router.refresh();
  };

  const handleSchedule = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const effectiveAssignmentId = selectedAssignmentId || snapshot.scheduleAssignments[0]?.id;
    const assignment = snapshot.scheduleAssignments.find(
      (item) => item.id === effectiveAssignmentId
    );
    if (!assignment) {
      reportError("Pilih kelas dan mata pelajaran sebelum menyimpan jadwal.");
      return;
    }

    void (async () => {
      const saved = await runAction(() =>
        createTeacherInitialScheduleAction({
          rombelId: assignment.rombelId,
          penugasanId: assignment.id,
          sessions: scheduleSessions
            .slice()
            .sort((left, right) => left.jamKe - right.jamKe)
            .map((session) => ({
              hari: session.hari as "SENIN" | "SELASA" | "RABU" | "KAMIS" | "JUMAT" | "SABTU",
              jam_mulai: session.jamMulai,
              jam_selesai: session.jamSelesai,
              label: `Jam Ke-${session.jamKe}`,
            })),
        })
      );
      if (saved) await finishOnboarding();
    })();
  };

  const handleScheduleLater = async () => {
    const deferred = await runAction(() => deferTeacherOnboardingStepAction("schedule"));
    if (deferred) await finishOnboarding();
  };

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setWizardOpen(false);
      return;
    }

    if (event.key !== "Tab" || !dialogRef.current) return;
    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setWizardOpen(false);
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="teacher-onboarding-dialog-title"
        aria-describedby="teacher-onboarding-dialog-description"
        onKeyDown={handleDialogKeyDown}
        className="teacher-onboarding-wizard max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/70 bg-white/78 shadow-[0_28px_80px_-32px_rgba(15,23,42,0.65)] backdrop-blur-xl supports-[backdrop-filter:none]:bg-white sm:max-h-[calc(100dvh-3rem)]"
      >
        <div className="border-b border-slate-200/80 px-5 py-5 sm:px-8 sm:py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-blue-700">Persiapan mengajar</p>
              <h2
                id="teacher-onboarding-dialog-title"
                className="mt-1 font-mono text-xl font-bold text-slate-950 sm:text-2xl"
              >
                {!schoolConfigured ? "Persiapan Mengajar" : wizardSteps[wizardStep].title}
              </h2>
              <p id="teacher-onboarding-dialog-description" className="mt-1 text-sm text-slate-600">
                {!schoolConfigured
                  ? "Tentukan sekolah atau tempat tugas mengajar Anda."
                  : wizardSteps[wizardStep].subtitle}
              </p>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              aria-label="Tutup onboarding sementara"
              title="Tutup onboarding sementara"
              onClick={() => setWizardOpen(false)}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          {!schoolConfigured ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800">
                <School className="size-3.5" aria-hidden="true" />
                Langkah Awal: Tempat Mengajar
              </span>
              <span className="text-xs text-slate-500">
                Langkah 1 dari 6 persiapan ruang kerja guru
              </span>
            </div>
          ) : (
            <>
              <div className="mt-5 flex items-center gap-3">
                <div
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200"
                  role="progressbar"
                  aria-label="Progres onboarding guru"
                  aria-valuemin={0}
                  aria-valuemax={5}
                  aria-valuenow={wizardStep}
                >
                  <div
                    className="h-full rounded-full bg-blue-700 transition-[width] duration-300"
                    style={{ width: `${(wizardStep / wizardSteps.length) * 100}%` }}
                  />
                </div>
                <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-slate-600">
                  {wizardStep + 1} / {wizardSteps.length}
                </span>
              </div>

              <ol className="mt-4 grid grid-cols-5 gap-2" aria-label="Langkah onboarding">
                {wizardSteps.map((step, index) => (
                  <li key={step.key} aria-current={index === wizardStep ? "step" : undefined}>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold ${
                          index < wizardStep
                            ? "bg-emerald-100 text-emerald-800"
                            : index === wizardStep
                              ? "bg-blue-700 text-white"
                              : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {index < wizardStep ? (
                          <Check className="size-3.5" aria-hidden="true" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <span className="hidden truncate text-xs font-medium text-slate-600 sm:block">
                        {step.shortTitle}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>

        <div className="px-5 py-5 sm:px-8 sm:py-7">
          {!schoolConfigured ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <label
                  htmlFor="teacher-school-input"
                  className="block text-sm font-bold text-slate-900"
                >
                  Nama Sekolah / Tempat Mengajar:
                </label>

                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <School className="size-4" aria-hidden="true" />
                  </div>
                  <input
                    id="teacher-school-input"
                    type="text"
                    value={schoolQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSchoolQuery(val);
                      if (selectedRegisteredSchool && val !== selectedRegisteredSchool.nama) {
                        setSelectedRegisteredSchool(null);
                      }
                    }}
                    placeholder="SMA Negeri 2 Bogor"
                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-10 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition"
                    autoComplete="off"
                    disabled={isPending}
                  />
                  {isSearchingSchool && (
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
                      <LoaderCircle className="size-4 animate-spin text-blue-600" />
                    </div>
                  )}
                  {!isSearchingSchool && schoolQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSchoolQuery("");
                        setSelectedRegisteredSchool(null);
                        setSchoolSearchResults([]);
                      }}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                      aria-label="Hapus teks pencarian"
                    >
                      <X className="size-4" />
                    </button>
                  )}

                  {/* Dropdown Hasil Pencarian */}
                  {isDropdownOpen && schoolSearchResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 text-left shadow-xl">
                      <div className="border-b border-slate-100 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Sekolah Terdaftar di Ruang Pintar
                      </div>
                      {schoolSearchResults.map((school) => (
                        <button
                          key={school.id}
                          type="button"
                          onClick={() => {
                            setSelectedRegisteredSchool(school);
                            setSchoolQuery(school.nama);
                            setIsDropdownOpen(false);
                          }}
                          className="flex w-full cursor-pointer items-center justify-between gap-3 border-b border-slate-50 px-3.5 py-2.5 text-left transition hover:bg-blue-50/70 last:border-b-0"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {school.nama}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {school.jenjang} {school.lokasi ? `• ${school.lokasi}` : ""}{" "}
                              {school.npsn ? `• NPSN: ${school.npsn}` : ""}
                            </p>
                          </div>
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                            <CheckCircle2 className="size-3" />
                            Terdaftar
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <p className="text-xs italic text-slate-500">
                  (Nama ini akan tampil pada kop absensi dan jurnal kelas)
                </p>
              </div>

              {/* Status Box: Terdaftar vs Ruang Mandiri */}
              {selectedRegisteredSchool ? (
                <div className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-700 px-2.5 py-1 text-xs font-bold text-white shadow-xs">
                        <CheckCircle2 className="size-3.5" />
                        Terdaftar
                      </span>
                      <span className="text-xs font-semibold text-blue-900">
                        {selectedRegisteredSchool.isSubscribed
                          ? "Sekolah Berlangganan Aktif"
                          : "Tenant Terdaftar"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedRegisteredSchool(null)}
                      className="text-xs font-semibold text-blue-700 underline hover:text-blue-900"
                    >
                      Ubah
                    </button>
                  </div>

                  <p className="text-xs leading-relaxed text-slate-700">
                    <strong>{selectedRegisteredSchool.nama}</strong> sudah terdaftar sebagai sekolah
                    di Ruang Pintar. Anda dapat mengajukan permohonan bergabung sebagai guru resmi.
                  </p>
                </div>
              ) : schoolQuery.trim().length >= 3 ? (
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-2.5 py-1 text-xs font-bold text-white shadow-xs">
                      <Building2 className="size-3.5" />
                      Ruang Mandiri
                    </span>
                    <span className="text-xs font-medium text-slate-600">
                      Sekolah Belum Terdaftar
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed text-slate-600">
                    Sekolah ini belum terdaftar sebagai tenant berlangganan. Anda dapat melanjutkan
                    persiapan mengajar mandiri. Seluruh fitur absensi dan jurnal kelas siap
                    digunakan.
                  </p>
                </div>
              ) : null}

              {errorMessage && (
                <p
                  role="alert"
                  className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
                >
                  {errorMessage}
                </p>
              )}

              {/* Action Footer */}
              <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setWizardOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                  disabled={isPending}
                >
                  Nanti Saja
                </button>

                {selectedRegisteredSchool ? (
                  <button
                    type="button"
                    onClick={handleJoinRegisteredSchool}
                    disabled={isPending}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-blue-800 active:scale-[0.98] disabled:opacity-50"
                  >
                    {isPending ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <ArrowRight className="size-4" />
                    )}
                    <span>Bergabung</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveCustomSchool}
                    disabled={isPending || schoolQuery.trim().length < 3}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50"
                  >
                    {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
                    <span>Simpan dan Lanjutkan</span>
                    <ArrowRight className="size-4" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {wizardStep === 0 && (
                <div className="space-y-5">
                  <div className="space-y-1">
                    <PreferenceToggle
                      title="Guru Mata Pelajaran"
                      description="Mengelola pembelajaran dan evaluasi pada mata pelajaran yang diampu."
                      icon={<BookOpen className="size-5" aria-hidden="true" />}
                      checked={rolePreferences.guruMapelAktif}
                      disabled={isPending}
                      onChange={() => handleRoleToggle("guruMapelAktif")}
                    />
                    <PreferenceToggle
                      title="Wali Kelas"
                      description="Memantau kelas bila sekolah memberikan penugasan wali kelas resmi."
                      icon={<Users className="size-5" aria-hidden="true" />}
                      checked={rolePreferences.waliKelasAktif}
                      disabled={isPending}
                      onChange={() => handleRoleToggle("waliKelasAktif")}
                    />
                  </div>
                  <p className="rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-2.5 text-xs leading-relaxed text-blue-900">
                    Pilihan ini hanya preferensi onboarding. Hak akses tetap mengikuti assignment
                    resmi sekolah.
                  </p>
                </div>
              )}

              {wizardStep === 1 && (
                <div className="space-y-4">
                  {snapshot.subjectChoices.length === 0 && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-3.5 text-sm leading-relaxed text-slate-700">
                      Belum ada mata pelajaran aktif di sekolah. Pilihan di langkah ini tetap berupa
                      preferensi dan tidak membuat penugasan mengajar.
                    </div>
                  )}

                  <div
                    className="flex flex-wrap items-center gap-2"
                    role="group"
                    aria-label="Pilihan mata pelajaran"
                  >
                    {snapshot.subjectChoices.map((subject) => {
                      const selected = selectedSubjectIds.includes(subject.id);
                      return (
                        <button
                          key={subject.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() =>
                            setSelectedSubjectIds((current) =>
                              selected
                                ? current.filter((subjectId) => subjectId !== subject.id)
                                : [...current, subject.id]
                            )
                          }
                          className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                            selected
                              ? "border-blue-700 bg-blue-50/85 text-blue-900 shadow-sm"
                              : "border-slate-200/90 bg-white/70 text-slate-800 shadow-sm hover:border-slate-400"
                          }`}
                        >
                          <span className="min-w-0">{subject.nama}</span>
                          {selected && <Check className="size-4" aria-hidden="true" />}
                        </button>
                      );
                    })}

                    {snapshot.canManageSubjects && !subjectFormOpen && (
                      <button
                        type="button"
                        onClick={() => {
                          setSubjectFormOpen(true);
                          setErrorMessage(null);
                        }}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-dashed border-blue-400 bg-blue-50/60 px-3.5 py-2 text-sm font-semibold text-blue-700 shadow-sm backdrop-blur-md transition hover:border-blue-600 hover:bg-blue-100/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                      >
                        <Plus className="size-4" aria-hidden="true" />
                        <span>Tambah Mata Pelajaran</span>
                      </button>
                    )}
                  </div>

                  {snapshot.canManageSubjects && subjectFormOpen && (
                    <form
                      onSubmit={handleCreateSubject}
                      className="grid gap-3 rounded-2xl border border-blue-200/80 bg-blue-50/40 p-4 shadow-sm backdrop-blur-md sm:grid-cols-2"
                    >
                      <div className="flex items-center justify-between border-b border-blue-200/60 pb-1 sm:col-span-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-blue-900">
                          Tambah Mata Pelajaran Baru
                        </span>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            setSubjectFormOpen(false);
                            setSubjectName("");
                            setSubjectCode("");
                          }}
                          className="text-xs font-medium text-slate-500 hover:text-slate-800"
                        >
                          Batal
                        </button>
                      </div>
                      <label className="text-sm font-medium text-slate-800">
                        Nama mata pelajaran
                        <input
                          required
                          autoFocus
                          minLength={2}
                          maxLength={100}
                          value={subjectName}
                          onChange={(event) => setSubjectName(event.target.value)}
                          placeholder="Contoh: Bahasa Inggris, Fisika, Informatika..."
                          className="mt-1 block h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20"
                        />
                      </label>
                      <label className="text-sm font-medium text-slate-800">
                        Kode
                        <input
                          maxLength={20}
                          value={subjectCode}
                          onChange={(event) => setSubjectCode(event.target.value)}
                          placeholder="Otomatis jika kosong"
                          className="mt-1 block h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20"
                        />
                      </label>
                      <div className="flex flex-wrap gap-2 pt-1 sm:col-span-2">
                        <button
                          type="submit"
                          disabled={isPending || !subjectName.trim()}
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-50"
                        >
                          {isPending ? (
                            <LoaderCircle className="size-4 animate-spin" />
                          ) : (
                            <Plus className="size-4" />
                          )}
                          Simpan Mata Pelajaran
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            setSubjectFormOpen(false);
                            setSubjectName("");
                            setSubjectCode("");
                          }}
                          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Batal
                        </button>
                      </div>
                    </form>
                  )}

                  <p className="text-xs leading-relaxed text-slate-500">
                    Pilihan disimpan sebagai preferensi onboarding dan tidak membuat penugasan
                    mengajar.
                  </p>
                </div>
              )}

              {wizardStep === 2 && (
                <form onSubmit={handleCreateClass} className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-slate-800">
                    Nama Kelas
                    <input
                      required
                      minLength={2}
                      maxLength={80}
                      value={className}
                      onChange={(event) => handleClassNameChange(event.target.value)}
                      placeholder="Contoh: X TO 1"
                      className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20"
                    />
                  </label>
                  <label className="block text-sm font-semibold text-slate-800">
                    Tingkat Kelas
                    <select
                      value={classGrade}
                      onChange={(event) => {
                        setClassGrade(event.target.value as TeacherGradeChoice);
                        setHasManuallySetGrade(true);
                      }}
                      className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20"
                    >
                      {(snapshot.gradeChoices?.length
                        ? snapshot.gradeChoices
                        : ["X", "XI", "XII"]
                      ).map((grade) => (
                        <option key={grade} value={grade}>
                          {grade}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex items-end justify-end sm:col-span-2">
                    <button
                      type="submit"
                      disabled={isPending || !snapshot.canCreateClass}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isPending ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <Check className="size-4" />
                      )}
                      Simpan Kelas
                    </button>
                  </div>
                  {!snapshot.canCreateClass && (
                    <p className="text-sm text-amber-800 sm:col-span-2">
                      Izin pembuatan kelas belum aktif pada akun ini.
                    </p>
                  )}
                </form>
              )}

              {wizardStep === 3 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => void handleAddStudentsNow()}
                    className="flex min-h-28 flex-col items-start justify-between rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-left transition hover:border-blue-500 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-50"
                  >
                    <Users className="size-5 text-blue-800" aria-hidden="true" />
                    <span>
                      <span className="block text-sm font-semibold text-slate-950">
                        Tambah sekarang
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-slate-600">
                        Buka pengelolaan siswa pada tenant aktif.
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => void handleSkipStudents()}
                    className="flex min-h-28 flex-col items-start justify-between rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-50"
                  >
                    <ArrowRight className="size-5 text-slate-700" aria-hidden="true" />
                    <span>
                      <span className="block text-sm font-semibold text-slate-950">Lewati</span>
                      <span className="mt-1 block text-xs leading-relaxed text-slate-600">
                        Lanjutkan tanpa membuat data siswa.
                      </span>
                    </span>
                  </button>
                </div>
              )}

              {wizardStep === 4 && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      aria-pressed={scheduleEditorOpen}
                      onClick={() => {
                        setScheduleEditorOpen(true);
                        if (!selectedAssignmentId && snapshot.scheduleAssignments[0]?.id) {
                          setSelectedAssignmentId(snapshot.scheduleAssignments[0].id);
                        }
                      }}
                      className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                        scheduleEditorOpen
                          ? "border-blue-700 bg-blue-700 text-white"
                          : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                      }`}
                    >
                      <CalendarDays className="size-4" aria-hidden="true" />
                      Atur sekarang
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => void handleScheduleLater()}
                      className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-50"
                    >
                      Nanti saja
                    </button>
                  </div>

                  {scheduleEditorOpen &&
                    (snapshot.scheduleAssignments.length > 0 ? (
                      <form
                        onSubmit={handleSchedule}
                        className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4"
                      >
                        <label className="block text-sm font-semibold text-slate-800">
                          Kelas &amp; Mata Pelajaran
                          <select
                            required
                            value={
                              selectedAssignmentId || snapshot.scheduleAssignments[0]?.id || ""
                            }
                            onChange={(event) => setSelectedAssignmentId(event.target.value)}
                            className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950"
                          >
                            {snapshot.scheduleAssignments.map((assignment) => (
                              <option key={assignment.id} value={assignment.id}>
                                {assignment.rombelNama} · {assignment.mataPelajaranNama}
                              </option>
                            ))}
                          </select>
                        </label>
                        <div className="space-y-3">
                          {scheduleSessions.map((session, index) => (
                            <div
                              key={session.id}
                              className="grid gap-3 rounded-2xl border border-white/80 bg-white/70 p-3 shadow-sm backdrop-blur-md sm:grid-cols-[0.7fr_1fr_1fr_1fr_auto] sm:items-end"
                            >
                              <label className="block text-sm font-semibold text-slate-800">
                                Jam Ke
                                <input
                                  required
                                  type="number"
                                  min={1}
                                  max={24}
                                  value={session.jamKe}
                                  onChange={(event) =>
                                    setScheduleSessions((current) =>
                                      current.map((item) =>
                                        item.id === session.id
                                          ? { ...item, jamKe: Number(event.target.value) }
                                          : item
                                      )
                                    )
                                  }
                                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950"
                                />
                              </label>
                              <label className="block text-sm font-semibold text-slate-800">
                                Hari
                                <select
                                  value={session.hari}
                                  onChange={(event) =>
                                    setScheduleSessions((current) =>
                                      current.map((item) =>
                                        item.id === session.id
                                          ? { ...item, hari: event.target.value }
                                          : item
                                      )
                                    )
                                  }
                                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950"
                                >
                                  <option value="SENIN">Senin</option>
                                  <option value="SELASA">Selasa</option>
                                  <option value="RABU">Rabu</option>
                                  <option value="KAMIS">Kamis</option>
                                  <option value="JUMAT">Jumat</option>
                                  <option value="SABTU">Sabtu</option>
                                </select>
                              </label>
                              <label className="block text-sm font-semibold text-slate-800">
                                Jam mulai
                                <input
                                  required
                                  type="time"
                                  value={session.jamMulai}
                                  onChange={(event) =>
                                    setScheduleSessions((current) =>
                                      current.map((item) =>
                                        item.id === session.id
                                          ? { ...item, jamMulai: event.target.value }
                                          : item
                                      )
                                    )
                                  }
                                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950"
                                />
                              </label>
                              <label className="block text-sm font-semibold text-slate-800">
                                Jam selesai
                                <input
                                  required
                                  type="time"
                                  value={session.jamSelesai}
                                  onChange={(event) =>
                                    setScheduleSessions((current) =>
                                      current.map((item) =>
                                        item.id === session.id
                                          ? { ...item, jamSelesai: event.target.value }
                                          : item
                                      )
                                    )
                                  }
                                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950"
                                />
                              </label>
                              <button
                                type="button"
                                aria-label={`Hapus jam ke-${index + 1}`}
                                title={`Hapus jam ke-${index + 1}`}
                                disabled={scheduleSessions.length === 1 || isPending}
                                onClick={() =>
                                  setScheduleSessions((current) =>
                                    current.filter((item) => item.id !== session.id)
                                  )
                                }
                                className="inline-flex size-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Trash2 className="size-4" aria-hidden="true" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="space-y-2 rounded-2xl border border-white/80 bg-white/65 p-4 shadow-sm backdrop-blur-md">
                          <h3 className="font-mono text-sm font-bold text-slate-900">
                            Daftar sesi
                          </h3>
                          <ol className="divide-y divide-slate-200 text-sm text-slate-700">
                            {scheduleSessions
                              .slice()
                              .sort((left, right) => left.jamKe - right.jamKe)
                              .map((session) => (
                                <li
                                  key={session.id}
                                  className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0"
                                >
                                  <span className="font-mono font-bold">
                                    Jam Ke-{session.jamKe}
                                  </span>
                                  <span>
                                    {session.hari}, {session.jamMulai}–{session.jamSelesai}
                                  </span>
                                </li>
                              ))}
                          </ol>
                        </div>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            const id = nextScheduleSessionId.current++;
                            setScheduleSessions((current) => {
                              const nextJamKe = current.length
                                ? Math.max(...current.map((item) => item.jamKe)) + 1
                                : 1;
                              return [
                                ...current,
                                {
                                  id,
                                  jamKe: nextJamKe,
                                  hari: "SENIN",
                                  jamMulai: "09:45",
                                  jamSelesai: "11:15",
                                },
                              ];
                            });
                          }}
                          className="inline-flex h-10 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-sm font-semibold text-blue-800 transition hover:border-blue-400 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-50"
                        >
                          <Plus className="size-4" aria-hidden="true" />
                          Tambah jam mengajar
                        </button>
                        <button
                          type="submit"
                          disabled={isPending}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 disabled:opacity-50"
                        >
                          {isPending ? (
                            <LoaderCircle className="size-4 animate-spin" />
                          ) : (
                            <Check className="size-4" />
                          )}
                          Simpan jadwal
                        </button>
                      </form>
                    ) : (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                        <p>
                          Jadwal mengajar dapat diatur setelah kelas dan mata pelajaran ditentukan.
                          Anda dapat melewati langkah ini sekarang dan mengaturnya nanti melalui
                          menu Jadwal Saya.
                        </p>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => void handleScheduleLater()}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-blue-800"
                        >
                          Lanjutkan tanpa jadwal{" "}
                          <ArrowRight className="size-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                </div>
              )}

              {errorMessage && (
                <p
                  role="alert"
                  className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
                >
                  {errorMessage}
                </p>
              )}

              {wizardStep < 2 && (
                <div className="mt-7 flex items-center justify-between gap-3 border-t border-slate-200 pt-5">
                  <button
                    type="button"
                    disabled={wizardStep === 0 || isPending}
                    onClick={() => void moveToStep(wizardStep - 1)}
                    className="inline-flex h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    Kembali
                  </button>
                  {wizardStep === 0 ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => void handleSaveRolePreferences()}
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 disabled:opacity-50"
                    >
                      {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
                      Simpan dan lanjutkan
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => void handleSaveSubjects()}
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 disabled:opacity-50"
                    >
                      {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
                      Simpan dan lanjutkan
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>,
    document.body
  );
}

function PreferenceToggle({
  title,
  description,
  icon,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-200 py-4 last:border-b-0">
      <span className="mt-0.5 text-blue-800">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-slate-950">{title}</div>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        disabled={disabled}
        onClick={onChange}
        className={`relative mt-0.5 inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-50 ${checked ? "bg-blue-700" : "bg-slate-300"}`}
      >
        <span
          className={`inline-flex size-5 items-center justify-center rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`}
        >
          {checked && <Check className="size-3 text-blue-800" aria-hidden="true" />}
        </span>
      </button>
    </div>
  );
}
