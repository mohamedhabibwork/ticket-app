"use client";

import { cn } from "@ticket-app/ui/lib/utils";
import { ChevronUpIcon, ChevronDownIcon, DownloadIcon } from "lucide-react";
import * as React from "react";

interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> extends Omit<React.ComponentProps<"div">, "value" | "onChange"> {
  columns: Column<T>[];
  data: T[];
  keyField?: keyof T;
  loading?: boolean;
  emptyMessage?: string;
  selectable?: boolean;
  selectedKeys?: Set<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  pagination?: {
    page: number;
    pageSize: number;
    totalCount: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
  };
  onSort?: (key: string, direction: "asc" | "desc") => void;
  sortKey?: string;
  sortDirection?: "asc" | "desc";
  onExportCSV?: (data: T[]) => void;
  exportFilename?: string;
}

function DataTable<T extends Record<string, unknown>>({
  className,
  columns,
  data,
  keyField = "id" as keyof T,
  loading = false,
  emptyMessage = "No data available",
  selectable = false,
  selectedKeys = new Set(),
  onSelectionChange,
  pagination,
  onSort,
  sortKey,
  sortDirection,
  onExportCSV,
  exportFilename = "export.csv",
  ...props
}: DataTableProps<T>) {
  const [internalSelectedKeys, setInternalSelectedKeys] = React.useState<Set<string>>(selectedKeys);

  React.useEffect(() => {
    setInternalSelectedKeys(selectedKeys);
  }, [selectedKeys]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allKeys = new Set(data.map((row) => String(row[keyField])));
      setInternalSelectedKeys(allKeys);
      onSelectionChange?.(allKeys);
    } else {
      setInternalSelectedKeys(new Set());
      onSelectionChange?.(new Set());
    }
  };

  const handleSelectRow = (key: string, checked: boolean) => {
    const newKeys = new Set(internalSelectedKeys);
    if (checked) {
      newKeys.add(key);
    } else {
      newKeys.delete(key);
    }
    setInternalSelectedKeys(newKeys);
    onSelectionChange?.(newKeys);
  };

  const handleSort = (column: Column<T>) => {
    if (!column.sortable || !onSort) return;

    const newDirection = sortKey === column.key && sortDirection === "asc" ? "desc" : "asc";
    onSort(column.key, newDirection);
  };

  const exportToCSV = () => {
    if (!onExportCSV && data.length > 0) {
      const headers = columns.map((c) => c.header).join(",");
      const rows = data.map((row) =>
        columns
          .map((c) => {
            const value = row[c.key];
            const cellValue =
              typeof value === "string" && value.includes(",") ? `"${value}"` : value;
            return cellValue;
          })
          .join(","),
      );

      const csvContent = [headers, ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = exportFilename;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      onExportCSV?.(data);
    }
  };

  const allSelected =
    data.length > 0 && data.every((row) => internalSelectedKeys.has(String(row[keyField])));
  const someSelected =
    data.some((row) => internalSelectedKeys.has(String(row[keyField]))) && !allSelected;

  return (
    <div data-slot="data-table" className={cn("flex flex-col", className)} {...props}>
      {onExportCSV && (
        <div className="flex justify-end pb-2">
          <button
            type="button"
            onClick={exportToCSV}
            className="inline-flex h-7 items-center gap-1.5 rounded-none border border-input bg-transparent px-3 text-xs transition-colors hover:bg-muted"
          >
            <DownloadIcon className="size-3.5" />
            Export CSV
          </button>
        </div>
      )}

      <div className="overflow-auto rounded-none border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-muted/50">
              {selectable && (
                <th className="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="size-4 rounded-none border-input"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "px-3 py-2 text-left font-medium text-muted-foreground",
                    column.sortable && "cursor-pointer select-none hover:bg-muted",
                  )}
                  style={{ width: column.width }}
                  onClick={() => handleSort(column)}
                >
                  <span className="inline-flex items-center gap-1">
                    {column.header}
                    {column.sortable && sortKey === column.key && (
                      <span className="text-primary">
                        {sortDirection === "asc" ? (
                          <ChevronUpIcon className="size-3.5" />
                        ) : (
                          <ChevronDownIcon className="size-3.5" />
                        )}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="h-32 text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <svg className="size-5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Loading...
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="h-32 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => {
                const rowKey = String(row[keyField]);
                const isSelected = internalSelectedKeys.has(rowKey);

                return (
                  <tr
                    key={rowKey || rowIdx}
                    data-selected={isSelected}
                    className={cn(
                      "border-b transition-colors",
                      isSelected ? "bg-primary/5" : "hover:bg-muted/50",
                    )}
                  >
                    {selectable && (
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(rowKey, e.target.checked)}
                          className="size-4 rounded-none border-input"
                        />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td key={column.key} className="px-3 py-2">
                        {column.render ? column.render(row) : String(row[column.key] ?? "")}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="flex items-center justify-between border-t px-4 py-3">
          <span className="text-xs text-muted-foreground">
            {Math.min((pagination.page - 1) * pagination.pageSize + 1, pagination.totalCount)}-
            {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} of{" "}
            {pagination.totalCount}
          </span>

          <div className="flex items-center gap-2">
            <select
              value={pagination.pageSize}
              onChange={(e) => pagination.onPageSizeChange?.(Number(e.target.value))}
              className="h-7 rounded-none border border-input bg-transparent px-2 text-xs outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size} rows
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => pagination.onPageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="inline-flex size-7 items-center justify-center rounded-none text-xs transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
              >
                <svg
                  className="size-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>

              <span className="px-2 text-xs">
                Page {pagination.page} of {Math.ceil(pagination.totalCount / pagination.pageSize)}
              </span>

              <button
                type="button"
                onClick={() => pagination.onPageChange(pagination.page + 1)}
                disabled={pagination.page >= Math.ceil(pagination.totalCount / pagination.pageSize)}
                className="inline-flex size-7 items-center justify-center rounded-none text-xs transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
              >
                <svg
                  className="size-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { DataTable };
