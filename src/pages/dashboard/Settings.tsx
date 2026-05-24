import { useState, useEffect, FormEvent } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import { motion } from 'motion/react';
import { Settings as SettingsIcon, Save, Building, Palette, Globe, DollarSign, Image as ImageIcon } from 'lucide-react';

export default function Settings() {
  const { isAdmin } = useAuth();
  const { primaryColor, setPrimaryColor } = useTheme();
  const { language, setLanguage } = useLanguage();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  const [formData, setFormData] = useState({
    schoolName: '',
    logoUrl: '',
    currency: 'USD',
    themeColor: primaryColor,
    defaultLanguage: language,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'general');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFormData({
            schoolName: data.schoolName || '',
            logoUrl: data.logoUrl || '',
            currency: data.currency || 'USD',
            themeColor: data.themeColor || primaryColor,
            defaultLanguage: data.defaultLanguage || language,
          });
          // Apply loaded settings immediately if they differ
          if (data.themeColor && data.themeColor !== primaryColor) {
            setPrimaryColor(data.themeColor);
          }
          if (data.defaultLanguage && data.defaultLanguage !== language) {
            setLanguage(data.defaultLanguage as any);
          }
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (isAdmin) {
      fetchSettings();
    }
  }, [isAdmin]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    
    try {
      await setDoc(doc(db, 'settings', 'general'), {
        ...formData,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      // Apply theme/language changes globally in the app
      setPrimaryColor(formData.themeColor);
      setLanguage(formData.defaultLanguage as any);
      
      setSuccessMsg('Settings updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return <div className="p-8 text-red-500 font-bold">Access Denied: Admin privileges required.</div>;
  }

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
          <SettingsIcon className="w-8 h-8 text-gray-400" />
          School Settings
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Manage your institution's profile, preferences, and branding.</p>
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

          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-4">
              <Building className="w-5 h-5 text-gray-400" /> General Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">School Name</label>
                <input
                  type="text"
                  value={formData.schoolName}
                  onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                  placeholder="e.g. Springfield High"
                  className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 outline-none"
                  style={{ '--tw-ring-color': primaryColor } as any}
                />
              </div>
              
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Logo URL</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <input
                    type="url"
                    value={formData.logoUrl}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full pl-12 pr-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 outline-none"
                    style={{ '--tw-ring-color': primaryColor } as any}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-4">
              <Globe className="w-5 h-5 text-gray-400" /> Localization
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Default Language</label>
                <select
                  value={formData.defaultLanguage}
                  onChange={(e) => setFormData({ ...formData, defaultLanguage: e.target.value })}
                  className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 outline-none"
                  style={{ '--tw-ring-color': primaryColor } as any}
                >
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                  <option value="ar">العربية (Arabic)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Currency</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full pl-12 pr-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 outline-none appearance-none"
                    style={{ '--tw-ring-color': primaryColor } as any}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="MAD">MAD (DH)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-4">
              <Palette className="w-5 h-5 text-gray-400" /> Branding
            </h2>
            
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Primary Brand Color</label>
              <div className="flex flex-wrap gap-4">
                {[
                  '#2563EB', // Blue
                  '#10B981', // Emerald
                  '#8B5CF6', // Violet
                  '#F59E0B', // Amber
                  '#EF4444', // Red
                  '#0F172A', // Slate
                ].map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, themeColor: color })}
                    className={`w-12 h-12 rounded-full shadow-md transition-transform flex items-center justify-center ${formData.themeColor === color ? 'scale-110 ring-4 ring-offset-2 ring-offset-white dark:ring-offset-gray-900' : 'hover:scale-110'}`}
                    style={{ backgroundColor: color, '--tw-ring-color': color } as any}
                  >
                    {formData.themeColor === color && <div className="w-4 h-4 rounded-full bg-white opacity-90" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-4 rounded-2xl text-white font-bold shadow-xl transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 flex items-center gap-3"
              style={{ backgroundColor: primaryColor }}
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
