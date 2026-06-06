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
  level?: 'nursery' | 'primary' | 'college' | 'high_school';
  prices?: {
    education: number;
    canteen: number;
    transport: number;
  };
}

export default function Classes() {
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassGroup | null>(null);
  
  const [name, setName] = useState('');
  const [level, setLevel] = useState<'nursery' | 'primary' | 'middle' | 'high'>('primary');

  const { primaryColor } = useTheme();
  const { isAdmin, schoolId } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    if (schoolId) {
      fetchClasses();
    }
  }, [schoolId]);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(query(collection(db, 'classes'), where('schoolId', '==', schoolId)));
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
    setEditingClass(null);
    setShowAdd(true);
  };

  const openEdit = (c: ClassGroup) => {
    setName(c.name);
    setLevel(c.level as any || 'primary');
    setEditingClass(c);
    setShowAdd(true);
  };

  const saveClass = async () => {
    if (!name.trim() || !schoolId) return;
    try {
      const classData = {
        name,
        schoolId,
        level,
        prices: {
          education: 0,
          canteen: 0,
          transport: 0
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
                     <span className="text-gray-500">{t('Education')}</span>
                     <span className="font-bold font-mono">${c.prices?.education || 0}</span>
                   </div>
                   <div className="flex justify-between text-sm">
                     <span className="text-gray-500">{t('Canteen')}</span>
                     <span className="font-bold font-mono">${c.prices?.canteen || 0}</span>
                   </div>
                   <div className="flex justify-between text-sm">
                     <span className="text-gray-500">{t('Transport')}</span>
                     <span className="font-bold font-mono">${c.prices?.transport || 0}</span>
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
