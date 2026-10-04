import { redirect } from "next/navigation";
import { AcademicShell } from "@/shared/components/shell/academic-shell";
import { requireAuth } from "@/shared/infrastructure/auth/auth-guard";
import { checkPermission } from "@/shared/infrastructure/authorization/authz-guard";
import { SubjectService } from "@/modules/teacher/application/subject-service";
import { SubjectsView } from "@/modules/teacher/presentation/subjects-view";

export const metadata = {
  title: "Mata Pelajaran — Ruang Pintar",
  description: "Kelola katalog mata pelajaran sekolah",
};

export default async function SubjectCatalogPage() {
  const user = await requireAuth();
  if (!user.sekolah_id) redirect("/dashboard");

  const canViewSubjects = await checkPermission("academic.structure.view", {
    sekolah_id: user.sekolah_id,
  });
  if (!canViewSubjects) redirect("/dashboard");

  const canManageSubjects = await checkPermission("academic.structure.manage", {
    sekolah_id: user.sekolah_id,
  });
  const subjects = await SubjectService.getSubjects(user.sekolah_id);

  return (
    <AcademicShell user={user} userCapabilities={[]}>
      <SubjectsView initialSubjects={subjects} canManage={canManageSubjects} />
    </AcademicShell>
  );
}
