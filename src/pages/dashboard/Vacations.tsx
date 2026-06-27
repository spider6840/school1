import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import { Plus, X, Calendar, Edit, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface Vacation {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  schoolId: string;
  season: string;
}

export default function Vacations() {
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [currentSeason, setCurrentSeason] = useState('2025/2026');

  const [formData, setFormData] = useState<Partial<Vacation>>({
    name: '',
    startDate: '',
    endDate: ''
  });

  const { primaryColor } = useTheme();
  const { schoolId, role, tenantId, isAdmin } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    if (schoolId || role === 'superadmin' || role === 'group_admin') {
      fetchVacations();
    }
  }, [schoolId, role, currentSeason]);

  const fetchVacations = async () => {
    try {
      setLoading(true);
      let schoolIdsToFetch = schoolId ? [schoolId] : [];
      if (role === 'group_admin' && tenantId) {
        const sSnap = await getDocs(query(collection(db, 'schools'), where('tenantId', '==', tenantId)));
        schoolIdsToFetch = sSnap.docs.map(d => d.id);
      }

      if (role === 'group_admin' && schoolIdsToFetch.length === 0) {
        setVacations([]);
        return;
      }

      let q = collection(db, 'vacations') as any;
      if (schoolId) q = query(q, where('schoolId', '==', schoolId));
      else if (role === 'group_admin') q = query(q, where('schoolId', 'in', schoolIdsToFetch.slice(0, 30)));
      
      q = query(q, where('season', '==', currentSeason));

      const snap = await getDocs(q);
      setVacations(snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Vacation)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const saveVacation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    
    // Fallback if superadmin doesn't have a schoolId set. Just for simplicity, we require a schoolId context.
    if (!schoolId && role !== 'group_admin') {
      alert("Please select a school context first.");
      return;
    }
    
    // For group_admin, if they don't have a specific school selected, we could save it at tenant level,
    // but schema says schoolId. Let's just use schoolId. Wait, if group_admin, we should let them pick a school
    // or just assume we're in a school context. For simplicity, we just use schoolId or the first school they manage.
    let targetId = schoolId;
    if (!targetId && role === 'group_admin' && tenantId) {
      const sSnap = await getDocs(query(collection(db, 'schools'), where('tenantId', '==', tenantId)));
      if (!sSnap.empty) targetId = sSnap.docs[0].id;
    }

    if (!targetId) return;

    try {
      await addDoc(collection(db, 'vacations'), {
        ...formData,
        season: currentSeason,
        schoolId: targetId,
        createdAt: serverTimestamp()
      });
      setShowAdd(false);
      setFormData({ name: '', startDate: '', endDate: '' });
      fetchVacations();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const deleteVacation = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm(t('Remove this vacation?'))) return;
    try {
       await deleteDoc(doc(db, 'vacations', id));
       fetchVacations();
    } catch(e) {
       console.error(e);
    }
  };

  return (
    <div className="space-y-6 flex-1 min-h-full">
      <div className="flex flex-col md:flex-row justify-between md:items-center bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Vacations & Holidays')}</h2>
          <p className="text-gray-500 mt-1">{t('Configure known vacation days and public holidays.')}</p>
        </div>
        <div className="flex gap-4 items-center">
           <input 
             type="text" 
             value={currentSeason} 
             onChange={(e) => setCurrentSeason(e.target.value)} 
             className="w-32 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-mono text-center font-bold" 
             placeholder="Season"
           />
           {isAdmin && (
             <button onClick={() => setShowAdd(true)} className="px-5 py-2.5 rounded-xl text-white font-medium flex items-center gap-2 shadow-lg" style={{ backgroundColor: primaryColor }}>
               <Plus className="w-5 h-5" /> {t('Add Holiday')}
             </button>
           )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 p-1 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm min-h-[400px]">
        {loading ? (
          <div className="p-12 text-center text-gray-500">{t('Loading...')}</div>
        ) : vacations.length === 0 ? (
          <div className="p-12 text-center text-gray-400 flex flex-col items-center">
            <Calendar className="w-16 h-16 mb-4 opacity-20" />
            <p>{t('No holidays configured for this season.')}</p>
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vacations.sort((a,b) => a.startDate.localeCompare(b.startDate)).map(v => (
              <div key={v.id} className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 flex flex-col justify-between group relative">
                <div>
                  <h3 className="font-bold text-lg mb-2 text-gray-800 dark:text-gray-100 pr-6">{v.name}</h3>
                  <div className="text-sm text-gray-500 flex flex-col gap-1">
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"/> {t('Start')}: <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{v.startDate}</span></div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"/> {t('End')}: <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{v.endDate}</span></div>
                  </div>
                </div>
                {isAdmin && (
                  <button onClick={() => deleteVacation(v.id)} className="absolute top-4 right-4 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-gray-900 rounded-[2rem] w-full max-w-sm shadow-xl overflow-hidden">
               <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                 <h3 className="text-xl font-bold">{t('Add Holiday')}</h3>
                 <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
               </div>
               
               <form onSubmit={saveVacation} className="p-6 space-y-4">
                 <div>
                   <label className="block text-sm font-medium mb-2">{t('Name/Title')}</label>
                   <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" placeholder="e.g. Winter Break" />
                 </div>
                 <div>
                   <label className="block text-sm font-medium mb-2">{t('Start Date')}</label>
                   <input type="date" required value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" />
                 </div>
                 <div>
                   <label className="block text-sm font-medium mb-2">{t('End Date')}</label>
                   <input type="date" required value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" />
                 </div>

                 <div className="pt-4 mt-2">
                   <button type="submit" className="w-full py-3 text-white rounded-xl font-bold shadow-lg" style={{ backgroundColor: primaryColor }}>{t('Save Holiday')}</button>
                 </div>
               </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
