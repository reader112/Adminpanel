// src/components/MedicalFacilityManagement.jsx (UPDATED to Server-Side Pagination & Search)

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { db } from '../firebaseConfig'; 
import { 
  collection, addDoc, onSnapshot, query, orderBy,
  doc, updateDoc, deleteDoc, writeBatch,
  getDocs, limit, startAfter, where
} from 'firebase/firestore';

// Icons
import { LuSearch, LuTrash2 } from 'react-icons/lu';
import { BsFillPatchCheckFill } from 'react-icons/bs'; // Verified Icon

// (Helper functions)
const cleanPhoneArray = (phoneString) => {
  if (!phoneString || phoneString.trim() === '') return [];
  return phoneString.split(',').map(phone => phone.trim()).filter(phone => phone.length > 0);
};

const generateMedicalKeywords = (name, city, type) => {
  const keywords = new Set();
  const facilityName = name.toLowerCase();
  keywords.add(facilityName);
  facilityName.split(' ').forEach(word => keywords.add(word));
  keywords.add(city.toLowerCase());
  keywords.add(type);
  return Array.from(keywords);
};

const MEDICAL_PAGE_SIZE = 20;

// --- Main Component ---
function MedicalFacilityManagement() {
  // (1) --- States (with Pagination) ---
  const [allFacilities, setAllFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastVisibleFacility, setLastVisibleFacility] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [formData, setFormData] = useState({
    name: '', type: 'private_hospital', city: '', address: '', phones: '', isVerified: false
  });
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Feature States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const listRef = useRef(null);

  // (2) --- NEW: Initial Data Fetch Function (Server-Side) ---
  const fetchInitialData = useCallback(async (searchTerm) => {
    setLoading(true);
    clearMessages();
    try {
      let q = query(
        collection(db, "medical_facilities"),
        orderBy("name_lowercase"), // (3) --- Order by new lowercase field ---
        limit(MEDICAL_PAGE_SIZE)
      );

      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        q = query(q, 
          where("name_lowercase", ">=", searchLower),
          where("name_lowercase", "<=", searchLower + "\uf8ff")
        );
      }

      const docSnap = await getDocs(q);
      const facilitiesData = docSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setAllFacilities(facilitiesData);
      setLastVisibleFacility(docSnap.docs[docSnap.docs.length - 1]);
      setHasMore(facilitiesData.length === MEDICAL_PAGE_SIZE);

    } catch (err) {
      console.error("Error fetching initial facilities: ", err);
      setError("Failed to fetch facilities. (You may need to create a Firestore Index for 'medical_facilities' on 'name_lowercase [asc]'.)");
    }
    setLoading(false);
  }, []);

  // (4) --- NEW: Fetch More Data Function ---
  const fetchMoreData = useCallback(async () => {
    if (loading || loadingMore || !hasMore || !lastVisibleFacility) return;

    setLoadingMore(true);
    try {
      let q = query(
        collection(db, "medical_facilities"),
        orderBy("name_lowercase"),
        startAfter(lastVisibleFacility),
        limit(MEDICAL_PAGE_SIZE)
      );

      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        q = query(q,
          where("name_lowercase", ">=", searchLower),
          where("name_lowercase", "<=", searchLower + "\uf8ff")
        );
      }

      const docSnap = await getDocs(q);
      const newFacilitiesData = docSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setAllFacilities(prev => [...prev, ...newFacilitiesData]);
      setLastVisibleFacility(docSnap.docs[docSnap.docs.length - 1]);
      setHasMore(newFacilitiesData.length === MEDICAL_PAGE_SIZE);

    } catch (err) {
      console.error("Error fetching more facilities: ", err);
      setError("Failed to load more facilities.");
    }
    setLoadingMore(false);
  }, [loading, loadingMore, hasMore, lastVisibleFacility, searchTerm]);

  // (5) --- useEffect to fetch on search term change ---
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchInitialData(searchTerm);
    }, 300); // Debounce search
    return () => clearTimeout(handler);
  }, [searchTerm, fetchInitialData]);

  // (6) --- useEffect for Infinite Scroll ---
  useEffect(() => {
    const listEl = listRef.current;
    if (!listEl) return;
    const handleScroll = () => {
      if (listEl.scrollTop + listEl.clientHeight >= listEl.scrollHeight - 100) {
        fetchMoreData();
      }
    };
    listEl.addEventListener('scroll', handleScroll);
    return () => listEl.removeEventListener('scroll', handleScroll);
  }, [fetchMoreData]);

  // (Message/Form Handlers)
  const clearMessages = () => { setError(''); setSuccessMessage(''); };
  const resetForm = () => {
    setFormData({
      name: '', type: 'private_hospital', city: '', address: '', phones: '', isVerified: false
    });
    setEditingId(null); 
    clearMessages();
  };

  const handleInputChange = (e) => {
    clearMessages();
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleEdit = (facility) => {
    setEditingId(facility.id);
    setFormData({
      name: facility.name,
      type: facility.type,
      city: facility.city,
      address: facility.address,
      phones: facility.phones ? facility.phones.join(', ') : '',
      isVerified: facility.isVerified || false
    });
    clearMessages();
    document.querySelector('.main-content').scrollTo(0, 0);
  };

  // (CRUD Handlers)
  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this facility?')) {
      try {
        await deleteDoc(doc(db, "medical_facilities", id));
        fetchInitialData(searchTerm); // Refresh list
      } catch (err) { setError("Failed to delete item."); }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.city || !formData.address) {
      setError("Name, City, and Address are required."); return;
    }
    setSubmitting(true); clearMessages();

    // (7) --- MUST SAVE name_lowercase ---
    const dataToSave = {
      name: formData.name,
      name_lowercase: formData.name.toLowerCase(), // Save lowercase field
      type: formData.type,
      city: formData.city,
      address: formData.address,
      phones: cleanPhoneArray(formData.phones),
      searchKeywords: generateMedicalKeywords(formData.name, formData.city, formData.type),
      isVerified: formData.isVerified,
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, "medical_facilities", editingId), dataToSave);
        setSuccessMessage('Facility updated successfully!');
      } else {
        await addDoc(collection(db, "medical_facilities"), dataToSave);
        setSuccessMessage('Facility added successfully!');
      }
      setTimeout(() => setSuccessMessage(''), 3000);
      resetForm();
      fetchInitialData(searchTerm); // Refresh list
    } catch (err) { 
      setError("Failed to save facility."); 
    }
    setSubmitting(false);
  };

  // (Feature Handlers)
  const handleToggleVerified = async (id, currentStatus) => {
    try {
      await updateDoc(doc(db, "medical_facilities", id), { isVerified: !currentStatus });
      // Update state locally for instant UI change
      setAllFacilities(prev => prev.map(f => f.id === id ? {...f, isVerified: !currentStatus} : f));
    } catch (err) { setError("Failed to update verification status."); }
  };

  const handleSelectOne = (id) => {
    const newSelectedIds = new Set(selectedIds);
    if (newSelectedIds.has(id)) newSelectedIds.delete(id);
    else newSelectedIds.add(id);
    setSelectedIds(newSelectedIds);
  };

  const handleSelectAll = () => {
    // (Note: This selects only visible items in pagination)
    if (selectedIds.size === allFacilities.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allFacilities.map(f => f.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedIds.size} selected items?`)) {
      try {
        const batch = writeBatch(db);
        selectedIds.forEach(id => {
          batch.delete(doc(db, "medical_facilities", id));
        });
        await batch.commit();
        setSelectedIds(new Set());
        fetchInitialData(searchTerm); // Refresh list
      } catch (err) { 
        setError("Failed to delete selected items."); 
      }
    }
  };

  return (
    <div className="content-card">
      <h1>Medical Facilities Management</h1>

      {/* --- Form Area --- */}
      <div className="form-container">
        <h3>{editingId ? 'Edit Facility' : 'Add New Facility'}</h3>
        {/* (8) --- Add Warning --- */}
        <p style={{color: '#c0392b', fontWeight: 'bold'}}>
        </p>
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="name">Facility Name (Required)</label>
            <input id="name" name="name" type="text"
              placeholder="ဥပမာ - အာရှတော်ဝင် ဆေးရုံ" value={formData.name}
              onChange={handleInputChange} required
            />
          </div>
          <div>
            <label htmlFor="type">Facility Type (Required)</label>
            <select id="type" name="type" value={formData.type}
              onChange={handleInputChange} required
            >
              <option value="private_hospital">Private Hospital (ပုဂ္ဂလိက ဆေးရုံ)</option>
              <option value="public_hospital">Public Hospital (အစိုးရ ဆေးရုံ)</option>
              <option value="clinic">Clinic (ဆေးခန်း)</option>
            </select>
          </div>
          <div>
            <label htmlFor="city">City (Required)</label>
            <input id="city" name="city" type="text"
              placeholder="ဥပမာ - ရန်ကုန်" value={formData.city}
              onChange={handleInputChange} required
            />
          </div>
          <div>
            <label htmlFor="address">Address (Required)</label>
            <textarea id="address" name="address" rows="3"
              placeholder="ဥပမာ - ... လမ်း၊ ... မြို့နယ်"
              value={formData.address} onChange={handleInputChange} required
            />
          </div>
          <div>
            <label htmlFor="phones">Phone Numbers (Separate with comma ',')</label>
            <input id="phones" name="phones" type="text"
              placeholder="09-123456, 01-987654" value={formData.phones}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-checkbox-group">
            <input id="isVerified" name="isVerified" type="checkbox"
              checked={formData.isVerified} onChange={handleInputChange}
            />
            <label htmlFor="isVerified">Mark as Verified (Show Blue Mark)</label>
          </div>

          {error && <p className="error-message">{error}</p>}
          {successMessage && <p className="success-message">{successMessage}</p>}

          <div style={{ display: 'flex', gap: '1rem', flexDirection: 'row', marginTop: '1rem' }}>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : (editingId ? 'Save Changes' : 'Add New Facility')}
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
      <div className="list-container">
        <h3>Medical Facilities List</h3>
        {/* (9) --- Add List Header --- */}
        <div className="list-header">
          <div className="search-bar">
            <span className="search-icon"><LuSearch /></span>
            <input 
              type="text" 
              placeholder="Search by Facility Name (starts with...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="bulk-actions">
            <div className="select-all">
              <input 
                type="checkbox"
                id="select-all-checkbox-medical"
                checked={selectedIds.size > 0 && selectedIds.size === allFacilities.length && allFacilities.length > 0}
                onChange={handleSelectAll}
              />
              <label htmlFor="select-all-checkbox-medical">Select All</label>
            </div>
            {selectedIds.size > 0 && (
              <button 
                onClick={handleBulkDelete} 
                className="delete-btn"
                style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}
              >
                <LuTrash2 /> Delete ({selectedIds.size})
              </button>
            )}
          </div>
        </div>

        {loading && <p>Loading data...</p>}
        {!loading && allFacilities.length === 0 && (
          <p>{searchTerm ? 'No results found.' : 'No facilities added yet.'}</p>
        )}

        {/* Scrollable List */}
        <div className="scrollable-list" style={{maxHeight: '600px'}} ref={listRef}>
          <div className="data-list">
            {!loading && allFacilities.map(facility => (
              <div key={facility.id} className="data-list-item">
                <div className="item-main-info">
                  <input 
                    type="checkbox"
                    checked={selectedIds.has(facility.id)}
                    onChange={() => handleSelectOne(facility.id)}
                  />
                  <div className="item-details">
                    <p>
                      <strong>{facility.name}</strong>
                      {facility.isVerified && <BsFillPatchCheckFill className="verified-icon" title="Verified" />}
                    </p>
                    <p style={{fontStyle: 'italic', color: '#555'}}>{facility.type.replace('_', ' ')}</p>
                    <p>{facility.city} | {facility.address}</p>
                    <p>Phone: {facility.phones ? facility.phones.join(', ') : 'N/A'}</p>
                  </div>
                </div>
                <div className="item-actions">
                  <button 
                    onClick={() => handleToggleVerified(facility.id, facility.isVerified)}
                    className="verify-btn"
                    title={facility.isVerified ? 'Click to Un-verify' : 'Click to Verify'}
                  >
                    {facility.isVerified ? 'Verified' : 'Verify'}
                  </button>
                  <button onClick={() => handleEdit(facility)} className="edit-btn">Edit</button>
                  <button onClick={() => handleDelete(facility.id)} className="delete-btn">Delete</button>
                </div>
              </div>
            ))}
          </div>
          {loadingMore && <p style={{textAlign: 'center', padding: '1rem'}}>Loading more...</p>}
        </div>
      </div>
    </div>
  );
}

export default MedicalFacilityManagement;