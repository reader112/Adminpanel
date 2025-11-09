// src/components/AppConfiguration.jsx (UPDATED with Toggle Switch)

import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { doc, onSnapshot, setDoc } from 'firebase/firestore'; 

const CONFIG_DOC_ID = "main_settings";
const CONFIG_COLLECTION = "app_config";

function AppConfiguration() {
  const [formData, setFormData] = useState({
    is_maintenance: false,
    maintenance_message: '',
    welcome_message: ''
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    setLoading(true);
    const docRef = doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setFormData(docSnap.data());
      } else {
        console.log("No config document found. Using defaults.");
      }
      setLoading(false);
    }, (err) => {
      console.error("Error fetching config: ", err);
      setError("Failed to fetch settings.");
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const clearMessages = () => { setError(''); setSuccessMessage(''); };

  const handleInputChange = (e) => {
    clearMessages();
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    clearMessages();
    try {
      const docRef = doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID);
      await setDoc(docRef, formData, { merge: true });
      setSuccessMessage('App settings saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) { 
      console.error("Save Error: ", err);
      setError("Failed to save settings."); 
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="content-card">
        <h1>App Settings</h1>
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="content-card">
      <h1>App Configuration</h1>
      <p>Control the behavior of the Android App from here. Changes are live.</p>

      <hr />

      <div className="form-container" style={{maxWidth: '800px'}}>
        <form onSubmit={handleSubmit}>

          <h3 style={{color: '#c0392b'}}>Maintenance Mode</h3>

          {/* (1) --- THIS IS THE NEW TOGGLE SWITCH --- */}
          <div className="toggle-switch-container">
            <input 
              id="is_maintenance"
              name="is_maintenance"
              type="checkbox"
              className="toggle-switch-checkbox" /* Hide original checkbox */
              checked={formData.is_maintenance}
              onChange={handleInputChange}
            />
            {/* This is the visual switch */}
            <label className="toggle-switch-label" htmlFor="is_maintenance">
              <span className="toggle-switch-inner" />
              <span className="toggle-switch-switch" />
            </label>
            {/* This is the text */}
            <label htmlFor="is_maintenance" className="toggle-switch-text">
              Enable Maintenance Mode (App ကို ပြုပြင်ထိန်းသိမ်းမှု ဖွင့်မည်)
            </label>
          </div>

          <div>
            <label htmlFor="maintenance_message">Maintenance Message</label>
            <textarea 
              id="maintenance_message"
              name="maintenance_message"
              rows="3"
              placeholder="ဥပမာ - App ကို ပြုပြင်နေပါသည်။ ခဏအကြာ ပြန်လာခဲ့ပါ..."
              value={formData.maintenance_message}
              onChange={handleInputChange}
            />
          </div>

          <hr />

          <h3 style={{color: '#007bff'}}>Welcome Message</h3>
          <div>
            <label htmlFor="welcome_message">App Welcome Message (Optional)</label>
            <textarea 
              id="welcome_message"
              name="welcome_message"
              rows="3"
              placeholder="ဥပမာ - Promotion အသစ် ရောက်ရှိ!"
              value={formData.welcome_message}
              onChange={handleInputChange}
            />
          </div>

          {error && <p className="error-message">{error}</p>}
          {successMessage && <p className="success-message">{successMessage}</p>}

          <div style={{ display: 'flex', marginTop: '1rem' }}>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save App Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AppConfiguration;