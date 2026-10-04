import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  AcademicDataTable,
  DataTableColumn,
  DataTableFilterOption,
} from "@/shared/components/ui/academic-data-table";

interface SampleItem {
  id: string;
  name: string;
  category: string;
  score: number;
}

const mockData: SampleItem[] = [
  { id: "1", name: "Alpha Item", category: "TECH", score: 95 },
  { id: "2", name: "Beta Item", category: "SCIENCE", score: 88 },
  { id: "3", name: "Gamma Item", category: "TECH", score: 72 },
  { id: "4", name: "Delta Item", category: "ART", score: 91 },
  { id: "5", name: "Epsilon Item", category: "SCIENCE", score: 65 },
  { id: "6", name: "Zeta Item", category: "ART", score: 84 },
  { id: "7", name: "Eta Item", category: "TECH", score: 78 },
  { id: "8", name: "Theta Item", category: "SCIENCE", score: 99 },
  { id: "9", name: "Iota Item", category: "ART", score: 80 },
  { id: "10", name: "Kappa Item", category: "TECH", score: 85 },
  { id: "11", name: "Lambda Item", category: "SCIENCE", score: 90 },
];

const mockColumns: DataTableColumn<SampleItem>[] = [
  {
    key: "name",
    header: "Nama Barang",
    sortable: true,
    sortAccessor: (r) => r.name,
  },
  {
    key: "category",
    header: "Kategori",
    sortable: true,
  },
  {
    key: "score",
    header: "Skor",
    sortable: true,
    sortAccessor: (r) => r.score,
    align: "right",
  },
];

const mockFilters: DataTableFilterOption<SampleItem>[] = [
  {
    id: "category",
    label: "Kategori",
    options: [
      { value: "ALL", label: "Semua Kategori" },
      { value: "TECH", label: "Teknologi" },
      { value: "SCIENCE", label: "Sains" },
      { value: "ART", label: "Seni" },
    ],
    filterAccessor: (r, val) => r.category === val,
  },
];

describe("AcademicDataTable Component", () => {
  it("renders table headers and paginated rows correctly", () => {
    render(
      <AcademicDataTable<SampleItem>
        data={mockData}
        columns={mockColumns}
        title="Daftar Sampel"
        defaultPageSize={10}
      />
    );

    expect(screen.getByText("Daftar Sampel")).toBeDefined();
    expect(screen.getByText("Nama Barang")).toBeDefined();
    expect(screen.getByText("Kategori")).toBeDefined();
    expect(screen.getByText("Skor")).toBeDefined();

    // Baris ke-1 sampai ke-10 tampil, baris ke-11 tidak di halaman 1
    expect(screen.getByText("Alpha Item")).toBeDefined();
    expect(screen.getByText("Kappa Item")).toBeDefined();
    expect(screen.queryByText("Lambda Item")).toBeNull();

    // Footer pagination format
    const paginationInfo = screen.getByTestId("data-table-pagination-info");
    expect(paginationInfo.textContent).toContain("Menampilkan 1–10 dari 11 data");
  });

  it("navigates to the next page and shows remaining items", () => {
    render(
      <AcademicDataTable<SampleItem> data={mockData} columns={mockColumns} defaultPageSize={10} />
    );

    // Click next page
    const nextBtn = screen.getByLabelText("Halaman Berikutnya");
    fireEvent.click(nextBtn);

    // Halaman 2: Lambda Item tampil, Alpha Item tidak tampil
    expect(screen.getByText("Lambda Item")).toBeDefined();
    expect(screen.queryByText("Alpha Item")).toBeNull();
    const paginationInfo = screen.getByTestId("data-table-pagination-info");
    expect(paginationInfo.textContent).toContain("Menampilkan 11–11 dari 11 data");
  });

  it("filters data based on dropdown selection", () => {
    render(
      <AcademicDataTable<SampleItem>
        data={mockData}
        columns={mockColumns}
        filters={mockFilters}
        defaultPageSize={10}
      />
    );

    const filterBtn = screen.getByTitle("Filter Data");
    fireEvent.click(filterBtn);

    const select = screen.getByDisplayValue("Semua Kategori");
    fireEvent.change(select, { target: { value: "ART" } });

    // Item ART: Delta, Zeta, Iota
    expect(screen.getByText("Delta Item")).toBeDefined();
    expect(screen.getByText("Zeta Item")).toBeDefined();
    expect(screen.getByText("Iota Item")).toBeDefined();
    expect(screen.queryByText("Alpha Item")).toBeNull();

    const paginationInfo = screen.getByTestId("data-table-pagination-info");
    expect(paginationInfo.textContent).toContain("Menampilkan 1–3 dari 3 data");
  });

  it("searches data matching the search query", () => {
    render(
      <AcademicDataTable<SampleItem>
        data={mockData}
        columns={mockColumns}
        searchKeys={["name"]}
        defaultPageSize={10}
      />
    );

    const searchInput = screen.getByPlaceholderText("Cari data...");
    fireEvent.change(searchInput, { target: { value: "gamma" } });

    expect(screen.getByText("Gamma Item")).toBeDefined();
    expect(screen.queryByText("Alpha Item")).toBeNull();
    const paginationInfo = screen.getByTestId("data-table-pagination-info");
    expect(paginationInfo.textContent).toContain("Menampilkan 1–1 dari 1 data");
  });

  it("renders academic glass empty state when no data matches", () => {
    render(
      <AcademicDataTable<SampleItem>
        data={mockData}
        columns={mockColumns}
        emptyStateTitle="Tidak Ditemukan"
        emptyStateDescription="Data kosong untuk pencarian ini."
        defaultPageSize={10}
      />
    );

    const searchInput = screen.getByPlaceholderText("Cari data...");
    fireEvent.change(searchInput, { target: { value: "NON_EXISTING_KEYWORD" } });

    expect(screen.getByText("Tidak Ditemukan")).toBeDefined();
    expect(screen.getByText("Data kosong untuk pencarian ini.")).toBeDefined();
  });
});
