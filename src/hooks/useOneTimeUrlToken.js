import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Reads a one-time token from the link (`?token=…`) once, then removes it from
 * the address bar so it doesn't stay in history, screenshots or shared URLs
 * (AUTH_API_CONTRACT §7.3).
 */
export function useOneTimeUrlToken(param = 'token') {
  const [searchParams, setSearchParams] = useSearchParams();
  const [token] = useState(() => searchParams.get(param) ?? '');

  useEffect(() => {
    if (!searchParams.has(param)) return;
    const remaining = new URLSearchParams(searchParams);
    remaining.delete(param);
    setSearchParams(remaining, { replace: true });
  }, [param, searchParams, setSearchParams]);

  return token;
}
