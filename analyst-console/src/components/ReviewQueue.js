import React, { useState, useEffect } from 'react';
import { Search, Filter, CheckSquare, Square, Check, X } from 'lucide-react';
import * as api from '../api';
import { TransactionList } from './TransactionList';
import { TransactionModal } from './TransactionModal';
import './ReviewQueue.css';

export const ReviewQueue = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  
  // Filters
  const [userIdFilter, setUserIdFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('FLAGGED');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  
  const [selectedTx, setSelectedTx] = useState(null);

  const loadData = async () => {
    try {
      const filters = {};
      if (userIdFilter) filters.userId = userIdFilter;
      if (statusFilter !== 'ALL') filters.status = statusFilter;
      if (minAmount) filters.minAmount = minAmount;
      if (maxAmount) filters.maxAmount = maxAmount;
      
      const data = await api.fetchAllTransactions(filters);
      setTransactions(data);
    } catch (e) {
      console.error("Failed to load Review Queue data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [userIdFilter, statusFilter, minAmount, maxAmount]);

  const handleReview = async (id, newStatus) => {
    try {
      await api.reviewTransaction(id, newStatus);
      setTransactions(prev => prev.filter(tx => tx._id !== id));
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    } catch (e) {
      console.error("Failed to review transaction:", e);
    }
  };

  const handleBulkReview = async (newStatus) => {
    if (selectedIds.size === 0) return;
    try {
      await api.bulkReviewTransactions(Array.from(selectedIds), newStatus);
      setTransactions(prev => prev.filter(tx => !selectedIds.has(tx._id)));
      setSelectedIds(new Set());
    } catch (e) {
      console.error("Bulk review failed:", e);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map(t => t._id)));
    }
  };

  return (
    <div className="review-queue-container">
      <div className="review-toolbar card">
        <div className="search-group">
          <Search size={18} color="#94a3b8" />
          <input 
            type="text" 
            placeholder="Search User ID..." 
            value={userIdFilter}
            onChange={(e) => setUserIdFilter(e.target.value)}
          />
        </div>
        
        <div className="filter-group">
          <Filter size={18} color="#94a3b8" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All Status</option>
            <option value="FLAGGED">Flagged (Action Req)</option>
            <option value="CLEARED">Cleared</option>
            <option value="BLOCKED">Blocked</option>
          </select>
          
          <input type="number" placeholder="Min $" value={minAmount} onChange={e => setMinAmount(e.target.value)} className="amount-input" />
          <span>-</span>
          <input type="number" placeholder="Max $" value={maxAmount} onChange={e => setMaxAmount(e.target.value)} className="amount-input" />
        </div>
      </div>

      <div className="bulk-actions card">
        <button className="select-all-btn" onClick={toggleSelectAll}>
          {selectedIds.size === transactions.length && transactions.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
          <span>{selectedIds.size} Selected</span>
        </button>
        <div className="bulk-buttons">
          <button className="btn btn-normal" onClick={() => handleBulkReview('CLEARED')} disabled={selectedIds.size === 0}>
            <Check size={16} /> Bulk Clear
          </button>
          <button className="btn btn-fraud" onClick={() => handleBulkReview('BLOCKED')} disabled={selectedIds.size === 0}>
            <X size={16} /> Bulk Block
          </button>
        </div>
      </div>

      {loading && transactions.length === 0 ? (
        <p>Loading queue...</p>
      ) : (
        <TransactionList 
          transactions={transactions} 
          onReview={handleReview} 
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onItemClick={setSelectedTx}
        />
      )}

      {selectedTx && (
        <TransactionModal tx={selectedTx} onClose={() => setSelectedTx(null)} />
      )}
    </div>
  );
};
