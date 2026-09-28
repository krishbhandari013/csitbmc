// Typed HTTP transport for client-side API calls.
// Server already returns `{ error: <friendly message> }` without stack traces;
// this module maps failures to a consistent ApiError model.

export type ApiErrorCode =
  | "validation"
  | "unauthorized"
  | "forbidden"
  | "not-found"
  | "conflict"
  | "rate-limited"
  | "server"
  | "network";

export class ApiError extends Error {
  status: number; // 0 = network failure (no HTTP response)
  code: ApiErrorCode;
  constructor(message: string, status: number, code: ApiErrorCode) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

function codeFor(status: number): ApiErrorCode {
  if (status === 400) return "validation";
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not-found";
  if (status === 409) return "conflict";
  if (status === 429) return "rate-limited";
  return "server";
}

const FALLBACK: Record<ApiErrorCode, string> = {
  validation: "Please check the highlighted fields and try again.",
  unauthorized: "Your session has expired. Please sign in again.",
  forbidden: "You don't have permission to do that.",
  "not-found": "That record no longer exists.",
  conflict: "That already exists. Please change your input and retry.",
  "rate-limited": "Too many attempts. Please wait a few minutes and retry.",
  server: "Something went wrong on our side. Please retry.",
  network: "No connection. Check your network and retry.",
};

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    });
  } catch {
    throw new ApiError(FALLBACK.network, 0, "network");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = codeFor(res.status);
    const message =
      typeof (data as any)?.error === "string" && (data as any).error.trim().length > 0
        ? (data as any).error
        : FALLBACK[code];
    throw new ApiError(message, res.status, code);
  }
  return data as T;
}

export const get = <T,>(path: string) => apiRequest<T>(path);
export const post = <T,>(path: string, body?: unknown) =>
  apiRequest<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
export const patch = <T,>(path: string, body?: unknown) =>
  apiRequest<T>(path, { method: "PATCH", body: body === undefined ? undefined : JSON.stringify(body) });
export const del = <T,>(path: string) => apiRequest<T>(path, { method: "DELETE" });

/** Friendly one-line message for toasts/inline errors. Never leaks internals. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return FALLBACK.server;
}

export function isUnauthorized(err: unknown): boolean {
  return err instanceof ApiError && err.code === "unauthorized";
}

/** Should this query be retried? Never retry auth/permission/missing/validation/rate-limit. */
export function shouldRetry(failureCount: number, err: unknown): boolean {
  if (err instanceof ApiError) {
    if (["unauthorized", "forbidden", "not-found", "validation", "rate-limited", "conflict"].includes(err.code)) return false;
    return failureCount < 2;
  }
  return failureCount < 2;
}
