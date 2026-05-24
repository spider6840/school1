import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { GraduationCap, User, Plus, Search, BookOpen } from 'lucide-react';

interface ClassGroup {
  id: string;
  name: string;
  teacherId: string;
}

export default function Classes() {
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const { primaryColor } = useTheme();
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const snap = await getDocs(collection(db, 'classes'));
      setClasses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassGroup)));
    } catch (e: any) {
      console.error(e);
      alert('Error fetching classes: ' + (e.message || String(e)));
    } finally {
      setLoading(false);
    }
  };

  const addClass = async () => {
    if (!name.trim()) return;
    try {
      await addDoc(collection(db, 'classes'), {
        name,
        teacherId: '',
        studentIds: [],
        createdAt: serverTimestamp()
      });
      setName('');
      setShowAdd(false);
      fetchClasses();
    } catch (e: any) {
      console.error(e);
      alert('Error creating class: ' + e.message);
    }
  };

  if (!isAdmin) return <div className="p-8">Access Denied</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Class Management</h2>
          <p className="text-gray-500 dark:text-gray-400">Organize your school into groups and classes.</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-bold"
          style={{ backgroundColor: primaryColor }}
        >
          <Plus className="w-5 h-5" />
          Create Class
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map(c => (
          <div key={c.id} className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
             <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-6" style={{ color: primaryColor }}>
                <BookOpen className="w-8 h-8" />
             </div>
             <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{c.name}</h3>
             <p className="text-gray-500 text-sm">No teacher assigned yet</p>
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] w-full max-w-md">
              <h3 className="text-xl font-bold mb-4">New Class Name</h3>
              <input 
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 mb-6 outline-none shadow-inner"
                placeholder="e.g. Mathematics 101"
              />
              <div className="flex gap-4">
                 <button onClick={() => setShowAdd(false)} className="flex-1 py-3 font-bold text-gray-500">Cancel</button>
                 <button onClick={addClass} className="flex-1 py-3 rounded-xl text-white font-bold" style={{ backgroundColor: primaryColor }}>Create</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
