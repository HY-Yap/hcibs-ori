// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDO80i4f5hhBHNH2LFFycnjTokPbPyc0qQ",
    authDomain: "hcibso.firebaseapp.com",
    projectId: "hcibso",
    storageBucket: "hcibso.firebasestorage.app",
    messagingSenderId: "1077288795449",
    appId: "1:1077288795449:web:30306666f8349d770abce8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and export Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);
