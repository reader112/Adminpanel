// src/components/Sidebar.jsx (FIXED with LuUpload)

import React from 'react';
import { NavLink } from 'react-router-dom';

// (1) --- FINAL FIX IS HERE ---
import { 
  LuLayoutDashboard, 
  LuBus, 
  LuStethoscope, 
  LuMegaphone,
  LuUpload, // Changed from LuUploadCloud
  LuSettings
} from 'react-icons/lu'; 

import { signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';

function Sidebar() {
  const { currentUser } = useAuth();

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to log out?')) {
      return;
    }
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout Error:", error);
      alert("Failed to log out.");
    }
  };

  return (
    <div className="sidebar">
      {/* --- Header --- */}
      <div className="sidebar-header">
        Admin Menu
      </div>

      {/* --- Navigation Links --- */}
      <nav className="sidebar-nav">
        <NavLink to="/">
          <LuLayoutDashboard />
          <span>Dashboard</span>
        </NavLink>

        <NavLink to="/bus-lines">
          <LuBus />
          <span>Bus Lines</span>
        </NavLink>

        <NavLink to="/medical-facilities">
          <LuStethoscope />
          <span>Medical Facilities</span>
        </NavLink>

        <NavLink to="/advertisements">
          <LuMegaphone />
          <span>Advertisements</span>
        </NavLink>

        {/* --- (2) Link is now using the correct icon --- */}
        <NavLink to="/data-import-export">
          <LuUpload />
          <span>Data Import/Export</span>
        </NavLink>
        
        {/* --- (2) Link အသစ် ထပ်ထည့်ပါ --- */}
        <NavLink to="/app-settings">
          <LuSettings />
          <span>App Settings</span>
        </NavLink>
      </nav>

      {/* --- Footer (Logout Area) --- */}
      <div className="sidebar-footer">
        <p>Logged in as:</p>
        {currentUser && (
          <span>{currentUser.email}</span>
        )}
        <button onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}

export default Sidebar;