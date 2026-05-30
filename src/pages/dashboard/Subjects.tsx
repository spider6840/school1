import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2, Edit2, Layers, Hash } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { useTheme } from '../../hooks/useTheme';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

interface Subject {
  id: string;
  name: string;
  coefficient: number;
  subSubjects: string[];
}

export default function Subjects() {
  const { role, schoolId } = useAuth();
  const { primaryColor } = useTheme();
  const { t } = useLanguage();
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [coefficient, setCoefficient] = useState<number>(1);
  const [subSubjectInput, setSubSubjectInput] = useState('');
  const [subSubjects, setSubSubjects] = useState<string[]>([]);

  useEffect(() => {
    fetchSubjects();
  }, [schoolId]);

  const fetchSubjects = async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const q = query(collection(db, 'subjects'), where('schoolId', '==', schoolId));
      const snaps = await getDocs(q);
      const data: Subject[] = [];
      snaps.forEach(d => {
        const item = d.data();
        data.push({
          id: d.id,
          name: item.name,
          coefficient: item.coefficient || 1,
          subSubjects: item.subSubjects || [],
        });
      });
      setSubjects(data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubSubject = () => {
    if (subSubjectInput.trim()) {
      setSubSubjects([...subSubjects, subSubjectInput.trim()]);
      setSubSubjectInput('');
    }
  };

  const handleRemoveSubSubject = (idx: number) => {
    setSubSubjects(subSubjects.filter((_, i) => i !== idx));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;
    try {
      if (editingId) {
        await updateDoc(doc(db, 'subjects', editingId), {
          name,
          coefficient,
          subSubjects,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'subjects'), {
          schoolId,
          name,
          coefficient,
          subSubjects,
          createdAt: serverTimestamp()
        });
      }
      resetForm();
      fetchSubjects();
    } catch (err: any) {
      console.error(err);
      alert('Error saving subject');
    }
  };

  const resetForm = () => {
    setName('');
    setCoefficient(1);
    setSubSubjects([]);
    setSubSubjectInput('');
    setEditingId(null);
    setShowAdd(false);
  };

  const startEdit = (s: Subject) => {
    setEditingId(s.id);
    setName(s.name);
    setCoefficient(s.coefficient);
    setSubSubjects(s.subSubjects);
    setShowAdd(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this subject?')) {
      try {
        await deleteDoc(doc(db, 'subjects', id));
        fetchSubjects();
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Subjects')}</h1>
            <p className="text-gray-500 text-sm mt-1">{t('Manage academic subjects & curriculum breakdown')}</p>
          </div>
        </div>
        {(role === 'admin' || role === 'superadmin') && (
          <button
            onClick={() => { resetForm(); setShowAdd(true); }}
            className="px-5 py-2.5 rounded-xl text-white font-medium flex items-center gap-2 shadow-lg transition-transform hover:scale-105 active:scale-95"
            style={{ backgroundColor: primaryColor }}
          >
            <Plus className="w-5 h-5" /> {t('Add Subject')}
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
            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subject Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. English"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Coefficient (Weight)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    required
                    value={coefficient}
                    onChange={(e) => setCoefficient(parseFloat(e.target.value))}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900 dark:text-white"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sub-Subjects (Optional)</label>
                  <div className="flex gap-3 mb-3">
                    <input
                      type="text"
                      value={subSubjectInput}
                      onChange={(e) => setSubSubjectInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubSubject(); } }}
                      placeholder="e.g. Speaking, Writing"
                      className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddSubSubject}
                      className="px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 font-medium transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  {subSubjects.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {subSubjects.map((sub, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-lg text-sm">
                          {sub}
                          <button type="button" onClick={() => handleRemoveSubSubject(idx)} className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200">
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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
                  {editingId ? 'Update Subject' : 'Save Subject'}
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
      ) : subjects.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-[2rem] p-12 text-center shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No subjects yet</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
            {role === 'admin' ? 'Start building your curriculum by adding subjects above.' : 'No subjects have been defined for this school yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map(subject => (
            <div key={subject.id} className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600">
                  <BookOpen className="w-6 h-6" />
                </div>
                {(role === 'admin' || role === 'superadmin') && (
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(subject)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDelete(subject.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{subject.name}</h3>
              
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg">
                  <Hash className="w-4 h-4" /> Coef: {subject.coefficient}
                </div>
                {subject.subSubjects.length > 0 && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg">
                    <Layers className="w-4 h-4" /> {subject.subSubjects.length} subs
                  </div>
                )}
              </div>
              
              {subject.subSubjects.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex flex-wrap gap-2">
                    {subject.subSubjects.map((sub, i) => (
                      <span key={i} className="text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-md">
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
