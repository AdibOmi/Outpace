// ─── helpers.js ─────────────────────────────────────────────────────────────
// Small utility functions shared across multiple pages.

/**
 * Returns the current time as a formatted string, e.g. "14:32:05".
 * Used to timestamp entries in the run log.
 */
export function now() {
  return new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Reads a value from localStorage and JSON-parses it.
 * If the key doesn't exist or parsing fails, returns `fallback`.
 *
 * @param {string} key       - The localStorage key to read.
 * @param {*}      fallback  - Value to return when the key is missing or invalid.
 */
export function loadFromStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Serialises `value` to JSON and stores it under `key` in localStorage.
 *
 * @param {string} key   - The localStorage key to write.
 * @param {*}      value - Any JSON-serialisable value.
 */
export function saveToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
