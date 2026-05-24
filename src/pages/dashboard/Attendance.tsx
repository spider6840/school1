import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, addDoc, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../lib/firestoreUtils';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Calendar, Search, CheckCircle2, XCircle, Clock, Save, Hash } from 'lucide-react';
import { motion } from 'motion/react';

interface ClassGroup {
  id: string;
  name: string;
  teacherId: string;
}

interface Student {
  uid: string;
  name: string;
  role: string;
}

type AttendanceStatus = 'present' | 'absent' | 'late';

export default function Attendance() {
  const { user, role, isAdmin } = useAuth();
  const { primaryColor } = useTheme();
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      let q;
      if (isAdmin) {
        q = query(collection(db, 'classes'));
      } else {
        q = query(collection(db, 'classes'), where('teacherId', '==', user?.uid));
      }
      const snapshot = await getDocs(q);
      const classList = snapshot.docs.map(doc => {
        const data = doc.data() as Record<string, any>;
        return { id: doc.id, ...data } as ClassGroup;
      });
      setClasses(classList);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'classes');
    }
  };

  useEffect(() => {
    if (selectedClass) {
      fetchStudentsAndAttendance();
    }
  }, [selectedClass, date]);

  const fetchStudentsAndAttendance = async () => {
    setLoading(true);
    try {
      // 1. Fetch students in this class (simplified: fetching all students for now)
      const usersQ = query(collection(db, 'users'), where('role', '==', 'student'));
      const userSnap = await getDocs(usersQ);
      const studentList = userSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Student));
      setStudents(studentList);

      // 2. Fetch existing attendance for this date/class
      const attendanceId = `${selectedClass}_${date}`;
      const attDoc = await getDocs(query(collection(db, 'attendance'), where('classId', '==', selectedClass), where('date', '==', date)));
      
      if (!attDoc.empty) {
        setRecords(attDoc.docs[0].data().records);
      } else {
        // Initialize records
        const initial: Record<string, AttendanceStatus> = {};
        studentList.forEach(s => initial[s.uid] = 'present');
        setRecords(initial);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setRecords(prev => ({ ...prev, [studentId]: status }));
  };

  const saveAttendance = async () => {
    setSaving(true);
    try {
      const attendanceId = `${selectedClass}_${date}`;
      await setDoc(doc(db, 'attendance', attendanceId), {
        classId: selectedClass,
        date: date,
        records: records,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid
      });
      alert('Attendance saved successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'attendance');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Attendance Tracking</h2>
          <p className="text-gray-500 dark:text-gray-400">Mark daily attendance for your students.</p>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-48">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 outline-none"
            />
          </div>
          <select 
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="flex-1 md:w-64 px-4 py-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 outline-none"
          >
            <option value="">Select a Class</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {!selectedClass ? (
        <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-20 text-center border border-dashed border-gray-200 dark:border-gray-800">
           <div className="w-20 h-20 rounded-3xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mx-auto mb-6 text-gray-400">
              <Hash className="w-10 h-10" />
           </div>
           <h3 className="text-xl font-bold text-gray-900 dark:text-white">No Class Selected</h3>
           <p className="text-gray-500 mt-2">Please select a class and date to begin tracking attendance.</p>
        </div>
      ) : loading ? (
        <div className="text-center py-20 text-gray-500">Loading student roster...</div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Student</th>
                  <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.uid} className="border-t border-gray-50 dark:border-gray-800">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center font-bold text-blue-600">
                          {student.name?.charAt(0) || '?'}
                        </div>
                        <div className="font-bold text-gray-900 dark:text-white">{student.name}</div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex justify-center items-center gap-2">
                        {[
                          { id: 'present', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
                          { id: 'absent', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
                          { id: 'late', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                        ].map((status) => (
                          <button
                            key={status.id}
                            onClick={() => handleStatusChange(student.uid, status.id as AttendanceStatus)}
                            className={`p-3 rounded-2xl transition-all flex items-center gap-2 group ${
                              records[student.uid] === status.id 
                              ? `${status.bg} ring-2 ring-inset` 
                              : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                            style={records[student.uid] === status.id ? { '--tw-ring-color': primaryColor } as any : {}}
                          >
                            <status.icon className={`w-5 h-5 ${records[student.uid] === status.id ? status.color : 'text-gray-400'}`} />
                            <span className={`text-[10px] font-black uppercase tracking-wider hidden sm:block ${records[student.uid] === status.id ? status.color : 'text-gray-400'}`}>
                              {status.id}
                            </span>
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <button
              onClick={saveAttendance}
              disabled={saving}
              className="px-10 py-5 rounded-[2rem] text-white font-black uppercase tracking-widest shadow-2xl flex items-center gap-3 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
              style={{ backgroundColor: primaryColor }}
            >
              <Save className="w-6 h-6" />
              {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
