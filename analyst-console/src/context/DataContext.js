/**
 * @module context/DataContext
 * @description Centralized data fetching context that eliminates duplicate polling.
 * Provides shared stats, flagged count, connection status, and error state
 * to all consuming components via React Context.
 */
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import * as api from '../api';

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
  const [stats, setStats] = useState({ total: 0, flagged: 0, blocked: 0, cleared: 0 });
  const [flaggedCount, setFlaggedCount] = useState(0);
  const [isConnected, setIsConnected] = useState(true);
  const [error, setError] = useState(null);

  const refreshData = useCallback(async () => {
    try {
      const [statsData, flaggedData] = await Promise.all([
        api.fetchStats(),
        api.fetchFlaggedTransactions(),
      ]);
      setStats(statsData);
      setFlaggedCount(flaggedData.length);
      setIsConnected(true);
      setError(null);
    } catch (e) {
      console.error('DataContext: fetch error', e);
      setIsConnected(false);
      setError('Failed to load data. Is the api-server running?');
    }
  }, []);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 5000);
    return () => clearInterval(interval);
  }, [refreshData]);

  return (
    <DataContext.Provider value={{ stats, flaggedCount, isConnected, error, refreshData }}>
      {children}
    </DataContext.Provider>
  );
};

/**
 * Hook to access the shared data context.
 * @returns {{ stats, flaggedCount, isConnected, error, refreshData }}
 */
export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
