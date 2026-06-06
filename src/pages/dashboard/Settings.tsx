import { useState, useEffect, FormEvent } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import { motion } from 'motion/react';
import { Settings as SettingsIcon, Save, Building, Palette, Globe, DollarSign, Image as ImageIcon } from 'lucide-react';

export default function Settings() {
  const { isAdmin, isSuperAdmin, schoolId } = useAuth();
  const { primaryColor, setPrimaryColor } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  const [formData, setFormData] = useState({
    schoolName: '',
    logoUrl: '',
    currency: 'USD',
    themeColor: primaryColor,
    defaultLanguage: language,
    levels: {
      nursery: { enabled: true, years: 2 },
      primary: { enabled: true, years: 6 },
      middle: { enabled: true, years: 3 },
      high: { enabled: true, years: 3 }
    }
  });

  const getDocRef = () => {
    if (isSuperAdmin) {
      return doc(db, 'settings', 'general');
    } else if (schoolId) {
      return doc(db, 'schools', schoolId);
    }
    return null;
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = getDocRef();
        if (!docRef) {
          setLoading(false);
          return;
        }
        
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFormData({
            schoolName: data.schoolName || data.name || '',
            logoUrl: data.logoUrl || '',
            currency: data.currency || 'USD',
            themeColor: data.themeColor || primaryColor,
            defaultLanguage: data.defaultLanguage || language,
            levels: data.levels || {
              nursery: { enabled: true, years: 2 },
              primary: { enabled: true, years: 6 },
              middle: { enabled: true, years: 3 },
              high: { enabled: true, years: 3 }
            }
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
  }, [isAdmin, isSuperAdmin, schoolId]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    
    try {
      const docRef = getDocRef();
      if (!docRef) throw new Error("No document reference to save to");

      const dataToSave: any = {
        logoUrl: formData.logoUrl,
        currency: formData.currency,
        themeColor: formData.themeColor,
        defaultLanguage: formData.defaultLanguage,
        levels: formData.levels,
        updatedAt: serverTimestamp()
      };
      
      if (isSuperAdmin) {
        dataToSave.schoolName = formData.schoolName;
      } else {
        dataToSave.name = formData.schoolName;
      }

      await setDoc(docRef, dataToSave, { merge: true });
      
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
          {isSuperAdmin ? t('Global Settings') : t('School Settings')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">{isSuperAdmin ? t('Manage the platform\'s global branding and preferences.') : t('Manage your institution\'s profile, preferences, and branding.')}</p>
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
                <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Logo</label>
                <div className="relative">
                  <label className="flex items-center gap-2 cursor-pointer w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-4 focus-within:ring-2 focus-within:ring-blue-500 transition-all text-gray-500 overflow-hidden relative text-sm">
                    <span className="truncate">{formData.logoUrl ? 'Logo Selected' : 'Choose an image...'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setFormData({ ...formData, logoUrl: reader.result as string });
                          reader.readAsDataURL(file);
                        }
                      }}
                       className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-4">
              <Building className="w-5 h-5 text-gray-400" /> Academic Levels & Config
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {(['nursery', 'primary', 'middle', 'high'] as const).map(level => (
                <div key={level} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold capitalize text-gray-700 dark:text-gray-300">{level}</label>
                    <input 
                      type="checkbox" 
                      checked={formData.levels[level]?.enabled}
                      onChange={(e) => setFormData({
                        ...formData,
                        levels: {
                          ...formData.levels,
                          [level]: { ...formData.levels[level], enabled: e.target.checked }
                        }
                      })}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Duration (Years)</label>
                    <input
                      type="number" min="1" max="10" disabled={!formData.levels[level]?.enabled}
                      value={formData.levels[level]?.years || 1}
                      onChange={(e) => setFormData({
                        ...formData, levels: { ...formData.levels, [level]: { ...formData.levels[level], years: parseInt(e.target.value) || 1 } }
                      })}
                      className="w-full px-4 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none disabled:opacity-50"
                    />
                  </div>
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Base Prices ($)</label>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span>Education</span>
                        <input type="number" min="0" value={formData.levels[level]?.prices?.education || 0}
                          onChange={(e) => setFormData({ ...formData, levels: { ...formData.levels, [level]: { ...formData.levels[level], prices: { ...formData.levels[level]?.prices, education: Number(e.target.value) } } } })}
                          className="w-16 px-2 py-1 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700" />
                      </div>
                      <div className="flex flex-col gap-1 text-xs mb-2">
                        <span className="font-bold flex justify-between">Canteen</span>
                        <div className="flex justify-between items-center pl-2">
                           <span className="text-gray-500">Full Meals</span>
                           <input type="number" min="0" value={formData.levels[level]?.prices?.canteen?.full || 0}
                             onChange={(e) => setFormData({ ...formData, levels: { ...formData.levels, [level]: { ...formData.levels[level], prices: { ...formData.levels[level]?.prices, canteen: { ...formData.levels[level]?.prices?.canteen, full: Number(e.target.value) } } } } })}
                             className="w-16 px-2 py-1 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700" />
                        </div>
                        <div className="flex justify-between items-center pl-2">
                           <span className="text-gray-500">Lunch Only</span>
                           <input type="number" min="0" value={formData.levels[level]?.prices?.canteen?.lunch || 0}
                             onChange={(e) => setFormData({ ...formData, levels: { ...formData.levels, [level]: { ...formData.levels[level], prices: { ...formData.levels[level]?.prices, canteen: { ...formData.levels[level]?.prices?.canteen, lunch: Number(e.target.value) } } } } })}
                             className="w-16 px-2 py-1 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700" />
                        </div>
                        <div className="flex justify-between items-center pl-2">
                           <span className="text-gray-500">Breakfast Only</span>
                           <input type="number" min="0" value={formData.levels[level]?.prices?.canteen?.breakfast || 0}
                             onChange={(e) => setFormData({ ...formData, levels: { ...formData.levels, [level]: { ...formData.levels[level], prices: { ...formData.levels[level]?.prices, canteen: { ...formData.levels[level]?.prices?.canteen, breakfast: Number(e.target.value) } } } } })}
                             className="w-16 px-2 py-1 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700" />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 text-xs">
                        <span className="font-bold flex justify-between">Transport</span>
                        <div className="flex justify-between items-center pl-2">
                           <span className="text-gray-500">Round Trip</span>
                           <input type="number" min="0" value={formData.levels[level]?.prices?.transport?.round_trip || 0}
                             onChange={(e) => setFormData({ ...formData, levels: { ...formData.levels, [level]: { ...formData.levels[level], prices: { ...formData.levels[level]?.prices, transport: { ...formData.levels[level]?.prices?.transport, round_trip: Number(e.target.value) } } } } })}
                             className="w-16 px-2 py-1 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700" />
                        </div>
                        <div className="flex justify-between items-center pl-2">
                           <span className="text-gray-500">Morning Coming</span>
                           <input type="number" min="0" value={formData.levels[level]?.prices?.transport?.morning || 0}
                             onChange={(e) => setFormData({ ...formData, levels: { ...formData.levels, [level]: { ...formData.levels[level], prices: { ...formData.levels[level]?.prices, transport: { ...formData.levels[level]?.prices?.transport, morning: Number(e.target.value) } } } } })}
                             className="w-16 px-2 py-1 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700" />
                        </div>
                        <div className="flex justify-between items-center pl-2">
                           <span className="text-gray-500">Return Home</span>
                           <input type="number" min="0" value={formData.levels[level]?.prices?.transport?.return || 0}
                             onChange={(e) => setFormData({ ...formData, levels: { ...formData.levels, [level]: { ...formData.levels[level], prices: { ...formData.levels[level]?.prices, transport: { ...formData.levels[level]?.prices?.transport, return: Number(e.target.value) } } } } })}
                             className="w-16 px-2 py-1 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
