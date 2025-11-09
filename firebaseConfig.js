// src/firebaseConfig.js

// Firebase modules တွေကို import လုပ်ပါ။
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// --- ဒီနေရာမှာ သင့် Firebase Config ကို ကူးထည့်ပါ ---
// (Firebase Console ကနေ ကူးလာတဲ့ "const firebaseConfig = { ... };" ကို ထည့်ပါ)
const firebaseConfig = {
  apiKey: "AIzaSyDabrffYILGy-AzkgrPZRbcvTr62bvo_GI", // <-- YOUR KEY
  authDomain: "mmdictionary-4baf9.firebaseapp.com", // <-- YOUR DOMAIN
  projectId: "mmdictionary-4baf9", // <-- YOUR PROJECT ID
  storageBucket: "mmdictionary-4baf9.firebasestorage.app", // <-- YOUR BUCKET
  messagingSenderId: "65925619341", // <-- YOUR SENDER ID
  appId: "165925619341web21359cf541353e47038cc4" // <-- YOUR APP ID
};
// ----------------------------------------------------

// Firebase app ကို စတင်ပါ။
const app = initializeApp(firebaseConfig);

// ကျွန်တော်တို့ သုံးမယ့် Services တွေကို export လုပ်ပါ။
export const auth = getAuth(app);
export const db = getFirestore(app);