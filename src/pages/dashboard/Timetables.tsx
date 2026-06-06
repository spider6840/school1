import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import { Calendar, Plus, Clock, MapPin, Search, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface TimetableSlot {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  classroomId: string;
  dayOfWeek: number; // 0=Sunday, 1=Monday... 6=Saturday
  startTime: string; // "08:00"
  endTime: string; // "10:00"
  season: string;
  schoolId: string;
  tenantId?: string;
}

export default function Timetables() {
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [currentSeason, setCurrentSeason] = useState('2025/2026');
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  const [formData, setFormData] = useState<Partial<TimetableSlot>>({
    classId: '',
    subjectId: '',
    teacherId: '',
    classroomId: '',
    dayOfWeek: 1,
    startTime: '08:00',
    endTime: '10:00'
  });
  
  const [conflictError, setConflictError] = useState('');

  const { theme, primaryColor } = useTheme();
  const { schoolId, role, tenantId, isAdmin } = useAuth();
  const { t } = useLanguage();

  const days = [t('Sunday'), t('Monday'), t('Tuesday'), t('Wednesday'), t('Thursday'), t('Friday'), t(' शनिवार')]; // Simple array

  useEffect(() => {
    if (schoolId || role === 'superadmin' || role === 'group_admin') {
      fetchData();
    }
  }, [schoolId, role, currentSeason, selectedClassId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      let schoolIdsToFetch = schoolId ? [schoolId] : [];
      if (role === 'group_admin' && tenantId) {
        const sSnap = await getDocs(query(collection(db, 'schools'), where('tenantId', '==', tenantId)));
        schoolIdsToFetch = sSnap.docs.map(d => d.id);
      }

      if (role === 'group_admin' && schoolIdsToFetch.length === 0) {
        setSlots([]); setClasses([]); setSubjects([]); setTeachers([]); setClassrooms([]);
        return;
      }

      const qSchoolIds = schoolIdsToFetch.length > 0 ? schoolIdsToFetch.slice(0, 30) : [];
      const baseQuery = (colName: string) => {
        let q = collection(db, colName) as any;
        if (schoolId) q = query(q, where('schoolId', '==', schoolId));
        else if (role === 'group_admin') q = query(q, where('schoolId', 'in', qSchoolIds));
        return q;
      };

      const [clsSnap, subSnap, tchSnap, rumSnap] = await Promise.all([
        getDocs(baseQuery('classes')),
        getDocs(baseQuery('subjects')),
        getDocs(query(collection(db, 'users'), where('role', '==', 'teacher'))),
        getDocs(baseQuery('classrooms'))
      ]);

      const cls = clsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setClasses(cls);
      setSubjects(subSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      // Filter teachers properly
      let tchRecords = tchSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (schoolId) tchRecords = tchRecords.filter((t: any) => t.schoolId === schoolId);
      if (role === 'group_admin') tchRecords = tchRecords.filter((t: any) => qSchoolIds.includes(t.schoolId));
      setTeachers(tchRecords);
      
      setClassrooms(rumSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      if (selectedClassId) {
        let slotQ = query(collection(db, 'timetables'), 
          where('classId', '==', selectedClassId),
          where('season', '==', currentSeason)
        );
        const sltSnap = await getDocs(slotQ);
        setSlots(sltSnap.docs.map(d => ({ id: d.id, ...d.data() } as TimetableSlot)));
      } else {
        setSlots([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const checkConflicts = async (data: Partial<TimetableSlot>) => {
    // Basic conflict check
    const qSlot = query(collection(db, 'timetables'), 
      where('season', '==', currentSeason),
      where('dayOfWeek', '==', data.dayOfWeek!)
    );
    const snap = await getDocs(qSlot);
    const sameDaySlots = snap.docs.map(d => ({ id: d.id, ...d.data() } as TimetableSlot));
    
    for (const slot of sameDaySlots) {
       // if time overlaps
       if (slot.startTime < data.endTime! && data.startTime! < slot.endTime) {
         if (slot.classroomId === data.classroomId) {
           return "Conflict: Classroom is already booked for this time block.";
         }
         if (slot.teacherId === data.teacherId) {
           return "Conflict: Teacher is already assigned to a class for this time block.";
         }
         if (slot.classId === data.classId) {
           return "Conflict: Class already has a course scheduled during this time.";
         }
       }
    }
    return null;
  };

  const saveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setConflictError('');

    if (!selectedClassId) {
      setConflictError('Please select a class context.');
      return;
    }

    const targetSchoolId = classes.find(c => c.id === selectedClassId)?.schoolId || schoolId;
    if (!targetSchoolId) return;

    const payload = {
      ...formData,
      classId: selectedClassId,
      season: currentSeason,
      schoolId: targetSchoolId
    };

    const conflict = await checkConflicts(payload);
    if (conflict) {
      setConflictError(conflict);
      return;
    }

    try {
      await addDoc(collection(db, 'timetables'), { ...payload, createdAt: serverTimestamp() });
      setShowAdd(false);
      fetchData();
    } catch (err: any) {
      setConflictError(err.message);
    }
  };

  const deleteSlot = async (id: string) => {
    if (!confirm(t('Remove this schedule slot?'))) return;
    try {
       await deleteDoc(doc(db, 'timetables', id));
       fetchData();
    } catch(e) {
       console.error(e);
    }
  };

  if (!isAdmin) return <div className="p-8">Access Denied</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Timetables')}</h2>
          <p className="text-gray-500 mt-1">{t('Manage class schedules and teacher allocations.')}</p>
        </div>
        <div className="flex gap-4 items-center">
           <input 
             type="text" 
             value={currentSeason} 
             onChange={(e) => setCurrentSeason(e.target.value)} 
             className="w-32 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-mono text-center font-bold" 
             placeholder="Season"
           />
           <button onClick={() => { setFormData({ dayOfWeek: 1, startTime: '08:00', endTime: '10:00' }); setShowAdd(true); }} disabled={!selectedClassId} className="px-5 py-2.5 rounded-xl text-white font-medium flex items-center gap-2 shadow-lg disabled:opacity-50" style={{ backgroundColor: primaryColor }}>
             <Plus className="w-5 h-5" /> {t('Add Slot')}
           </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm">
         <div className="max-w-md mb-8">
            <label className="block text-sm font-bold mb-2 uppercase text-gray-500 tracking-wider">{t('Select Class')}</label>
            <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
               <option value="">{t('Choose a class...')}</option>
               {classes.map(c => (
                 <option key={c.id} value={c.id}>{c.name}</option>
               ))}
            </select>
         </div>

         {selectedClassId ? (
           <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
             {[1,2,3,4,5,6].map(dayIndex => (
               <div key={dayIndex} className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 min-h-[300px]">
                 <h4 className="font-bold text-center mb-4 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2">
                   {/* Days: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat */}
                   {dayIndex === 1 && t('Monday')}
                   {dayIndex === 2 && t('Tuesday')}
                   {dayIndex === 3 && t('Wednesday')}
                   {dayIndex === 4 && t('Thursday')}
                   {dayIndex === 5 && t('Friday')}
                   {dayIndex === 6 && t('Saturday')}
                 </h4>
                 
                 <div className="space-y-3">
                   {slots.filter(s => s.dayOfWeek === dayIndex).sort((a,b) => a.startTime.localeCompare(b.startTime)).map(slot => {
                     const sub = subjects.find(s => s.id === slot.subjectId);
                     const tch = teachers.find(t => t.id === slot.teacherId);
                     const rum = classrooms.find(r => r.id === slot.classroomId);

                     return (
                       <div key={slot.id} className="bg-white dark:bg-gray-900 p-3 rounded-xl shadow-sm border-l-4 group relative" style={{borderLeftColor: sub?.color || primaryColor}}>
                         <div className="text-xs font-bold font-mono text-gray-500 mb-1">{slot.startTime} - {slot.endTime}</div>
                         <div className="font-bold text-sm mb-1">{sub?.name || 'Unknown'}</div>
                         <div className="text-xs text-gray-600 dark:text-gray-400 truncate">{tch?.name || 'No Teacher'}</div>
                         <div className="text-[10px] uppercase font-bold text-gray-400 mt-2 flex items-center gap-1">
                           <MapPin className="w-3 h-3" /> {rum?.name || 'No Room'}
                         </div>
                         <button onClick={() => deleteSlot(slot.id)} className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 p-1 bg-red-50 rounded hover:bg-red-100 transition">
                           <X className="w-3 h-3" />
                         </button>
                       </div>
                     );
                   })}
                 </div>
               </div>
             ))}
           </div>
         ) : (
           <div className="text-center text-gray-400 py-12 flex flex-col items-center">
             <Calendar className="w-16 h-16 mb-4 opacity-20" />
             <p>{t('Please select a class to view or edit its timetable.')}</p>
           </div>
         )}
      </div>

      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-gray-900 rounded-[2rem] w-full max-w-lg shadow-xl overflow-hidden">
               <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                 <h3 className="text-xl font-bold">{t('Add Timetable Slot')}</h3>
               </div>
               
               <form onSubmit={saveSlot} className="p-6 space-y-4">
                 {conflictError && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold">{conflictError}</div>}
                 
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium mb-2">{t('Day')}</label>
                     <select value={formData.dayOfWeek} onChange={e => setFormData({...formData, dayOfWeek: Number(e.target.value)})} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                       <option value={1}>{t('Monday')}</option>
                       <option value={2}>{t('Tuesday')}</option>
                       <option value={3}>{t('Wednesday')}</option>
                       <option value={4}>{t('Thursday')}</option>
                       <option value={5}>{t('Friday')}</option>
                       <option value={6}>{t('Saturday')}</option>
                     </select>
                   </div>
                   <div className="grid grid-cols-2 gap-2">
                     <div>
                       <label className="block text-sm font-medium mb-2">{t('Start')}</label>
                       <input type="time" required value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} className="w-full px-2 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" />
                     </div>
                     <div>
                       <label className="block text-sm font-medium mb-2">{t('End')}</label>
                       <input type="time" required value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} className="w-full px-2 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" />
                     </div>
                   </div>
                 </div>

                 <div>
                   <label className="block text-sm font-medium mb-2">{t('Subject')}</label>
                   <select required value={formData.subjectId} onChange={e => setFormData({...formData, subjectId: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                     <option value="">-- {t('Select')} --</option>
                     {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                   </select>
                 </div>

                 <div>
                   <label className="block text-sm font-medium mb-2">{t('Teacher')}</label>
                   <select required value={formData.teacherId} onChange={e => setFormData({...formData, teacherId: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                     <option value="">-- {t('Select')} --</option>
                     {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                   </select>
                 </div>

                 <div>
                   <label className="block text-sm font-medium mb-2">{t('Classroom')}</label>
                   <select required value={formData.classroomId} onChange={e => setFormData({...formData, classroomId: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                     <option value="">-- {t('Select')} --</option>
                     {classrooms.map(r => <option key={r.id} value={r.id}>{r.name} ({r.type})</option>)}
                   </select>
                 </div>

                 <div className="flex gap-4 pt-6 mt-6 border-t border-gray-100 dark:border-gray-800">
                   <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl font-bold">{t('Cancel')}</button>
                   <button type="submit" className="flex-1 py-3 text-white rounded-xl font-bold" style={{ backgroundColor: primaryColor }}>{t('Save Slot')}</button>
                 </div>
               </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
