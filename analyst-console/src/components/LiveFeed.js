import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ShieldAlert, Ban, Clock } from 'lucide-react';
import * as api from '../api';

export const LiveFeed = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await api.fetchAllTransactions();
        setTransactions(data);
      } catch (e) {
        console.error("LiveFeed fetch error:", e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'CLEARED': return <ShieldCheck size={16} color="#10b981" />;
      case 'FLAGGED': return <ShieldAlert size={16} color="#ef4444" />;
      case 'BLOCKED': return <Ban size={16} color="#6b7280" />;
      default: return <Clock size={16} color="#f59e0b" />;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'CLEARED': return 'status-cleared';
      case 'FLAGGED': return 'status-flagged';
      case 'BLOCKED': return 'status-blocked';
      default: return 'status-pending';
    }
  };

  return (
    <div className="live-feed-container">
      <h2 className="section-title">Live Transaction Stream</h2>
      {loading && transactions.length === 0 ? (
        <p>Connecting to data stream...</p>
      ) : (
        <ul className="live-feed-list">
          <AnimatePresence>
            {transactions.map(tx => (
              <motion.li
                key={tx._id}
                className={`live-feed-item ${getStatusClass(tx.status)}`}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="feed-info">
                  <span className="feed-time">{new Date(tx.createdAt).toLocaleTimeString()}</span>
                  <span className="feed-user">{tx.userId}</span>
                  <span className="feed-amount">${tx.amount.toFixed(2)}</span>
                </div>
                <div className="feed-status">
                  {getStatusIcon(tx.status)}
                  <span>{tx.status}</span>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
};
