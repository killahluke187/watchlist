type Props = {
  nameQuery: string;
  usernameQuery: string;
  onNameChange: (v: string) => void;
  onUsernameChange: (v: string) => void;
  authQuery?: string;
  onAuthChange?: (v: string) => void;
  resultCount: number;
};

export default function SearchBar({
  nameQuery,
  usernameQuery,
  onNameChange,
  onUsernameChange,
  authQuery,
  onAuthChange,
  resultCount,
}: Props) {
  const showAuth = typeof authQuery === "string" && typeof onAuthChange === "function";
  const active = nameQuery.trim() || usernameQuery.trim() || (showAuth && authQuery!.trim());

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
        {showAuth && (
          <label>
            <span>search auth user</span>
            <input
              type="text"
              value={authQuery}
              onChange={(e) => onAuthChange!(e.target.value)}
              placeholder="who was logged in"
            />
          </label>
        )}
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
              if (showAuth) onAuthChange!("");
            }}
          >
            clear
          </button>
        </div>
      )}
    </div>
  );
}
