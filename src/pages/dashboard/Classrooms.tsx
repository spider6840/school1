import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import { Plus, Edit, Home, Monitor, Square, Hash } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface Classroom {
  id: string;
  name: string;
  schoolId: string;
  floor: string;
  area: number;
  capacity: number; // places/tables
  windowsCount: number;
  computersCount: number;
  boardType: 'simple' | 'smart' | 'none';
  type: 'general' | 'music' | 'painting' | 'laboratory' | 'computer_lab' | 'sports';
}

export default function Classrooms() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingRow, setEditingRow] = useState<Classroom | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    floor: '0',
    area: 0,
    capacity: 20,
    windowsCount: 2,
    computersCount: 0,
    boardType: 'simple' as any,
    type: 'general' as any
  });

  const { theme, primaryColor } = useTheme();
  const { schoolId, role, tenantId, isAdmin } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    if (schoolId || role === 'superadmin' || role === 'group_admin') {
      fetchClassrooms();
    }
  }, [schoolId, role]);

  const fetchClassrooms = async () => {
    try {
      setLoading(true);
      let schoolIdsToFetch = schoolId ? [schoolId] : [];
      if (role === 'group_admin' && tenantId) {
        const sSnap = await getDocs(query(collection(db, 'schools'), where('tenantId', '==', tenantId)));
        schoolIdsToFetch = sSnap.docs.map(d => d.id);
      }

      if (role === 'group_admin' && schoolIdsToFetch.length === 0) {
        setClassrooms([]);
        return;
      }

      let q = collection(db, 'classrooms') as any;
      if (schoolId) q = query(q, where('schoolId', '==', schoolId));
      else if (role === 'group_admin') q = query(q, where('schoolId', 'in', schoolIdsToFetch.slice(0, 30)));

      const snap = await getDocs(q);
      setClassrooms(snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Classroom)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const saveClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetSchoolId = editingRow?.schoolId || schoolId;
    if (!targetSchoolId) {
      alert("Please select a school context.");
      return;
    }

    try {
      const payload = {
        ...formData,
        schoolId: targetSchoolId,
        updatedAt: serverTimestamp()
      };

      if (editingRow) {
        await updateDoc(doc(db, 'classrooms', editingRow.id), payload);
      } else {
        await addDoc(collection(db, 'classrooms'), { ...payload, createdAt: serverTimestamp() });
      }

      setShowAdd(false);
      fetchClassrooms();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const openAdd = () => {
    setFormData({ name: '', floor: '0', area: 0, capacity: 20, windowsCount: 2, computersCount: 0, boardType: 'simple', type: 'general' });
    setEditingRow(null);
    setShowAdd(true);
  };

  const openEdit = (c: Classroom) => {
    setFormData({
      name: c.name,
      floor: c.floor,
      area: c.area || 0,
      capacity: c.capacity || 0,
      windowsCount: c.windowsCount || 0,
      computersCount: c.computersCount || 0,
      boardType: c.boardType || 'simple',
      type: c.type || 'general'
    });
    setEditingRow(c);
    setShowAdd(true);
  };

  if (!isAdmin) return <div className="p-8">Access Denied</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Classrooms')}</h2>
          <p className="text-gray-500 mt-1">{t('Manage physical spaces and facilities.')}</p>
        </div>
        <button onClick={openAdd} className="px-5 py-2.5 rounded-xl text-white font-medium flex items-center gap-2 shadow-lg" style={{ backgroundColor: primaryColor }}>
          <Plus className="w-5 h-5" /> {t('Add Classroom')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? <div className="p-4">{t('Loading...')}</div> : classrooms.map(c => (
          <div key={c.id} className="bg-white dark:bg-gray-900 rounded-[2rem] p-6 border border-gray-100 dark:border-gray-800 shadow-sm relative group overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                 <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 flex items-center justify-center">
                    <Home className="w-6 h-6" />
                 </div>
                 <div>
                   <h3 className="font-bold text-lg text-gray-900 dark:text-white">{c.name}</h3>
                   <div className="text-xs text-gray-500">{t('Floor')}: {c.floor}</div>
                 </div>
              </div>
              <button onClick={() => openEdit(c)} className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-gray-700 transition">
                <Edit className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
               <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl flex items-center gap-2">
                  <Hash className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">{t('Capacity')}</div>
                    <div className="font-bold">{c.capacity} {t('seats')}</div>
                  </div>
               </div>
               <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl flex items-center gap-2">
                  <Square className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">{t('Area')}</div>
                    <div className="font-bold">{c.area} m²</div>
                  </div>
               </div>
               <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">{t('Computers')}</div>
                    <div className="font-bold">{c.computersCount}</div>
                  </div>
               </div>
               <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl flex items-center gap-2">
                  <div className="w-4 h-4 rounded-sm border-2 border-gray-400" />
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">{t('Board')}</div>
                    <div className="font-bold text-sm capitalize">{c.boardType}</div>
                  </div>
               </div>
            </div>
            <div className="mt-4 inline-block px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-full text-xs font-bold uppercase tracking-wider">
              {c.type}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-gray-900 rounded-[2rem] w-full max-w-2xl shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto">
               <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                 <h3 className="text-xl font-bold">{editingRow ? t('Edit Classroom') : t('New Classroom')}</h3>
               </div>
               <form onSubmit={saveClassroom} className="p-6 space-y-6">
                 <div className="grid md:grid-cols-2 gap-6">
                   <div>
                     <label className="block text-sm font-medium mb-2">{t('Name')}</label>
                     <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" placeholder="e.g. Room 101" />
                   </div>
                   <div>
                     <label className="block text-sm font-medium mb-2">{t('Floor')}</label>
                     <input type="text" required value={formData.floor} onChange={e => setFormData({...formData, floor: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" />
                   </div>
                   <div>
                     <label className="block text-sm font-medium mb-2">{t('Area')} (m²)</label>
                     <input type="number" min="0" value={formData.area} onChange={e => setFormData({...formData, area: Number(e.target.value)})} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" />
                   </div>
                   <div>
                     <label className="block text-sm font-medium mb-2">{t('Capacity (Seats/Tables)')}</label>
                     <input type="number" min="0" value={formData.capacity} onChange={e => setFormData({...formData, capacity: Number(e.target.value)})} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" />
                   </div>
                   <div>
                     <label className="block text-sm font-medium mb-2">{t('Windows Count')}</label>
                     <input type="number" min="0" value={formData.windowsCount} onChange={e => setFormData({...formData, windowsCount: Number(e.target.value)})} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" />
                   </div>
                   <div>
                     <label className="block text-sm font-medium mb-2">{t('Computers Count')}</label>
                     <input type="number" min="0" value={formData.computersCount} onChange={e => setFormData({...formData, computersCount: Number(e.target.value)})} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" />
                   </div>
                   <div>
                     <label className="block text-sm font-medium mb-2">{t('Board Type')}</label>
                     <select value={formData.boardType} onChange={e => setFormData({...formData, boardType: e.target.value as any})} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                       <option value="simple">Simple Board</option>
                       <option value="smart">Smart Display</option>
                       <option value="none">None</option>
                     </select>
                   </div>
                   <div>
                     <label className="block text-sm font-medium mb-2">{t('Room Type')}</label>
                     <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                       <option value="general">General Purpose</option>
                       <option value="music">Music</option>
                       <option value="painting">Painting / Art</option>
                       <option value="laboratory">Science Lab</option>
                       <option value="computer_lab">Computer Lab</option>
                       <option value="sports">Sports Hall</option>
                     </select>
                   </div>
                 </div>
                 <div className="flex gap-4 pt-6 border-t border-gray-100 dark:border-gray-800">
                   <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl font-bold">{t('Cancel')}</button>
                   <button type="submit" className="flex-1 py-3 text-white rounded-xl font-bold" style={{ backgroundColor: primaryColor }}>{editingRow ? t('Save') : t('Create')}</button>
                 </div>
               </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
