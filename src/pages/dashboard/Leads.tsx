import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { useTheme } from '../../hooks/useTheme';
import { Users, Phone, Mail, Calendar, UserPlus, CheckCircle, Clock, X, MessageSquare, Code } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Leads() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showApi, setShowApi] = useState(false);
  const [showActionModal, setShowActionModal] = useState<any>(null);
  const [schools, setSchools] = useState<any[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string>('');

  const { schoolId, role, tenantId, isAdmin, isSales } = useAuth();
  const { t } = useLanguage();
  const { primaryColor } = useTheme();

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', phoneCountry: '+212', phone: '', email: '', type: 'Walk-in', reason: '', description: '', schoolId: ''
  });

  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [leadTab, setLeadTab] = useState<'info' | 'events'>('info');
  const [completingAction, setCompletingAction] = useState<any>(null);
  const [outcomeData, setOutcomeData] = useState({ outcome: '', nextDate: '' });
  const [actionData, setActionData] = useState({ type: 'Call', notes: '' });

  const COUNTRY_CODES: Record<string, string> = {
    'Morocco': '+212',
    'France': '+33',
    'United Kingdom': '+44',
    'United States': '+1',
    'Spain': '+34',
    'Germany': '+49'
  };

  useEffect(() => {
    const targetSchoolId = formData.schoolId || selectedSchool || schoolId;
    if (targetSchoolId && schools.length > 0) {
      const sch = schools.find(s => s.id === targetSchoolId);
      if (sch && sch.country && COUNTRY_CODES[sch.country]) {
        setFormData(prev => ({ ...prev, phoneCountry: COUNTRY_CODES[sch.country] }));
      }
    }
  }, [selectedSchool, schoolId, schools, formData.schoolId]);

  useEffect(() => {
    fetchData();
  }, [schoolId, selectedSchool]);

  const fetchData = async () => {
    setLoading(true);
    let qSchoolIds = [];
    if (role === 'superadmin') {
      const sSnap = await getDocs(collection(db, 'schools'));
      setSchools(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      qSchoolIds = sSnap.docs.map(d => d.id);
    } else if (role === 'group_admin' && tenantId) {
      const sSnap = await getDocs(query(collection(db, 'schools'), where('tenantId', '==', tenantId)));
      setSchools(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      qSchoolIds = sSnap.docs.map(d => d.id);
    } else if (schoolId) {
      const sSnap = await getDocs(query(collection(db, 'schools'), where('__name__', '==', schoolId)));
      setSchools(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      qSchoolIds = [schoolId];
    }

    if (qSchoolIds.length === 0) {
      setLeads([]); setLoading(false); return;
    }

    const tSchool = selectedSchool || (qSchoolIds.length === 1 ? qSchoolIds[0] : null);
    let leadsQuery = collection(db, 'leads') as any;
    if (tSchool) {
      leadsQuery = query(leadsQuery, where('schoolId', '==', tSchool), orderBy('createdAt', 'desc'));
    } else {
      leadsQuery = query(leadsQuery, where('schoolId', 'in', qSchoolIds.slice(0, 30)));
    }

    try {
      const lSnap = await getDocs(leadsQuery);
      setLeads(lSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const getLeadOutcomes = (sId: string) => {
    const s = schools.find(sch => sch.id === sId);
    return s?.leadOutcomes || ['Interested', 'Not Interested', 'Want to visit'];
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const targetSchool = formData.schoolId || schoolId || selectedSchool;
      if (!targetSchool) return alert('Select a school');
      
      const combinedPhone = `${formData.phoneCountry} ${formData.phone}`;
      
      const payload = { ...formData };
      delete (payload as any).phoneCountry;

      const q = query(collection(db, 'leads'), where('phone', '==', combinedPhone));
      const existing = await getDocs(q);

      if (!existing.empty) {
        alert('A lead with this phone number already exists.');
        return;
      }

      await addDoc(collection(db, 'leads'), {
        ...payload,
        phone: combinedPhone,
        schoolId: targetSchool,
        status: 'New',
        actions: [],
        source: 'Manual',
        createdAt: serverTimestamp()
      });
      setShowAdd(false);
      setFormData({ firstName: '', lastName: '', phoneCountry: '+212', phone: '', email: '', type: 'Walk-in', reason: '', description: '', schoolId: ''});
      fetchData();
    } catch (e: any) { 
      console.error(e); 
      alert('Error saving lead: ' + (e.message || 'Unknown error')); 
    }
  };

  const handleAddAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    try {
      const leadRef = doc(db, 'leads', selectedLead.id);
      const newAction = { id: Date.now().toString(), type: actionData.type, notes: actionData.notes, date: new Date().toISOString(), done: false };
      const updatedActions = [...(selectedLead.actions || []), newAction];
      await updateDoc(leadRef, { actions: updatedActions, status: 'Contacted' });
      const newLead = { ...selectedLead, actions: updatedActions, status: 'Contacted' };
      setSelectedLead(newLead);
      setLeads(leads.map(l => l.id === newLead.id ? newLead : l));
      setShowActionModal(null); setActionData({ type: 'Call', notes: '' }); 
    } catch (e) { console.error(e); }
  };

  const handleCompleteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !completingAction) return;
    try {
      const leadRef = doc(db, 'leads', selectedLead.id);
      let newGeneratedAction = null;
      
      if (outcomeData.outcome === 'Interested' && outcomeData.nextDate) {
         newGeneratedAction = { id: Date.now().toString() + '1', type: 'Call', notes: 'Follow-up Call', date: outcomeData.nextDate, done: false };
      } else if (outcomeData.outcome === 'Want to visit' && outcomeData.nextDate) {
         newGeneratedAction = { id: Date.now().toString() + '1', type: 'Visit', notes: 'Scheduled Visit', date: outcomeData.nextDate, done: false };
      }

      const updatedActions = selectedLead.actions.map((act: any) => 
        act.id === completingAction.id ? { ...act, done: true, outcome: outcomeData.outcome, completedAt: new Date().toISOString() } : act
      );
      
      if (newGeneratedAction) {
        updatedActions.push(newGeneratedAction);
      }

      await updateDoc(leadRef, { actions: updatedActions });
      const newLead = { ...selectedLead, actions: updatedActions };
      setSelectedLead(newLead);
      setLeads(leads.map(l => l.id === newLead.id ? newLead : l));
      setCompletingAction(null); setOutcomeData({ outcome: '', nextDate: '' });
    } catch (e) { console.error(e); }
  };

  const convertToSubscription = async (lead: any) => {
    if (!confirm('Convert to Student Subscription?')) return;
    try {
      // Create user
      await addDoc(collection(db, 'users'), { name: `${lead.firstName} ${lead.lastName}`, email: lead.email, phone: lead.phone, role: 'student', schoolId: lead.schoolId, createdAt: serverTimestamp() });
      await updateDoc(doc(db, 'leads', lead.id), { status: 'Converted' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  if (!isAdmin && !isSales) return <div>Access Denied</div>;

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
         <div>
           <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">Lead Management</h2>
           <p className="text-gray-500">Track walk-ins, calls, and incoming agency leads.</p>
         </div>
         <div className="flex gap-4">
            <button onClick={() => setShowApi(true)} className="px-6 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-200 transition"><Code className="w-5 h-5"/> Web Service Webhooks</button>
            {(role === 'superadmin' || role === 'group_admin') && (
              <select value={selectedSchool} onChange={e => setSelectedSchool(e.target.value)} className="px-4 py-2 border rounded-xl bg-gray-50 dark:bg-gray-800">
                 <option value="">All Schools</option>
                 {schools.map(s => <option key={s.id} value={s.id}>{s.name || s.id}</option>)}
              </select>
            )}
            <button onClick={() => setShowAdd(true)} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition"><UserPlus className="w-5 h-5"/> Add Lead</button>
         </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {leads.map(lead => (
            <div key={lead.id} className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 py-6 relative">
               <div className={`absolute top-6 right-6 px-3 py-1 rounded-full text-xs font-bold ${lead.status === 'Converted' ? 'bg-green-100 text-green-700' : lead.status === 'New' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                 {lead.status || 'New'}
               </div>
               <h3 className="text-xl font-bold mb-1">{lead.firstName} {lead.lastName}</h3>
               <div className="text-sm font-bold text-gray-400 mb-4 uppercase">{lead.type} - {lead.reason}</div>
               
               <div className="space-y-2 mb-6 text-sm text-gray-600 dark:text-gray-400">
                 <div className="flex items-center gap-2"><Phone className="w-4 h-4"/> {lead.phone}</div>
                 <div className="flex items-center gap-2"><Mail className="w-4 h-4"/> {lead.email}</div>
                 <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl italic">"{lead.description}"</div>
               </div>

               <div className="border-t border-gray-100 dark:border-gray-800 pt-4 flex gap-2">
                 <button onClick={() => setSelectedLead(lead)} className="flex-1 py-2 bg-indigo-50 text-indigo-700 rounded-xl font-bold hover:bg-indigo-100">View Details</button>
                 <button onClick={() => convertToSubscription(lead)} disabled={lead.status === 'Converted'} className="flex-1 py-2 bg-green-50 text-green-700 rounded-xl font-bold hover:bg-green-100 disabled:opacity-50">Convert</button>
               </div>
               
               {lead.actions?.length > 0 && (
                 <div className="mt-4 pt-4 border-t border-gray-100 text-xs">
                   <div className="font-bold text-gray-400 mb-2 uppercase">Recent Actions</div>
                   {lead.actions.map((act: any, i: number) => (
                     <div key={i} className="flex gap-2 mb-1">
                        <span className="font-bold">{act.type}:</span> <span className="text-gray-500 truncate">{act.notes}</span>
                     </div>
                   ))}
                 </div>
               )}
            </div>
          ))}
          {leads.length === 0 && !loading && (
             <div className="col-span-full py-12 text-center text-gray-400 font-bold border-2 border-dashed border-gray-200 rounded-3xl">No leads found in pipeline.</div>
          )}
       </div>

       <AnimatePresence>
         {selectedLead && !completingAction && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-gray-900 rounded-[2rem] w-full max-w-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                  <h3 className="text-2xl font-bold">{selectedLead.firstName} {selectedLead.lastName}</h3>
                  <button onClick={() => setSelectedLead(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><X/></button>
                </div>
                
                <div className="flex border-b border-gray-100 dark:border-gray-800">
                  <button onClick={() => setLeadTab('info')} className={`flex-1 py-4 font-bold text-center border-b-2 ${leadTab === 'info' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}>Information</button>
                  <button onClick={() => setLeadTab('events')} className={`flex-1 py-4 font-bold text-center border-b-2 ${leadTab === 'events' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}>Events & Actions</button>
                </div>

                <div className="p-6 overflow-y-auto">
                  {leadTab === 'info' ? (
                     <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                           <div><span className="text-gray-500">Phone:</span> <div className="font-bold">{selectedLead.phone}</div></div>
                           <div><span className="text-gray-500">Email:</span> <div className="font-bold">{selectedLead.email}</div></div>
                           <div><span className="text-gray-500">Source:</span> <div className="font-bold">{selectedLead.type}</div></div>
                           <div><span className="text-gray-500">Reason:</span> <div className="font-bold">{selectedLead.reason}</div></div>
                           <div><span className="text-gray-500">Status:</span> <div className="font-bold">{selectedLead.status}</div></div>
                           <div><span className="text-gray-500">Created:</span> <div className="font-bold">{new Date(selectedLead.createdAt?.seconds * 1000).toLocaleDateString()}</div></div>
                        </div>
                        <div>
                          <span className="text-gray-500 text-sm">Description/Notes:</span>
                          <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm italic">{selectedLead.description || 'No description provided.'}</div>
                        </div>
                     </div>
                  ) : (
                     <div className="space-y-6">
                        <div className="flex justify-between items-center mb-4">
                           <h4 className="font-bold text-lg">Action History</h4>
                           <button onClick={() => setShowActionModal(selectedLead)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700"><Calendar className="w-4 h-4"/> Schedule Action</button>
                        </div>
                        {selectedLead.actions && selectedLead.actions.length > 0 ? (
                           <div className="space-y-3">
                             {selectedLead.actions.map((act: any, i: number) => (
                               <div key={i} className={`p-4 rounded-xl border ${act.done ? 'bg-gray-50 border-gray-100 dark:bg-gray-800 dark:border-gray-700' : 'bg-white border-indigo-100 shadow-sm'}`}>
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <div className="font-bold flex items-center gap-2">
                                        {act.type} 
                                        {act.done ? <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Completed</span> : <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">Pending</span>}
                                      </div>
                                      <div className="text-sm text-gray-500 mt-1">{act.notes}</div>
                                      {act.date && <div className="text-xs text-gray-400 mt-2 flex items-center gap-1"><Clock className="w-3 h-3"/> Scheduled: {new Date(act.date).toLocaleString()}</div>}
                                      {act.outcome && <div className="text-sm font-bold text-indigo-600 mt-2">Outcome: {act.outcome}</div>}
                                    </div>
                                    {!act.done && (
                                      <button onClick={() => setCompletingAction(act)} className="px-3 py-1.5 bg-green-50 text-green-700 text-sm font-bold rounded-lg hover:bg-green-100 flex items-center gap-1"><CheckCircle className="w-4 h-4"/> Mark Done</button>
                                    )}
                                  </div>
                               </div>
                             ))}
                           </div>
                        ) : (
                           <div className="text-center py-8 text-gray-500">No actions logged yet.</div>
                        )}
                     </div>
                  )}
                </div>
             </motion.div>
           </div>
         )}

         {completingAction && (
           <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-gray-900 rounded-[2rem] w-full max-w-sm shadow-xl p-6">
                <h3 className="font-bold text-lg mb-4">Complete Action</h3>
                <form onSubmit={handleCompleteAction} className="space-y-4">
                   <div>
                     <label className="block text-sm font-bold mb-2">Outcome</label>
                     <select required value={outcomeData.outcome} onChange={e => setOutcomeData({...outcomeData, outcome: e.target.value})} className="w-full px-4 py-3 border rounded-xl">
                       <option value="">Select Outcome...</option>
                       {getLeadOutcomes(selectedLead?.schoolId).map((o: string) => <option key={o} value={o}>{o}</option>)}
                     </select>
                   </div>
                   
                   {(outcomeData.outcome === 'Interested' || outcomeData.outcome === 'Want to visit') && (
                     <div>
                       <label className="block text-sm font-bold mb-2">{outcomeData.outcome === 'Interested' ? 'Next Follow-up Call' : 'Visit Date'}</label>
                       <input type="datetime-local" required value={outcomeData.nextDate} onChange={e => setOutcomeData({...outcomeData, nextDate: e.target.value})} className="w-full px-4 py-3 border rounded-xl"/>
                     </div>
                   )}

                   <div className="flex gap-2 pt-2">
                     <button type="button" onClick={() => { setCompletingAction(null); setOutcomeData({outcome:'', nextDate:''}); }} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">Cancel</button>
                     <button type="submit" className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold">Complete</button>
                   </div>
                </form>
             </motion.div>
           </div>
         )}
         {showAdd && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-gray-900 rounded-[2rem] w-full max-w-lg shadow-xl overflow-hidden">
               <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between"><h3 className="text-xl font-bold">New Lead</h3><button onClick={() => setShowAdd(false)}><X/></button></div>
               <form onSubmit={handleAddLead} className="p-6 space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                   <input type="text" required placeholder="First Name" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full px-4 py-3 rounded-xl border" />
                   <input type="text" required placeholder="Last Name" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full px-4 py-3 rounded-xl border" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="flex gap-1 border rounded-xl overflow-hidden">
                      <select value={formData.phoneCountry || '+212'} onChange={e => setFormData({...formData, phoneCountry: e.target.value})} className="px-2 py-3 bg-gray-50 border-r border-gray-200 outline-none text-xs">
                        <option value="+212">🇲🇦 +212</option>
                        <option value="+1">🇺🇸 +1</option>
                        <option value="+44">🇬🇧 +44</option>
                        <option value="+33">🇫🇷 +33</option>
                        <option value="+34">🇪🇸 +34</option>
                        <option value="+49">🇩🇪 +49</option>
                      </select>
                      <input type="text" required placeholder="Phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-3 outline-none min-w-0" />
                   </div>
                   <input type="email" placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 rounded-xl border" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-4 py-3 rounded-xl border">
                      <option value="Walk-in">Walk-in</option>
                      <option value="Call">Call</option>
                      <option value="Agency">Agency (Web)</option>
                      <option value="Social">Social Media</option>
                   </select>
                   <input type="text" required placeholder="Reason/Interest" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} className="w-full px-4 py-3 rounded-xl border" />
                 </div>
                 <textarea placeholder="Description or Notes" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-3 rounded-xl border min-h-[100px]"></textarea>
                 {schools.length > 0 && !schoolId && !selectedSchool && <select required value={formData.schoolId} onChange={e => setFormData({...formData, schoolId: e.target.value})} className="w-full px-4 py-3 rounded-xl border"><option value="">Select School</option>{schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>}
                 <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold">Add Lead</button>
               </form>
             </motion.div>
           </div>
         )}
         {showActionModal && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-gray-900 rounded-[2rem] w-full max-w-sm shadow-xl p-6">
                <h3 className="font-bold text-lg mb-4">Log Action</h3>
                <form onSubmit={handleAddAction} className="space-y-4">
                   <select value={actionData.type} onChange={e => setActionData({...actionData, type: e.target.value})} className="w-full px-4 py-3 border rounded-xl">
                     <option value="Call">Phone Call</option>
                     <option value="Visit">School Visit</option>
                     <option value="Email">Email Sent</option>
                   </select>
                   <textarea required placeholder="Action notes..." value={actionData.notes} onChange={e => setActionData({...actionData, notes: e.target.value})} className="w-full px-4 py-3 border rounded-xl"></textarea>
                   <div className="flex gap-2">
                     <button type="button" onClick={() => setShowActionModal(null)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">Cancel</button>
                     <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Save</button>
                   </div>
                </form>
             </motion.div>
           </div>
         )}
         {showApi && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-gray-900 rounded-[2rem] w-full max-w-2xl shadow-xl overflow-hidden">
               <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between">
                 <h3 className="text-xl font-bold flex items-center gap-2"><Code className="w-5 h-5"/> Web Service Integration</h3>
                 <button onClick={() => setShowApi(false)}><X/></button>
               </div>
               <div className="p-6">
                 <p className="text-gray-500 mb-4 text-sm">Send this information to your marketing agency (Facebook Lead Ads, Web developers) to inject leads directly into this CRM.</p>
                 
                 <div className="mb-6">
                   <h4 className="font-bold mb-2">1. Webhook API Endpoint</h4>
                   <div className="bg-gray-900 text-green-400 p-4 rounded-xl font-mono text-xs overflow-x-auto">
                      POST {window.location.origin}/api/leads
                   </div>
                 </div>

                 <div className="mb-6">
                   <h4 className="font-bold mb-2">2. JSON Payload Format</h4>
                   <div className="bg-gray-900 text-blue-300 p-4 rounded-xl font-mono text-xs overflow-x-auto whitespace-pre">
{`{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+212 1234567890",
  "type": "Facebook",
  "reason": "Advertising",
  "schoolId": "${selectedSchool || schoolId || 'YOUR_SCHOOL_ID'}"
}`}
                   </div>
                 </div>

                 <div className="mb-4">
                   <h4 className="font-bold mb-2">3. Direct Landing Page</h4>
                   <p className="text-sm text-gray-500 mb-2">You can also direct traffic directly to the pre-built landing page form:</p>
                   <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-xl font-mono text-xs text-gray-700 dark:text-gray-300">
                     {window.location.origin}/landing
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
