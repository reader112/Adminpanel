// src/components/AdsManagement.jsx (FINAL Professional CRUD Version)

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebaseConfig'; 
import { 
  collection, addDoc, onSnapshot, query, orderBy,
  doc, updateDoc, deleteDoc, writeBatch
} from 'firebase/firestore';

// Icons
import { LuSearch, LuTrash2 } from 'react-icons/lu';
import { BsFillPatchCheckFill } from 'react-icons/bs'; // Verified Icon

// Helper function: Generate search keywords
const generateAdKeywords = (title, description, address) => {
  const keywords = new Set();
  const name = title.toLowerCase();
  keywords.add(name);
  name.split(' ').forEach(word => keywords.add(word));

  if (description) {
    description.toLowerCase().split(' ').forEach(word => keywords.add(word));
  }
  if (address) {
    address.toLowerCase().split(' ').forEach(word => keywords.add(word));
  }
  return Array.from(keywords);
};

// Helper function: Clean phone array
const cleanPhoneArray = (phoneString) => {
  if (!phoneString || phoneString.trim() === '') return [];
  return phoneString.split(',').map(phone => phone.trim()).filter(phone => phone.length > 0);
};

// --- Initial Form State ---
const initialFormData = {
  title: '',
  description: '',
  contact: '',
  address: '',
  googleMapUrl: '',
  imageUrl: '',
  websiteUrl: '',
  facebookUrl: '',
  telegramUrl: '',
  tiktokUrl: '',
  isEnabled: true, // (1) Enable by default
  isVerified: false,
};

