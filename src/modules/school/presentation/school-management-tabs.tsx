"use client";

/**
 * Ruang Pintar — School Management Tabs Component (Academic Glass UI v1.2)
 */

import React, { useState } from "react";
import { Building2, Network, Award, UserCheck, Zap } from "lucide-react";
import {
  OrganizationUnitDTO,
  PersonilOptionDTO,
  PositionAssignmentDTO,
  PositionDTO,
  SchoolProfileDTO,
} from "../domain/school-types";
import { SchoolProfileForm } from "./school-profile-form";
import { OrganizationUnitsView } from "./organization-units-view";
import { PositionsView } from "./positions-view";
import { PositionAssignmentsView } from "./position-assignments-view";
import { TenantBillingDashboardView } from "@/modules/billing/presentation/tenant-billing-dashboard-view";

interface SchoolManagementTabsProps {
  profile: SchoolProfileDTO;
  units: OrganizationUnitDTO[];
  positions: PositionDTO[];
  assignments: PositionAssignmentDTO[];
  personnel: PersonilOptionDTO[];
  canManageSchool: boolean;
  canViewStructure: boolean;
  canManageStructure: boolean;
  initialTab?: string;
}

export function SchoolManagementTabs({
  profile,
  units,
  positions,
  assignments,
  personnel,
  canManageSchool,
  canViewStructure,
  canManageStructure,
  initialTab = "profil",
}: SchoolManagementTabsProps) {
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  return (
    <div className="space-y-6">
      {/* Floating Segmented Tabs Capsule (2x2 Grid on Mobile, Flex on Tablet/Desktop) */}
      <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 p-1.5 bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100/90">
        <button
          type="button"
          onClick={() => setActiveTab("profil")}
          className={`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2.5 rounded-xl text-[11.5px] sm:text-[13px] font-bold transition-all cursor-pointer ${
            activeTab === "profil"
              ? "bg-[#2563EB] text-white shadow-md shadow-blue-500/20"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Building2 className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">Profil Sekolah</span>
        </button>

        {canViewStructure && (
          <>
            <button
              type="button"
              onClick={() => setActiveTab("unit")}
              className={`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2.5 rounded-xl text-[11.5px] sm:text-[13px] font-bold transition-all cursor-pointer ${
                activeTab === "unit"
                  ? "bg-[#2563EB] text-white shadow-md shadow-blue-500/20"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Network className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Unit Organisasi</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold flex-shrink-0 ${
                  activeTab === "unit" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {units.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("jabatan")}
              className={`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2.5 rounded-xl text-[11.5px] sm:text-[13px] font-bold transition-all cursor-pointer ${
                activeTab === "jabatan"
                  ? "bg-[#2563EB] text-white shadow-md shadow-blue-500/20"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Award className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Master Jabatan</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold flex-shrink-0 ${
                  activeTab === "jabatan" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {positions.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("penugasan")}
              className={`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2.5 rounded-xl text-[11.5px] sm:text-[13px] font-bold transition-all cursor-pointer ${
                activeTab === "penugasan"
                  ? "bg-[#2563EB] text-white shadow-md shadow-blue-500/20"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <UserCheck className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">
                Penugasan<span className="hidden sm:inline"> Personil</span>
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold flex-shrink-0 ${
                  activeTab === "penugasan"
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {assignments.length}
              </span>
            </button>
          </>
        )}

        {/* Tab Langganan & Billing (ADR-003 Tenant Owner Visibility) */}
        <button
          type="button"
          onClick={() => setActiveTab("billing")}
          className={`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2.5 rounded-xl text-[11.5px] sm:text-[13px] font-bold transition-all cursor-pointer ${
            activeTab === "billing"
              ? "bg-[#2563EB] text-white shadow-md shadow-blue-500/20"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Zap className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">Langganan & Billing</span>
        </button>
      </div>

      {/* TAB CONTENT PANELS */}
      <div>
        {activeTab === "profil" && (
          <SchoolProfileForm initialProfile={profile} canManage={canManageSchool} />
        )}

        {canViewStructure && activeTab === "unit" && (
          <OrganizationUnitsView initialUnits={units} canManage={canManageStructure} />
        )}

        {canViewStructure && activeTab === "jabatan" && (
          <PositionsView
            initialPositions={positions}
            units={units}
            canManage={canManageStructure}
          />
        )}

        {canViewStructure && activeTab === "penugasan" && (
          <PositionAssignmentsView
            initialAssignments={assignments}
            positions={positions}
            personnel={personnel}
            canManage={canManageStructure}
          />
        )}

        {activeTab === "billing" && <TenantBillingDashboardView />}
      </div>
    </div>
  );
}
