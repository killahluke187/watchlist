import { useEffect, useMemo, useState } from "react";
import AddEntryForm from "../components/AddEntryForm";
import EntryCard from "../components/EntryCard";
import LoginForm from "../components/LoginForm";
import Modal from "../components/Modal";
import Pagination from "../components/Pagination";
import SearchBar from "../components/SearchBar";
import ViewControls from "../components/ViewControls";
import { useViewPrefs } from "../hooks/useViewPrefs";
import { checkUser, fetchEntries } from "../api";
import type { Entry } from "../types";

const USER_KEY = "watchlist-user";

export default function Home() {
  const [authedUser, setAuthedUser] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [nameQuery, setNameQuery] = useState("");
  const [usernameQuery, setUsernameQuery] = useState("");
  const { pageSize, setPageSize, columns, setColumns, sortOrder, setSortOrder } = useViewPrefs();

  useEffect(() => {
    const cached = localStorage.getItem(USER_KEY);
    if (!cached) return;
    checkUser(cached)
      .then((ok) => {
        if (ok) setAuthedUser(cached);
        else localStorage.removeItem(USER_KEY);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchEntries()
      .then(setEntries)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function onAuthed(username: string) {
    localStorage.setItem(USER_KEY, username);
    setAuthedUser(username);
    setLoginOpen(false);
  }

  function logout() {
    localStorage.removeItem(USER_KEY);
    setAuthedUser(null);
  }

  function onAdded(entry: Entry) {
    setEntries((prev) => [entry, ...prev]);
    setAddOpen(false);
    setPage(1);
  }

  const filtered = useMemo(() => {
    const n = nameQuery.trim().toLowerCase();
    const u = usernameQuery.trim().toLowerCase();
    if (!n && !u) return entries;
    return entries.filter(
      (e) =>
        (!n || e.name.toLowerCase().includes(n)) &&
        (!u || e.username.toLowerCase().includes(u))
    );
  }, [entries, nameQuery, usernameQuery]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) =>
      sortOrder === "desc" ? b.createdAt - a.createdAt : a.createdAt - b.createdAt
    );
    return copy;
  }, [filtered, sortOrder]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageEntries = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  useEffect(() => {
    setPage(1);
  }, [nameQuery, usernameQuery, pageSize]);

  return (
    <div className={`page${columns === 3 ? " page--wide" : ""}`}>
      <header className="page-header card">
        <div>
          <h1>watchlist</h1>
          <div className="subtitle">
            {authedUser ? `signed in as ${authedUser}` : "view-only — log in to add entries"}
          </div>
        </div>
        <div className="header-actions">
          <ViewControls
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            columns={columns}
            onColumnsChange={setColumns}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
          />
          {authedUser ? (
            <>
              <button onClick={() => setAddOpen(true)}>+ new entry</button>
              <button className="ghost" onClick={logout}>logout</button>
            </>
          ) : (
            <button onClick={() => setLoginOpen(true)}>login</button>
          )}
        </div>
      </header>

      <SearchBar
        nameQuery={nameQuery}
        usernameQuery={usernameQuery}
        onNameChange={setNameQuery}
        onUsernameChange={setUsernameQuery}
        resultCount={filtered.length}
      />

      <section className={`entries${columns === 3 ? " entries--grid" : ""}`}>
        {loading && <div className="card muted">loading...</div>}
        {error && <div className="card error">{error}</div>}
        {!loading && entries.length === 0 && (
          <div className="card muted">no entries yet</div>
        )}
        {!loading && entries.length > 0 && filtered.length === 0 && (
          <div className="card muted">no matches</div>
        )}
        {pageEntries.map((e) => (
          <EntryCard key={e.id} entry={e} />
        ))}
      </section>

      <Pagination page={page} pageCount={pageCount} onChange={setPage} />

      <Modal open={loginOpen} onClose={() => setLoginOpen(false)} title="login">
        <LoginForm onAuthed={onAuthed} />
      </Modal>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="new entry">
        {authedUser && <AddEntryForm onAdded={onAdded} submittedBy={authedUser} />}
      </Modal>
    </div>
  );
}
