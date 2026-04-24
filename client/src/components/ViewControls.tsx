import type { SortOrder } from "../hooks/useViewPrefs";

type Props = {
  pageSize: number;
  onPageSizeChange: (v: number) => void;
  columns: 1 | 3;
  onColumnsChange: (v: 1 | 3) => void;
  sortOrder: SortOrder;
  onSortOrderChange: (v: SortOrder) => void;
};

const PAGE_SIZES = [10, 20, 30, 40, 50];

export default function ViewControls({
  pageSize,
  onPageSizeChange,
  columns,
  onColumnsChange,
  sortOrder,
  onSortOrderChange,
}: Props) {
  return (
    <div className="view-controls">
      <label className="inline-select">
        <span>per page</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="col-toggle"
        aria-label={`switch to ${columns === 1 ? "3" : "1"} column layout`}
        onClick={() => onColumnsChange(columns === 1 ? 3 : 1)}
      >
        {columns === 1 ? "▯ 1 col" : "▦ 3 col"}
      </button>
      <button
        type="button"
        className="sort-toggle"
        aria-label={`sort ${sortOrder === "desc" ? "oldest" : "newest"} first`}
        onClick={() => onSortOrderChange(sortOrder === "desc" ? "asc" : "desc")}
      >
        {sortOrder === "desc" ? "↓ newest" : "↑ oldest"}
      </button>
    </div>
  );
}
