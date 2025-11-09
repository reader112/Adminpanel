// src/components/Layout.jsx

import React from 'react';
// react-router-dom က Outlet က ညာဘက်မှာ ပြမယ့် စာမျက်နှာတွေအတွက် နေရာပါ
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar'; // Task 3.14 က Sidebar

function Layout() {
  return (
    <div className="layout-container">
      {/* ဘယ်ဘက်က Sidebar */}
      <Sidebar />

      {/* ညာဘက်က အဓိက Content ပြမယ့် နေရာ */}
      <main className="main-content">
        {/* ဒီ Outlet နေရာမှာ 
          DashboardPage, BusLinesPage, etc. 
          တွေက အလိုအလျောက် ဝင်ပြီး ပေါ်လာပါလိမ့်မယ် 
        */}
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;