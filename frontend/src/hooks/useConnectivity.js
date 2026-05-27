import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to track online/offline status and API connectivity
 * Returns: { isOnline, isApiConnected, mode, checkConnection }
 * - mode: 'live' | 'vault' (offline)
 */
export const useConnectivity = (apiUrl) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isApiConnected, setIsApiConnected] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);

  // Check browser online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      setIsApiConnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check API connectivity
  const checkConnection = useCallback(async () => {
    if (!isOnline) {
      setIsApiConnected(false);
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${apiUrl}/api/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const connected = response.ok;
      setIsApiConnected(connected);
      setLastChecked(new Date());
      return connected;
    } catch (error) {
      setIsApiConnected(false);
      setLastChecked(new Date());
      return false;
    }
  }, [apiUrl, isOnline]);

  // Check connection periodically
  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [checkConnection]);

  const mode = isOnline && isApiConnected ? 'live' : 'vault';

  return {
    isOnline,
    isApiConnected,
    mode,
    lastChecked,
    checkConnection,
  };
};

export default useConnectivity;
