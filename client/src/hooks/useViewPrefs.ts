import { useEffect, useState } from "react";

const PAGE_SIZE_KEY = "watchlist-page-size";
const COL_MODE_KEY = "watchlist-col-mode";
const SORT_KEY = "watchlist-sort";
const ALLOWED_SIZES = [10, 20, 30, 40, 50];

export type SortOrder = "desc" | "asc";

function readPageSize(): number {
  if (typeof window === "undefined") return 20;
  const raw = Number(window.localStorage.getItem(PAGE_SIZE_KEY));
  return ALLOWED_SIZES.includes(raw) ? raw : 20;
}

function readColumns(): 1 | 3 {
  if (typeof window === "undefined") return 1;
  return window.localStorage.getItem(COL_MODE_KEY) === "3" ? 3 : 1;
}

function readSortOrder(): SortOrder {
  if (typeof window === "undefined") return "desc";
  return window.localStorage.getItem(SORT_KEY) === "asc" ? "asc" : "desc";
}

export function useViewPrefs() {
  const [pageSize, setPageSize] = useState<number>(readPageSize);
  const [columns, setColumns] = useState<1 | 3>(readColumns);
  const [sortOrder, setSortOrder] = useState<SortOrder>(readSortOrder);

  useEffect(() => {
    window.localStorage.setItem(PAGE_SIZE_KEY, String(pageSize));
  }, [pageSize]);

  useEffect(() => {
    window.localStorage.setItem(COL_MODE_KEY, String(columns));
  }, [columns]);

  useEffect(() => {
    window.localStorage.setItem(SORT_KEY, sortOrder);
  }, [sortOrder]);

  return { pageSize, setPageSize, columns, setColumns, sortOrder, setSortOrder };
}
