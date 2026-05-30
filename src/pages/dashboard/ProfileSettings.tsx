import { useState, useEffect, FormEvent } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { useTheme } from '../../hooks/useTheme';
import { motion } from 'motion/react';
import { User, Save, Upload, Link as LinkIcon, Book } from 'lucide-react';

export default function ProfileSettings() {
  const { user, userData, role } = useAuth();
  const { primaryColor } = useTheme();
  const { t } = useLanguage();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    birthDate: '',
    photoUrl: '',
    // Teacher specific
    grades: '',
    subjects: '',
    // Student specific
    parentsLink: ''
  });

  useEffect(() => {
    if (userData) {
      setFormData({
        name: userData.name || '',
        address: userData.address || '',
        birthDate: userData.birthDate || '',
        photoUrl: userData.photoUrl || '',
        grades: userData.grades || '',
        subjects: userData.subjects || '',
        parentsLink: userData.parentsLink || ''
      });
      setLoading(false);
    }
  }, [userData]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSuccessMsg('');
    
    try {
      const docRef = doc(db, 'users', user.uid);
      const updates: any = {
        name: formData.name,
        address: formData.address,
        birthDate: formData.birthDate,
        photoUrl: formData.photoUrl,
        updatedAt: serverTimestamp()
      };

      if (role === 'teacher') {
        updates.grades = formData.grades;
        updates.subjects = formData.subjects;
      } else if (role === 'student') {
        updates.parentsLink = formData.parentsLink;
      }

      await updateDoc(docRef, updates);
      
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert('Failed to save profile details.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="w-8 h-8 rounded-full border-4 border-gray-200 border-t-brand-primary animate-spin" style={{ borderTopColor: primaryColor }}></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <User className="w-8 h-8 text-gray-400" />
          {t('My Profile')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">{t('Manage your personal information and preferences.')}</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-gray-800"
      >
        <form onSubmit={handleSave} className="space-y-8">
          
          {successMsg && (
            <div className="p-4 rounded-2xl bg-green-50 dark:bg-green-900/10 text-green-600 text-sm font-medium flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-green-500"></span>
               {successMsg}
            </div>
          )}

          <div className="flex items-start gap-8 border-b border-gray-100 dark:border-gray-800 pb-8">
            <div className="relative group shrink-0">
               <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-700">
                  {formData.photoUrl ? (
                    <img src={formData.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-gray-400" />
                  )}
               </div>
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Profile Photo</label>
                <div className="relative">
                  <label className="flex items-center gap-2 cursor-pointer w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-4 py-4 focus-within:ring-2 focus-within:ring-blue-500 transition-all text-gray-500 overflow-hidden relative text-sm">
                    <Upload className="w-5 h-5" />
                    <span className="truncate">{formData.photoUrl ? 'Photo Selected' : 'Choose an image...'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setFormData({ ...formData, photoUrl: reader.result as string });
                          reader.readAsDataURL(file);
                        }
                      }}
                       className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-400 mt-2">Upload a profile picture (max 1MB). It will be saved securely.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 outline-none"
                   style={{ '--tw-ring-color': primaryColor } as any}
                />
             </div>
             <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border-none outline-none opacity-50 select-none cursor-not-allowed"
                />
             </div>
             <div className="md:col-span-2">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 outline-none"
                   style={{ '--tw-ring-color': primaryColor } as any}
                />
             </div>
             <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Birth Date</label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 outline-none"
                   style={{ '--tw-ring-color': primaryColor } as any}
                />
             </div>
          </div>

          {role === 'teacher' && (
            <div className="space-y-6 pt-4 border-t border-gray-100 dark:border-gray-800">
               <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                 <Book className="w-5 h-5 text-gray-400" /> Teaching Details
               </h2>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Subjects Can Cover (Comma separated)</label>
                    <input
                      type="text"
                      value={formData.subjects}
                      onChange={(e) => setFormData({ ...formData, subjects: e.target.value })}
                      placeholder="Math, Physics, Computing"
                      className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 outline-none"
                       style={{ '--tw-ring-color': primaryColor } as any}
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Grades</label>
                    <input
                      type="text"
                      value={formData.grades}
                      onChange={(e) => setFormData({ ...formData, grades: e.target.value })}
                      placeholder="10th Grade, 11th Grade"
                      className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 outline-none"
                       style={{ '--tw-ring-color': primaryColor } as any}
                    />
                 </div>
               </div>
            </div>
          )}

          {role === 'student' && (
            <div className="space-y-6 pt-4 border-t border-gray-100 dark:border-gray-800">
               <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                 <LinkIcon className="w-5 h-5 text-gray-400" /> Guardian / Parents Link
               </h2>
               <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Parent/Guardian Email or ID</label>
                  <input
                    type="text"
                    value={formData.parentsLink}
                    onChange={(e) => setFormData({ ...formData, parentsLink: e.target.value })}
                    placeholder="parent@example.com"
                    className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 outline-none"
                     style={{ '--tw-ring-color': primaryColor } as any}
                  />
               </div>
            </div>
          )}

          <div className="pt-6">
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-4 rounded-2xl text-white font-bold shadow-xl transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 flex items-center gap-3"
              style={{ backgroundColor: primaryColor }}
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
