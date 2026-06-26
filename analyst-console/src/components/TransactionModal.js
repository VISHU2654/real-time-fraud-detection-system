import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Activity } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './TransactionModal.css';

// Fix leaflet marker icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

export const TransactionModal = ({ tx, onClose }) => {
  // Escape key handler
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  // Prevent body scroll when modal is open & add keyboard listener
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  if (!tx) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Transaction Detail"
      >
        <motion.div
          className="modal-content"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2>Transaction Detail</h2>
            <button className="close-btn" onClick={onClose} aria-label="Close modal">
              <X size={24} />
            </button>
          </div>
          <div className="modal-body">
            <div className="modal-grid">

              {/* Features Section */}
              <div className="modal-section">
                <h3><Activity size={18} /> Raw Features</h3>
                <div className="feature-list">
                  <div className="feature-item"><span className="feature-label">User ID</span><span className="feature-value">{tx.userId}</span></div>
                  <div className="feature-item"><span className="feature-label">Amount</span><span className="feature-value">${tx.amount?.toFixed(2)}</span></div>
                  <div className="feature-item"><span className="feature-label">Distance (km)</span><span className="feature-value">{tx.distance_from_home?.toFixed(1)}</span></div>
                  <div className="feature-item"><span className="feature-label">Repeat Retailer</span><span className="feature-value">{tx.repeat_retailer === 1 ? 'Yes' : 'No'}</span></div>
                  <div className="feature-item"><span className="feature-label">Chip Used</span><span className="feature-value">{tx.used_chip === 1 ? 'Yes' : 'No'}</span></div>
                  <div className="feature-item"><span className="feature-label">PIN Used</span><span className="feature-value">{tx.used_pin_number === 1 ? 'Yes' : 'No'}</span></div>
                  <div className="feature-item"><span className="feature-label">Online Order</span><span className="feature-value">{tx.online_order === 1 ? 'Yes' : 'No'}</span></div>
                  <div className="feature-item"><span className="feature-label">Status</span><span className="feature-value">{tx.status}</span></div>
                </div>
              </div>

              {/* Map Section */}
              <div className="modal-section">
                <h3><MapPin size={18} /> Geographic Data</h3>
                <div className="feature-list">
                  <div className="feature-item"><span className="feature-label">Latitude</span><span className="feature-value">{tx.lat?.toFixed(4)}</span></div>
                  <div className="feature-item"><span className="feature-label">Longitude</span><span className="feature-value">{tx.lon?.toFixed(4)}</span></div>
                </div>
                {tx.lat && tx.lon && (
                  <div className="map-container">
                    <MapContainer center={[tx.lat, tx.lon]} zoom={4} style={{ height: '100%', width: '100%' }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Marker position={[tx.lat, tx.lon]}>
                        <Popup>Transaction Location</Popup>
                      </Marker>
                      {/* Approximated Home Radius */}
                      <Circle center={[tx.lat, tx.lon]} radius={tx.distance_from_home * 1000} pathOptions={{ color: 'red', fillColor: 'red' }} />
                    </MapContainer>
                  </div>
                )}
              </div>
            </div>

            {/* ML Reasoning */}
            <div className="reasoning-box">
              <strong>ML Ensemble Reasoning:</strong>
              <p>{tx.reasoning || "No reasoning provided."}</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
