import React, { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, LayoutDashboard, List, ActivitySquare, Settings, Wifi, WifiOff } from 'lucide-react';
import { ReviewQueue } from './components/ReviewQueue';
import { Dashboard } from './components/Dashboard';
import { LiveFeed } from './components/LiveFeed';
import { TransactionGenerator } from './components/TransactionGenerator';
import { useData } from './context/DataContext';
import './App.css';

/**
 * NavItem — extracted as a top-level memoized component
 * to prevent re-creation on every App render.
 */
const NavItem = memo(({ id, label, icon, isActive, onClick, badgeCount }) => (
  <button
    className={`nav-item ${isActive ? 'active' : ''}`}
    onClick={onClick}
    aria-label={`Navigate to ${label}`}
    aria-current={isActive ? 'page' : undefined}
  >
    {icon}
    <span>{label}</span>
    {badgeCount > 0 && (
      <span className="nav-badge" aria-label={`${badgeCount} items need review`}>{badgeCount}</span>
    )}
  </button>
));
NavItem.displayName = 'NavItem';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState(() => localStorage.getItem('app-theme') || 'charcoal');

  // Get shared data from context (eliminates duplicate polling)
  const { flaggedCount, isConnected, error } = useData();

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  const handleTabChange = useCallback((id) => {
    setActiveTab(id);
  }, []);

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar" role="navigation" aria-label="Main navigation">
        <div className="sidebar-header">
          <ShieldAlert size={32} />
          <h2>FraudGuard</h2>
        </div>

        <nav className="sidebar-nav">
          <NavItem id="dashboard" label="Dashboard" icon={<LayoutDashboard size={20} />}
            isActive={activeTab === 'dashboard'} onClick={() => handleTabChange('dashboard')} />
          <NavItem id="review" label="Review Queue" icon={<List size={20} />}
            isActive={activeTab === 'review'} onClick={() => handleTabChange('review')}
            badgeCount={flaggedCount} />
          <NavItem id="live" label="Live Feed" icon={<ActivitySquare size={20} />}
            isActive={activeTab === 'live'} onClick={() => handleTabChange('live')} />
          <NavItem id="generator" label="Simulation" icon={<Settings size={20} />}
            isActive={activeTab === 'generator'} onClick={() => handleTabChange('generator')} />
        </nav>

        <div className="sidebar-footer">
          <div className="theme-selector" role="radiogroup" aria-label="Theme selection">
            {['charcoal', 'dark', 'light'].map(t => (
              <button
                key={t}
                className={`theme-btn ${theme === t ? 'active' : ''}`}
                onClick={() => setTheme(t)}
                role="radio"
                aria-checked={theme === t}
                aria-label={`${t} theme`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div className={`status-indicator ${isConnected ? 'active' : 'offline'}`}
            role="status" aria-live="polite">
            <div className={`pulse ${isConnected ? 'active' : 'offline'}`}></div>
            <span>{isConnected ? 'System Active' : 'System Offline'}</span>
            {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content" role="main">
        <header className="main-header">
          <h1 className="page-title">
            {activeTab === 'dashboard' && 'System Overview'}
            {activeTab === 'review' && 'Action Required'}
            {activeTab === 'live' && 'Real-time Event Stream'}
            {activeTab === 'generator' && 'Simulation & Testing'}
          </h1>
        </header>

        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}

        <div className="content-scroll">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && <Dashboard />}
              {activeTab === 'review' && <ReviewQueue />}
              {activeTab === 'live' && <LiveFeed />}
              {activeTab === 'generator' && <TransactionGenerator />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default App;