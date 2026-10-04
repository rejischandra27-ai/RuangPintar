/**
 * Ruang Pintar — Effective Access Decision Engine (M02)
 *
 * Sesuai docs/04-ROLE-ACCESS.md Section 3-60:
 * Identity -> Base Role -> Position/Assignment/Relationship -> Permission -> Resource Scope -> Effective Access
 * Default Deny: Setiap hak yang tidak dapat dibuktikan secara sah menghasilkan DENY.
 */

import { AccessDecision, AccessRequest, PermissionString, ResourceScopeType } from "./types";
import { BASE_ROLE_PERMISSIONS, POSITION_PERMISSIONS } from "./role-permissions";
import { getPermissionsForBundles } from "./capability-bundles";
import {
  evaluateTeachingAssignmentScope,
  evaluateHomeroomAssignmentScope,
  evaluatePositionAssignmentScope,
  evaluateGuardianRelationshipScope,
} from "./assignment-contracts";

export class AccessControlEngine {
  /**
   * Evaluasi permintaan akses secara deterministik dan server-authoritative.
   */
  public evaluate(request: AccessRequest): AccessDecision {
    const { actor, permission, resource = {}, context = {} } = request;
    const evalDate = context.evaluationDate ?? new Date();

    // 1. Verifikasi Status Akun (Must be AKTIF)
    if (actor.status_akun !== "AKTIF") {
      return {
        allowed: false,
        reason: `Akun berstatus ${actor.status_akun}; akses ditolak.`,
        actorId: actor.id,
        baseRole: actor.peran_dasar,
      };
    }

    // 2. Tenant / Cross-School Isolation (Kecuali SUPER_ADMIN)
    if (actor.peran_dasar !== "SUPER_ADMIN") {
      if (resource.sekolah_id && !actor.sekolah_id) {
        return {
          allowed: false,
          reason: "Active tenant context is required for tenant-scoped resources.",
          actorId: actor.id,
          baseRole: actor.peran_dasar,
        };
      }
      if (resource.sekolah_id && resource.sekolah_id !== actor.sekolah_id) {
        return {
          allowed: false,
          reason: "Cross-school resource access prohibited.",
          actorId: actor.id,
          baseRole: actor.peran_dasar,
        };
      }
    }

    // 3. SUPER_ADMIN Platform Superuser Bypass
    if (actor.peran_dasar === "SUPER_ADMIN") {
      return {
        allowed: true,
        reason: "SUPER_ADMIN platform-level access granted.",
        actorId: actor.id,
        baseRole: actor.peran_dasar,
        matchedScope: "GLOBAL",
      };
    }

    // 4. Resolusi Himpunan Permission yang Dimiliki Actor
    const grantedPermissions = new Set<PermissionString>(
      BASE_ROLE_PERMISSIONS[actor.peran_dasar] || []
    );

    // Tambahkan capability bundle jika actor adalah SCHOOL_STAFF
    if (actor.peran_dasar === "SCHOOL_STAFF" && actor.capabilities) {
      const bundlePerms = getPermissionsForBundles(actor.capabilities);
      for (const p of bundlePerms) {
        grantedPermissions.add(p);
      }
    }

    // Resolusi otoritas Tenant Owner (Guru Mandiri / Pemilik Tenant)
    if (actor.is_owner) {
      grantedPermissions.add("academic.students.view");
      grantedPermissions.add("academic.students.manage");
      grantedPermissions.add("academic.classes.view");
      grantedPermissions.add("academic.classes.manage");
      grantedPermissions.add("academic.structure.view");
      grantedPermissions.add("academic.structure.manage");
    }

    // Tambahkan permissions dari Homeroom Assignment yang aktif
    if (context.homeroomAssignments && context.homeroomAssignments.length > 0) {
      for (const ha of context.homeroomAssignments) {
        if (evaluateHomeroomAssignmentScope(actor.id, ha, resource, evalDate)) {
          grantedPermissions.add("monitoring.homeroom.view");
          grantedPermissions.add("attendance.school.view");
        }
      }
    }

    // Tambahkan permissions dari Position Assignment yang aktif
    let activePositionScopeMatched = false;
    let activePositionCode: string | undefined;

    if (context.positionAssignments && context.positionAssignments.length > 0) {
      for (const pos of context.positionAssignments) {
        if (evaluatePositionAssignmentScope(actor.id, pos, resource, evalDate)) {
          const posPerms = POSITION_PERMISSIONS[pos.position_code] || [];
          for (const p of posPerms) {
            grantedPermissions.add(p);
          }
          activePositionScopeMatched = true;
          activePositionCode = pos.position_code;
        }
      }
    }

    // 5. Verifikasi Keberadaan Permission pada Grant Set
    if (!grantedPermissions.has(permission)) {
      return {
        allowed: false,
        reason: `Actor role ${actor.peran_dasar} lacks required permission: ${permission}`,
        actorId: actor.id,
        baseRole: actor.peran_dasar,
        effectiveCapabilities: actor.capabilities,
      };
    }

    // 6. Evaluasi Resource Scope Berdasarkan Domain & Base Role

    // A. Guru (TEACHER) Scope Evaluation
    if (actor.peran_dasar === "TEACHER") {
      const isClassroomMutationOrGrading =
        permission.startsWith("attendance.session.") ||
        permission.startsWith("assessment.grades.") ||
        permission.startsWith("learning.material.manage") ||
        permission.startsWith("learning.assignment.manage") ||
        permission.startsWith("cbt.exam.manage");

      if (isClassroomMutationOrGrading) {
        // Jika terdapat target spesifik rombel atau mapel, wajib memiliki Teaching Assignment aktif yang sesuai
        const hasSpecificTarget = Boolean(resource.rombel_id || resource.subject_id);

        if (hasSpecificTarget) {
          const assignments = context.teachingAssignments || [];
          const hasMatchingTeachingAssignment = assignments.some((ta) =>
            evaluateTeachingAssignmentScope(actor.id, ta, resource, evalDate)
          );

          if (!hasMatchingTeachingAssignment) {
            return {
              allowed: false,
              reason: "Teacher has no active Teaching Assignment for the requested class/subject.",
              actorId: actor.id,
              baseRole: actor.peran_dasar,
            };
          }
        }

        return {
          allowed: true,
          reason: "Teacher authorized via valid Teaching Assignment.",
          actorId: actor.id,
          baseRole: actor.peran_dasar,
          matchedScope: "TEACHING_ASSIGNMENT",
        };
      }

      // Homeroom monitoring check
      if (permission === "monitoring.homeroom.view") {
        const homerooms = context.homeroomAssignments || [];
        const hasMatchingHomeroom = homerooms.some((ha) =>
          evaluateHomeroomAssignmentScope(actor.id, ha, resource, evalDate)
        );

        if (!hasMatchingHomeroom) {
          return {
            allowed: false,
            reason: "Teacher has no active Homeroom Assignment for requested rombel.",
            actorId: actor.id,
            baseRole: actor.peran_dasar,
          };
        }

        return {
          allowed: true,
          reason: "Teacher authorized via valid Homeroom Assignment.",
          actorId: actor.id,
          baseRole: actor.peran_dasar,
          matchedScope: "HOMEROOM_ASSIGNMENT",
        };
      }
    }

    // B. Siswa (STUDENT) Self-Scope Evaluation
    if (actor.peran_dasar === "STUDENT") {
      if (resource.student_id && resource.student_id !== actor.id) {
        return {
          allowed: false,
          reason: "Student is restricted to SELF scope and cannot access other students' records.",
          actorId: actor.id,
          baseRole: actor.peran_dasar,
        };
      }

      if (resource.resource_owner_id && resource.resource_owner_id !== actor.id) {
        return {
          allowed: false,
          reason: "Student cannot access resources owned by others.",
          actorId: actor.id,
          baseRole: actor.peran_dasar,
        };
      }

      return {
        allowed: true,
        reason: "Student authorized within STUDENT_SELF scope.",
        actorId: actor.id,
        baseRole: actor.peran_dasar,
        matchedScope: "STUDENT_SELF",
      };
    }

    // C. Orang Tua / Wali (GUARDIAN) Scope Evaluation
    if (actor.peran_dasar === "GUARDIAN") {
      const isStudentSpecificRead =
        permission.startsWith("attendance.session.") ||
        permission.startsWith("assessment.grades.") ||
        permission.startsWith("assessment.report_card.");

      if (isStudentSpecificRead) {
        if (!resource.student_id) {
          return {
            allowed: false,
            reason: "Target student_id required for guardian resource evaluation.",
            actorId: actor.id,
            baseRole: actor.peran_dasar,
          };
        }

        const relationships = context.guardianRelationships || [];
        const hasVerifiedRelationship = relationships.some((gr) =>
          evaluateGuardianRelationshipScope(actor.id, gr, resource, evalDate)
        );

        if (!hasVerifiedRelationship) {
          return {
            allowed: false,
            reason: "Guardian has no verified, active relationship with the target student.",
            actorId: actor.id,
            baseRole: actor.peran_dasar,
          };
        }

        return {
          allowed: true,
          reason: "Guardian authorized via verified active student relationship.",
          actorId: actor.id,
          baseRole: actor.peran_dasar,
          matchedScope: "GUARDIAN_RELATIONSHIP",
        };
      }
    }

    // D. Staff / Position Scope Evaluation
    let matchedScope: ResourceScopeType = "SCHOOL";
    if (activePositionScopeMatched) {
      matchedScope = activePositionCode === "PROGRAM_HEAD" ? "PROGRAM" : "SCHOOL";
    }

    return {
      allowed: true,
      reason: `Access granted under ${matchedScope} scope.`,
      actorId: actor.id,
      baseRole: actor.peran_dasar,
      effectiveCapabilities: actor.capabilities,
      matchedScope,
    };
  }
}

export const accessControlEngine = new AccessControlEngine();
