import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import config from './firebase-applet-config.json' with { type: 'json' };

initializeApp({
  projectId: config.projectId,
});

const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true, databaseId: config.firestoreDatabaseId });

async function run() {
  try {
    const snap = await db.collection('leads').limit(1).get();
    console.log("Success! Docs:", snap.size);
  } catch(e: any) {
    console.error("Error:", e.message);
  }
}
run();
