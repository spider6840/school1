import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig, 'test-app');
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  const email = 'server@local.host';
  const password = 'server_super_secret_password_123!';
  try {
    await signInWithEmailAndPassword(auth, email, password);
    console.log("Logged in");
  } catch(e: any) {
    if(e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
      try {
        await createUserWithEmailAndPassword(auth, email, password);
        console.log("Created and logged in");
      } catch(err: any) {
        console.error("Failed to create", err.message);
        return;
      }
    } else {
      console.error("Login failed", e.message);
      return;
    }
  }

  try {
    const q = query(collection(db, 'leads'));
    const s = await getDocs(q);
    console.log("Docs:", s.size);
  } catch(e: any) {
    console.error("Read failed:", e.message);
  }
}
run();
