/**
 * Ruang Pintar — Authorization & Access Control (M02) Types & Contracts
 *
 * Implements the canonical Effective Access model:
 * Identity -> Base Role -> Position/Assignment/Relationship -> Permission -> Resource Scope -> Effective Access
 */

export type BaseRole = "SUPER_ADMIN" | "SCHOOL_STAFF" | "TEACHER" | "STUDENT" | "GUARDIAN";

export type CapabilityBundle =
  | "SYSTEM_ADMIN"
  | "ACADEMIC_OPERATOR"
  | "STUDENT_DATA_OPERATOR"
  | "REPORT_OPERATOR"
  | "HOMEROOM_TEACHER"
  | "LEADERSHIP_ROLE";

export type PositionCode =
  "HEADMASTER" | "VICE_PRINCIPAL_CURRICULUM" | "VICE_PRINCIPAL_STUDENT_AFFAIRS" | "PROGRAM_HEAD";

export type ResourceScopeType =
  | "GLOBAL"
  | "SCHOOL"
  | "ORGANIZATION_UNIT"
  | "PROGRAM"
  | "GRADE_LEVEL"
  | "ROMBEL"
  | "TEACHING_ASSIGNMENT"
  | "HOMEROOM_ASSIGNMENT"
  | "STUDENT_SELF"
  | "GUARDIAN_RELATIONSHIP"
  | "RESOURCE_OWNER"
  | "EXPLICIT_RESOURCE";

export type PermissionString =
  // Platform & System (M01, M02, M03, M05)
  | "system.config.view"
  | "system.config.manage"
  | "system.audit.view"
  | "system.backup.manage"
  | "system.school.bootstrap"
  | "system.staff_capabilities.manage"

  // School & Organization Structure (M01, M06)
  | "academic.school.view"
  | "academic.school.manage"
  | "academic.structure.view"
  | "academic.structure.manage"
  | "academic.calendar.view"
  | "academic.calendar.manage"
  | "academic.classes.view"
  | "academic.classes.manage"

  // Student & Teacher Master (M06, M07, M08)
  | "academic.students.view"
  | "academic.students.manage"
  | "academic.teachers.view"
  | "academic.teachers.manage"
  | "academic.teaching_assignments.view"
  | "academic.teaching_assignments.manage"
  | "academic.homeroom_assignments.view"
  | "academic.homeroom_assignments.manage"

  // Schedule & Timetable (M09, M10)
  | "schedule.master.view"
  | "schedule.master.manage"
  | "schedule.master.publish"
  | "schedule.class.view"

  // Learning & Materials (M11, M12)
  | "learning.material.view"
  | "learning.material.manage"
  | "learning.assignment.view"
  | "learning.assignment.manage"
  | "learning.assignment.submit"

  // Attendance (M13)
  | "attendance.session.view"
  | "attendance.session.record"
  | "attendance.session.correct"
  | "attendance.session.finalize"
  | "attendance.school.view"

  // Assessment & Grades (M14)
  | "assessment.grades.view"
  | "assessment.grades.manage"
  | "assessment.grades.publish"
  | "assessment.grades.finalize"
  | "assessment.report_card.view"
  | "assessment.report_card.generate"
  | "assessment.report_card.sign"

  // CBT / Computer-Based Test (M14)
  | "cbt.exam.view"
  | "cbt.exam.manage"
  | "cbt.attempt.start"
  | "cbt.attempt.monitor"
  | "cbt.results.transfer"

  // Student Attention & Monitoring (M17)
  | "monitoring.student.view"
  | "monitoring.student.record"
  | "monitoring.homeroom.view"

  // Communication & Announcements (M18)
  | "communication.announcement.view"
  | "communication.announcement.manage"

  // Reporting & Export (M19, M20, M21)
  | "report.school.view"
  | "report.academic.view"
  | "report.attendance.view"
  | "report.export"

  // External Integration & Webhooks (M20)
  | "integration.view"
  | "integration.manage";

export interface ResourceContext {
  sekolah_id?: string | null;
  unit_id?: string | null;
  program_id?: string | null;
  grade_level?: number | string | null;
  rombel_id?: string | null;
  subject_id?: string | null;
  student_id?: string | null;
  teacher_id?: string | null;
  resource_owner_id?: string | null;
  explicit_resource_id?: string | null;
}

export interface ITeachingAssignmentContext {
  id: string;
  teacher_id: string;
  sekolah_id: string;
  rombel_id: string;
  subject_id: string;
  valid_from: Date;
  valid_until?: Date | null;
  status: "AKTIF" | "NONAKTIF" | "EXPIRED";
}

export interface IHomeroomAssignmentContext {
  id: string;
  teacher_id: string;
  sekolah_id: string;
  rombel_id: string;
  academic_year_id?: string;
  valid_from: Date;
  valid_until?: Date | null;
  status: "AKTIF" | "NONAKTIF" | "EXPIRED";
}

export interface IPositionAssignmentContext {
  id: string;
  personil_id: string;
  sekolah_id: string;
  position_code: PositionCode;
  unit_id?: string | null;
  program_id?: string | null;
  valid_from: Date;
  valid_until?: Date | null;
  status: "AKTIF" | "NONAKTIF" | "EXPIRED";
}

export interface IGuardianRelationshipContext {
  id: string;
  guardian_id: string;
  student_id: string;
  sekolah_id?: string;
  relationship_type?: string;
  verified: boolean;
  valid_from: Date;
  valid_until?: Date | null;
  status: "AKTIF" | "NONAKTIF" | "EXPIRED";
}

export interface EvaluationContext {
  teachingAssignments?: ITeachingAssignmentContext[];
  homeroomAssignments?: IHomeroomAssignmentContext[];
  positionAssignments?: IPositionAssignmentContext[];
  guardianRelationships?: IGuardianRelationshipContext[];
  evaluationDate?: Date;
}

export interface ActorContext {
  id: string;
  username: string;
  peran_dasar: BaseRole;
  status_akun: string;
  sekolah_id?: string | null;
  capabilities?: CapabilityBundle[];
  is_owner?: boolean;
  tipe_sekolah?: string;
}

export interface AccessRequest {
  actor: ActorContext;
  permission: PermissionString;
  resource?: ResourceContext;
  context?: EvaluationContext;
}

export interface AccessDecision {
  allowed: boolean;
  reason: string;
  actorId: string;
  baseRole: BaseRole;
  effectiveCapabilities?: CapabilityBundle[];
  matchedScope?: ResourceScopeType;
}
