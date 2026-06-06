import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import { GraduationCap, User, Plus, Search, BookOpen, Edit } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface ClassGroup {
  id: string;
  name: string;
  schoolId: string;
  teacherId: string;
  level?: 'nursery' | 'primary' | 'middle' | 'high';
  seasons?: Record<string, {
    education?: number;
    canteen?: { full?: number; lunch?: number; breakfast?: number } | number;
    transport?: { round_trip?: number; morning?: number; return?: number } | number;
  }>;
}

export default function Classes() {
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassGroup | null>(null);
  
  const [name, setName] = useState('');
  const [level, setLevel] = useState<'nursery' | 'primary' | 'middle' | 'high'>('primary');
  
  const [currentSeason, setCurrentSeason] = useState('2025/2026');
  const [prices, setPrices] = useState<any>({
    education: 0,
    canteen: { full: 0, lunch: 0, breakfast: 0 },
    transport: { round_trip: 0, morning: 0, return: 0 }
  });

  const { primaryColor } = useTheme();
  const { isAdmin, role, schoolId, tenantId } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    if (schoolId || role === 'superadmin' || role === 'group_admin') {
      fetchClasses();
    }
  }, [schoolId, role]);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      let schoolIdsToFetch = schoolId ? [schoolId] : [];
      if (role === 'group_admin' && tenantId) {
        const sSnap = await getDocs(query(collection(db, 'schools'), where('tenantId', '==', tenantId)));
        schoolIdsToFetch = sSnap.docs.map(d => d.id);
      }
      
      if (role === 'group_admin' && schoolIdsToFetch.length === 0) {
         setClasses([]);
         return;
      }

      let clsQuery = collection(db, 'classes') as any;
      if (schoolId) clsQuery = query(clsQuery, where('schoolId', '==', schoolId));
      else if (role === 'group_admin') clsQuery = query(clsQuery, where('schoolId', 'in', schoolIdsToFetch.slice(0, 30)));
      
      const snap = await getDocs(clsQuery);
      setClasses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassGroup)));
    } catch (e: any) {
      console.error(e);
      alert('Error fetching classes: ' + (e.message || String(e)));
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setName('');
    setLevel('primary');
    setPrices({ education: 0, canteen: { full: 0, lunch: 0, breakfast: 0 }, transport: { round_trip: 0, morning: 0, return: 0 } });
    setEditingClass(null);
    setShowAdd(true);
  };

  const openEdit = (c: ClassGroup) => {
    setName(c.name);
    setLevel(c.level as any || 'primary');
    const seasonPrices = c.seasons?.[currentSeason] || { education: 0, canteen: { full: 0, lunch: 0, breakfast: 0 }, transport: { round_trip: 0, morning: 0, return: 0 } };
    
    // Normalize old flat formats to objects if they exist
    setPrices({
       education: seasonPrices.education || 0,
       canteen: typeof seasonPrices.canteen === 'object' ? seasonPrices.canteen : { full: Number(seasonPrices.canteen) || 0, lunch: 0, breakfast: 0 },
       transport: typeof seasonPrices.transport === 'object' ? seasonPrices.transport : { round_trip: Number(seasonPrices.transport) || 0, morning: 0, return: 0 },
    });
    setEditingClass(c);
    setShowAdd(true);
  };

  const saveClass = async () => {
    // Determine the working school ID for saving. Must be an admin/superadmin with context
    // If superadmin creates it, they'd ideally select a school, but we'll use schoolId if available
    if (!name.trim()) return;
    
    // Quick validation
    const targetSchoolId = editingClass?.schoolId || schoolId;
    if (!targetSchoolId) {
      alert("Please select a school context to create a class.");
      return;
    }

    try {
      const existingSeasons = editingClass?.seasons || {};
      
      const classData = {
        name,
        schoolId: targetSchoolId,
        level,
        seasons: {
          ...existingSeasons,
           [currentSeason]: prices
        }
      };

      if (editingClass) {
        await updateDoc(doc(db, 'classes', editingClass.id), {
          ...classData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'classes'), {
          ...classData,
          teacherId: '',
          studentIds: [],
          createdAt: serverTimestamp()
        });
      }
      setShowAdd(false);
      fetchClasses();
    } catch (e: any) {
      console.error(e);
      alert('Error saving class: ' + e.message);
    }
  };

  if (!isAdmin) return <div className="p-8">Access Denied</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Class Management')}</h2>
          <p className="text-gray-500 dark:text-gray-400">{t('Organize your school into groups and classes.')}</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-bold shadow-lg hover:scale-105 active:scale-95 transition-transform"
          style={{ backgroundColor: primaryColor }}
        >
          <Plus className="w-5 h-5" />
          {t('Create Class')}
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">{t('Loading...')}</div>
      ) : classes.length === 0 ? (
        <div className="p-8 text-center text-gray-500">{t('No classes found.')}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map(c => (
            <div key={c.id} className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm relative group overflow-hidden">
               <div className="flex justify-between items-start mb-6 relative z-10">
                 <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center" style={{ color: primaryColor }}>
                    <BookOpen className="w-8 h-8" />
                 </div>
                 <button onClick={() => openEdit(c)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors opacity-0 group-hover:opacity-100">
                   <Edit className="w-5 h-5" />
                 </button>
               </div>
               
               <div className="relative z-10">
                 <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{c.name}</h3>
                 <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 mb-4">
                   {c.level ? t(c.level) : t('Uncategorized')}
                 </span>
                 
                 <div className="space-y-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                   <div className="flex justify-between text-sm">
                     <span className="text-gray-500">{t('Season')}</span>
                     <span className="font-bold font-mono">{currentSeason}</span>
                   </div>
                   <div className="flex justify-between text-sm">
                     <span className="text-gray-500">{t('Education')}</span>
                     <span className="font-bold font-mono">${c.seasons?.[currentSeason]?.education || 0}</span>
                   </div>
                   <div className="flex justify-between text-sm">
                     <span className="text-gray-500">{t('Canteen (Full)')}</span>
                     <span className="font-bold font-mono">${typeof c.seasons?.[currentSeason]?.canteen === 'object' ? (c.seasons?.[currentSeason]?.canteen as any)?.full : (c.seasons?.[currentSeason]?.canteen || 0)}</span>
                   </div>
                   <div className="flex justify-between text-sm">
                     <span className="text-gray-500">{t('Transport (RT)')}</span>
                     <span className="font-bold font-mono">${typeof c.seasons?.[currentSeason]?.transport === 'object' ? (c.seasons?.[currentSeason]?.transport as any)?.round_trip : (c.seasons?.[currentSeason]?.transport || 0)}</span>
                   </div>
                 </div>
               </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-gray-900 rounded-[2rem] w-full max-w-lg shadow-xl overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {editingClass ? t('Edit Class') : t('New Class')}
                  </h3>
                </div>
                
                <div className="p-8 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('Class Name')}</label>
                    <input 
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 outline-none shadow-inner border border-transparent focus:border-gray-200 dark:focus:border-gray-700"
                      placeholder="e.g. Mathematics 101"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('Level')}</label>
                    <select 
                      value={level} 
                      onChange={(e) => setLevel(e.target.value as any)}
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 outline-none shadow-inner appearance-none border border-transparent focus:border-gray-200 dark:focus:border-gray-700"
                    >
                      <option value="nursery">{t('Nursery')}</option>
                      <option value="primary">{t('Primary')}</option>
                      <option value="middle">{t('Middle School')}</option>
                      <option value="high">{t('High School')}</option>
                    </select>
                  </div>

                  <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-gray-900 dark:text-white">{t('Class Services Prices')}</h4>
                      <input 
                        type="text" 
                        value={currentSeason} 
                        onChange={(e) => setCurrentSeason(e.target.value)} 
                        className="w-32 px-3 py-1 rounded bg-gray-50 dark:bg-gray-800 border-none outline-none text-sm text-right font-bold" 
                        placeholder="e.g. 2025/2026"
                      />
                    </div>
                    
                    <div className="space-y-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{t('Education')}</label>
                        <input type="number" min="0" value={prices.education} onChange={e => setPrices({...prices, education: Number(e.target.value)})} className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none" />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{t('Canteen')}</label>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <span className="text-[10px] text-gray-400 block mb-1">{t('Full Meals')}</span>
                            <input type="number" min="0" value={prices.canteen.full} onChange={e => setPrices({...prices, canteen: { ...prices.canteen, full: Number(e.target.value) }})} className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none" />
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 block mb-1">{t('Lunch')}</span>
                            <input type="number" min="0" value={prices.canteen.lunch} onChange={e => setPrices({...prices, canteen: { ...prices.canteen, lunch: Number(e.target.value) }})} className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none" />
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 block mb-1">{t('Breakfast')}</span>
                            <input type="number" min="0" value={prices.canteen.breakfast} onChange={e => setPrices({...prices, canteen: { ...prices.canteen, breakfast: Number(e.target.value) }})} className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none" />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{t('Transport')}</label>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <span className="text-[10px] text-gray-400 block mb-1">{t('Round Trip')}</span>
                            <input type="number" min="0" value={prices.transport.round_trip} onChange={e => setPrices({...prices, transport: { ...prices.transport, round_trip: Number(e.target.value) }})} className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none" />
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 block mb-1">{t('Morning')}</span>
                            <input type="number" min="0" value={prices.transport.morning} onChange={e => setPrices({...prices, transport: { ...prices.transport, morning: Number(e.target.value) }})} className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none" />
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 block mb-1">{t('Return')}</span>
                            <input type="number" min="0" value={prices.transport.return} onChange={e => setPrices({...prices, transport: { ...prices.transport, return: Number(e.target.value) }})} className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 flex gap-4">
                   <button onClick={() => setShowAdd(false)} className="flex-1 py-3 font-bold text-gray-500 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700">{t('Cancel')}</button>
                   <button onClick={saveClass} className="flex-1 py-3 rounded-xl text-white font-bold shadow-md hover:opacity-90" style={{ backgroundColor: primaryColor }}>{editingClass ? t('Save Changes') : t('Create')}</button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
