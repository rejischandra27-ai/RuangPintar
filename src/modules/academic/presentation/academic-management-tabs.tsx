"use client";

/**
 * Ruang Pintar — Academic Structure Management Tabs (Academic Glass UI v1.2)
 *
 * Tab navigasi simetris responsif untuk 4 pilar struktur akademik:
 * 1. Tahun Ajaran & Semester
 * 2. Tingkat & Fase
 * 3. Program Keahlian / Jurusan
 * 4. Rombel / Rombongan Belajar
 */

import React, { useState } from "react";
import { Calendar, Layers, BookOpen, Users } from "lucide-react";
import { AcademicStructureData } from "../application/academic-facade";
import { AcademicYearsView } from "./academic-years-view";
import { GradeLevelsView } from "./grade-levels-view";
import { ProgramsView } from "./programs-view";
import { RombelsView } from "./rombels-view";

interface AcademicManagementTabsProps {
  initialData: AcademicStructureData;
  canManage: boolean;
  isTenantOwner?: boolean;
}

export type AcademicTabKey = "YEARS" | "GRADES" | "PROGRAMS" | "ROMBELS";

export function AcademicManagementTabs({
  initialData,
  canManage,
  isTenantOwner = false,
}: AcademicManagementTabsProps) {
  const [activeTab, setActiveTab] = useState<AcademicTabKey>("YEARS");

  return (
    <div className="space-y-6">
      {/* Responsive Tab Bar (Mobile 2x2 Grid, Desktop Flex) */}
      <div className="rounded-3xl bg-white/80 backdrop-blur-md border border-slate-200/80 p-2 shadow-sm">
        <div className="grid grid-cols-2 md:flex md:items-center gap-1.5">
          {/* Tab 1: Tahun Ajaran */}
          <button
            type="button"
            onClick={() => setActiveTab("YEARS")}
            className={`w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeTab === "YEARS"
                ? "bg-[#2563EB] text-white shadow-md shadow-blue-500/20"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
            }`}
          >
            <Calendar className="h-4 w-4 shrink-0" />
            <span>Tahun Ajaran & Semester</span>
            <span
              className={`ml-1 text-[11px] px-2 py-0.5 rounded-full font-extrabold ${
                activeTab === "YEARS" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {initialData.academicYears.length}
            </span>
          </button>

          {/* Tab 2: Tingkat & Fase */}
          <button
            type="button"
            onClick={() => setActiveTab("GRADES")}
            className={`w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeTab === "GRADES"
                ? "bg-[#2563EB] text-white shadow-md shadow-blue-500/20"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
            }`}
          >
            <Layers className="h-4 w-4 shrink-0" />
            <span>Tingkat & Fase</span>
            <span
              className={`ml-1 text-[11px] px-2 py-0.5 rounded-full font-extrabold ${
                activeTab === "GRADES" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {initialData.gradeLevels.length}
            </span>
          </button>

          {/* Tab 3: Program Keahlian */}
          <button
            type="button"
            onClick={() => setActiveTab("PROGRAMS")}
            className={`w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeTab === "PROGRAMS"
                ? "bg-[#2563EB] text-white shadow-md shadow-blue-500/20"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
            }`}
          >
            <BookOpen className="h-4 w-4 shrink-0" />
            <span>Program / Jurusan</span>
            <span
              className={`ml-1 text-[11px] px-2 py-0.5 rounded-full font-extrabold ${
                activeTab === "PROGRAMS" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {initialData.programs.length}
            </span>
          </button>

          {/* Tab 4: Rombel */}
          <button
            type="button"
            onClick={() => setActiveTab("ROMBELS")}
            className={`w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeTab === "ROMBELS"
                ? "bg-[#2563EB] text-white shadow-md shadow-blue-500/20"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
            }`}
          >
            <Users className="h-4 w-4 shrink-0" />
            <span>Rombongan Belajar</span>
            <span
              className={`ml-1 text-[11px] px-2 py-0.5 rounded-full font-extrabold ${
                activeTab === "ROMBELS" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {initialData.rombels.length}
            </span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === "YEARS" && (
          <AcademicYearsView
            initialYears={initialData.academicYears}
            initialSemesters={initialData.semesters}
            canManage={canManage}
          />
        )}

        {activeTab === "GRADES" && (
          <GradeLevelsView
            initialGradeLevels={initialData.gradeLevels}
            initialPhases={initialData.phases}
            canManage={canManage}
          />
        )}

        {activeTab === "PROGRAMS" && (
          <ProgramsView initialPrograms={initialData.programs} canManage={canManage} />
        )}

        {activeTab === "ROMBELS" && (
          <RombelsView
            initialRombels={initialData.rombels}
            academicYears={initialData.academicYears}
            semesters={initialData.semesters}
            gradeLevels={initialData.gradeLevels}
            phases={initialData.phases}
            programs={initialData.programs}
            canManage={canManage}
            isTenantOwner={isTenantOwner}
          />
        )}
      </div>
    </div>
  );
}
