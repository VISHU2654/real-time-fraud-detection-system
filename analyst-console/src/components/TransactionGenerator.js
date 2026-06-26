import React, { useState } from 'react';
import { Play, AlertTriangle, ShieldCheck } from 'lucide-react';
import * as api from '../api';
import './TransactionGenerator.css';

const LOCATIONS = [
  { name: 'Midland, Texas (USA)', lat: 31.8599, lon: -102.7413, desc: 'Original fraud source' },
  { name: 'Tokyo, Japan', lat: 35.6762, lon: 139.6503, desc: 'International jump' },
  { name: 'London, UK', lat: 51.5074, lon: -0.1278, desc: 'European hub' },
  { name: 'Sydney, Australia', lat: -33.8688, lon: 151.2093, desc: 'Oceania region' },
  { name: 'New York City, NY', lat: 40.7128, lon: -74.0060, desc: 'US East Coast' }
];

export const TransactionGenerator = () => {
  const [isSending, setIsSending] = useState(false);
  const [lastSent, setLastSent] = useState(null);

  const sendOne = async (isFraud) => {
    const randomId = Math.floor(Math.random() * 10000);
    const loc = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
    
    let payload;
    if (isFraud) {
      payload = {
        userId: `fraud_user_${randomId}`,
        amount: parseFloat((Math.random() * 4500 + 500).toFixed(2)),
        lat: loc.lat,
        lon: loc.lon,
        distance_from_home: Math.floor(Math.random() * 8000 + 1000), 
        repeat_retailer: 0,
        used_chip: 0,
        used_pin_number: Math.random() > 0.5 ? 1 : 0,
        online_order: Math.random() > 0.3 ? 1 : 0
      };
    } else {
      payload = {
        userId: `normal_user_${randomId}`,
        amount: parseFloat((Math.random() * 145 + 5).toFixed(2)),
        lat: LOCATIONS[0].lat, 
        lon: LOCATIONS[0].lon, 
        distance_from_home: Math.floor(Math.random() * 20), 
        repeat_retailer: 1,
        used_chip: 1,
        used_pin_number: 1,
        online_order: 0
      };
    }

    await api.generateTransaction(payload);
    setLastSent({ type: isFraud ? 'fraud' : 'normal', data: payload, locationName: isFraud ? loc.name : LOCATIONS[0].name });
  };

  const handleSend = async (isFraud) => {
    setIsSending(true);
    try {
      await sendOne(isFraud);
    } catch (e) {
      console.error("Failed to generate transaction:", e);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendTen = async () => {
    setIsSending(true);
    try {
      for(let i=0; i<10; i++) {
        await sendOne(Math.random() > 0.8);
        await new Promise(r => setTimeout(r, 200));
      }
    } catch (e) {
      console.error("Failed to generate transactions:", e);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="generator-container card">
      <h2><Play size={24} /> Simulation Engine</h2>
      <p className="generator-desc">
        Inject simulated transactions into the Kafka stream to test the ML ensemble models.
        Fraudulent transactions will use dynamic real-world international locations and random high amounts.
      </p>

      <div className="generator-actions">
        <button 
          className="btn btn-normal"
          onClick={() => handleSend(false)}
          disabled={isSending}
        >
          <ShieldCheck size={20} />
          Send Normal Transaction
        </button>
        
        <button 
          className="btn btn-fraud"
          onClick={() => handleSend(true)}
          disabled={isSending}
        >
          <AlertTriangle size={20} />
          Send Fraudulent Transaction
        </button>

        <button 
          className="btn btn-normal"
          style={{ background: '#3b82f6', borderColor: '#3b82f6' }}
          onClick={handleSendTen}
          disabled={isSending}
        >
          <Play size={20} />
          Send 10 Random Transactions
        </button>
      </div>

      {lastSent && (
        <div className={`last-sent-banner ${lastSent.type}`}>
          <h4>Last Injected Transaction ({lastSent.type.toUpperCase()})</h4>
          <pre>
            Amount: ${lastSent.data.amount}
            <br/>
            Location: {lastSent.locationName} ({lastSent.data.lat}, {lastSent.data.lon})
            <br/>
            User ID: {lastSent.data.userId}
          </pre>
        </div>
      )}
    </div>
  );
};
