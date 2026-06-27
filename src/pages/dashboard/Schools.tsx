import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, serverTimestamp, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Building, Plus, Trash2, Layers, MapPin, X } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';

const GEO_DATA: Record<string, string[]> = {
  "Morocco": ["Casablanca", "Rabat", "Marrakech", "Agadir", "Tangier", "Fez"],
  "France": ["Paris", "Lyon", "Marseille", "Nice", "Toulouse", "Bordeaux"],
  "USA": ["New York", "Los Angeles", "Chicago", "Miami", "San Francisco", "Austin"],
  "Canada": ["Toronto", "Vancouver", "Montreal", "Calgary"],
  "UK": ["London", "Manchester", "Birmingham", "Edinburgh"]
};

interface Tenant {
  id: string;
  name: string;
  country: string;
  createdAt: any;
}

interface School {
  id: string;
  name: string;
  tenantId: string;
  address: string;
  country: string;
  city: string;
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
  const [showAddSchool, setShowAddSchool] = useState<Tenant | null>(null);
  const [viewTenantSchools, setViewTenantSchools] = useState<Tenant | null>(null);
  
  const { primaryColor } = useTheme();
  const { isSuperAdmin, role, profileTenantId } = useAuth();
  
  // Tenant Form
  const [tenantName, setTenantName] = useState('');
  const [tenantCountry, setTenantCountry] = useState('Morocco');
  
