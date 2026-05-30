import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  role: 'superadmin' | 'admin' | 'teacher' | 'student' | 'parent' | null;
  userData: any | null;
  schoolId: string | null;
  schoolData: any | null;
  loading: boolean;
  login: () => Promise<void>;
  emailLogin: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'superadmin' | 'admin' | 'teacher' | 'student' | 'parent' | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schoolData, setSchoolData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Fetch user role from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            let data = userDoc.data();
            let currentRole = data.role;
            const superadminEmails = ['r.elmougali@addohaafrique.com', 'r.elmougali@edupro.com', 'rmougali@yahoo.fr'];
            const userEmail = user.email || '';
            
            // Auto-upgrade if they are hardcoded but stuck as admin/something else
            if (superadminEmails.includes(userEmail) && currentRole !== 'superadmin') {
              currentRole = 'superadmin';
              await setDoc(doc(db, 'users', user.uid), { role: 'superadmin', updatedAt: serverTimestamp() }, { merge: true });
              await setDoc(doc(db, 'admins', user.uid), { email: userEmail, promotedBy: 'system', updatedAt: serverTimestamp() }, { merge: true });
              data.role = 'superadmin';
            }
            
            setRole(currentRole);
            setUserData(data);
            setSchoolId(data.schoolId || null);
            
            if (data.schoolId) {
              const schoolDoc = await getDoc(doc(db, 'schools', data.schoolId));
              if (schoolDoc.exists()) setSchoolData(schoolDoc.data());
            } else if (currentRole === 'superadmin') {
              const genSet = await getDoc(doc(db, 'settings', 'general'));
              if (genSet.exists()) setSchoolData(genSet.data());
            }

          } else {
            // Auto-create Firestore profile if missing (e.g. created via Firebase Console)
            const superadminEmails = ['r.elmougali@addohaafrique.com', 'r.elmougali@edupro.com', 'rmougali@yahoo.fr'];
            const userEmail = user.email || '';
            const newRole = superadminEmails.includes(userEmail) ? 'superadmin' : 'student';

            const newUserData = {
              uid: user.uid, // Default
              name: user.displayName || userEmail.split('@')[0] || 'Unknown',
              email: userEmail,
              role: newRole,
              schoolId: null, // Default
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            };

            await setDoc(doc(db, 'users', user.uid), newUserData);

            if (newRole === 'superadmin') {
              await setDoc(doc(db, 'admins', user.uid), {
                email: userEmail,
                promotedBy: 'system',
                createdAt: serverTimestamp()
              });
              const genSet = await getDoc(doc(db, 'settings', 'general'));
              if (genSet.exists()) setSchoolData(genSet.data());
            }

            setRole(newRole);
            setUserData(newUserData);
            setSchoolId(null);
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          // Fallback role check
          const superadminEmails = ['r.elmougali@addohaafrique.com', 'r.elmougali@edupro.com', 'rmougali@yahoo.fr'];
          if (superadminEmails.includes(user.email || '')) {
            setRole('superadmin');
            const genSet = await getDoc(doc(db, 'settings', 'general'));
            if (genSet.exists()) setSchoolData(genSet.data());
          } else {
            setRole(null);
            setSchoolData(null);
          }
          setUserData(null);
          setSchoolId(null);
        }
      } else {
        setRole(null);
        setUserData(null);
        setSchoolId(null);
        setSchoolData(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const emailLogin = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      role, 
      userData,
      schoolId,
      schoolData,
      loading, 
      login, 
      emailLogin,
      logout,
      isAdmin: role === 'admin' || role === 'superadmin',
      isSuperAdmin: role === 'superadmin'
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
