import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2, Edit2, Upload, FileText, CheckCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { useTheme } from '../../hooks/useTheme';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

interface Homework {
  id: string;
  classId: string;
  schoolId: string;
  title: string;
  description: string;
  attachmentUrl: string;
  dueDate: string;
  createdAt: any;
  teacherId: string;
}

interface Submission {
  id: string;
  homeworkId: string;
  studentId: string;
  attachmentUrl: string;
  status: 'done' | 'submitted';
  submittedAt: any;
}

export default function Homeworks() {
  const { user, role, schoolId } = useAuth();
  const { primaryColor } = useTheme();
  const { t } = useLanguage();
  
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [classes, setClasses] = useState<{id: string, name: string}[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  
  // Homework Form
  const [selectedClass, setSelectedClass] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Submission Form State (for students)
  const [activeSubmitId, setActiveSubmitId] = useState<string | null>(null);
  const [submitAttachmentUrl, setSubmitAttachmentUrl] = useState('');

  useEffect(() => {
    if (schoolId) {
      fetchClasses();
      fetchHomeworks();
    }
  }, [schoolId, role]);

  const fetchClasses = async () => {
    try {
      const q = query(collection(db, 'classes'), where('schoolId', '==', schoolId));
      const snaps = await getDocs(q);
      const data: any[] = [];
      snaps.forEach(d => data.push({ id: d.id, ...d.data() }));
      
      // Filter accessible classes based on role
      if (role === 'teacher') {
        setClasses(data.filter(c => c.teacherId === user?.uid));
      } else if (role === 'student') {
        setClasses(data.filter(c => (c.studentIds || []).includes(user?.uid)));
      } else {
        setClasses(data);
      }
    } catch (e) {
      console.error("Classes Error", e);
    }
  };

  const fetchHomeworks = async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const q = query(collection(db, 'homeworks'), where('schoolId', '==', schoolId));
      const snaps = await getDocs(q);
      const data: Homework[] = [];
      snaps.forEach(d => data.push({ id: d.id, ...d.data() } as Homework));
      
      // Filter for student/teacher logic if needed (For simplicity, using class lists check)
      // fetchClasses will already constrain which classes matter
      
      setHomeworks(data);

      if (role === 'student' && user) {
        fetchSubmissions(data.map(h => h.id));
      }

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async (homeworkIds: string[]) => {
    if (!user || homeworkIds.length === 0) return;
    try {
      const q = query(collection(db, 'homework_submissions'), where('studentId', '==', user.uid));
      const snaps = await getDocs(q);
      const subs: Record<string, Submission> = {};
      snaps.forEach(d => {
        const item = d.data() as Submission;
        subs[item.homeworkId] = { id: d.id, ...item };
      });
      setSubmissions(subs);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !user) return;
    try {
      await addDoc(collection(db, 'homeworks'), {
        schoolId,
        classId: selectedClass,
        teacherId: user.uid,
        title,
        description,
        attachmentUrl,
        dueDate,
        createdAt: serverTimestamp()
      });
      resetForm();
      fetchHomeworks();
    } catch (err: any) {
      console.error(err);
      alert('Error creating homework');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this homework?')) {
      try {
        await deleteDoc(doc(db, 'homeworks', id));
        fetchHomeworks();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleSubmitHomework = async (hwId: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'homework_submissions'), {
        homeworkId: hwId,
        studentId: user.uid,
        attachmentUrl: submitAttachmentUrl,
        status: submitAttachmentUrl ? 'submitted' : 'done',
        submittedAt: serverTimestamp()
      });
      setActiveSubmitId(null);
      setSubmitAttachmentUrl('');
      fetchHomeworks(); // Will re-fetch submissions too
    } catch (e) {
      console.error(e);
      alert('Error submitting homework');
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setAttachmentUrl('');
    setDueDate('');
    setSelectedClass('');
    setShowAdd(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      // For proof of concept in AI Studio: use object URL or data URL
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Filter homeworks based on the user's classes
  const visibleHomeworks = homeworks.filter(h => classes.some(c => c.id === h.classId));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Homeworks')}</h1>
            <p className="text-gray-500 text-sm mt-1">{t('Manage assignments and submissions')}</p>
          </div>
        </div>
        {(role === 'admin' || role === 'teacher' || role === 'superadmin') && (
          <button
            onClick={() => { resetForm(); setShowAdd(true); }}
            className="px-5 py-2.5 rounded-xl text-white font-medium flex items-center gap-2 shadow-lg transition-transform hover:scale-105 active:scale-95"
            style={{ backgroundColor: primaryColor }}
          >
            <Plus className="w-5 h-5" /> {t('Create Homework')}
          </button>
        )}
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden"
          >
            <form onSubmit={handleSaveHomework} className="p-8 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Class</label>
                  <select
                    required
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900 dark:text-white"
                  >
                    <option value="">Select a class</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. History Essay"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900 dark:text-white"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                  <textarea
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Instructions..."
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900 dark:text-white resize-none"
                  ></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Attachment (Optional)</label>
                  <label className="flex items-center gap-2 cursor-pointer w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500 transition-all text-gray-500 overflow-hidden relative text-sm">
                    <Upload className="w-5 h-5" />
                    <span className="truncate">{attachmentUrl ? 'File Selected' : 'Choose a file...'}</span>
                    <input
                      type="file"
                      onChange={(e) => handleFileUpload(e, setAttachmentUrl)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Due Date</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2.5 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-white font-medium shadow-lg transition-transform hover:scale-105 active:scale-95"
                  style={{ backgroundColor: primaryColor }}
                >
                  Save Homework
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="p-12 flex justify-center">
          <div className="w-8 h-8 rounded-full border-4 border-gray-200 border-t-indigo-600 animate-spin" style={{ borderTopColor: primaryColor }}></div>
        </div>
      ) : visibleHomeworks.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-[2rem] p-12 text-center shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No homeworks found</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
            Homework assignments will appear here once created.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {visibleHomeworks.map(hw => (
            <div key={hw.id} className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">{classes.find(c => c.id === hw.classId)?.name || 'Class'}</div>
                    <div className="text-xs text-gray-400">Due: {hw.dueDate}</div>
                  </div>
                </div>
                
                {(role === 'admin' || role === 'teacher') && (
                  <button onClick={() => handleDelete(hw.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{hw.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 flex-1 whitespace-pre-wrap">{hw.description}</p>
              
              {hw.attachmentUrl && (
                 <a href={hw.attachmentUrl} download="homework-attachment" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg mb-4 self-start">
                   <FileText className="w-4 h-4" /> View Attachment
                 </a>
              )}

              {/* Student Action Area */}
              {role === 'student' && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  {submissions[hw.id] ? (
                    <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 px-4 py-3 rounded-xl">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium text-sm">Status: Completed</span>
                      {submissions[hw.id].attachmentUrl && (
                        <a href={submissions[hw.id].attachmentUrl} target="_blank" rel="noreferrer" className="ml-auto text-xs underline">
                           View Submitted File
                        </a>
                      )}
                    </div>
                  ) : activeSubmitId === hw.id ? (
                    <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                      <label className="flex items-center gap-2 cursor-pointer w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 hover:border-blue-500 transition-all text-sm text-gray-500">
                        <Upload className="w-4 h-4" />
                        <span className="truncate">{submitAttachmentUrl ? 'Response Attached' : 'Attach Response File (Optional)'}</span>
                        <input type="file" onChange={(e) => handleFileUpload(e, setSubmitAttachmentUrl)} className="hidden" />
                      </label>
                      <div className="flex gap-2">
                        <button onClick={() => { setActiveSubmitId(null); setSubmitAttachmentUrl(''); }} className="flex-1 py-2 rounded-xl text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                          Cancel
                        </button>
                        <button onClick={() => handleSubmitHomework(hw.id)} className="flex-1 py-2 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: primaryColor }}>
                          Submit
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setActiveSubmitId(hw.id)} 
                      className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400 font-medium text-sm transition-colors"
                    >
                      Mark as Done / Submit Work
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
