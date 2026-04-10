"use client";

import { cn } from "@ticket-app/ui/lib/utils";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "lucide-react";
import * as React from "react";

interface PaginatorProps extends React.ComponentProps<"div"> {
  page: number;
  pageSize: number;
  totalCount: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  showPageSizeSelector?: boolean;
  showTotalCount?: boolean;
}

function Paginator({
  className,
  page,
  pageSize,
  totalCount,
  pageSizeOptions = [10, 25, 50, 100],
  onPageChange,
  onPageSizeChange,
  showPageSizeSelector = true,
  showTotalCount = true,
  ...props
}: PaginatorProps) {
  const totalPages = Math.ceil(totalCount / pageSize);

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    const delta = 1;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== "ellipsis") {
        pages.push("ellipsis");
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();
  const startItem = Math.min((page - 1) * pageSize + 1, totalCount);
  const endItem = Math.min(page * pageSize, totalCount);

  return (
    <div
      data-slot="paginator"
      className={cn("flex flex-wrap items-center justify-between gap-4 px-4 py-3", className)}
      {...props}
    >
      <div className="flex items-center gap-4">
        {showTotalCount && (
          <span className="text-xs text-muted-foreground">
            {startItem}-{endItem} of {totalCount}
          </span>
        )}

        {showPageSizeSelector && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Rows per page</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-7 rounded-none border border-input bg-transparent px-2 text-xs outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          className="inline-flex size-7 items-center justify-center rounded-none text-xs transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
          aria-label="First page"
        >
          <ChevronsLeftIcon className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="inline-flex size-7 items-center justify-center rounded-none text-xs transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
          aria-label="Previous page"
        >
          <ChevronLeftIcon className="size-4" />
        </button>

        <div className="flex items-center gap-1">
          {pageNumbers.map((p, idx) =>
            p === "ellipsis" ? (
              <span
                key={`ellipsis-${idx}`}
                className="inline-flex size-7 items-center justify-center text-xs text-muted-foreground"
              >
                ...
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={cn(
                  "inline-flex size-7 items-center justify-center rounded-none text-xs transition-colors",
                  p === page ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
                aria-current={p === page ? "page" : undefined}
              >
                {p}
              </button>
            ),
          )}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="inline-flex size-7 items-center justify-center rounded-none text-xs transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
          aria-label="Next page"
        >
          <ChevronRightIcon className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          className="inline-flex size-7 items-center justify-center rounded-none text-xs transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
          aria-label="Last page"
        >
          <ChevronsRightIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}

export { Paginator };
