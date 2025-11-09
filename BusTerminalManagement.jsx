// src/components/BusTerminalManagement.jsx (FINAL: Fixed "Unknown Operator" Bug & Search Logic)

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { db } from '../firebaseConfig'; 
import { 
  collection, addDoc, onSnapshot, query, orderBy,
  doc, updateDoc, deleteDoc, writeBatch,
  getDocs, limit, startAfter, where
} from 'firebase/firestore';

import Select from 'react-select'; 
import { 
  LuSearch, 
  LuTrash2, 
  LuCircleCheck,
  LuArrowRightLeft 
} from 'react-icons/lu';
import { BsFillPatchCheckFill } from 'react-icons/bs';

const cleanPhoneArray = (phoneString) => {
  if (!phoneString || phoneString.trim() === '') return [];
  return phoneString.split(',').map(phone => phone.trim()).filter(phone => phone.length > 0);
};

const OPERATORS_PAGE_SIZE = 20;

// --- (Component 1) OperatorManagement (No changes from Task 3.47) ---
function OperatorManagement() {
  // ... (This component is identical to Task 3.47) ...
  const [allOperators, setAllOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: '', isVerified: false });
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "bus_operators"), orderBy("name_lowercase"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAllOperators(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => { setError("Failed to fetch operators."); setLoading(false); });
    return () => unsubscribe();
  }, []);

  const filteredOperators = useMemo(() => {
    if (!searchTerm) return allOperators;
    return allOperators.filter(op =>
      op.name.toLowerCase().startsWith(searchTerm.toLowerCase())
    );
  }, [allOperators, searchTerm]);

  const clearMessages = () => { setError(''); setSuccessMessage(''); };
  const resetForm = () => {
    setFormData({ name: '', isVerified: false });
    setEditingId(null); clearMessages();
  };
  const handleInputChange = (e) => {
    clearMessages();
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };
  const handleEdit = (op) => {
    setEditingId(op.id);
    setFormData({ name: op.name, isVerified: op.isVerified || false });
    clearMessages();
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this operator?')) {
      try {
        await deleteDoc(doc(db, "bus_operators", id));
      } catch (err) { /* ... */ }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      setError("Operator Name is required."); return;
    }
    setSubmitting(true); clearMessages();
    const dataToSave = {
      name: formData.name,
      name_lowercase: formData.name.toLowerCase(),
      isVerified: formData.isVerified,
      searchKeywords: [formData.name.toLowerCase(), ...formData.name.toLowerCase().split(' ')]
    };
    try {
      if (editingId) {
        await updateDoc(doc(db, "bus_operators", editingId), dataToSave);
        setSuccessMessage('Operator updated successfully!');
      } else {
        await addDoc(collection(db, "bus_operators"), dataToSave);
        setSuccessMessage('Operator added successfully!');
      }
      setTimeout(() => setSuccessMessage(''), 3000);
      setFormData({ name: '', isVerified: false });
      setEditingId(null);
    } catch (err) { 
      setError("Failed to save operator."); 
    }
    setSubmitting(false);
  };

  const handleSelectOne = (id) => {
    const newSelectedIds = new Set(selectedIds);
    if (newSelectedIds.has(id)) newSelectedIds.delete(id);
    else newSelectedIds.add(id);
    setSelectedIds(newSelectedIds);
  };
  const handleSelectAll = () => {
    if (selectedIds.size === filteredOperators.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredOperators.map(op => op.id)));
    }
  };
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedIds.size} selected operators?`)) {
      try {
        const batch = writeBatch(db);
        selectedIds.forEach(id => {
          batch.delete(doc(db, "bus_operators", id));
        });
        await batch.commit();
        setSelectedIds(new Set());
      } catch (err) { 
        setError("Failed to delete selected operators."); 
      }
    }
  };

  return (
    <div className="management-grid">
      {/* Form Area */}
      <div className="form-container">
        <h3>{editingId ? 'Edit Operator' : 'Add New Operator'}</h3>
        <form onSubmit={handleSubmit} style={{marginTop: '1rem'}}>
          <div>
            <label htmlFor="name">Operator Name (Required)</label>
            <input id="name" name="name" type="text"
              placeholder="ဥပမာ - ရွှေမန္တလာ" value={formData.name}
              onChange={handleInputChange} required
            />
          </div>
          <div className="form-checkbox-group">
            <input id="op-isVerified" name="isVerified" type="checkbox"
              checked={formData.isVerified} onChange={handleInputChange}
            />
            <label htmlFor="op-isVerified">Mark as Verified (Show Blue Mark)</label>
          </div>
          {error && <p className="error-message">{error}</p>}
          {successMessage && <p className="success-message">{successMessage}</p>}
          <div style={{ display: 'flex', gap: '1rem', flexDirection: 'row', marginTop: '1rem' }}>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : (editingId ? 'Save Changes' : 'Add New Operator')}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} style={{ backgroundColor: '#6c757d' }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* List Area */}
      <div className="list-container">
        <h3>Operators List</h3>
        <div className="list-header">
          <div className="search-bar">
            <span className="search-icon"><LuSearch /></span>
            <input 
              type="text" 
              placeholder="Search by Operator Name (starts with...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="bulk-actions">
            <div className="select-all">
              <input 
                type="checkbox"
                id="select-all-operators"
                checked={selectedIds.size > 0 && selectedIds.size === filteredOperators.length}
                onChange={handleSelectAll}
              />
              <label htmlFor="select-all-operators">Select All</label>
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
        {!loading && filteredOperators.length === 0 && (
          <p>{searchTerm ? 'No results found.' : 'No operators added yet.'}</p>
        )}

        <div className="scrollable-list" style={{maxHeight: '80vh'}}>
          <div className="data-list">
            {!loading && filteredOperators.map(op => ( 
              <div key={op.id} className="data-list-item">
                <div className="item-main-info">
                  <input 
                    type="checkbox"
                    checked={selectedIds.has(op.id)}
                    onChange={() => handleSelectOne(op.id)}
                  />
                  <div className="item-details">
                    <p>
                      <strong>{op.name}</strong>
                      {op.isVerified && <BsFillPatchCheckFill className="verified-icon" title="Verified" />}
                    </p>
                  </div>
                </div>
                <div className="item-actions">
                  <button onClick={() => handleEdit(op)} className="edit-btn">Edit</button>
                  <button onClick={() => handleDelete(op.id)} className="delete-btn">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- (Component 2) TerminalManagement (FIXED) ---
function TerminalManagement({ operators, operatorsLoading }) {
  const [allTerminals, setAllTerminals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    operatorId: '', terminalName: '', city: '', address: '', phones: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());

  // This map is now fed by a reliable, indexed query
  const operatorMap = useMemo(() => {
    return operators.reduce((map, op) => {
      map[op.id] = op;
      return map;
    }, {});
  }, [operators]);

  // This query uses onSnapshot (client-side)
  useEffect(() => {
    setLoading(true);
    // (1) --- FIX: We must order by a field that always exists ---
    // 'operatorName_lowercase' might not exist on old data. Let's use 'city'.
    const q = query(collection(db, "bus_terminals"), orderBy("city"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAllTerminals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => { setError("Failed to fetch terminals."); setLoading(false); });
    return () => unsubscribe();
  }, []);

  // This builds the full terminal object for searching
  const terminalsWithOperatorNames = useMemo(() => {
    return allTerminals.map(terminal => {
      // (2) --- *** FIX for "Unknown Operator" Bug *** ---
      // Check if the operator exists in the (live) map
      const operator = operatorMap[terminal.operatorId];
      return {
        ...terminal,
        operatorName: operator ? operator.name : 'Unknown Operator', 
        operatorIsVerified: operator ? operator.isVerified : false,
      };
    });
  }, [allTerminals, operatorMap]);

  // (3) --- *** FIX for "Search" Bug *** ---
  const filteredTerminals = useMemo(() => {
    if (!searchTerm) return terminalsWithOperatorNames;
    const searchLower = searchTerm.toLowerCase();
    // Search by Operator, City, OR Address (all with startsWith)
    return terminalsWithOperatorNames.filter(terminal =>
      (terminal.operatorName && terminal.operatorName.toLowerCase().startsWith(searchLower)) ||
      (terminal.city && terminal.city.toLowerCase().startsWith(searchLower)) ||
      (terminal.address && terminal.address.toLowerCase().startsWith(searchLower))
    );
  }, [terminalsWithOperatorNames, searchTerm]);

  const clearMessages = () => { setError(''); setSuccessMessage(''); };
  const resetForm = () => {
    setFormData({ operatorId: '', terminalName: '', city: '', address: '', phones: '' });
    setEditingId(null); 
    clearMessages();
  };

  const handleInputChange = (e) => {
    clearMessages();
    if (e.target) {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));
    } else if (e.name) {
      setFormData(prev => ({ ...prev, [e.name]: e.value }));
    }
  };

  const handleEdit = (terminal) => {
    setEditingId(terminal.id);
    setFormData({
      operatorId: terminal.operatorId,
      terminalName: terminal.terminalName,
      city: terminal.city,
      address: terminal.address,
      phones: terminal.phones ? terminal.phones.join(', ') : '',
    });
    clearMessages();
    document.querySelector('.main-content').scrollTo(0, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.operatorId || !formData.city || !formData.address) {
      setError("Operator, City, and Address are required."); return;
    }
    setSubmitting(true); clearMessages();

    const operator = operatorMap[formData.operatorId];
    if (!operator) {
        setError("Selected operator is invalid. Please re-select.");
        setSubmitting(false);
        return;
    }

    // (4) --- Save all denormalized fields ---
    const dataToSave = {
      operatorId: operator.id,
      operatorName: operator.name,
      operatorName_lowercase: operator.name.toLowerCase(),
      operatorIsVerified: operator.isVerified || false,

      terminalName: formData.terminalName,
      city: formData.city,
      address: formData.address,
      phones: cleanPhoneArray(formData.phones),
      searchKeywords: [ 
          operator.name.toLowerCase(),
          ...operator.name.toLowerCase().split(' '),
          formData.city.toLowerCase(), 
          ...formData.address.toLowerCase().split(' ')
      ]
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, "bus_terminals", editingId), dataToSave);
        setSuccessMessage('Terminal updated successfully!');
      } else {
        await addDoc(collection(db, "bus_terminals"), dataToSave);
        setSuccessMessage('Terminal added successfully!');
      }
      setTimeout(() => setSuccessMessage(''), 3000);

      // (This was the fix from Task 3.45)
      setFormData({ operatorId: '', terminalName: '', city: '', address: '', phones: '' });
      setEditingId(null);

    } catch (err) { 
      setError("Failed to save terminal."); 
    }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this terminal?')) {
      try { await deleteDoc(doc(db, "bus_terminals", id)); } 
      catch (err) { /* (No form error) */ }
    }
  };
  const handleSelectOne = (id) => {
    const newSelectedIds = new Set(selectedIds);
    if (newSelectedIds.has(id)) newSelectedIds.delete(id);
    else newSelectedIds.add(id);
    setSelectedIds(newSelectedIds);
  };
  const handleSelectAll = () => {
    if (selectedIds.size === filteredTerminals.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredTerminals.map(t => t.id)));
  };
  const handleBulkDelete = async (id) => {
    if (selectedIds.size === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedIds.size} selected items?`)) {
      try {
        const batch = writeBatch(db);
        selectedIds.forEach(id => {
          batch.delete(doc(db, "bus_terminals", id));
        });
        await batch.commit();
        setSelectedIds(new Set());
      } catch (err) { 
        setError("Failed to delete selected items."); 
      }
    }
  };

  const operatorOptions = useMemo(() => {
    if (operatorsLoading) return [];
    return operators.map(op => ({
      value: op.id,
      label: `${op.name}${op.isVerified ? ' (Verified)' : ''}`
    }));
  }, [operators, operatorsLoading]);

  return (
    <div className="management-grid">
      <div className="form-container">
        <h3>{editingId ? 'Edit Terminal' : 'Add New Terminal'}</h3>

        {/* (5) --- FIX 1: REMOVED Warning Text --- */}

        <form onSubmit={handleSubmit} style={{marginTop: '1rem'}}>
          {/* ... form fields ... */}
          <div>
            <label htmlFor="operatorId">Operator (Required)</label>
            <Select
              id="operatorId"
              name="operatorId"
              options={operatorOptions}
              isLoading={operatorsLoading}
              placeholder="Type to search operators..."
              isClearable
              isSearchable
              value={operatorOptions.find(opt => opt.value === formData.operatorId)}
              onChange={(selectedOption) => {
                handleInputChange({
                  name: 'operatorId',
                  value: selectedOption ? selectedOption.value : ''
                });
              }}
              className="react-select-container"
              classNamePrefix="react-select"
            />
          </div>
          <div>
            <label htmlFor="terminalName">Terminal Name (Optional)</label>
            <input id="terminalName" name="terminalName" type="text"
              placeholder="ဥပမာ - အောင်မင်္ဂလာဂိတ်" value={formData.terminalName}
              onChange={handleInputChange}
            />
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
              placeholder="ဥပမာ - အခန်း ၅၊ အောင်မင်္ဂလာအဝေးပြေးဝင်း..."
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

          {error && <p className="error-message">{error}</p>}
          {successMessage && <p className="success-message">{successMessage}</p>}

          <div style={{ display: 'flex', gap: '1rem', flexDirection: 'row', marginTop: '1rem' }}>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : (editingId ? 'Save Changes' : 'Add New Terminal')}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} style={{ backgroundColor: '#6c757d' }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="list-container">
        {/* ... List component ... */}
        <h3>Terminals List</h3>
        <div className="list-header">
          <div className="search-bar">
            <span className="search-icon"><LuSearch /></span>
            <input type="text" 
              placeholder="Search by Operator, City, or Address (starts with...)"
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="bulk-actions">
            <div className="select-all">
              <input type="checkbox" id="select-all-terminals"
                checked={selectedIds.size > 0 && selectedIds.size === filteredTerminals.length && filteredTerminals.length > 0}
                onChange={handleSelectAll}
              />
              <label htmlFor="select-all-terminals">Select All</label>
            </div>
            {selectedIds.size > 0 && (
              <button onClick={handleBulkDelete} className="delete-btn"
                style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}
              >
                <LuTrash2 /> Delete ({selectedIds.size})
              </button>
            )}
          </div>
        </div>

        {loading && <p>Loading data...</p>}
        {!loading && filteredTerminals.length === 0 && (
          <p>{searchTerm ? 'No results found.' : 'No terminals added yet.'}</p>
        )}

        <div className="scrollable-list" style={{maxHeight: '600px'}}>
          <div className="data-list">
            {!loading && filteredTerminals.map(terminal => {
              return (
                <div key={terminal.id} className="data-list-item">
                  <div className="item-main-info">
                    <input type="checkbox"
                      checked={selectedIds.has(terminal.id)}
                      onChange={() => handleSelectOne(terminal.id)}
                    />
                    <div className="item-details">
                      <p>
                        {/* (3c) --- FIX for BUG 3 --- */}
                        <strong>{terminal.operatorName || 'Unknown Operator'}</strong>
                        {terminal.operatorIsVerified && 
                          <BsFillPatchCheckFill className="verified-icon" title="Verified Operator" />}
                      </p>
                      <p><strong>{terminal.city}</strong> | {terminal.terminalName || terminal.address}</p>
                      <p>Phone: {terminal.phones ? terminal.phones.join(', ') : 'N/A'}</p>
                    </div>
                  </div>
                  <div className="item-actions">
                    <button onClick={() => handleEdit(terminal)} className="edit-btn">Edit</button>
                    <button onClick={() => handleDelete(terminal.id)} className="delete-btn">Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- (Main) BusTerminalManagement (FIXED) ---
function BusTerminalManagement() {
  const [activeTab, setActiveTab] = useState('operators');
  const [operators, setOperators] = useState([]);
  const [operatorsLoading, setOperatorsLoading] = useState(true);

  // (1) --- *** FIX for BUG 3: Create the Index for this query *** ---
  useEffect(() => {
    // This query (orderBy("name_lowercase")) requires a Single-Field Index
    // on 'bus_operators' collection.
    const q = query(collection(db, "bus_operators"), orderBy("name_lowercase"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOperators(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setOperatorsLoading(false);
    }, (err) => {
      // (This error will now show if the Index is missing)
      console.error("CRITICAL ERROR fetching operators for dropdown: ", err);
      console.error(">>> SOLUTION: Create a Firestore Index for 'bus_operators' collection on field 'name_lowercase' (Ascending) <<<");
      setOperatorsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="content-card">
      <h1>Bus Lines Management</h1>
      <p>Manage bus operators (companies) first, then add their terminals (locations).</p>

      <div className="internal-tab-header">
        <button
          className={`internal-tab-button ${activeTab === 'operators' ? 'active' : ''}`}
          onClick={() => setActiveTab('operators')}
        >
          <LuCircleCheck /> Operators (Companies)
        </button>
        <button
          className={`internal-tab-button ${activeTab === 'terminals' ? 'active' : ''}`}
          onClick={() => setActiveTab('terminals')}
        >
          <LuArrowRightLeft /> Terminals (Locations)
        </button>
      </div>

      <div>
        {activeTab === 'operators' && (
          <OperatorManagement />
        )}
        {activeTab === 'terminals' && (
          <TerminalManagement operators={operators} operatorsLoading={operatorsLoading} />
        )}
      </div>
    </div>
  );
}

export default BusTerminalManagement;