type Props = {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
};

export default function Pagination({ page, pageCount, onChange }: Props) {
  if (pageCount <= 1) return null;
  const pages: number[] = [];
  for (let i = 1; i <= pageCount; i++) pages.push(i);

  return (
    <div className="pagination">
      <button
        className="ghost"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
      >
        prev
      </button>
      {pages.map((p) => (
        <button
          key={p}
          className={p === page ? "page-num active" : "page-num"}
          onClick={() => onChange(p)}
        >
          {p}
        </button>
      ))}
      <button
        className="ghost"
        disabled={page === pageCount}
        onClick={() => onChange(page + 1)}
      >
        next
      </button>
    </div>
  );
}
