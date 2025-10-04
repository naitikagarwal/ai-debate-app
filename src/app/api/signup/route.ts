import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import admin, { adminAuth, adminDb } from "@/backend/firebaseAdmin";


export async function POST(req: Request) {
try {
const body = await req.json();
const { displayName, email, password, walletAddress } = body;


if (!displayName || !email || !password) {
return NextResponse.json({ error: "Missing fields" }, { status: 400 });
}


// 1) create user in Firebase Auth (server-side)
const userRecord = await adminAuth.createUser({
email,
password,
displayName,
});


// 2) hash password for storage (bcrypt)
const hashed = await bcrypt.hash(password, 10);


// 3) create a users document with additional fields
await adminDb.collection("users").doc(userRecord.uid).set({
displayName,
email,
hashed_password: hashed,
walletAddress: walletAddress ?? null,
createdAt: admin.firestore.FieldValue.serverTimestamp(),
});


return NextResponse.json({ uid: userRecord.uid }, { status: 201 });
} catch (err: any) {
console.error("/api/signup error", err);
return NextResponse.json({ error: err.message ?? String(err) }, { status: 500 });
}
}