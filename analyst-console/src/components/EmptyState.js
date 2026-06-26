import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';

export const EmptyState = () => (
  <motion.div
    className="empty-state"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2, duration: 0.5 }}
  >
    <motion.div 
      className="empty-icon-wrapper"
      initial={{ scale: 0.8 }}
      animate={{ scale: 1 }}
      transition={{ 
        type: "spring",
        stiffness: 260,
        damping: 20,
        repeat: Infinity,
        repeatType: "reverse",
        repeatDelay: 2
      }}
    >
      <ShieldCheck size={48} strokeWidth={1.5} />
    </motion.div>
    <h2 className="empty-title">System Secure</h2>
    <p className="empty-subtitle">All transactions look normal. AI models are continuously monitoring the data stream for anomalies.</p>
  </motion.div>
);