// --- Main Component ---
function AdsManagement() {
  // --- States ---
  const [allAds, setAllAds] = useState([]); // All data
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(initialFormData);

  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Feature States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());

  // --- Data Fetching (Read) ---
  useEffect(() => {
    setLoading(true);
    // (2) Listen to "custom_ads" collection
    const q = query(collection(db, "custom_ads"), orderBy("title"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const adsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAllAds(adsData);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching data: ", err);
      setError("Failed to fetch data."); setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Search & Filtering Logic ---
  const filteredAds = useMemo(() => {
    return allAds.filter(ad =>
      ad.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allAds, searchTerm]);

  // --- Helper Functions ---
  const resetForm = () => {
    setFormData(initialFormData);
    setEditingId(null); setError(''); setSubmitting(false);
  };

  // --- Event Handlers (CRUD) ---
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleEdit = (ad) => {
    setEditingId(ad.id);
    // (3) Fill form with all new fields
    setFormData({
      title: ad.title || '',
      description: ad.description || '',
      contact: ad.contact ? ad.contact.join(', ') : '',
      address: ad.address || '',
      googleMapUrl: ad.googleMapUrl || '',
      imageUrl: ad.imageUrl || '',
      websiteUrl: ad.websiteUrl || '',
      facebookUrl: ad.facebookUrl || '',
      telegramUrl: ad.telegramUrl || '',
      tiktokUrl: ad.tiktokUrl || '',
      isEnabled: ad.isEnabled === undefined ? true : ad.isEnabled,
      isVerified: ad.isVerified || false
    });
    setError('');
    document.querySelector('.main-content').scrollTo(0, 0);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this advertisement?')) {
      try {
        await deleteDoc(doc(db, "custom_ads", id));
      } catch (err) { setError("Failed to delete item."); }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // (4) Required fields check
    if (!formData.title || !formData.contact || !formData.address) {
      setError("Title, Contact Info, and Address are required."); return;
    }
    setSubmitting(true); setError('');

    // (5) Save all new fields
    const dataToSave = {
      title: formData.title,
      description: formData.description,
      contact: cleanPhoneArray(formData.contact),
      address: formData.address,
      googleMapUrl: formData.googleMapUrl,
      imageUrl: formData.imageUrl,
      websiteUrl: formData.websiteUrl,
      facebookUrl: formData.facebookUrl,
      telegramUrl: formData.telegramUrl,
      tiktokUrl: formData.tiktokUrl,
      isEnabled: formData.isEnabled,
      isVerified: formData.isVerified,
      searchKeywords: generateAdKeywords(formData.title, formData.description, formData.address),
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, "custom_ads", editingId), dataToSave);
      } else {
        await addDoc(collection(db, "custom_ads"), dataToSave);
      }
      resetForm();
    } catch (err) { setError("Failed to save data."); }
    setSubmitting(false);
  };

  // --- Feature Handlers (Verified, Select, Delete) ---
  const handleToggleVerified = async (id, currentStatus) => {
    try {
      await updateDoc(doc(db, "custom_ads", id), { isVerified: !currentStatus });
    } catch (err) { setError("Failed to update verification status."); }
  };

  const handleToggleEnabled = async (id, currentStatus) => {
    try {
      await updateDoc(doc(db, "custom_ads", id), { isEnabled: !currentStatus });
    } catch (err) { setError("Failed to update status."); }
  };

  const handleSelectOne = (id) => {
    const newSelectedIds = new Set(selectedIds);
    if (newSelectedIds.has(id)) newSelectedIds.delete(id);
    else newSelectedIds.add(id);
    setSelectedIds(newSelectedIds);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredAds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAds.map(f => f.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedIds.size} selected items?`)) {
      try {
        const batch = writeBatch(db);
        selectedIds.forEach(id => {
          batch.delete(doc(db, "custom_ads", id));
        });
        await batch.commit();
        setSelectedIds(new Set());
      } catch (err) { setError("Failed to delete selected items."); }
    }
  };

  // --- JSX (UI) ---
  return (
    <div className="content-card">
      <h1>Advertisements Management</h1>

      {/* --- Form Area --- */}
      <div>
        <h3>{editingId ? 'Edit Advertisement' : 'Add New Advertisement'}</h3>
        <form onSubmit={handleSubmit}>
          {/* (6) --- New Form Fields --- */}
          <div>
            <label htmlFor="title">Title (Business Name) (Required)</label>
            <input id="title" name="title" type="text"
              placeholder="ဥပမာ - ABC Digital Marketing" value={formData.title}
              onChange={handleInputChange} required
            />
          </div>

          <div>
            <label htmlFor="description">Description</label>
            <textarea id="description" name="description" rows="3"
              placeholder="လုပ်ငန်းအကြောင်းအရာ အကျဉ်းချုပ်..."
              value={formData.description} onChange={handleInputChange}
            />
          </div>

          <div>
            <label htmlFor="contact">Contact Info (Phone) (Required)</label>
            <input id="contact" name="contact" type="text"
              placeholder="09-123456, 09-987654" value={formData.contact}
              onChange={handleInputChange} required
            />
          </div>

          <div>
            <label htmlFor="address">Shop Address (Required)</label>
            <textarea id="address" name="address" rows="3"
              placeholder="... လမ်း၊ ... မြို့နယ်၊ ... မြို့"
              value={formData.address} onChange={handleInputChange} required
            />
          </div>

          <hr />

          {/* Optional Fields */}
          <div>
            <label htmlFor="imageUrl">Image URL (Optional)</label>
            <input id="imageUrl" name="imageUrl" type="url"
              placeholder="https://... (ပုံ Link)" value={formData.imageUrl}
              onChange={handleInputChange}
            />
          </div>

          <div>
            <label htmlFor="websiteUrl">Main Website Link (Optional)</label>
            <input id="websiteUrl" name="websiteUrl" type="url"
              placeholder="https://www.example.com" value={formData.websiteUrl}
              onChange={handleInputChange}
            />
          </div>

          <div>
            <label htmlFor="googleMapUrl">Google Map URL (Optional)</label>
            <input id="googleMapUrl" name="googleMapUrl" type="url"
              placeholder="https://maps.app.goo.gl/..." value={formData.googleMapUrl}
              onChange={handleInputChange}
            />
          </div>

          <div>
            <label htmlFor="facebookUrl">Facebook URL</label>
            <input id="facebookUrl" name="facebookUrl" type="url"
              placeholder="https://facebook.com/..." value={formData.facebookUrl}
              onChange={handleInputChange}
            />
          </div>

          <div>
            <label htmlFor="telegramUrl">Telegram URL</label>
            <input id="telegramUrl" name="telegramUrl" type="url"
              placeholder="https://t.me/..." value={formData.telegramUrl}
              onChange={handleInputChange}
            />
          </div>

          <div>
            <label htmlFor="tiktokUrl">TikTok URL</label>
            <input id="tiktokUrl" name="tiktokUrl" type="url"
              placeholder="https://tiktok.com/..." value={formData.tiktokUrl}
              onChange={handleInputChange}
            />
          </div>

          <hr />

          {/* Status Toggles */}
          <div className="form-checkbox-group">
            <input id="isEnabled" name="isEnabled" type="checkbox"
              checked={formData.isEnabled} onChange={handleInputChange}
            />
            <label htmlFor="isEnabled">Enable this Ad (App မှာ ပြမည်)</label>
          </div>

          <div className="form-checkbox-group">
            <input id="isVerified" name="isVerified" type="checkbox"
              checked={formData.isVerified} onChange={handleInputChange}
            />
            <label htmlFor="isVerified">Mark as Verified (Show Blue Mark)</label>
          </div>

          {error && <p className="error-message">{error}</p>}

          <div style={{ display: 'flex', gap: '1rem', flexDirection: 'row' }}>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : (editingId ? 'Save Changes' : 'Add New Ad')}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} style={{ backgroundColor: '#6c757d' }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <hr /> 

      {/* --- List Area --- */}
      <div>
        <h3>Advertisements List</h3>
        {/* List Header */}
        <div className="list-header">
          <div className="search-bar">
            <span className="search-icon"><LuSearch /></span>
            <input 
              type="text" 
              placeholder="Search by Title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="bulk-actions">
            <div className="select-all">
              <input 
                type="checkbox"
                id="select-all-checkbox-ads"
                checked={selectedIds.size > 0 && selectedIds.size === filteredAds.length}
                onChange={handleSelectAll}
              />
              <label htmlFor="select-all-checkbox-ads">Select All</label>
            </div>
            {selectedIds.size > 0 && (
              <button 
                onClick={handleBulkDelete} 
                className="delete-btn"
                style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}
              >
                <LuTrash2 />
                Delete ({selectedIds.size})
              </button>
            )}
          </div>
        </div>

        {loading && <p>Loading data...</p>}
        {!loading && filteredAds.length === 0 && (
          <p>{searchTerm ? 'No results found.' : 'No ads added yet.'}</p>
        )}

        {/* Scrollable List */}
        <div className="scrollable-list">
          <div className="data-list">
            {!loading && filteredAds.map(ad => (
              <div key={ad.id} className="data-list-item">
                <div className="item-main-info">
                  <input 
                    type="checkbox"
                    checked={selectedIds.has(ad.id)}
                    onChange={() => handleSelectOne(ad.id)}
                  />
                  {/* (7) Show Image thumbnail if it exists */}
                  {ad.imageUrl && (
                    <img 
                      src={ad.imageUrl} 
                      alt="Ad thumbnail" 
                      style={{width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px'}} 
                    />
                  )}
                  <div className="item-details">
                    <p>
                      <strong>{ad.title}</strong>
                      {ad.isVerified && <BsFillPatchCheckFill className="verified-icon" title="Verified" />}
                    </p>
                    {/* (8) Show Enabled/Disabled status */}
                    <p style={{color: ad.isEnabled ? 'green' : 'red', fontWeight: 'bold'}}>
                      {ad.isEnabled ? 'Enabled' : 'Disabled'}
                    </p>
                    <p>{ad.address}</p>
                    <p>Contact: {ad.contact ? ad.contact.join(', ') : 'N/A'}</p>
                  </div>
                </div>
                {/* (9) Actions: Add Enable/Disable toggle */}
                <div className="item-actions">
                   <button 
                    onClick={() => handleToggleEnabled(ad.id, ad.isEnabled)}
                    style={{backgroundColor: ad.isEnabled ? '#f59e0b' : '#6c757d'}}
                    title={ad.isEnabled ? 'Click to Disable' : 'Click to Enable'}
                  >
                    {ad.isEnabled ? 'Disable' : 'Enable'}
                  </button>
                  <button 
                    onClick={() => handleToggleVerified(ad.id, ad.isVerified)}
                    className="verify-btn"
                    title={ad.isVerified ? 'Click to Un-verify' : 'Click to Verify'}
                  >
                    {ad.isVerified ? 'Verified' : 'Verify'}
                  </button>
                  <button onClick={() => handleEdit(ad)} className="edit-btn">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(ad.id)} className="delete-btn">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdsManagement;