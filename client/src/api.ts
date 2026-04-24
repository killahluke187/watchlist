import type { Entry } from "./types";

export async function fetchEntries(): Promise<Entry[]> {
  const res = await fetch("/api/entries");
  if (!res.ok) throw new Error("failed to load entries");
  return res.json();
}

export type CreateEntryInput = {
  username: string;
  name: string;
  reason: string;
  imageDataUrl?: string | null;
  youtubeUrl?: string | null;
  medalUrl?: string | null;
};

export async function createEntry(input: CreateEntryInput): Promise<Entry> {
  const res = await fetch("/api/entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "failed to create entry");
  }
  return res.json();
}

export async function adminLogin(password: string): Promise<boolean> {
  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  return res.ok;
}

export type UpdateEntryInput = {
  username?: string;
  name?: string;
  reason?: string;
  imageDataUrl?: string | null;
  youtubeUrl?: string | null;
  medalUrl?: string | null;
  removeImage?: boolean;
};

export async function updateEntry(
  id: string,
  password: string,
  input: UpdateEntryInput
): Promise<Entry> {
  const res = await fetch(`/api/entries/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-admin-password": password,
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "failed to update entry");
  }
  return res.json();
}

export async function deleteEntry(id: string, password: string): Promise<void> {
  const res = await fetch(`/api/entries/${id}`, {
    method: "DELETE",
    headers: { "x-admin-password": password },
  });
  if (!res.ok) throw new Error("failed to delete entry");
}
