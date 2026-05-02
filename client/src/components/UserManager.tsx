import { useEffect, useMemo, useState } from "react";
import { addUser, listUsers, removeUser } from "../api";

type Props = {
  password: string;
};

export default function UserManager({ password }: Props) {
  const [users, setUsers] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listUsers(password)
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [password]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const value = input.trim();
    if (!value) return;
    setError(null);
    setBusy(true);
    try {
      const next = await addUser(value, password);
      setUsers(next);
      setInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove(username: string) {
    setError(null);
    setBusy(true);
    try {
      const next = await removeUser(username, password);
      setUsers(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "error");
    } finally {
      setBusy(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.toLowerCase().includes(q));
  }, [users, search]);

  return (
    <div className="user-manager">
      <div className="subtitle">
        only these usernames can submit entries from the public page
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={`search ${users.length} user${users.length === 1 ? "" : "s"}`}
        autoCapitalize="off"
        autoCorrect="off"
      />

      {loading && <div className="muted">loading...</div>}
      {!loading && users.length === 0 && (
        <div className="muted">no users yet — add one below</div>
      )}
      {!loading && users.length > 0 && filtered.length === 0 && (
        <div className="muted">no matches</div>
      )}
      {filtered.length > 0 && (
        <ul className="user-list">
          {filtered.map((u) => (
            <li key={u}>
              <span className="user-list-name" title={u}>{u}</span>
              <button
                type="button"
                className="danger user-list-remove"
                onClick={() => remove(u)}
                disabled={busy}
                aria-label={`remove ${u}`}
                title={`remove ${u}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <form className="row user-add-row" onSubmit={add}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="new username"
          maxLength={40}
          autoCapitalize="off"
          autoCorrect="off"
        />
        <button type="submit" disabled={busy || !input.trim()}>
          add user
        </button>
      </form>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
