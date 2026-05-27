import { useState, useEffect, useCallback } from 'react';

export type BackendStatus = 'checking' | 'online' | 'offline';

const HEALTH_URL = `${(import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3001/api'}/system/health`;
const POLL_INTERVAL_MS = 5000;
const TIMEOUT_MS = 3000;

export function useBackendStatus(): {
  status: BackendStatus;
  retry: () => void;
  lastChecked: Date | null;
} {
  const [status, setStatus] = useState<BackendStatus>('checking');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const check = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const res = await fetch(HEALTH_URL, { signal: controller.signal });
      clearTimeout(timeout);
      setStatus(res.ok ? 'online' : 'offline');
    } catch {
      setStatus('offline');
    }
    setLastChecked(new Date());
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [check]);

  return { status, retry: check, lastChecked };
}
