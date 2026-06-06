import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, serverTimestamp, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Building, Plus, Trash2, Layers } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';

interface Tenant {
  id: string;
  name: string;
  createdAt: any;
}

interface School {
  id: string;
  name: string;
  tenantId?: string;
  address: string;
  contactEmail: string;
  logoUrl?: string;
  currency?: string;
  createdAt: any;
}

export default function Schools() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showAddTenant, setShowAddTenant] = useState(false);
  const [showAddSchool, setShowAddSchool] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  
  const { primaryColor } = useTheme();
  const { isSuperAdmin } = useAuth();
  
  // Forms
  const [tenantName, setTenantName] = useState('');
  
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [tenantId, setTenantId] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tenantsSnap, schoolsSnap] = await Promise.all([
        getDocs(collection(db, 'tenants')),
        getDocs(collection(db, 'schools'))
      ]);
      setTenants(tenantsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tenant)));
      setSchools(schoolsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as School)));
    } catch (e: any) {
      console.error(e);
      alert('Error fetching data: ' + (e.message || String(e)));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    try {
      await addDoc(collection(db, 'tenants'), {
        name: tenantName,
        createdAt: serverTimestamp()
      });
      setTenantName('');
      setShowAddTenant(false);
      fetchData();
    } catch (e: any) {
      console.error(e);
      alert('Error creating group: ' + (e.message || String(e)));
    }
  };

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    try {
      await addDoc(collection(db, 'schools'), {
        name,
        tenantId,
        address,
        contactEmail,
        logoUrl,
        currency,
        createdAt: serverTimestamp()
      });
      setName('');
      setTenantId('');
      setAddress('');
      setContactEmail('');
      setLogoUrl('');
      setCurrency('USD');
      setShowAddSchool(false);
      fetchData();
    } catch (e: any) {
      console.error(e);
      alert('Error creating school: ' + (e.message || String(e)));
    }
  };

  const handleDeleteSchool = async (id: string) => {
    if (!isSuperAdmin || !window.confirm('Are you sure you want to delete this school?')) return;
    try {
      await deleteDoc(doc(db, 'schools', id));
      fetchData();
    } catch (e: any) {
      console.error(e);
      alert('Error deleting school: ' + (e.message || String(e)));
    }
  };

  const handleDeleteTenant = async (id: string) => {
    if (!isSuperAdmin || !window.confirm('Are you sure you want to delete this group? Schools inside will become independent.')) return;
    try {
      await deleteDoc(doc(db, 'tenants', id));
      fetchData();
    } catch (e: any) {
      console.error(e);
      alert('Error deleting group: ' + (e.message || String(e)));
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
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Groups & Schools</h1>
            <p className="text-gray-500 text-sm mt-1">Manage school groups and tenants</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddTenant(true)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full text-gray-600 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Group
          </button>
          <button
            onClick={() => { setTenantId(''); setShowAddSchool(true); }}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full text-white font-medium shadow-lg transition-transform hover:scale-105 active:scale-95"
            style={{ backgroundColor: primaryColor }}
          >
            <Plus className="w-5 h-5" />
            Add School
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showAddTenant && (
           <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden mb-6">
             <form onSubmit={handleCreateTenant} className="p-8 space-y-6">
                <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">School Group Name</label>
                   <input type="text" required value={tenantName} onChange={(e) => setTenantName(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900 dark:text-white" placeholder="e.g. Addoha Afrique" />
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setShowAddTenant(false)} className="px-6 py-2.5 rounded-full text-gray-600 hover:bg-gray-100">Cancel</button>
                  <button type="submit" className="px-6 py-2.5 rounded-full text-white font-medium" style={{ backgroundColor: primaryColor }}>Create Group</button>
                </div>
             </form>
           </motion.div>
        )}

        {showAddSchool && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden"
          >
            <form onSubmit={handleCreateSchool} className="p-8 space-y-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">School Group (Optional)</label>
                  <select
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900 dark:text-white"
                  >
                    <option value="">-- Independent School --</option>
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
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
                  onClick={() => setShowAddSchool(false)}
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

      <div className="space-y-8">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading groups & schools...</div>
        ) : (
          <>
            {/* Display grouped schools */}
            {tenants.map(tenant => (
              <div key={tenant.id} className="bg-gray-50 dark:bg-gray-800/30 rounded-[2.5rem] p-6 sm:p-8 border border-gray-200 dark:border-gray-800">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                      <Layers className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{tenant.name}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setTenantId(tenant.id); setShowAddSchool(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-sm px-4 py-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 rounded-full shadow-sm font-medium hover:bg-gray-50">+ Add School</button>
                    <button onClick={() => handleDeleteTenant(tenant.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-full transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {schools.filter(s => s.tenantId === tenant.id).map(school => (
                    <div key={school.id} className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 overflow-hidden">
                          {school.logoUrl ? (
                            <img src={school.logoUrl} alt={school.name} className="w-full h-full object-cover" />
                          ) : (
                            <Building className="w-6 h-6" />
                          )}
                        </div>
                        <button onClick={() => handleDeleteSchool(school.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">{school.name}</h3>
                      <p className="text-sm text-gray-500 mt-1 truncate">{school.contactEmail}</p>
                      <p className="text-xs text-gray-400 mt-1 truncate">{school.address || 'No address provided'}</p>
                    </div>
                  ))}
                  {schools.filter(s => s.tenantId === tenant.id).length === 0 && (
                    <div className="col-span-full py-6 text-center text-gray-400 text-sm">No schools in this group yet.</div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Display independent schools */}
            {schools.filter(s => !s.tenantId).length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800/30 rounded-[2.5rem] p-6 sm:p-8 border border-gray-200 dark:border-gray-800">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center">
                      <Building className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Independent Schools</h2>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {schools.filter(s => !s.tenantId).map(school => (
                    <div key={school.id} className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 overflow-hidden">
                          {school.logoUrl ? (
                            <img src={school.logoUrl} alt={school.name} className="w-full h-full object-cover" />
                          ) : (
                            <Building className="w-6 h-6" />
                          )}
                        </div>
                        <button onClick={() => handleDeleteSchool(school.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">{school.name}</h3>
                      <p className="text-sm text-gray-500 mt-1 truncate">{school.contactEmail}</p>
                      <p className="text-xs text-gray-400 mt-1 truncate">{school.address || 'No address provided'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {tenants.length === 0 && schools.length === 0 && (
              <div className="text-center py-12 text-gray-500 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
                No groups or schools found. Create a group or an independent school to get started.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
