type Props = {
  nameQuery: string;
  usernameQuery: string;
  onNameChange: (v: string) => void;
  onUsernameChange: (v: string) => void;
  resultCount: number;
};

export default function SearchBar({
  nameQuery,
  usernameQuery,
  onNameChange,
  onUsernameChange,
  resultCount,
}: Props) {
  const active = nameQuery.trim() || usernameQuery.trim();

  return (
    <div className="card search-bar">
      <div className="search-fields">
        <label>
          <span>search name on list</span>
          <input
            type="text"
            value={nameQuery}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="who is on the watchlist"
          />
        </label>
        <label>
          <span>search added by</span>
          <input
            type="text"
            value={usernameQuery}
            onChange={(e) => onUsernameChange(e.target.value)}
            placeholder="who added the entry"
          />
        </label>
      </div>
      {active && (
        <div className="search-meta">
          <span className="muted">{resultCount} result{resultCount === 1 ? "" : "s"}</span>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              onNameChange("");
              onUsernameChange("");
            }}
          >
            clear
          </button>
        </div>
      )}
    </div>
  );
}
