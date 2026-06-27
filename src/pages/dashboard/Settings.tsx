import React, { useState, useEffect, FormEvent } from 'react';
import { collection, query, getDocs, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import { motion, AnimatePresence } from 'motion/react';
import { Settings as SettingsIcon, Save, Building, Palette, Globe, DollarSign, X, Plus, Trash, Layers, MapPin } from 'lucide-react';

export default function Settings() {
  const { isAdmin, isSuperAdmin, role, schoolId, profileTenantId } = useAuth();
  
  if (!isAdmin) {
    return <div className="p-8 text-red-500 font-bold">Access Denied: Admin privileges required.</div>;
  }

  // If tied to a specific school, show settings directly
  if (schoolId) {
    return <SettingsForm targetSchoolId={schoolId} onClose={() => {}} isModal={false} />;
  }

  // Otherwise (SuperAdmin or GroupAdmin), use the drill down
  return <SchoolSettingsDrillDown isSuperAdmin={isSuperAdmin} role={role} profileTenantId={profileTenantId || undefined} />;
}

function SchoolSettingsDrillDown({ isSuperAdmin, role, profileTenantId }: { isSuperAdmin: boolean, role: string | undefined, profileTenantId: string | undefined }) {
  const [tenants, setTenants] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewTenantSchools, setViewTenantSchools] = useState<any | null>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tenantsSnap, schoolsSnap] = await Promise.all([
          getDocs(collection(db, 'tenants')),
          getDocs(collection(db, 'schools'))
        ]);
        
        let allTenants = tenantsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        let allSchools = schoolsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (role === 'group_admin' && profileTenantId) {
          allTenants = allTenants.filter(t => t.id === profileTenantId);
          allSchools = allSchools.filter(s => s.tenantId === profileTenantId);
        }

        setTenants(allTenants);
        setSchools(allSchools);
      } catch (e: any) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [role, profileTenantId]);

  return (
    <div className="space-y-6 flex-1 h-full flex flex-col relative overflow-hidden">
      <div className="flex items-center gap-4 bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl">
          <SettingsIcon className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">School Settings</h1>
          <p className="text-gray-500 text-sm mt-1">Select a tenant to manage school configurations.</p>
        </div>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto pr-2 pb-8">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading tenants...</div>
        ) : tenants.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">No tenants found.</div>
        ) : (
          tenants.map(tenant => (
            <div key={tenant.id} className="bg-white dark:bg-gray-900 rounded-[2rem] p-6 border border-gray-100 dark:border-gray-800 flex justify-between items-center hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 flex items-center justify-center">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{tenant.name}</h2>
                  <div className="text-sm text-gray-500">{schools.filter(s => s.tenantId === tenant.id).length} School(s)</div>
                </div>
              </div>
              <button onClick={() => setViewTenantSchools(tenant)} className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                 Manage Schools
              </button>
            </div>
          ))
        )}
      </div>

      {/* Tenant's Schools Modal */}
      <AnimatePresence>
        {viewTenantSchools && (
          <div className="fixed inset-0 z-[40] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-gray-50 dark:bg-gray-900 rounded-[2rem] w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex justify-between items-center z-10">
                <h3 className="text-2xl font-bold">{viewTenantSchools.name} - Choose School</h3>
                <button onClick={() => setViewTenantSchools(null)} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"><X className="w-6 h-6" /></button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {schools.filter(s => s.tenantId === viewTenantSchools.id).map(school => (
                       <div key={school.id} className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col hover:shadow-md transition-shadow relative">
                          <div className="flex justify-between items-start mb-4">
                             <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 overflow-hidden">
                                {school.logoUrl ? <img src={school.logoUrl} alt={school.name} className="w-full h-full object-cover" /> : <Building className="w-8 h-8" />}
                             </div>
                             <button onClick={() => setSelectedSchoolId(school.id)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors">Settings</button>
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{school.name}</h3>
                          <div className="mt-4 text-sm text-gray-500 flex items-center gap-2"><MapPin className="w-4 h-4"/> {school.city}, {school.country}</div>
                       </div>
                    ))}
                    {schools.filter(s => s.tenantId === viewTenantSchools.id).length === 0 && (
                      <div className="col-span-full py-12 text-center text-gray-400">No schools in this tenant.</div>
                    )}
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Setting Form Modal */}
      <AnimatePresence>
        {selectedSchoolId && (
           <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-gray-900 w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
               <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center z-10 sticky top-0 bg-white dark:bg-gray-900">
                  <h3 className="text-xl font-bold">Edit Settings</h3>
                  <button onClick={() => setSelectedSchoolId(null)} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"><X className="w-5 h-5"/></button>
               </div>
               <div className="overflow-y-auto flex-1 p-6 relative">
                 <SettingsForm targetSchoolId={selectedSchoolId} onClose={() => setSelectedSchoolId(null)} isModal={true} />
               </div>
             </motion.div>
           </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SettingsForm({ targetSchoolId, onClose, isModal }: { targetSchoolId: string, onClose: () => void, isModal: boolean }) {
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
    leadNotificationEmails: '',
    leadOutcomes: ['Interested', 'Not Interested', 'Want to visit'],
    hwCoefficient: 1,
    examCoefficient: 2,
    levels: {
      nursery: { enabled: true, years: 2, classTemplates: [], vacations: [] },
      primary: { enabled: true, years: 6, classTemplates: [], vacations: [] },
      middle: { enabled: true, years: 3, classTemplates: [], vacations: [] },
      high: { enabled: true, years: 3, classTemplates: [], vacations: [] }
    }
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'schools', targetSchoolId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFormData({
            schoolName: data.name || '',
            logoUrl: data.logoUrl || '',
            currency: data.currency || 'USD',
            themeColor: data.themeColor || primaryColor,
            defaultLanguage: data.defaultLanguage || language,
            leadNotificationEmails: data.leadNotificationEmails || '',
            leadOutcomes: data.leadOutcomes || ['Interested', 'Not Interested', 'Want to visit'],
            hwCoefficient: data.hwCoefficient || 1,
            examCoefficient: data.examCoefficient || 2,
            levels: {
              nursery: { enabled: true, years: 2, classTemplates: [], vacations: [], disableReasons: [], ...data.levels?.nursery },
              primary: { enabled: true, years: 6, classTemplates: [], vacations: [], disableReasons: [], ...data.levels?.primary },
              middle: { enabled: true, years: 3, classTemplates: [], vacations: [], disableReasons: [], ...data.levels?.middle },
              high: { enabled: true, years: 3, classTemplates: [], vacations: [], disableReasons: [], ...data.levels?.high }
            }
          });
          if (!isModal) {
            if (data.themeColor && data.themeColor !== primaryColor) setPrimaryColor(data.themeColor);
            if (data.defaultLanguage && data.defaultLanguage !== language) setLanguage(data.defaultLanguage as any);
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [targetSchoolId]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    
    // Validation for duplicate template names
    for (const level in formData.levels) {
        const templates = formData.levels[level as keyof typeof formData.levels].classTemplates;
        const names = templates.map((t: any) => t.name.trim().toLowerCase());
        const hasDuplicates = names.length !== new Set(names).size;
        if (hasDuplicates) {
            alert(`Error: Duplicate template names found in level ${level}. Each template must have a unique name.`);
            return;
        }
    }

    setSaving(true);
    setSuccessMsg('');
    try {
      const docRef = doc(db, 'schools', targetSchoolId);
      const dataToSave: any = {
        name: formData.schoolName,
        logoUrl: formData.logoUrl,
        currency: formData.currency,
        themeColor: formData.themeColor,
        defaultLanguage: formData.defaultLanguage,
        leadNotificationEmails: formData.leadNotificationEmails,
        leadOutcomes: formData.leadOutcomes,
        hwCoefficient: formData.hwCoefficient,
        examCoefficient: formData.examCoefficient,
        levels: formData.levels,
        updatedAt: serverTimestamp()
      };

      await setDoc(docRef, dataToSave, { merge: true });
      if (!isModal) {
         setPrimaryColor(formData.themeColor);
         setLanguage(formData.defaultLanguage as any);
      }
      setSuccessMsg('Settings updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
       console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-gray-500">Loading settings...</div>;

  return (
    <div className={isModal ? "space-y-8" : "bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-gray-800"}>
      <form onSubmit={handleSave} className="space-y-8">
        {successMsg && (
          <div className="p-4 rounded-2xl bg-green-50 dark:bg-green-900/10 text-green-600 text-sm font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span> {successMsg}
          </div>
        )}

        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-4"><Building className="w-5 h-5"/> General Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">School Name</label>
              <input type="text" value={formData.schoolName} onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })} className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none" />
            </div>
            <div>
               <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Logo</label>
               <input type="file" accept="image/*" onChange={(e) => {
                   const file = e.target.files?.[0];
                   if (file) { const r = new FileReader(); r.onloadend = () => setFormData({...formData, logoUrl: r.result as string}); r.readAsDataURL(file); }
               }} className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none" />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-4"><Building className="w-5 h-5"/> Local & Branding</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Currency</label>
                <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none">
                  <option value="USD">USD</option> <option value="EUR">EUR</option> <option value="MAD">MAD</option>
                </select>
             </div>
             <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Language</label>
                 <select value={formData.defaultLanguage} onChange={e => setFormData({...formData, defaultLanguage: e.target.value})} className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none">
                  <option value="en">English</option> <option value="fr">French</option> <option value="ar">Arabic</option>
                </select>
             </div>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-4"><Building className="w-5 h-5"/> Notifications</h2>
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Lead Notification Emails (comma-separated)</label>
              <input type="text" placeholder="admin@school.com, sales@school.com" value={formData.leadNotificationEmails} onChange={(e) => setFormData({ ...formData, leadNotificationEmails: e.target.value })} className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Lead Event Outcomes (comma-separated)</label>
              <input type="text" placeholder="Interested, Not Interested" value={formData.leadOutcomes?.join(', ')} onChange={(e) => setFormData({ ...formData, leadOutcomes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none" />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-4">Academic & Grading Config</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Homework Average Coefficient</label>
              <input type="number" step="0.1" value={formData.hwCoefficient} onChange={(e) => setFormData({ ...formData, hwCoefficient: Number(e.target.value) })} className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Exam Coefficient</label>
              <input type="number" step="0.1" value={formData.examCoefficient} onChange={(e) => setFormData({ ...formData, examCoefficient: Number(e.target.value) })} className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none" />
            </div>
          </div>
        </div>

        <div className="space-y-6 flex-col">
          <h2 className="text-xl font-bold flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-4">Academic Levels (Seasons, Config)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             {(['nursery', 'primary', 'middle', 'high'] as const).map(level => (
               <div key={level} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl flex justify-between items-center">
                  <div className="capitalize font-bold">{level}</div>
                  <button type="button" onClick={() => setConfiguringLevel(level)} className="px-4 py-2 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 font-bold rounded-lg text-sm">Configure</button>
               </div>
             ))}
          </div>
        </div>

        <button type="submit" disabled={saving} className="px-8 py-4 rounded-2xl text-white font-bold shadow-xl transition-all w-full flex justify-center gap-2" style={{ backgroundColor: primaryColor }}>
           <Save className="w-5 h-5"/> {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>

      {/* Configure Level Modal */}
      <AnimatePresence>
      {configuringLevel && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-gray-900 w-full max-w-4xl rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center z-10 sticky top-0">
                  <h3 className="text-xl font-bold capitalize">Configure: {configuringLevel}</h3>
                  <button type="button" onClick={() => setConfiguringLevel(null)} className="p-2 text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-full"><X className="w-5 h-5"/></button>
              </div>
              <div className="p-6 space-y-8 flex-1 overflow-y-auto">
                 {/* Class Templates */}
                 <div>
                    <div className="flex justify-between mb-4"><h4 className="font-bold">Class Templates & Prices</h4> <button onClick={() => {
                        const next = [...formData.levels[configuringLevel as keyof typeof formData.levels].classTemplates];
                        next.push({ name: '', prices: { education: 0, canteen: { full:0, lunch:0, breakfast:0 }, transport: { round_trip:0, morning:0, return:0 } } } as never);
                        setFormData({...formData, levels: {...formData.levels, [configuringLevel]: {...formData.levels[configuringLevel as keyof typeof formData.levels], classTemplates: next}}});
                    }} className="text-sm bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg">+ Add Template</button></div>
                    
                    <div className="space-y-4">
                       {formData.levels[configuringLevel as keyof typeof formData.levels].classTemplates.map((tpl: any, idx: number) => (
                           <div key={idx} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl relative">
                              <button onClick={() => {
                                 const next = [...formData.levels[configuringLevel as keyof typeof formData.levels].classTemplates]; next.splice(idx, 1);
                                 setFormData({...formData, levels: {...formData.levels, [configuringLevel]: {...formData.levels[configuringLevel as keyof typeof formData.levels], classTemplates: next}}});
                              }} className="absolute top-4 right-4 text-red-500"><Trash className="w-4 h-4"/></button>
                              <input type="text" placeholder="Template Name (CP)" value={tpl.name} onChange={e => {
                                 const next = [...formData.levels[configuringLevel as keyof typeof formData.levels].classTemplates]; next[idx] = {...next[idx], name: e.target.value};
                                 setFormData({...formData, levels: {...formData.levels, [configuringLevel]: {...formData.levels[configuringLevel as keyof typeof formData.levels], classTemplates: next}}});
                              }} className="w-1/2 px-3 py-2 bg-white dark:bg-gray-900 rounded-lg outline-none mb-4 font-bold border border-gray-200 dark:border-gray-700" />
                              <div className="grid grid-cols-3 gap-4">
                                 <div><label className="text-xs">Education Fees</label><input type="number" value={tpl.prices?.education} onChange={e => {
                                    const next = [...formData.levels[configuringLevel as keyof typeof formData.levels].classTemplates]; next[idx].prices.education = Number(e.target.value);
                                    setFormData({...formData, levels: {...formData.levels, [configuringLevel]: {...formData.levels[configuringLevel as keyof typeof formData.levels], classTemplates: next}}});
                                 }} className="w-full bg-white dark:bg-gray-900 py-1 px-2 rounded border border-gray-200" /></div>
                                 <div className="grid grid-cols-2 gap-2">
                                    <div><label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Canteen (Full)</label><input type="number" placeholder="Full" value={tpl.prices?.canteen?.full || ''} onChange={e => {
                                        const next = [...formData.levels[configuringLevel as keyof typeof formData.levels].classTemplates]; next[idx].prices.canteen = {...(next[idx].prices.canteen || {}), full: Number(e.target.value)};
                                        setFormData({...formData, levels: {...formData.levels, [configuringLevel]: {...formData.levels[configuringLevel as keyof typeof formData.levels], classTemplates: next}}});
                                    }} className="w-full bg-white dark:bg-gray-900 py-1 px-2 rounded border border-gray-200 mt-1" /></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Transport (Round Trip)</label><input type="number" placeholder="Round Trip" value={tpl.prices?.transport?.round_trip || ''} onChange={e => {
                                        const next = [...formData.levels[configuringLevel as keyof typeof formData.levels].classTemplates]; next[idx].prices.transport = {...(next[idx].prices.transport || {}), round_trip: Number(e.target.value)};
                                        setFormData({...formData, levels: {...formData.levels, [configuringLevel]: {...formData.levels[configuringLevel as keyof typeof formData.levels], classTemplates: next}}});
                                    }} className="w-full bg-white dark:bg-gray-900 py-1 px-2 rounded border border-gray-200 mt-1" /></div>
                                 </div>
                              </div>
                           </div>
                       ))}
                    </div>
                 </div>

                 {/* Disable Reasons */}
                 <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex justify-between mb-4"><h4 className="font-bold">Subscription Disable Reasons</h4> <button onClick={() => {
                        const next = [...(formData.levels[configuringLevel as keyof typeof formData.levels] as any).disableReasons || []]; next.push('');
                        setFormData({...formData, levels: {...formData.levels, [configuringLevel]: {...formData.levels[configuringLevel as keyof typeof formData.levels], disableReasons: next}}});
                    }} className="text-sm bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg">+ Add Reason</button></div>
                    
                    <div className="space-y-2">
                       {((formData.levels[configuringLevel as keyof typeof formData.levels] as any).disableReasons || []).map((reason: string, idx: number) => (
                           <div key={idx} className="flex gap-2">
                               <input type="text" value={reason} onChange={e => {
                                   const next = [...(formData.levels[configuringLevel as keyof typeof formData.levels] as any).disableReasons]; next[idx] = e.target.value;
                                   setFormData({...formData, levels: {...formData.levels, [configuringLevel]: {...formData.levels[configuringLevel as keyof typeof formData.levels], disableReasons: next}}});
                               }} placeholder="e.g. Moved away, Financial, Rules violation" className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2" />
                               <button onClick={() => {
                                   const next = [...(formData.levels[configuringLevel as keyof typeof formData.levels] as any).disableReasons]; next.splice(idx, 1);
                                   setFormData({...formData, levels: {...formData.levels, [configuringLevel]: {...formData.levels[configuringLevel as keyof typeof formData.levels], disableReasons: next}}});
                               }} className="text-red-500 p-2 bg-red-50 rounded-lg"><Trash className="w-4 h-4"/></button>
                           </div>
                       ))}
                    </div>
                 </div>

              </div>
           </motion.div>
        </div>
      )}
      </AnimatePresence>
    </div>
  );
}
