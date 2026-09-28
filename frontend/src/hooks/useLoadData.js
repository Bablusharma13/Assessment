import { useEffect, useState } from 'react';

// Loads data when a page opens and tracks loading/error state.
// `load` must be a stable function (a service function, or wrapped in useCallback).
export function useLoadData(load) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // If the user leaves the page before the request finishes, ignore the result.
    let ignore = false;

    load()
      .then((result) => {
        if (!ignore) setData(result);
      })
      .catch((loadError) => {
        if (!ignore) setError(loadError.message);
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [load, attempt]);

  function retry() {
    setIsLoading(true);
    setError('');
    setAttempt((current) => current + 1);
  }

  // setData lets the page update the list after create/edit/delete without reloading.
  return { data, setData, isLoading, error, retry };
}
