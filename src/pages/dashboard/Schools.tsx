import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Building, Plus, Search, Trash2, Edit } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';

interface School {
  id: string;
  name: string;
  address: string;
  contactEmail: string;
  logoUrl?: string;
  currency?: string;
  createdAt: any;
}

export default function Schools() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const { primaryColor } = useTheme();
  const { isSuperAdmin } = useAuth();
  
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'schools'));
      setSchools(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as School)));
    } catch (e: any) {
      console.error(e);
      alert('Error fetching schools: ' + (e.message || String(e)));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    try {
      await addDoc(collection(db, 'schools'), {
        name,
        address,
        contactEmail,
        logoUrl,
        currency,
        createdAt: serverTimestamp()
      });
      setName('');
      setAddress('');
      setContactEmail('');
      setLogoUrl('');
      setCurrency('USD');
      setShowAdd(false);
      fetchSchools();
    } catch (e: any) {
      console.error(e);
      alert('Error creating school: ' + (e.message || String(e)));
    }
  };

  const handleDelete = async (id: string) => {
    if (!isSuperAdmin || !window.confirm('Are you sure you want to delete this school?')) return;
    try {
      await deleteDoc(doc(db, 'schools', id));
      fetchSchools();
    } catch (e: any) {
      console.error(e);
      alert('Error deleting school: ' + (e.message || String(e)));
    }
  };

  if (!isSuperAdmin) {
    return <div className="p-8 text-center text-red-500">Access Denied. Superadmin only.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Schools Management</h1>
            <p className="text-gray-500 text-sm mt-1">Manage tenant schools</p>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full text-white font-medium shadow-lg transition-transform hover:scale-105 active:scale-95"
          style={{ backgroundColor: primaryColor }}
        >
          <Plus className="w-5 h-5" />
          Add School
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden"
          >
            <form onSubmit={handleCreate} className="p-8 space-y-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">School Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contact Email</label>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Logo</label>
                  <label className="flex items-center gap-2 cursor-pointer w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500 transition-all text-gray-500 overflow-hidden relative text-sm">
                    <span className="truncate">{logoUrl ? 'Logo Selected' : 'Choose an image...'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setLogoUrl(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                       className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900 dark:text-white"
                  >
                     <option value="USD">USD ($)</option>
                     <option value="EUR">EUR (€)</option>
                     <option value="MAD">MAD (DH)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-6 py-2.5 rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full text-white font-medium shadow-lg transition-transform hover:scale-105 active:scale-95"
                  style={{ backgroundColor: primaryColor }}
                >
                  Create School
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="md:col-span-2 lg:col-span-3 text-center py-12 text-gray-500">Loading schools...</div>
        ) : schools.length === 0 ? (
          <div className="md:col-span-2 lg:col-span-3 text-center py-12 text-gray-500 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
            No schools found. Create one to get started.
          </div>
        ) : (
          schools.map(school => (
            <div key={school.id} className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 overflow-hidden">
                  {school.logoUrl ? (
                    <img src={school.logoUrl} alt={school.name} className="w-full h-full object-cover" />
                  ) : (
                    <Building className="w-6 h-6" />
                  )}
                </div>
                <button onClick={() => handleDelete(school.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{school.name}</h3>
              <p className="text-sm text-gray-500 mt-1 truncate">{school.contactEmail}</p>
              <p className="text-xs text-gray-400 mt-1 truncate">{school.address || 'No address provided'}</p>
              <div className="mt-auto pt-4 flex gap-2">
                 <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-semibold rounded-full border border-gray-200 dark:border-gray-700">
                   ID: {school.id}
                 </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
