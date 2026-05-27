import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

// Global State Context
const GlobalContext = createContext(null);

// Provider component
export const GlobalProvider = ({ children }) => {
  // Site content state
  const [siteContent, setSiteContent] = useState({});
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // System health state
  const [systemHealth, setSystemHealth] = useState({
    backend: false,
    database: false,
    pulse: 'unknown'
  });

  // Fetch site content
  const fetchContent = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/content`);
      setSiteContent(res.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch content:', error);
    }
  }, []);

  // Fetch games
  const fetchGames = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/games`);
      setGames(res.data);
    } catch (error) {
      console.error('Failed to fetch games:', error);
    }
  }, []);

  // Check system health (pulse)
  const checkPulse = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/health/pulse`, { timeout: 5000 });
      setSystemHealth({
        backend: res.data.backend,
        database: res.data.database,
        pulse: res.data.pulse
      });
    } catch (error) {
      setSystemHealth({
        backend: false,
        database: false,
        pulse: 'offline'
      });
    }
  }, []);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchContent(), fetchGames(), checkPulse()]);
    setLoading(false);
  }, [fetchContent, fetchGames, checkPulse]);

  // Update a specific content key (for instant updates)
  const updateContent = useCallback((key, value) => {
    setSiteContent(prev => ({
      ...prev,
      [key]: value
    }));
    setLastUpdated(new Date());
  }, []);

  // Initial load
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Pulse check every 30 seconds
  useEffect(() => {
    const interval = setInterval(checkPulse, 30000);
    return () => clearInterval(interval);
  }, [checkPulse]);

  // Listen for content update events (for real-time sync)
  useEffect(() => {
    const handleContentUpdate = (event) => {
      if (event.detail?.key && event.detail?.value) {
        updateContent(event.detail.key, event.detail.value);
      }
    };
    
    window.addEventListener('site-content-updated', handleContentUpdate);
    return () => window.removeEventListener('site-content-updated', handleContentUpdate);
  }, [updateContent]);

  const value = {
    // State
    siteContent,
    games,
    loading,
    lastUpdated,
    systemHealth,
    
    // Actions
    fetchContent,
    fetchGames,
    checkPulse,
    refreshAll,
    updateContent,
    
    // Helper to trigger global update event
    broadcastUpdate: (key, value) => {
      window.dispatchEvent(new CustomEvent('site-content-updated', {
        detail: { key, value }
      }));
    }
  };

  return (
    <GlobalContext.Provider value={value}>
      {children}
    </GlobalContext.Provider>
  );
};

// Hook to use global state
export const useGlobalState = () => {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error('useGlobalState must be used within a GlobalProvider');
  }
  return context;
};

export default GlobalContext;
