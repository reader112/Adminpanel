// src/components/DataImportExport.jsx (FIXED: Terminal Importer saves all denormalized fields)

import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { 
  collection, writeBatch, doc, query, getDocs, orderBy
} from 'firebase/firestore'; 
import Papa from 'papaparse';
import { LuUpload, LuDownload } from 'react-icons/lu';

// (Helper functions)
const cleanPhoneArray = (phoneString) => {
  if (!phoneString || phoneString.trim() === '') return [];
  return phoneString.split(',').map(phone => phone.trim()).filter(phone => phone.length > 0);
};

const generateTerminalKeywords = (operatorName, city, address) => {
  const keywords = new Set();
  operatorName.toLowerCase().split(' ').forEach(word => keywords.add(word));
  city.toLowerCase().split(' ').forEach(word => keywords.add(word));
  address.toLowerCase().split(' ').forEach(word => keywords.add(word));
  return Array.from(keywords);
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

// --- (Component 1) Operator Importer (No changes) ---
function OperatorImporter() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const handleFileChange = (e) => { setFile(e.target.files[0]); setMessage(''); setError(''); };
  const handleDownloadTemplate = () => {
    const headers = "name,isVerified";
    const exampleRow = `ရွှေမန္တလာ,TRUE`;
    const content = "\uFEFF" + headers + "\n" + exampleRow;
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "operators_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const handleUpload = () => {
    if (!file) { setError("Please select a file."); return; }
    setUploading(true); setError(''); setMessage('Parsing operators CSV...');
    Papa.parse(file, {
      header: true, skipEmptyLines: true, encoding: "UTF-8",
      complete: async (results) => {
        const data = results.data;
        setMessage(`Parsed ${data.length} rows. Validating...`);
        const validData = [];
        const errors = [];
        const namesInFile = new Set();
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          if (!row.name || row.name.trim() === '') {
            errors.push(`Row ${i + 2}: Missing required field 'name'.`);
            continue;
          }
          if (namesInFile.has(row.name.toLowerCase())) {
             errors.push(`Row ${i + 2}: Duplicate 'name' (${row.name}) found in the file.`);
             continue;
          }
          namesInFile.add(row.name.toLowerCase());
          validData.push(row);
        }
        if (errors.length > 0) {
          setError(`Validation failed:\n${errors.slice(0, 5).join('\n')}`);
          setUploading(false); setMessage(''); return;
        }
        setMessage(`Validation complete. Importing ${validData.length} new operators...`);
        try {
          const batch = writeBatch(db);
          const opCollectionRef = collection(db, "bus_operators");
          validData.forEach((row) => {
            const docRef = doc(opCollectionRef); 
            const dataToSave = {
              name: row.name,
              name_lowercase: row.name.toLowerCase(),
              isVerified: (row.isVerified && row.isVerified.toUpperCase() === 'TRUE') || false,
              searchKeywords: [row.name.toLowerCase(), ...row.name.toLowerCase().split(' ')]
            };
            batch.set(docRef, dataToSave);
          });
          await batch.commit();
          setMessage(`Successfully imported ${validData.length} new operators!`);
          setFile(null);
        } catch (err) {
          console.error("Batch Upload Error: ", err);
          setError(`Import failed: ${err.message}`);
        }
        setUploading(false);
      },
      error: (err) => { setError(`Failed to parse file: ${err.message}`); setUploading(false); }
    });
  };
  return (
    <div>
      <h3>Step 1: Import Operators (Companies)</h3>
      <p>Import new bus operators. Required header: <strong>name</strong>. Optional: <strong>isVerified</strong> (TRUE/FALSE).</p>
      <button onClick={handleDownloadTemplate} style={{backgroundColor: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem'}}>
        <LuDownload /> Download Operators CSV Template
      </button>
      <div className="form-checkbox-group" style={{padding: '1.5rem', background: '#f9fafb'}}>
        <input type="file" accept=".csv" onChange={handleFileChange} />
        <button onClick={handleUpload} disabled={uploading || !file} style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
          <LuUpload /> {uploading ? 'Importing...' : 'Upload Operators'}
        </button>
      </div>
      {message && <p style={{color: 'green', fontWeight: 'bold', marginTop: '1rem'}}>{message}</p>}
      {error && <pre className="error-message" style={{whiteSpace: 'pre-wrap', background: '#fff0f0', padding: '1rem', borderRadius: '4px', marginTop: '1rem'}}>{error}</pre>}
    </div>
  );
}

// --- (Component 2) Terminal Importer (FIXED) ---
function TerminalImporter() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [operatorMap, setOperatorMap] = useState(null);
  const [loadingMap, setLoadingMap] = useState(false);

  const loadOperatorMap = async () => {
    setLoadingMap(true);
    setMessage('Loading existing operators map...');
    setError('');
    try {
      const q = query(collection(db, "bus_operators"));
      const querySnapshot = await getDocs(q);
      const map = {};
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // (1) --- FIX: Map needs to store the full operator data ---
        map[data.name.toLowerCase()] = {
          id: doc.id,
          name: data.name,
          isVerified: data.isVerified || false
        };
      });
      setOperatorMap(map);
      setMessage(`Operators map loaded (${Object.keys(map).length} operators found). Ready for terminal import.`);
    } catch (err) {
      setError("Failed to load operators list. Cannot import terminals.");
    }
    setLoadingMap(false);
  };

  const handleFileChange = (e) => { setFile(e.target.files[0]); setMessage(''); setError(''); };

  const handleDownloadTemplate = () => {
    const headers = "operatorName,terminalName,city,address,phones";
    const exampleRow = `ရွှေမန္တလာ,အောင်မင်္ဂလာ,ရန်ကုန်,"အခန်း ၁၊ အောင်မင်္ဂလာ",09-123`;
    const content = "\uFEFF" + headers + "\n" + exampleRow;
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "terminals_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpload = () => {
    if (!file) { setError("Please select a file."); return; }
    if (!operatorMap) { setError("Please load the operators map first."); return; }
    setUploading(true); setError(''); setMessage('Parsing terminals CSV...');

    Papa.parse(file, {
      header: true, skipEmptyLines: true, encoding: "UTF-8",
      complete: async (results) => {
        const data = results.data;
        setMessage(`Parsed ${data.length} rows. Validating...`);

        const validData = [];
        const errors = [];
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          if (!row.operatorName || !row.city || !row.address) {
            errors.push(`Row ${i + 2}: Missing required field (operatorName, city, or address).`);
            continue;
          }
          // (2) --- FIX: Get the full operator data from the map ---
          const operatorData = operatorMap[row.operatorName.toLowerCase()];
          if (!operatorData) {
            errors.push(`Row ${i + 2}: Operator "${row.operatorName}" not found. Please add it via Step 1 first.`);
            continue;
          }

          row.operatorData = operatorData; // Attach the full operator data
          validData.push(row);
        }

        if (errors.length > 0) {
          setError(`Validation failed:\n${errors.slice(0, 5).join('\n')}\n...and ${errors.length - 5 > 0 ? errors.length - 5 : 0} more errors.`);
          setUploading(false); setMessage(''); return;
        }

        setMessage(`Validation complete. Importing ${validData.length} new terminals...`);

        try {
          const batch = writeBatch(db);
          const terminalCollectionRef = collection(db, "bus_terminals");

          validData.forEach((row) => {
            const docRef = doc(terminalCollectionRef);
            const opData = row.operatorData; // Get operator data

            // (3) --- FIX: Save all denormalized fields ---
            const dataToSave = {
              operatorId: opData.id,
              operatorName: opData.name,
              operatorName_lowercase: opData.name.toLowerCase(),
              operatorIsVerified: opData.isVerified || false,

              terminalName: row.terminalName || '',
              city: row.city,
              address: row.address,
              phones: cleanPhoneArray(row.phones || ''),

              searchKeywords: generateTerminalKeywords(opData.name, row.city, row.address)
            };
            batch.set(docRef, dataToSave);
          });

          await batch.commit();
          setMessage(`Successfully imported ${validData.length} new terminals!`);
          setFile(null);
        } catch (err) {
          console.error("Batch Upload Error: ", err);
          setError(`Import failed: ${err.message}`);
        }
        setUploading(false);
      },
      error: (err) => { setError(`Failed to parse file: ${err.message}`); setUploading(false); }
    });
  };

  return (
    <div>
      <h3>Step 2: Import Terminals (Locations)</h3>
      <p>Import terminals and link them to existing operators. Required headers: <strong>operatorName, city, address</strong>.</p>
      <p style={{color: '#c0392b', fontWeight: 'bold'}}>
        (Important) `operatorName` must **exactly match** (case-insensitive) an Operator from Step 1.
      </p>
      {!operatorMap && (
         <button onClick={loadOperatorMap} disabled={loadingMap} style={{backgroundColor: '#007bff', marginBottom: '1rem'}}>
          {loadingMap ? 'Loading...' : 'Load Operators Map'}
        </button>
      )}
      {operatorMap && (
        <>
          <button onClick={handleDownloadTemplate} style={{backgroundColor: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem'}}>
            <LuDownload /> Download Terminals CSV Template
          </button>
          <div className="form-checkbox-group" style={{padding: '1.5rem', background: '#f9fafb'}}>
            <input type="file" accept=".csv" onChange={handleFileChange} />
            <button onClick={handleUpload} disabled={uploading || !file || loadingMap} style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              <LuUpload /> {uploading ? 'Importing...' : 'Upload Terminals'}
            </button>
          </div>
        </>
      )}
      {message && <p style={{color: 'green', fontWeight: 'bold', marginTop: '1rem'}}>{message}</p>}
      {error && <pre className="error-message" style={{whiteSpace: 'pre-wrap', background: '#fff0f0', padding: '1rem', borderRadius: '4px', marginTop: '1rem'}}>{error}</pre>}
    </div>
  );
}

// --- (Component 3) Medical Importer (FIXED) ---
function MedicalImporter() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage(''); setError('');
  };

  const handleDownloadTemplate = () => {
    const headers = "name,type,city,address,phones,isVerified";
    const exampleRow = `အာရှတော်ဝင်,private_hospital,ရန်ကုန်,"... လမ်း",09-123,TRUE`;
    const content = "\uFEFF" + headers + "\n" + exampleRow;

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "medical_facilities_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpload = () => {
    if (!file) { setError("Please select a file."); return; }
    setUploading(true); setError(''); setMessage('Parsing medical CSV...');

    Papa.parse(file, {
      header: true, skipEmptyLines: true, encoding: "UTF-8",
      complete: async (results) => {
        const data = results.data;
        setMessage(`Parsed ${data.length} rows. Validating...`);

        const validData = [];
        const errors = [];
        const validTypes = ['private_hospital', 'public_hospital', 'clinic'];

        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          if (!row.name || !row.type || !row.city || !row.address) {
            errors.push(`Row ${i + 2}: Missing required field (name, type, city, or address).`);
            continue;
          }
          if (!validTypes.includes(row.type)) {
             errors.push(`Row ${i + 2}: Invalid 'type'. Must be one of: ${validTypes.join(', ')}`);
             continue;
          }
          validData.push(row);
        }

        if (errors.length > 0) {
          setError(`Validation failed:\n${errors.slice(0, 5).join('\n')}`);
          setUploading(false); setMessage(''); return;
        }

        setMessage(`Validation complete. Importing ${validData.length} new facilities...`);

        try {
          const batch = writeBatch(db);
          const medCollectionRef = collection(db, "medical_facilities");

          validData.forEach((row) => {
            const docRef = doc(medCollectionRef); 
            // (4) --- FIX: Save all denormalized fields ---
            const dataToSave = {
              name: row.name,
              name_lowercase: row.name.toLowerCase(),
              type: row.type,
              city: row.city,
              address: row.address,
              phones: cleanPhoneArray(row.phones || ''),
              isVerified: (row.isVerified && row.isVerified.toUpperCase() === 'TRUE') || false,
              searchKeywords: generateMedicalKeywords(row.name, row.city, row.type)
            };
            batch.set(docRef, dataToSave);
          });

          await batch.commit();
          setMessage(`Successfully imported ${validData.length} new medical facilities!`);
          setFile(null);
        } catch (err) {
          console.error("Batch Upload Error: ", err);
          setError(`Import failed: ${err.message}`);
        }
        setUploading(false);
      },
      error: (err) => { setError(`Failed to parse file: ${err.message}`); setUploading(false); }
    });
  };

  return (
    <div>
      <h3>Import Medical Facilities</h3>
      <p>Import new hospitals and clinics. Required headers: <strong>name, type, city, address</strong>.</p>
      <p>Valid 'type' values are: <strong>private_hospital, public_hospital, clinic</strong>.</p>

      <button 
        onClick={handleDownloadTemplate} 
        style={{backgroundColor: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem'}}
      >
        <LuDownload /> Download Medical CSV Template
      </button>
      <div className="form-checkbox-group" style={{padding: '1.5rem', background: '#f9fafb'}}>
        <input type="file" accept=".csv" onChange={handleFileChange} />
        <button onClick={handleUpload} disabled={uploading || !file}
          style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}
        >
          <LuUpload /> {uploading ? 'Importing...' : 'Upload Medical Facilities'}
        </button>
      </div>
      {message && <p style={{color: 'green', fontWeight: 'bold', marginTop: '1rem'}}>{message}</p>}
      {error && <pre className="error-message" style={{whiteSpace: 'pre-wrap', background: '#fff0f0', padding: '1rem', borderRadius: '4px', marginTop: '1rem'}}>{error}</pre>}
    </div>
  );
}

