export type StorageFailureCode =
  | "unavailable"
  | "invalid-json"
  | "quota"
  | "security"
  | "unknown";

export interface StorageFailure {
  ok: false;
  code: StorageFailureCode;
  message: string;
  cause?: unknown;
}

export type StorageReadResult<T> =
  | { ok: true; status: "missing" }
  | { ok: true; status: "ready"; value: T }
  | StorageFailure;

export type StorageWriteResult = { ok: true } | StorageFailure;

export class StorageOperationError extends Error {
  readonly code: StorageFailureCode;
  readonly cause?: unknown;

  constructor(failure: StorageFailure) {
    super(failure.message);
    this.name = "StorageOperationError";
    this.code = failure.code;
    this.cause = failure.cause;
  }
}

function failure(error: unknown, operation: string): StorageFailure {
  const name = error instanceof DOMException ? error.name : "";
  const code: StorageFailureCode =
    name === "QuotaExceededError"
      ? "quota"
      : name === "SecurityError"
        ? "security"
        : "unknown";
  return {
    ok: false,
    code,
    message: `Local storage ${operation} failed (${code}).`,
    cause: error,
  };
}

function getStorage(): Storage | StorageFailure {
  if (typeof window === "undefined") {
    return {
      ok: false,
      code: "unavailable",
      message: "Local storage is unavailable outside the browser.",
    };
  }
  try {
    return window.localStorage;
  } catch (error) {
    return failure(error, "access");
  }
}

function isFailure(value: Storage | StorageFailure): value is StorageFailure {
  return "ok" in value && value.ok === false;
}

export function readJsonResult<T>(key: string): StorageReadResult<T> {
  const storage = getStorage();
  if (isFailure(storage)) return storage;
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch (error) {
    return failure(error, `read for "${key}"`);
  }
  if (raw === null) return { ok: true, status: "missing" };
  try {
    return { ok: true, status: "ready", value: JSON.parse(raw) as T };
  } catch (error) {
    return {
      ok: false,
      code: "invalid-json",
      message: `Local storage value "${key}" is not valid JSON.`,
      cause: error,
    };
  }
}

export function writeJsonResult<T>(key: string, value: T): StorageWriteResult {
  const storage = getStorage();
  if (isFailure(storage)) return storage;
  try {
    storage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (error) {
    return failure(error, `write for "${key}"`);
  }
}

export function removeKeyResult(key: string): StorageWriteResult {
  const storage = getStorage();
  if (isFailure(storage)) return storage;
  try {
    storage.removeItem(key);
    return { ok: true };
  } catch (error) {
    return failure(error, `remove for "${key}"`);
  }
}

/** Compatibility read for existing repositories. Use readJsonResult at new boundaries. */
export function readJson<T>(key: string, fallback: T): T {
  const result = readJsonResult<T>(key);
  return result.ok && result.status === "ready" ? result.value : fallback;
}

/** Existing repositories now surface persistence failures instead of reporting success. */
export function writeJson<T>(key: string, value: T): true {
  const result = writeJsonResult(key, value);
  if (!result.ok) throw new StorageOperationError(result);
  return true;
}

export function removeKey(key: string): void {
  const result = removeKeyResult(key);
  if (!result.ok) throw new StorageOperationError(result);
}
