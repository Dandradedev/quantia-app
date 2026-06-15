import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA8z6sxXbcwk5ZLu8Y6sQA-qkOWCLlvhKo",
  authDomain: "quantia-app-88acc.firebaseapp.com",
  projectId: "quantia-app-88acc",
  storageBucket: "quantia-app-88acc.firebasestorage.app",
  messagingSenderId: "1063628671519",
  appId: "1:1063628671519:web:5935358e29ff21bc87232a"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);