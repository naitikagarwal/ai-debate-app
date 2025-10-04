import admin from "firebase-admin";


if (!admin.apps.length) {
const svc = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!svc) throw new Error("FIREBASE_SERVICE_ACCOUNT env var missing");
const serviceAccount = JSON.parse(svc);


admin.initializeApp({
credential: admin.credential.cert(serviceAccount),
});
}


export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export default admin;