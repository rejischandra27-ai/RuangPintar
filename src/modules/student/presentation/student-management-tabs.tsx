"use client";

/**
 * Ruang Pintar — M07 Student Academic Lifecycle: Symmetrical Management Tabs Container
 */

import React, { useState } from "react";
import { Users, Calendar, BookOpen } from "lucide-react";
import { StudentManagementDataset } from "../application/student-facade";
import { StudentDirectoryView } from "./student-directory-view";
import { StudentEnrollmentsView } from "./student-enrollments-view";
import { StudentPlacementsView } from "./student-placements-view";

interface StudentManagementTabsProps {
  dataset: StudentManagementDataset;
  canManage: boolean;
}

export function StudentManagementTabs({ dataset, canManage }: StudentManagementTabsProps) {
  const [activeTab, setActiveTab] = useState<"directory" | "enrollments" | "placements">(
    "directory"
  );

  const tabs = [
    {
      id: "directory" as const,
      label: "Daftar Siswa",
      icon: Users,
      count: dataset.totalStudents,
      badgeColor: "bg-blue-100 text-blue-700",
    },
    {
      id: "enrollments" as const,
      label: "Keikutsertaan Akademik",
      icon: Calendar,
      count: dataset.totalEnrollments,
      badgeColor: "bg-indigo-100 text-indigo-700",
    },
    {
      id: "placements" as const,
      label: "Penempatan Rombel",
      icon: BookOpen,
      count: dataset.totalPlacements,
      badgeColor: "bg-emerald-100 text-emerald-700",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Clean Tab Navigation (Border-free / Minimalist divider, no heavy card container) */}
      <div className="border-b border-slate-200/80 dark:border-slate-800/80 pb-px">
        <div className="flex items-center gap-2 sm:gap-6 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`group relative pb-3.5 pt-1 px-1 flex items-center gap-2 text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? "text-[#2563EB] dark:text-blue-400"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                }`}
              >
                <Icon
                  className={`h-4 w-4 transition-colors ${
                    isActive
                      ? "text-[#2563EB] dark:text-blue-400"
                      : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500"
                  }`}
                />
                <span>{tab.label}</span>
                <span
                  className={`ml-1 text-[11px] font-mono px-2 py-0.5 rounded-full font-bold transition-colors ${
                    isActive
                      ? "bg-blue-50 text-[#2563EB] dark:bg-blue-950/60 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400"
                  }`}
                >
                  {tab.count}
                </span>
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563EB] dark:bg-blue-400 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Tab View */}
      {activeTab === "directory" && (
        <StudentDirectoryView
          initialStudents={dataset.students}
          academicYears={dataset.academicYears}
          gradeLevels={dataset.gradeLevels}
          rombels={dataset.rombels}
          canManage={canManage}
        />
      )}

      {activeTab === "enrollments" && (
        <StudentEnrollmentsView
          initialEnrollments={dataset.enrollments}
          students={dataset.students}
          academicYears={dataset.academicYears}
          activeYear={dataset.activeYear}
          gradeLevels={dataset.gradeLevels}
          rombels={dataset.rombels}
          canManage={canManage}
        />
      )}

      {activeTab === "placements" && (
        <StudentPlacementsView
          initialPlacements={dataset.placements}
          enrollments={dataset.enrollments}
          rombels={dataset.rombels}
          academicYears={dataset.academicYears}
          canManage={canManage}
        />
      )}
    </div>
  );
}
