import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig, 'test-app-2');
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  const email = 'server@local.host';
  const password = 'server_super_secret_password_123!';
  await signInWithEmailAndPassword(auth, email, password);
  
  try {
    const q1 = query(collection(db, 'users'), where('role', '==', 'sales'));
    await getDocs(q1);
    console.log("Q1 users passed");
  } catch(e: any) {
    console.error("Q1 users failed", e.message);
  }

  try {
    const q2 = query(collection(db, 'leads'), where('phone', '==', '+212 99999999'));
    await getDocs(q2);
    console.log("Q2 leads read passed");
  } catch(e: any) {
    console.error("Q2 leads read failed", e.message);
  }
  
  process.exit(0);
}
run();
