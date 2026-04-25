import { useState } from "react";
import { checkUser } from "../api";

type Props = {
  onAuthed: (username: string) => void;
};

export default function LoginForm({ onAuthed }: Props) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = input.trim();
    if (!value) return;
    setError(null);
    setBusy(true);
    try {
      const ok = await checkUser(value);
      if (!ok) {
        setError("incorrect user");
        return;
      }
      onAuthed(value);
    } catch {
      setError("could not reach server");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="add-form" onSubmit={submit}>
      <label>
        <span>username</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
          maxLength={40}
        />
      </label>
      {error && <div className="error">{error}</div>}
      <button type="submit" disabled={busy}>
        {busy ? "checking..." : "continue"}
      </button>
    </form>
  );
}