// --- (Component 4) Exporter (FIXED) ---
function Exporter() {
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleExport = async (collectionName, fileName, sortField, dataFormatter) => {
    setExporting(true); setMessage(`Fetching ${fileName} data...`); setError('');
    try {
      // (5) --- FIX: Use correct sort field ---
      const q = query(collection(db, collectionName), orderBy(sortField));

      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        setError(`No data found in "${collectionName}" to export.`);
        setExporting(false); setMessage(''); return;
      }
      const dataToExport = querySnapshot.docs.map(dataFormatter);
      const csv = Papa.unparse(dataToExport, { header: true });
      const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `${fileName}_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setMessage(`Successfully exported ${dataToExport.length} records from ${fileName}.`);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error("Export Error: ", err);
      setError(`Export failed: ${err.message}. (You may need to create an Index for this collection).`);
    }
    setExporting(false);
  };

  // Data Formatters (FIXED)
  const formatOperator = (doc) => {
    const data = doc.data();
    return { name: data.name, isVerified: data.isVerified ? 'TRUE' : 'FALSE' };
  };
  const formatTerminal = (doc) => {
    const data = doc.data();
    return {
      operatorId: data.operatorId,
      operatorName: data.operatorName, // (6) --- FIX: Export denormalized name ---
      terminalName: data.terminalName,
      city: data.city, address: data.address,
      phones: data.phones ? data.phones.join(',') : ''
    };
  };
  const formatMedical = (doc) => {
    const data = doc.data();
    return {
      name: data.name, type: data.type, city: data.city,
      address: data.address, phones: data.phones ? data.phones.join(',') : '',
      isVerified: data.isVerified ? 'TRUE' : 'FALSE'
    };
  };
  const formatAd = (doc) => {
    const data = doc.data();
    return {
      title: data.title, description: data.description,
      contact: data.contact ? data.contact.join(',') : '',
      address: data.address, googleMapUrl: data.googleMapUrl,
      imageUrl: data.imageUrl, websiteUrl: data.websiteUrl,
      facebookUrl: data.facebookUrl, telegramUrl: data.telegramUrl,
      tiktokUrl: data.tiktokUrl, isEnabled: data.isEnabled ? 'TRUE' : 'FALSE',
      isVerified: data.isVerified ? 'TRUE' : 'FALSE'
    };
  };

  return (
    <div>
      <h3>Export Data</h3>
      <p>Download all data from a collection as a single CSV file.</p>
      <div style={{display: 'flex', flexWrap: 'wrap', gap: '1rem'}}>
        {/* (7) --- FIX: Use correct sort field 'name_lowercase' --- */}
        <button onClick={() => handleExport("bus_operators", "bus_operators", "name_lowercase", formatOperator)} style={{backgroundColor: '#007bff'}}>
          <LuDownload /> {exporting ? 'Exporting...' : 'Export Bus Operators'}
        </button>
        {/* (7) --- FIX: Use correct sort field 'operatorName_lowercase' --- */}
        <button onClick={() => handleExport("bus_terminals", "bus_terminals", "operatorName_lowercase", formatTerminal)} style={{backgroundColor: '#007bff'}}>
          <LuDownload /> {exporting ? 'Exporting...' : 'Export Bus Terminals'}
        </button>
        {/* (7) --- FIX: Use correct sort field 'name_lowercase' --- */}
        <button onClick={() => handleExport("medical_facilities", "medical_facilities", "name_lowercase", formatMedical)} style={{backgroundColor: '#007bff'}}>
          <LuDownload /> {exporting ? 'Exporting...' : 'Export Medical Facilities'}
        </button>
        {/* (7) --- FIX: Use correct sort field 'title' (assuming no lowercase field yet) --- */}
        <button onClick={() => handleExport("custom_ads", "custom_ads", "title", formatAd)} style={{backgroundColor: '#007bff'}}>
          <LuDownload /> {exporting ? 'Exporting...' : 'Export Advertisements'}
        </button>
      </div>
      {message && <p style={{color: 'green', fontWeight: 'bold', marginTop: '1rem'}}>{message}</p>}
      {error && <pre className="error-message" style={{whiteSpace: 'pre-wrap', background: '#fff0f0', padding: '1rem', borderRadius: '4px', marginTop: '1rem'}}>{error}</pre>}
    </div>
  );
}

// --- (Main) DataImportExport ---
function DataImportExport() {
  return (
    <div className="content-card">
      <h1>Data Import / Export</h1>
      <p>Import or export data in bulk using CSV files. Ensure CSV headers match the template exactly.</p>

      <hr />

      <OperatorImporter />

      <hr />

      <TerminalImporter />

      <hr />

      {/* (8) --- ADD NEW COMPONENT HERE --- */}
      <MedicalImporter />

      <hr />

      <Exporter />
    </div>
  );
}

export default DataImportExport;