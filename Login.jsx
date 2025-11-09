// src/pages/Login.jsx

import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebaseConfig'; // ကျွန်တော်တို့ရဲ့ Firebase "တံတား"

function Login() {
  // (1) User ရိုက်ထည့်မယ့် Email/Password ကို သိမ်းဖို့ State တွေ
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // (2) Error ပြဖို့နဲ့ Loading ပြဖို့ State တွေ
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // (3) Login ခလုတ်ကို နှိပ်လိုက်ရင် အလုပ်လုပ်မယ့် Function
  const handleSubmit = async (e) => {
    e.preventDefault(); // Form က page reload မဖြစ်သွားအောင်
    setError(''); // Error အဟောင်းကို အရင်ရှင်း
    setLoading(true); // "Logging in..." လို့ပြဖို့

    try {
      // (4) Firebase ကို Email/Password နဲ့ Login ဝင်ခိုင်းခြင်း
      await signInWithEmailAndPassword(auth, email, password);

      // အောင်မြင်သွားရင် ဘာမှ ဆက်လုပ်စရာမလိုပါ။
      // Task 3.6 က AuthContext က Login ဝင်သွားတာကို အလိုလိုသိပြီး
      // App.jsx က Dashboard ကို အလိုလို ပြောင်းပေးပါလိမ့်မယ်။

    } catch (err) {
      // (5) Login မအောင်မြင်ရင် (Password မှားရင်) Error ပြခြင်း
      console.error("Login Error:", err.code);
      if (err.code === 'auth/invalid-credential') {
        setError('Email သို့မဟုတ် Password မှားယွင်းနေပါသည်။');
      } else {
        setError('Login ဝင်ခြင်း မအောင်မြင်ပါ။');
      }
    }

    setLoading(false); // Loading ပြီးဆုံး
  };

  return (
    <div className="login-container"> {/* CSS class ကို သုံးပါမယ် */}
      <h1>Admin Panel Login</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email:</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="admin@email.com"
          />
        </div>
        <div>
          <label htmlFor="password">Password:</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
          />
        </div>

        {/* Error ရှိမှ Error message ကို ပြပါ */}
        {error && <p className="error-message">{error}</p>}

        {/* Loading ဖြစ်နေရင် ခလုတ်ကို ပိတ်ထားပါ */}
        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}

export default Login;