const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`);
  if (!response.ok) throw new Error(`GET ${path} failed`);
  return response.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: `POST ${path} failed` }));
    throw new Error(payload.error ?? `POST ${path} failed`);
  }

  return response.json();
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: `PATCH ${path} failed` }));
    throw new Error(payload.error ?? `PATCH ${path} failed`);
  }

  return response.json();
}

export async function apiDelete(path: string): Promise<void> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "DELETE"
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: `DELETE ${path} failed` }));
    throw new Error(payload.error ?? `DELETE ${path} failed`);
  }
}
