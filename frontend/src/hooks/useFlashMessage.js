import { useEffect, useState } from 'react';

// A success message that disappears by itself after a few seconds.
export function useFlashMessage(durationMs = 3000) {
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!message) return undefined;

    const timer = setTimeout(() => setMessage(''), durationMs);
    return () => clearTimeout(timer);
  }, [message, durationMs]);

  return [message, setMessage];
}
