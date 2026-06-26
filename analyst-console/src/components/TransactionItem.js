import React from 'react';
import { motion } from 'framer-motion';
import { Check, X, AlertTriangle, User, MapPin, CreditCard, Square, CheckSquare } from 'lucide-react';

export const TransactionItem = ({ tx, onReview, isSelected, onToggleSelect, onClick }) => (
  <motion.li
    className={`transaction-item ${isSelected ? 'selected' : ''}`}
    layout
    initial={{ opacity: 0, scale: 0.95, y: 20 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.9, y: -20, height: 0, padding: 0, margin: 0 }}
    transition={{ duration: 0.4, type: "spring", bounce: 0.3 }}
  >
    <div className="checkbox-container" onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}>
      {isSelected ? <CheckSquare size={20} color="#3b82f6" /> : <Square size={20} color="#94a3b8" />}
    </div>
    <div className="info-group" onClick={onClick} style={{ cursor: 'pointer', flex: 1 }}>
      <div className="info-header">
        <div className="info-main">${tx.amount?.toFixed(2)}</div>
        <div className="badge">
          <AlertTriangle size={14} />
          High Risk
        </div>
      </div>
      
      <div className="info-grid">
        <div className="info-detail">
          <User size={14} />
          {tx.userId}
        </div>
        <div className="info-detail">
          <MapPin size={14} />
          {tx.distance_from_home} km
        </div>
        <div className="info-detail">
          <CreditCard size={14} />
          {tx.online_order ? 'Online' : 'In-Store'}
        </div>
      </div>
      
      {tx.reasoning && (
        <div className="reasoning-badge" style={{ marginTop: '10px', fontSize: '0.85rem', color: '#888', background: 'rgba(0,0,0,0.1)', padding: '6px 10px', borderRadius: '4px', borderLeft: '3px solid var(--theme-red)' }}>
          <strong>Reasoning:</strong> {tx.reasoning}
        </div>
      )}
    </div>
    
    <div className="action-group">
      <div className="score-container">
        <span className="score-label">Fraud Probability</span>
        <span className="score-value">{(tx.fraud_score * 100).toFixed(1)}%</span>
      </div>
      
      <div className="buttons">
        <motion.button
          className="button button-approve"
          onClick={() => onReview(tx._id, 'CLEARED')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Check size={16} />
          Clear
        </motion.button>
        <motion.button
          className="button button-block"
          onClick={() => onReview(tx._id, 'BLOCKED')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <X size={16} />
          Block
        </motion.button>
      </div>
    </div>
  </motion.li>
);