import { useEffect, useState } from 'react';

// A success message that disappears by itself after a few seconds.
export function useFlashMessage(durationMs = 3000) {
  // Stored as a new object on every call, so showing the same text twice
  // (e.g. "Task created" for two tasks in a row) restarts the timer.
  const [flash, setFlash] = useState(null);

  useEffect(() => {
    if (!flash) return undefined;

    const timer = setTimeout(() => setFlash(null), durationMs);
    return () => clearTimeout(timer);
  }, [flash, durationMs]);

  function showMessage(text) {
    setFlash({ text });
  }

  return [flash?.text ?? '', showMessage];
}
