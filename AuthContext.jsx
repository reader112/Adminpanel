// src/context/AuthContext.jsx

import React, { useContext, createContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebaseConfig'; // ကျွန်တော်တို့ရဲ့ Firebase "တံတား"

// 1. Context ကို အရင်ဖန်တီးပါ
const AuthContext = createContext();

// 2. တခြားဖိုင်တွေက အလွယ်တကူ သုံးနိုင်အောင် custom hook တစ်ခု export လုပ်ပါ
export function useAuth() {
  return useContext(AuthContext);
}

// 3. App တစ်ခုလုံးကို ခြုံပေးမယ့် Provider component
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 4. Firebase ရဲ့ Auth state ကို နားထောင်မယ့် အဓိက အပိုင်း
  useEffect(() => {
    // onAuthStateChanged က Login ဝင်/ထွက် တိုင်း အလုပ်လုပ်ပါတယ်
    // user ဆိုတာက login ဝင်ထားတဲ့ user object ပါ (မဝင်ထားရင် null)
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false); // Firebase ကနေ စစ်ဆေးပြီးပြီ
    });

    // Component ပိတ်သွားရင် (unmount) ဒီ listener ကို ရှင်းလင်းပါ
    return unsubscribe;
  }, []); // [] က ဒီ effect ကို component စဖွင့်ချိန်မှာ တစ်ခါပဲ run ခိုင်းတာပါ

  // 5. App တစ်ခုလုံးကို "currentUser" state ကို မျှဝေပါ
  const value = {
    currentUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {/* loading (စစ်ဆေးဆဲ) မဟုတ်မှသာ children (App) ကို ပြပါ */}
      {!loading && children}
    </AuthContext.Provider>
  );
}