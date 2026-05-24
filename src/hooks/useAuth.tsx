import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  role: 'superadmin' | 'admin' | 'teacher' | 'student' | 'parent' | null;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Fetch user role from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setRole(userDoc.data().role);
          } else {
            // Auto-create Firestore profile if missing (e.g. created via Firebase Console)
            const superadminEmails = ['r.elmougali@addohaafrique.com', 'r.elmougali@edupro.com', 'rmougali@yahoo.fr'];
            const userEmail = user.email || '';
            const newRole = superadminEmails.includes(userEmail) ? 'superadmin' : 'student';

            await setDoc(doc(db, 'users', user.uid), {
              uid: user.uid,
              name: user.displayName || userEmail.split('@')[0] || 'Unknown',
              email: userEmail,
              role: newRole,
              schoolId: null, // Default
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });

            if (newRole === 'superadmin') {
              await setDoc(doc(db, 'admins', user.uid), {
                email: userEmail,
                promotedBy: 'system',
                createdAt: serverTimestamp()
              });
            }

            setRole(newRole);
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          // Fallback role check
          const superadminEmails = ['r.elmougali@addohaafrique.com', 'r.elmougali@edupro.com', 'rmougali@yahoo.fr'];
          if (superadminEmails.includes(user.email || '')) {
            setRole('superadmin');
          } else {
            setRole(null);
          }
        }
      } else {
        setRole(null);
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
