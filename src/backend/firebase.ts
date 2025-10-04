import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
// Your web app's Firebase configuration

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
// ...existing code...
console.log("Firebase config:", firebaseConfig);
// ...existing code...

// DEV: quick sanity log (remove in production)
if (typeof window !== "undefined") {
  // safe to log projectId (it's public)
  // eslint-disable-next-line no-console
  console.log("Firebase app projectId:", (app.options as any).projectId);
}


export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

export default app;
