import React, { useState, useEffect, useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, ShieldAlert, CheckCircle, XCircle } from 'lucide-react';
import { useData } from '../context/DataContext';
import * as api from '../api';

/**
 * StatCard — extracted as top-level memoized component
 * to prevent re-creation on every Dashboard render.
 */
const StatCard = memo(({ title, value, icon, color, delay, loading }) => (
  <motion.div
    className="stat-card"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
  >
    <div className="stat-icon" style={{ backgroundColor: `${color}20`, color }}>
      {icon}
    </div>
    <div className="stat-info">
      <h3>{title}</h3>
      <p className="stat-value">{loading ? '-' : value}</p>
    </div>
  </motion.div>
));
StatCard.displayName = 'StatCard';

export const Dashboard = () => {
  // Get stats from shared DataContext (no duplicate polling)
  const { stats } = useData();
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    const loadChartData = async () => {
      try {
        const txData = await api.fetchAllTransactions();
        setChartData(txData);
        setFetchError(null);
      } catch (e) {
        console.error("Dashboard chart fetch error:", e);
        setFetchError("Failed to load chart data.");
      } finally {
        setLoading(false);
      }
    };

    loadChartData();
    const interval = setInterval(loadChartData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Memoize chart data transformation to avoid recomputing on every render
  const formattedChartData = useMemo(() => {
    return [...chartData].reverse().map(tx => ({
      time: new Date(tx.createdAt).toLocaleTimeString(),
      amount: tx.amount,
      fraud_score: tx.fraud_score * 100
    }));
  }, [chartData]);

  return (
    <div className="dashboard-container">
      <div className="stats-grid">
        <StatCard title="Total Processed" value={stats.total} icon={<Activity />} color="#9e9e9e" delay={0.1} loading={loading} />
        <StatCard title="Flagged" value={stats.flagged} icon={<ShieldAlert />} color="#e53935" delay={0.2} loading={loading} />
        <StatCard title="Blocked" value={stats.blocked} icon={<XCircle />} color="#757575" delay={0.3} loading={loading} />
        <StatCard title="Cleared" value={stats.cleared} icon={<CheckCircle />} color="#43a047" delay={0.4} loading={loading} />
      </div>

      <motion.div
        className="chart-container"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
      >
        <h3 className="chart-title">Recent Transaction Volume & Risk</h3>
        {fetchError && <p style={{ color: 'var(--accent-red)', padding: '0.5rem 1rem' }}>{fetchError}</p>}
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={formattedChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickMargin={10} />
              <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} tickFormatter={(val) => `$${val}`} />
              <YAxis yAxisId="right" orientation="right" stroke="#ef4444" fontSize={12} tickFormatter={(val) => `${val}%`} />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                itemStyle={{ color: '#f8fafc' }}
              />
              <Area yAxisId="left" type="monotone" dataKey="amount" name="Amount" stroke="#3b82f6" fillOpacity={1} fill="url(#colorAmount)" />
              <Area yAxisId="right" type="monotone" dataKey="fraud_score" name="Fraud Score" stroke="#ef4444" fillOpacity={1} fill="url(#colorRisk)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
};
