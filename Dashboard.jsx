// src/pages/Dashboard.jsx (FIXED for Separated Counts)

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebaseConfig';
import { collection, onSnapshot } from 'firebase/firestore';

function Dashboard() {
  // (1) --- States for all 4 counts ---
  const [operatorCount, setOperatorCount] = useState(0); // Card 1
  const [terminalCount, setTerminalCount] = useState(0); // Card 2
  const [medicalCount, setMedicalCount] = useState(0); // Card 3
  const [adsCount, setAdsCount] = useState(0);       // Card 4

  // (2) --- Listen to `bus_operators` ---
  useEffect(() => {
    const q = collection(db, "bus_operators");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOperatorCount(snapshot.size); // Count of Operators
    });
    return () => unsubscribe();
  }, []);

  // (3) --- Listen to `bus_terminals` ---
  useEffect(() => {
    const q = collection(db, "bus_terminals");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTerminalCount(snapshot.size); // Count of Terminals
    });
    return () => unsubscribe();
  }, []);

  // (4) --- Listen to `medical_facilities` ---
  useEffect(() => {
    const q = collection(db, "medical_facilities");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMedicalCount(snapshot.size); // Count of Medical
    });
    return () => unsubscribe();
  }, []);

  // (5) --- Listen to `custom_ads` ---
  useEffect(() => {
    const q = collection(db, "custom_ads");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAdsCount(snapshot.size); 
    });
    return () => unsubscribe();
  }, []);

  // (6) --- Removed 'totalLocations' and 'uniqueCities' ---
  // They are no longer needed as we show separate counts.

  return (
    <div className="content-card">
      <h1>Dashboard</h1>

      <div className="summary-cards" style={{ marginTop: '2rem' }}>

        {/* Card 1: Total Bus Lines (Operators) */}
        <div className="summary-card blue">
          <h2>{operatorCount}</h2>
          <p>Total Bus Lines (Operators)</p>
        </div>

        {/* Card 2: Total Bus Terminals (NEW) */}
        <div className="summary-card green">
          <h2>{terminalCount}</h2>
          <p>Total Bus Terminals</p>
        </div>

        {/* Card 3: Total Medical Facilities (NEW) */}
        <div className="summary-card yellow">
          <h2>{medicalCount}</h2>
          <p>Total Medical Facilities</p>
        </div>

        {/* Card 4: Total Ads */}
        <div className="summary-card purple">
          <h2>{adsCount}</h2>
          <p>Total Ads</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;