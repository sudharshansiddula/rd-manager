import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCpq7cjxpMEt7Lu5oJ0lW-USPuhWE3zJoc",
  authDomain: "rd-manager-4b40e.firebaseapp.com",
  projectId: "rd-manager-4b40e",
  storageBucket: "rd-manager-4b40e.firebasestorage.app",
  messagingSenderId: "941170239175",
  appId: "1:941170239175:web:5b8fe86e4c2c38c6a140e2",
  measurementId: "G-LQS2VHYEMD"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code == 'failed-precondition') {
    console.warn('Multiple tabs open, persistence can only be enabled in one tab at a a time.');
  } else if (err.code == 'unimplemented') {
    console.warn('The current browser does not support all of the features required to enable persistence');
  }
});

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
