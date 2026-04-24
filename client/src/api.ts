import type { Entry } from "./types";

export async function fetchEntries(adminPassword?: string): Promise<Entry[]> {
  const headers: Record<string, string> = {};
  if (adminPassword) headers["x-admin-password"] = adminPassword;
  const res = await fetch("/api/entries", { headers });
  if (!res.ok) throw new Error("failed to load entries");
  return res.json();
}

export type CreateEntryInput = {
  username: string;
  name: string;
  reason: string;
  submittedBy: string;
  imageDataUrl?: string | null;
  youtubeUrl?: string | null;
  medalUrl?: string | null;
};

export async function createEntry(input: CreateEntryInput, adminPassword?: string): Promise<Entry> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (adminPassword) headers["x-admin-password"] = adminPassword;
  const res = await fetch("/api/entries", {
    method: "POST",
    headers,
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

export async function checkUser(username: string): Promise<boolean> {
  const res = await fetch("/api/auth/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  return res.ok;
}

export async function listUsers(adminPassword: string): Promise<string[]> {
  const res = await fetch("/api/admin/users", {
    headers: { "x-admin-password": adminPassword },
  });
  if (!res.ok) throw new Error("failed to load users");
  return res.json();
}

export async function addUser(username: string, adminPassword: string): Promise<string[]> {
  const res = await fetch("/api/admin/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-password": adminPassword,
    },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "failed to add user");
  }
  return res.json();
}

export async function removeUser(username: string, adminPassword: string): Promise<string[]> {
  const res = await fetch(`/api/admin/users/${encodeURIComponent(username)}`, {
    method: "DELETE",
    headers: { "x-admin-password": adminPassword },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "failed to remove user");
  }
  return res.json();
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
