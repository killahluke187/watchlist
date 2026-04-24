import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AddEntryForm from "../components/AddEntryForm";
import EditEntryForm from "../components/EditEntryForm";
import EntryCard from "../components/EntryCard";
import Modal from "../components/Modal";
import Pagination from "../components/Pagination";
import SearchBar from "../components/SearchBar";
import UserManager from "../components/UserManager";
import ViewControls from "../components/ViewControls";
import { useViewPrefs } from "../hooks/useViewPrefs";
import { adminLogin, deleteEntry, fetchEntries } from "../api";
import type { Entry } from "../types";

const STORAGE_KEY = "watchlist-admin-password";

export default function Admin() {
  const navigate = useNavigate();
  const [password, setPassword] = useState<string | null>(null);
  const [pwInput, setPwInput] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [nameQuery, setNameQuery] = useState("");
  const [usernameQuery, setUsernameQuery] = useState("");
  const { pageSize, setPageSize, columns, setColumns, sortOrder, setSortOrder } = useViewPrefs();

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) setPassword(saved);
  }, []);

  useEffect(() => {
    if (!password) return;
    fetchEntries(password)
      .then(setEntries)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [password]);

  async function doLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setLoggingIn(true);
    try {
      const ok = await adminLogin(pwInput);
      if (!ok) {
        setLoginError("wrong password");
      } else {
        sessionStorage.setItem(STORAGE_KEY, pwInput);
        setPassword(pwInput);
        setPwInput("");
      }
    } catch {
      setLoginError("login failed");
    } finally {
      setLoggingIn(false);
    }
  }

  function logout() {
    sessionStorage.removeItem(STORAGE_KEY);
    setPassword(null);
    setEntries([]);
    setLoading(true);
    navigate("/");
  }

  function onAdded(entry: Entry) {
    setEntries((prev) => [entry, ...prev]);
    setAddOpen(false);
    setPage(1);
  }

  function onSaved(updated: Entry) {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    setEditingEntry(null);
  }

  async function onDelete(id: string) {
    if (!password) return;
    await deleteEntry(id, password);
    setEntries((prev) => prev.filter((e) => e.id !== id));
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

  if (!password) {
    return (
      <div className="page">
        <header className="page-header card">
          <h1>watchlist · admin</h1>
        </header>
        <form className="card add-form" onSubmit={doLogin}>
          <h2>admin login</h2>
          <label>
            <span>password</span>
            <input
              type="password"
              value={pwInput}
              onChange={(e) => setPwInput(e.target.value)}
              autoFocus
            />
          </label>
          {loginError && <div className="error">{loginError}</div>}
          <button type="submit" disabled={loggingIn}>
            {loggingIn ? "checking..." : "login"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className={`page${columns === 3 ? " page--wide" : ""}`}>
      <header className="page-header card">
        <div>
          <h1>watchlist · admin</h1>
          <div className="subtitle">edit or delete any entry</div>
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
          <button onClick={() => setAddOpen(true)}>+ new entry</button>
          <button className="ghost" onClick={logout}>logout</button>
        </div>
      </header>

      <UserManager password={password} />

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
          <EntryCard
            key={e.id}
            entry={e}
            admin={{ onEdit: setEditingEntry, onDelete }}
          />
        ))}
      </section>

      <Pagination page={page} pageCount={pageCount} onChange={setPage} />

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="new entry">
        <AddEntryForm onAdded={onAdded} submittedBy="admin" adminPassword={password} />
      </Modal>

      <Modal
        open={Boolean(editingEntry)}
        onClose={() => setEditingEntry(null)}
        title="edit entry"
      >
        {editingEntry && password && (
          <EditEntryForm
            entry={editingEntry}
            password={password}
            onSaved={onSaved}
            onCancel={() => setEditingEntry(null)}
          />
        )}
      </Modal>
    </div>
  );
}