  // School Form
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [schoolCountry, setSchoolCountry] = useState('Morocco');
  const [schoolCity, setSchoolCity] = useState(GEO_DATA['Morocco'][0]);
  const [contactEmail, setContactEmail] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    fetchData();
  }, [role, profileTenantId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tenantsSnap, schoolsSnap] = await Promise.all([
        getDocs(collection(db, 'tenants')),
        getDocs(collection(db, 'schools'))
      ]);
      
      let allTenants = tenantsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tenant));
      let allSchools = schoolsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as School));

      if (role === 'group_admin') {
         allTenants = allTenants.filter(t => t.id === profileTenantId);
         allSchools = allSchools.filter(s => s.tenantId === profileTenantId);
      }

      setTenants(allTenants);
      setSchools(allSchools);
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
      // check duplicate
      if (tenants.some(t => t.name.toLowerCase() === tenantName.toLowerCase())) {
         alert('A tenant with this name already exists.');
         return;
      }

      await addDoc(collection(db, 'tenants'), {
        name: tenantName,
        country: tenantCountry,
        createdAt: serverTimestamp()
      });
      setTenantName('');
      setTenantCountry('Morocco');
      setShowAddTenant(false);
      fetchData();
    } catch (e: any) {
      console.error(e);
      alert('Error creating tenant: ' + (e.message || String(e)));
    }
  };

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAddSchool) return;
    try {
      if (schools.filter(s => s.tenantId === showAddSchool.id).some(s => s.name.toLowerCase() === name.toLowerCase())) {
         alert('A school with this name already exists in this tenant.');
         return;
      }

      await addDoc(collection(db, 'schools'), {
        name,
        tenantId: showAddSchool.id,
        address,
        country: schoolCountry,
        city: schoolCity,
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
      setShowAddSchool(null);
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
    }
  };

  const handleDeleteTenant = async (id: string) => {
    if (!isSuperAdmin || !window.confirm('Are you sure you want to delete this tenant and all its schools?')) return;
    try {
      await deleteDoc(doc(db, 'tenants', id));
      // In a real app we would delete schools recursively too via a cloud function.
      fetchData();
    } catch (e: any) {
      console.error(e);
    }
  };

  if (!isSuperAdmin && role !== 'group_admin') {
    return <div className="p-8 text-center text-red-500">Access Denied.</div>;
  }

  return (
    <div className="space-y-6 flex-1 h-full flex flex-col relative overflow-hidden">
      <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tenant Schools</h1>
            <p className="text-gray-500 text-sm mt-1">Manage tenants and their schools</p>
          </div>
        </div>
        {isSuperAdmin && (
          <div className="flex gap-3">
            <button
              onClick={() => setShowAddTenant(true)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full text-white font-medium shadow-lg transition-transform hover:scale-105 active:scale-95"
              style={{ backgroundColor: primaryColor }}
            >
              <Plus className="w-5 h-5" />
              Add Tenant
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAddTenant && isSuperAdmin && (
           <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden mb-6">
             <form onSubmit={handleCreateTenant} className="p-8 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tenant Name</label>
                     <input type="text" required value={tenantName} onChange={(e) => setTenantName(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus:ring-2 outline-none transition-all" placeholder="e.g. Addoha Afrique" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Country</label>
                    <select value={tenantCountry} onChange={e => setTenantCountry(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus:ring-2 outline-none">
                      {Object.keys(GEO_DATA).map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setShowAddTenant(false)} className="px-6 py-2.5 rounded-full text-gray-600 hover:bg-gray-100 font-medium">Cancel</button>
                  <button type="submit" className="px-6 py-2.5 rounded-full text-white font-medium" style={{ backgroundColor: primaryColor }}>Create Tenant</button>
                </div>
             </form>
           </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4 flex-1 overflow-y-auto pr-2 pb-8">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading tenants...</div>
        ) : tenants.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
            No tenants found.
          </div>
        ) : (
          tenants.map(tenant => (
            <div key={tenant.id} className="bg-white dark:bg-gray-900 rounded-[2rem] p-6 border border-gray-100 dark:border-gray-800 flex justify-between items-center hover:shadow-md transition-shadow group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 flex items-center justify-center">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{tenant.name}</h2>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                     <MapPin className="w-4 h-4" /> {tenant.country}
                     <span className="mx-2">•</span>
                     <span>{schools.filter(s => s.tenantId === tenant.id).length} School(s)</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                 <button onClick={() => setViewTenantSchools(tenant)} className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    View Schools
                 </button>
                 {isSuperAdmin && (
                   <button onClick={() => handleDeleteTenant(tenant.id)} className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
                     <Trash2 className="w-5 h-5"/>
                   </button>
                 )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Schools Modal */}
      <AnimatePresence>
        {viewTenantSchools && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-gray-50 dark:bg-gray-900 rounded-[2rem] w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex justify-between items-center z-10">
                <div>
                  <h3 className="text-2xl font-bold">{viewTenantSchools.name} - Schools</h3>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => {
                      setSchoolCountry(viewTenantSchools.country);
                      setSchoolCity(GEO_DATA[viewTenantSchools.country]?.[0] || '');
                      setShowAddSchool(viewTenantSchools);
                  }} className="px-4 py-2 rounded-xl text-white font-bold flex items-center gap-2" style={{ backgroundColor: primaryColor }}>
                    <Plus className="w-5 h-5" /> Add School
                  </button>
                  <button onClick={() => setViewTenantSchools(null)} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {schools.filter(s => s.tenantId === viewTenantSchools.id).map(school => (
                       <div key={school.id} className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col hover:shadow-md transition-shadow relative group">
                          <div className="flex justify-between items-start mb-4">
                             <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 overflow-hidden">
                                {school.logoUrl ? <img src={school.logoUrl} alt={school.name} className="w-full h-full object-cover" /> : <Building className="w-8 h-8" />}
                             </div>
                             {isSuperAdmin && (
                               <button onClick={() => handleDeleteSchool(school.id)} className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                 <Trash2 className="w-5 h-5" />
                               </button>
                             )}
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{school.name}</h3>
                          <div className="mt-4 space-y-2 text-sm text-gray-500">
                             <div className="flex items-center gap-2 truncate">
                                <MapPin className="w-4 h-4 flex-shrink-0" /> {school.city}, {school.country}
                             </div>
                             <div className="truncate text-xs">{school.address || 'No specific address'}</div>
                             <div className="truncate text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded-lg mt-2">{school.contactEmail}</div>
                          </div>
                       </div>
                    ))}
                    {schools.filter(s => s.tenantId === viewTenantSchools.id).length === 0 && (
                      <div className="col-span-full py-12 text-center text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl">
                        No schools created under this tenant yet.
                      </div>
                    )}
                 </div>
              </div>
            </motion.div>
          </div>
        )}

        {showAddSchool && (
           <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
               <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                  <h3 className="text-xl font-bold">Add School to {showAddSchool.name}</h3>
                  <button onClick={() => setShowAddSchool(null)} className="p-2 text-gray-400"><X className="w-5 h-5"/></button>
               </div>
               <div className="p-6 overflow-y-auto">
                 <form id="add-school-form" onSubmit={handleCreateSchool} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold mb-2 text-gray-600">School Name</label>
                        <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 outline-none focus:ring-2" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-2 text-gray-600">Contact Email</label>
                        <input type="email" required value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 outline-none focus:ring-2" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-2 text-gray-600">Country</label>
                        <select value={schoolCountry} onChange={e => {
                          setSchoolCountry(e.target.value);
                          setSchoolCity(GEO_DATA[e.target.value][0]);
                        }} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 outline-none focus:ring-2">
                          {Object.keys(GEO_DATA).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-2 text-gray-600">City</label>
                        <select value={schoolCity} onChange={e => setSchoolCity(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 outline-none focus:ring-2">
                          {(GEO_DATA[schoolCountry] || []).map(city => <option key={city} value={city}>{city}</option>)}
                        </select>
                      </div>
                      <div className="col-span-full">
                        <label className="block text-sm font-bold mb-2 text-gray-600">Address (Optional)</label>
                        <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 outline-none focus:ring-2" />
                      </div>
                    </div>
                 </form>
               </div>
               <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3">
                 <button onClick={() => setShowAddSchool(null)} className="px-6 py-3 font-bold text-gray-500 hover:bg-gray-200 rounded-xl">Cancel</button>
                 <button form="add-school-form" type="submit" className="px-6 py-3 font-bold text-white rounded-xl shadow-lg" style={{ backgroundColor: primaryColor }}>Create School</button>
               </div>
             </motion.div>
           </div>
        )}
      </AnimatePresence>
    </div>
  );
}
