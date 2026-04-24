import { useEffect, useMemo, useState } from "react";
import AddEntryForm from "../components/AddEntryForm";
import EntryCard from "../components/EntryCard";
import Modal from "../components/Modal";
import Pagination from "../components/Pagination";
import SearchBar from "../components/SearchBar";
import UserGate from "../components/UserGate";
import ViewControls from "../components/ViewControls";
import { useViewPrefs } from "../hooks/useViewPrefs";
import { checkUser, fetchEntries } from "../api";
import type { Entry } from "../types";

const USER_KEY = "watchlist-user";

export default function Home() {
  const [authedUser, setAuthedUser] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [nameQuery, setNameQuery] = useState("");
  const [usernameQuery, setUsernameQuery] = useState("");
  const { pageSize, setPageSize, columns, setColumns, sortOrder, setSortOrder } = useViewPrefs();

  useEffect(() => {
    const cached = localStorage.getItem(USER_KEY);
    if (!cached) {
      setAuthChecked(true);
      return;
    }
    checkUser(cached)
      .then((ok) => {
        if (ok) setAuthedUser(cached);
        else localStorage.removeItem(USER_KEY);
      })
      .catch(() => {})
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (!authedUser) return;
    fetchEntries()
      .then(setEntries)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [authedUser]);

  function onAuthed(username: string) {
    localStorage.setItem(USER_KEY, username);
    setAuthedUser(username);
  }

  function onAdded(entry: Entry) {
    setEntries((prev) => [entry, ...prev]);
    setModalOpen(false);
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

  if (!authChecked) return null;
  if (!authedUser) return <UserGate onAuthed={onAuthed} />;

  return (
    <div className={`page${columns === 3 ? " page--wide" : ""}`}>
      <header className="page-header card">
        <div>
          <h1>watchlist</h1>
          <div className="subtitle">signed in as {authedUser}</div>
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
          <button onClick={() => setModalOpen(true)}>+ new entry</button>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="new entry">
        <AddEntryForm onAdded={onAdded} submittedBy={authedUser} />
      </Modal>
    </div>
  );
}
