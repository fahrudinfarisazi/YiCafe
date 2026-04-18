import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBar5PNdi6GjEps03Gs6KQfuW-2Y6fNIyE",
  authDomain: "pos-app-b8346.firebaseapp.com",
  projectId: "pos-app-b8346",
  storageBucket: "pos-app-b8346.firebasestorage.app",
  messagingSenderId: "373986641101",
  appId: "1:373986641101:web:d3c62c033a95bd19655584"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
