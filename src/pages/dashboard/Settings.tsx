import { useState, useEffect, FormEvent } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import { motion } from 'motion/react';
import { Settings as SettingsIcon, Save, Building, Palette, Globe, DollarSign, Image as ImageIcon, X, Plus, Trash } from 'lucide-react';

export default function Settings() {
  const { isAdmin, isSuperAdmin, schoolId } = useAuth();
  const { primaryColor, setPrimaryColor } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [configuringLevel, setConfiguringLevel] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    schoolName: '',
    logoUrl: '',
    currency: 'USD',
    themeColor: primaryColor,
    defaultLanguage: language,
    levels: {
      nursery: { enabled: true, years: 2, classTemplates: [], vacations: [] },
      primary: { enabled: true, years: 6, classTemplates: [], vacations: [] },
      middle: { enabled: true, years: 3, classTemplates: [], vacations: [] },
      high: { enabled: true, years: 3, classTemplates: [], vacations: [] }
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
            levels: {
              nursery: { enabled: true, years: 2, classTemplates: [], vacations: [], ...data.levels?.nursery },
              primary: { enabled: true, years: 6, classTemplates: [], vacations: [], ...data.levels?.primary },
              middle: { enabled: true, years: 3, classTemplates: [], vacations: [], ...data.levels?.middle },
              high: { enabled: true, years: 3, classTemplates: [], vacations: [], ...data.levels?.high }
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
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button 
                      type="button"
                      onClick={() => setConfiguringLevel(level)}
                      className="w-full py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl text-sm"
                    >
                      {t('Configure Classes & Vacations')}
                    </button>
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

      {configuringLevel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-gray-900 rounded-[2rem] w-full max-w-4xl shadow-xl border border-gray-100 dark:border-gray-800 my-8 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-900 z-10">
              <h3 className="text-xl font-bold capitalize text-gray-900 dark:text-white">{t('Configure Level')}: {configuringLevel}</h3>
              <button type="button" onClick={() => setConfiguringLevel(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                 <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-8 space-y-8 flex-1 overflow-y-auto" style={{ maxHeight: '70vh' }}>
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-lg text-gray-900 dark:text-white">{t('Class Templates & Base Prices')}</h4>
                  <button type="button" onClick={() => {
                     const updated = [...(formData.levels[configuringLevel as keyof typeof formData.levels]?.classTemplates || [])];
                     updated.push({ name: '', prices: { education: 0, canteen: { full: 0, lunch: 0, breakfast: 0 }, transport: { round_trip: 0, morning: 0, return: 0 } } });
                     setFormData({ ...formData, levels: { ...formData.levels, [configuringLevel]: { ...formData.levels[configuringLevel as keyof typeof formData.levels], classTemplates: updated } } });
                  }} className="text-sm px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 font-bold rounded-lg flex items-center gap-2">
                    <Plus className="w-4 h-4" /> {t('Add Template')}
                  </button>
                </div>
                
                <div className="space-y-4">
                   {(formData.levels[configuringLevel as keyof typeof formData.levels]?.classTemplates || []).map((tpl: any, idx: number) => (
                      <div key={idx} className="p-5 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-4">
                        <div className="flex justify-between items-center">
                          <input type="text" placeholder="Class Name (e.g. CP-A Template)" value={tpl.name} onChange={(e) => {
                             const updated = [...(formData.levels[configuringLevel as keyof typeof formData.levels]?.classTemplates || [])];
                             updated[idx].name = e.target.value;
                             setFormData({ ...formData, levels: { ...formData.levels, [configuringLevel]: { ...formData.levels[configuringLevel as keyof typeof formData.levels], classTemplates: updated } } });
                          }} className="w-1/3 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 font-bold" />
                          
                          <button type="button" onClick={() => {
                             const updated = [...(formData.levels[configuringLevel as keyof typeof formData.levels]?.classTemplates || [])];
                             updated.splice(idx, 1);
                             setFormData({ ...formData, levels: { ...formData.levels, [configuringLevel]: { ...formData.levels[configuringLevel as keyof typeof formData.levels], classTemplates: updated } } });
                          }} className="text-red-500 hover:text-red-700 p-2"><Trash className="w-5 h-5"/></button>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Education ($)</label>
                            <input type="number" min="0" value={tpl.prices?.education} onChange={e => {
                               const updated = [...(formData.levels[configuringLevel as keyof typeof formData.levels]?.classTemplates || [])];
                               if(!updated[idx].prices) updated[idx].prices = {};
                               updated[idx].prices.education = Number(e.target.value);
                               setFormData({ ...formData, levels: { ...formData.levels, [configuringLevel]: { ...formData.levels[configuringLevel as keyof typeof formData.levels], classTemplates: updated } } });
                            }} className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Canteen (Full/Lunch/Break) $</label>
                            <div className="flex gap-1">
                              <input type="number" title="Full" value={tpl.prices?.canteen?.full || 0} onChange={e => {
                                 const updated = [...(formData.levels[configuringLevel as keyof typeof formData.levels]?.classTemplates || [])];
                                 if(!updated[idx].prices) updated[idx].prices = {}; if(!updated[idx].prices.canteen) updated[idx].prices.canteen = {};
                                 updated[idx].prices.canteen.full = Number(e.target.value);
                                 setFormData({ ...formData, levels: { ...formData.levels, [configuringLevel]: { ...formData.levels[configuringLevel as keyof typeof formData.levels], classTemplates: updated } } });
                              }} className="w-1/3 px-2 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm" />
                              <input type="number" title="Lunch" value={tpl.prices?.canteen?.lunch || 0} onChange={e => {
                                 const updated = [...(formData.levels[configuringLevel as keyof typeof formData.levels]?.classTemplates || [])];
                                 if(!updated[idx].prices) updated[idx].prices = {}; if(!updated[idx].prices.canteen) updated[idx].prices.canteen = {};
                                 updated[idx].prices.canteen.lunch = Number(e.target.value);
                                 setFormData({ ...formData, levels: { ...formData.levels, [configuringLevel]: { ...formData.levels[configuringLevel as keyof typeof formData.levels], classTemplates: updated } } });
                              }} className="w-1/3 px-2 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm" />
                              <input type="number" title="Breakfast" value={tpl.prices?.canteen?.breakfast || 0} onChange={e => {
                                 const updated = [...(formData.levels[configuringLevel as keyof typeof formData.levels]?.classTemplates || [])];
                                 if(!updated[idx].prices) updated[idx].prices = {}; if(!updated[idx].prices.canteen) updated[idx].prices.canteen = {};
                                 updated[idx].prices.canteen.breakfast = Number(e.target.value);
                                 setFormData({ ...formData, levels: { ...formData.levels, [configuringLevel]: { ...formData.levels[configuringLevel as keyof typeof formData.levels], classTemplates: updated } } });
                              }} className="w-1/3 px-2 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Transport (RT/Morn/Ret) $</label>
                            <div className="flex gap-1">
                              <input type="number" title="Round Trip" value={tpl.prices?.transport?.round_trip || 0} onChange={e => {
                                 const updated = [...(formData.levels[configuringLevel as keyof typeof formData.levels]?.classTemplates || [])];
                                 if(!updated[idx].prices) updated[idx].prices = {}; if(!updated[idx].prices.transport) updated[idx].prices.transport = {};
                                 updated[idx].prices.transport.round_trip = Number(e.target.value);
                                 setFormData({ ...formData, levels: { ...formData.levels, [configuringLevel]: { ...formData.levels[configuringLevel as keyof typeof formData.levels], classTemplates: updated } } });
                              }} className="w-1/3 px-2 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm" />
                              <input type="number" title="Morning" value={tpl.prices?.transport?.morning || 0} onChange={e => {
                                 const updated = [...(formData.levels[configuringLevel as keyof typeof formData.levels]?.classTemplates || [])];
                                 if(!updated[idx].prices) updated[idx].prices = {}; if(!updated[idx].prices.transport) updated[idx].prices.transport = {};
                                 updated[idx].prices.transport.morning = Number(e.target.value);
                                 setFormData({ ...formData, levels: { ...formData.levels, [configuringLevel]: { ...formData.levels[configuringLevel as keyof typeof formData.levels], classTemplates: updated } } });
                              }} className="w-1/3 px-2 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm" />
                              <input type="number" title="Return" value={tpl.prices?.transport?.return || 0} onChange={e => {
                                 const updated = [...(formData.levels[configuringLevel as keyof typeof formData.levels]?.classTemplates || [])];
                                 if(!updated[idx].prices) updated[idx].prices = {}; if(!updated[idx].prices.transport) updated[idx].prices.transport = {};
                                 updated[idx].prices.transport.return = Number(e.target.value);
                                 setFormData({ ...formData, levels: { ...formData.levels, [configuringLevel]: { ...formData.levels[configuringLevel as keyof typeof formData.levels], classTemplates: updated } } });
                              }} className="w-1/3 px-2 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm" />
                            </div>
                          </div>
                        </div>
                      </div>
                   ))}
                   {!(formData.levels[configuringLevel as keyof typeof formData.levels]?.classTemplates?.length) && <p className="text-gray-400 text-sm">{t('No class templates defined.')}</p>}
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-lg text-gray-900 dark:text-white">{t('Vacations Schedule')}</h4>
                  <button type="button" onClick={() => {
                     const updated = [...(formData.levels[configuringLevel as keyof typeof formData.levels]?.vacations || [])];
                     updated.push({ name: '', startDate: '', endDate: '' });
                     setFormData({ ...formData, levels: { ...formData.levels, [configuringLevel]: { ...formData.levels[configuringLevel as keyof typeof formData.levels], vacations: updated } } });
                  }} className="text-sm px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 font-bold rounded-lg flex items-center gap-2">
                    <Plus className="w-4 h-4" /> {t('Add Vacation')}
                  </button>
                </div>
                
                <div className="space-y-4">
                   {(formData.levels[configuringLevel as keyof typeof formData.levels]?.vacations || []).map((vac: any, idx: number) => (
                      <div key={idx} className="flex flex-col sm:flex-row gap-3">
                         <input type="text" placeholder="Name (e.g. Winter Break)" value={vac.name} onChange={e => {
                            const updated = [...(formData.levels[configuringLevel as keyof typeof formData.levels]?.vacations || [])];
                            updated[idx].name = e.target.value;
                            setFormData({ ...formData, levels: { ...formData.levels, [configuringLevel]: { ...formData.levels[configuringLevel as keyof typeof formData.levels], vacations: updated } } });
                         }} className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" />
                         <input type="date" value={vac.startDate} onChange={e => {
                            const updated = [...(formData.levels[configuringLevel as keyof typeof formData.levels]?.vacations || [])];
                            updated[idx].startDate = e.target.value;
                            setFormData({ ...formData, levels: { ...formData.levels, [configuringLevel]: { ...formData.levels[configuringLevel as keyof typeof formData.levels], vacations: updated } } });
                         }} className="w-full sm:w-auto px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" />
                         <input type="date" value={vac.endDate} onChange={e => {
                            const updated = [...(formData.levels[configuringLevel as keyof typeof formData.levels]?.vacations || [])];
                            updated[idx].endDate = e.target.value;
                            setFormData({ ...formData, levels: { ...formData.levels, [configuringLevel]: { ...formData.levels[configuringLevel as keyof typeof formData.levels], vacations: updated } } });
                         }} className="w-full sm:w-auto px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" />
                         <button type="button" onClick={() => {
                             const updated = [...(formData.levels[configuringLevel as keyof typeof formData.levels]?.vacations || [])];
                             updated.splice(idx, 1);
                             setFormData({ ...formData, levels: { ...formData.levels, [configuringLevel]: { ...formData.levels[configuringLevel as keyof typeof formData.levels], vacations: updated } } });
                          }} className="text-red-500 hover:text-red-700 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl"><Trash className="w-5 h-5"/></button>
                      </div>
                   ))}
                   {!(formData.levels[configuringLevel as keyof typeof formData.levels]?.vacations?.length) && <p className="text-gray-400 text-sm">{t('No vacations defined for this level.')}</p>}
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-end">
               <button type="button" onClick={() => setConfiguringLevel(null)} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-md">
                 {t('Done')}
               </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
