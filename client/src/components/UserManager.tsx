import { useEffect, useState } from "react";
import { addUser, listUsers, removeUser } from "../api";

type Props = {
  password: string;
};

export default function UserManager({ password }: Props) {
  const [users, setUsers] = useState<string[]>([]);
  const [input, setInput] = useState("");
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

  return (
    <div className="user-manager">
      <div className="subtitle">only these usernames can submit entries from the public page</div>
      {loading && <div className="muted">loading...</div>}
      {!loading && users.length === 0 && (
        <div className="muted">no users yet — add one below</div>
      )}
      {users.length > 0 && (
        <ul className="user-list">
          {users.map((u) => (
            <li key={u}>
              <span className="user-list-name">{u}</span>
              <button
                type="button"
                className="danger"
                onClick={() => remove(u)}
                disabled={busy}
              >
                remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <form className="row" onSubmit={add}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="new username"
          maxLength={40}
          style={{ flex: 1 }}
        />
        <button type="submit" disabled={busy || !input.trim()}>
          add user
        </button>
      </form>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
