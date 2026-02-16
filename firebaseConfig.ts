import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Validate that all required config values are present
const requiredFields = ["apiKey", "authDomain", "projectId", "appId"];
const missingFields = requiredFields.filter(
  (field) => !firebaseConfig[field as keyof typeof firebaseConfig],
);

if (missingFields.length > 0) {
  console.warn(
    `Firebase configuration is incomplete. Missing fields: ${missingFields.join(", ")}. ` +
      "Please add your Firebase credentials to the .env file.",
  );
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Auth instance
const auth = getAuth(app);

// 🔥 Ensure persistence is set BEFORE auth is used
let firebaseReady: Promise<void> = Promise.resolve();

if (Platform.OS === "web") {
  firebaseReady = setPersistence(auth, browserLocalPersistence).catch(
    (error) => {
      console.warn("Failed to set persistence:", error);
    },
  );
}

// Get Firestore instance
const db = getFirestore(app);

export { app, auth, db, firebaseReady };

