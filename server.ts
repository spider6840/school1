import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, getDocs, serverTimestamp, updateDoc, doc, getDoc } from 'firebase/firestore';
import fs from 'fs';

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = initializeApp(firebaseConfig, 'server-app');
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

let lastSalesIndex = 0;

async function authenticateServer() {
  const email = 'server@local.host';
  const password = 'server_super_secret_password_123!';
  try {
    await signInWithEmailAndPassword(auth, email, password);
    console.log("Server authenticated as Admin.");
  } catch (e: any) {
    if (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password') {
       try {
         await createUserWithEmailAndPassword(auth, email, password);
         console.log("Server admin account created and authenticated.");
       } catch (err) {
         console.error("Failed to create server account:", err);
       }
    } else {
      console.error("Failed to authenticate server:", e);
    }
  }
}

async function startServer() {
  await authenticateServer();
  const server = express();
  server.use(express.json());
  const PORT = 3000;

  server.post("/api/leads", async (req, res) => {
    try {
      const data = req.body;
      const combinedPhone = data.phone; // Assuming full phone is passed from API
      
      if (!combinedPhone) {
         return res.status(400).json({ error: "Phone number is required." });
      }
      
      const q = query(collection(db, 'leads'), where('phone', '==', combinedPhone));
      const existing = await getDocs(q);

      // Fetch School settings for email
      let notificationEmails = '';
      if (data.schoolId) {
        const schoolDoc = await getDoc(doc(db, 'schools', data.schoolId));
        if (schoolDoc.exists()) {
           notificationEmails = schoolDoc.data().leadNotificationEmails || '';
        }
      }
      
      // Assign to sales
      const salesQuery = query(collection(db, 'users'), where('role', '==', 'sales'));
      const salesSnap = await getDocs(salesQuery);
      const salesUsers = salesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      let assignedSalesId = null;
      let assignedSalesName = null;
      if (salesUsers.length > 0) {
         lastSalesIndex = (lastSalesIndex + 1) % salesUsers.length;
         assignedSalesId = salesUsers[lastSalesIndex].id;
         assignedSalesName = (salesUsers[lastSalesIndex] as any).name;
      }
      
      const callDate = new Date();
      callDate.setHours(callDate.getHours() + 48); // 48 hours later
      
      const newAction = {
         type: 'Call',
         notes: `Scheduled API Follow-up Call. Assigned to: ${assignedSalesName || 'Unassigned'}`,
         date: callDate.toISOString(),
         assignedTo: assignedSalesId
      };
      
      if (!existing.empty) {
         // Duplicate phone -> update existing lead
         const leadDoc = existing.docs[0];
         const leadData = leadDoc.data();
         
         const updatedActions = [...(leadData.actions || []), newAction];
         await updateDoc(doc(db, 'leads', leadDoc.id), { 
           actions: updatedActions, 
           status: 'Contacted',
           source: 'API' // Or update an array of sources
         });
         
         // Mock Email Sending
         if (notificationEmails) {
           console.log(`[Email Service] Sent duplicate lead alert to configured recipients (${notificationEmails}) for phone ${combinedPhone}`);
         }
         
         return res.json({ success: true, message: "Lead already exists. Scheduled follow-up call.", leadId: leadDoc.id });
      }
      
      // Create new lead
      const newLead = await addDoc(collection(db, 'leads'), {
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        phone: combinedPhone,
        email: data.email || '',
        type: data.type || 'Agency',
        reason: data.reason || '',
        description: data.description || '',
        schoolId: data.schoolId || '',
        status: 'New',
        actions: [newAction],
        source: 'API',
        createdAt: serverTimestamp()
      });
      
      if (notificationEmails) {
        console.log(`[Email Service] Sent new lead alert to configured recipients (${notificationEmails}) for lead ${newLead.id}`);
      }

      return res.json({ success: true, message: "Lead created and follow-up scheduled.", leadId: newLead.id });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    server.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    server.use(express.static(distPath));
    server.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
