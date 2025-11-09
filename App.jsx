// src/App.jsx (NEW - Router Setup)

import React from 'react';
// (1) Router အတွက် လိုအပ်တာတွေ import လုပ်ပါ
import { Routes, Route, Navigate } from 'react-router-dom';

// (2) Context နဲ့ Layout တွေကို import လုပ်ပါ
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout'; // Task 3.15 က Layout

// (3) စာမျက်နှာ အားလုံးကို import လုပ်ပါ
import Login from './pages/Login';
import Dashboard from './pages/Dashboard'; // Task 3.16 Revised ကဖိုင်

// (4) Component တွေကို Page အဖြစ် သုံးဖို့ import လုပ်ပါ
import BusTerminalManagement from './components/BusTerminalManagement';
import MedicalFacilityManagement from './components/MedicalFacilityManagement';
import AdsManagement from './components/AdsManagement';
import DataImportExport from './components/DataImportExport';
import AppConfiguration from './components/AppConfiguration'; // (1) --- Component အသစ်ကို Import လုပ်ပါ

// (5) Login ဝင်မှ ဝင်ရမယ့် စာမျက်နှာတွေအတွက် wrapper
function PrivateRoute({ children }) {
  const { currentUser } = useAuth();
  // Login ဝင်ထားရင် children (Layout) ကို ပြ၊ မဝင်ထားရင် Login page ကို ပို့
  return currentUser ? children : <Navigate to="/login" />;
}

// (6) Login ဝင်ပြီးသားဆို ဝင်စရာမလိုတဲ့ စာမျက်နှာ (Login page) အတွက် wrapper
function PublicRoute({ children }) {
  const { currentUser } = useAuth();
  // Login ဝင်ထားရင် Dashboard (/) ကို ပို့၊ မဝင်ထားရင် children (Login) ကို ပြ
  return currentUser ? <Navigate to="/" /> : children;
}

// --- Main App Component ---
function App() {
  return (
    <Routes>
      {/* Route 1: Login Page
        - path="/login"
        - Login ဝင်ပြီးသားဆို (/) ကို ပို့မယ်
      */}
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } 
      />

      {/* Route 2: Admin Panel (Sidebar + Content)
        - path="/" (ဒါက အဓိကစာမျက်နှာ)
        - Login မဝင်ထားရင် (/login) ကို ပို့မယ်
      */}
      <Route 
        path="/" 
        element={
          <PrivateRoute>
            <Layout /> {/* Task 3.15 က Sidebar + Content Area ပါတဲ့ Layout */}
          </PrivateRoute>
        }
      >
        {/* Layout ထဲက <Outlet /> မှာ ပြမယ့် စာမျက်နှာခွဲ (Nested Routes) များ
        */}

        {/* "/" ကို ဝင်တာနဲ့ Dashboard ကို default ပြမယ် */}
        <Route index element={<Dashboard />} /> 

        {/* "/bus-lines" ကို ဝင်ရင် BusTerminalManagement ကို ပြမယ် */}
        <Route path="bus-lines" element={<BusTerminalManagement />} />

        {/* "/medical-facilities" ကို ဝင်ရင် MedicalFacilityManagement ကို ပြမယ် */}
        <Route path="medical-facilities" element={<MedicalFacilityManagement />} />

        {/* "/advertisements" ကို ဝင်ရင် AdsManagement ကို ပြမယ် */}
        <Route path="advertisements" element={<AdsManagement />} />

        {/* ---Data import/exportအသစ် ထပ်ထည့်ပါ --- */}
        <Route path="data-import-export" element={<DataImportExport />} />
        
        {/* --- (2) Route အသစ် ထပ်ထည့်ပါ --- */}
        <Route path="app-settings" element={<AppConfiguration />} />
      </Route>

      {/* Route 3: တခြား မှားယွင်းဝင်ရောက်လာသော link များ
        - အားလုံးကို (/) (Dashboard) ဆီသို့ ပို့ပေးပါ
      */}
      <Route path="*" element={<Navigate to="/" />} />

    </Routes>
  );
}

export default App;