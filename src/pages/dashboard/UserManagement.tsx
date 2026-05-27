import { FormEvent, useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, setDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { db, auth } from '../../lib/firebase';
import firebaseConfig from '../../../firebase-applet-config.json';
import { handleFirestoreError, OperationType } from '../../lib/firestoreUtils';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { UserPlus, Search, Filter, MoreVertical, Shield, X, Eye, EyeOff, CheckCircle2, Edit } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const getSecondaryAuth = () => {
  const secondaryAppName = 'SecondaryAuth';
  const app = getApps().find(a => a.name === secondaryAppName) || initializeApp(firebaseConfig, secondaryAppName);
  return getAuth(app);
};

interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'superadmin' | 'admin' | 'teacher' | 'student' | 'parent';
  schoolId?: string;
  createdAt: any;
}

interface School {
  id: string;
  name: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student' as any,
    schoolId: ''
  });

  const { primaryColor } = useTheme();
  const { isAdmin, isSuperAdmin, user: adminUser } = useAuth();

  useEffect(() => {
    fetchUsers();
    fetchSchools();
  }, []);

  const fetchUsers = async () => {
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const userList = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setUsers(userList);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
    } finally {
      setLoading(false);
    }
  };

  const fetchSchools = async () => {
    try {
      const snap = await getDocs(collection(db, 'schools'));
      setSchools(snap.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
    } catch (e) {
      console.error('Error fetching schools', e);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', password: '', role: 'student', schoolId: '' });
  };

  const handleAddUser = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg('');
    
    try {
      const secondaryAuth = getSecondaryAuth();
      
      let uid: string;
      try {
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
        uid = userCredential.user.uid;
        await secondaryAuth.signOut();
      } catch (authErr: any) {
        if (authErr.code === 'auth/email-already-in-use') {
          throw new Error('This email is already registered. Have the user sign in once to auto-generate their profile, then you can manage their role here.');
        }
        throw authErr;
      }

      const profileData: any = {
        uid: uid,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      if (formData.schoolId) profileData.schoolId = formData.schoolId;

      await setDoc(doc(db, 'users', uid), profileData);

      if (formData.role === 'admin' || formData.role === 'superadmin') {
        await setDoc(doc(db, 'admins', uid), {
          email: formData.email,
          promotedBy: adminUser?.email,
          schoolId: formData.schoolId || null,
          createdAt: serverTimestamp()
        });
      }

      setSuccessMsg(`Successfully created ${formData.role} account for ${formData.name}`);
      fetchUsers();
      
      setTimeout(() => {
        setShowAddModal(false);
        setSuccessMsg('');
        resetForm();
      }, 2000);

    } catch (error: any) {
      alert(error.message);
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRole = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSubmitting(true);
    
    try {
      const updates: any = {
        role: formData.role,
        schoolId: formData.schoolId || null,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(doc(db, 'users', selectedUser.uid), updates);
      
      if (formData.role === 'admin' || formData.role === 'superadmin') {
        await setDoc(doc(db, 'admins', selectedUser.uid), {
          email: selectedUser.email,
          promotedBy: adminUser?.email,
          schoolId: formData.schoolId || null,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
      
      setShowEditModal(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (user: UserProfile) => {
    setSelectedUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '', // Leave blank when editing
      role: user.role,
      schoolId: user.schoolId || ''
    });
    setShowEditModal(true);
  };

  if (!isAdmin) return <div className="p-8 text-red-500 font-bold">Access Denied: Admin privileges required.</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h2>
          <p className="text-gray-500 dark:text-gray-400">Manage students, teachers, and staff admissions.</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-bold shadow-lg transition-all hover:brightness-110"
          style={{ backgroundColor: primaryColor }}
        >
          <UserPlus className="w-5 h-5" />
          Add New User
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name or email..."
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 outline-none focus:ring-2"
            style={{ '--tw-ring-color': primaryColor } as any}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50">
              <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Name</th>
              <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Email</th>
              <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Role</th>
              <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">School</th>
              <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-8 py-10 text-center text-gray-500">Loading users...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="px-8 py-10 text-center text-gray-500">No users found. Admissions are empty.</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.uid} className="border-t border-gray-50 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center font-bold text-blue-600">
                        {u.name?.charAt(0) || '?'}
                      </div>
                      <div className="font-bold text-gray-900 dark:text-white">{u.name}</div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-gray-600 dark:text-gray-400">{u.email}</td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      u.role === 'superadmin' ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/20' :
                      u.role === 'admin' ? 'bg-red-50 text-red-600 dark:bg-red-900/20' :
                      u.role === 'teacher' ? 'bg-green-50 text-green-600 dark:bg-green-900/20' :
                      'bg-blue-50 text-blue-600 dark:bg-blue-900/20'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-gray-500 text-sm">
                    {u.schoolId ? schools.find(s => s.id === u.schoolId)?.name || u.schoolId : '—'}
                  </td>
                  <td className="px-8 py-5 text-right flex items-center justify-end gap-2">
                    {isSuperAdmin && (
                      <button 
                        onClick={() => openEdit(u)}
                        className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Manage Role & School"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {(showAddModal || showEditModal) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="absolute inset-0 bg-black/60 backdrop-blur-sm"
               onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
             />
             <motion.div
               initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
               className="relative w-full max-w-xl bg-white dark:bg-gray-900 rounded-[2.5rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh]"
             >
                <button 
                  onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
                  className="absolute top-8 right-8 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-4 mb-8">
                   <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center" style={{ color: primaryColor }}>
                      {showEditModal ? <Edit className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
                   </div>
                   <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                     {showEditModal ? 'Edit User Details' : 'Register New Account'}
                   </h3>
                </div>

                {successMsg ? (
                  <div className="py-20 text-center animate-in fade-in zoom-in duration-500">
                    <div className="w-20 h-20 bg-green-500 rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-green-500/20">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Operation Complete</h4>
                    <p className="text-gray-500">{successMsg}</p>
                  </div>
                ) : (
                  <form onSubmit={showEditModal ? handleUpdateRole : handleAddUser} className="space-y-6">
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Full Name</label>
                      <input
                        type="text"
                        required
                        disabled={showEditModal}
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border-none outline-none disabled:opacity-50"
                        style={{ '--tw-ring-color': primaryColor } as any}
                      />
                    </div>
                    
                    {!showEditModal && (
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Email Address</label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border-none outline-none"
                        />
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Account Role</label>
                        <select
                          value={formData.role}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                          className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 outline-none appearance-none"
                          style={{ '--tw-ring-color': primaryColor } as any}
                        >
                          <option value="student">Student</option>
                          <option value="teacher">Teacher</option>
                          <option value="parent">Parent</option>
                          <option value="admin">School Admin</option>
                          {isSuperAdmin && <option value="superadmin">Super Admin</option>}
                        </select>
                      </div>

                      {formData.role !== 'superadmin' && schools.length > 0 && (
                        <div>
                          <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Assigned School</label>
                          <select
                            value={formData.schoolId}
                            onChange={(e) => setFormData({ ...formData, schoolId: e.target.value })}
                            className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 outline-none appearance-none"
                            style={{ '--tw-ring-color': primaryColor } as any}
                          >
                            <option value="">Select a school...</option>
                            {schools.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {!showEditModal && (
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Initial Password</label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            minLength={6}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 outline-none"
                            style={{ '--tw-ring-color': primaryColor } as any}
                          />
                          <button 
                            type="button" 
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                        <p className="mt-2 text-[10px] text-gray-400 italic">Minimum 6 characters required for Firebase security.</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full mt-6 py-4 rounded-2xl text-white font-bold shadow-xl transition-all hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {submitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : (showEditModal ? 'Save Details' : 'Create Account')}
                    </button>
                  </form>
                )}
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
