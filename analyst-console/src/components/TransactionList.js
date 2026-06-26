import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { TransactionItem } from './TransactionItem';
import { EmptyState } from './EmptyState';

export const TransactionList = ({ transactions, onReview, selectedIds = new Set(), onToggleSelect, onItemClick }) => (
  <ul className="transaction-list">
    <AnimatePresence>
      {transactions.length === 0 && <EmptyState />}
      {transactions.map(tx => (
        <TransactionItem 
          key={tx._id} 
          tx={tx} 
          onReview={onReview}
          isSelected={selectedIds.has(tx._id)}
          onToggleSelect={() => onToggleSelect && onToggleSelect(tx._id)}
          onClick={() => onItemClick && onItemClick(tx)}
        />
      ))}
    </AnimatePresence>
  </ul>
);