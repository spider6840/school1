import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { useTheme } from '../../hooks/useTheme';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { FileText, Plus, Search, DollarSign, Edit, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Subscription {
  id: string;
  studentId: string;
  classId: string;
  season: string;
  status: 'active' | 'disabled';
  createdAt: any;
  overridePayment: boolean;
  services: {
    education: boolean | { enabled: boolean; discount: number };
    canteen: boolean | { enabled: boolean; discount: number; subType?: string };
    transport: boolean | { enabled: boolean; discount: number; subType?: string };
  };
}

interface Payment {
  id: string;
  subscriptionId: string;
  amount: number;
  reference: string;
  type: 'check' | 'transfer' | 'cash';
  status: 'pending' | 'paid' | 'sent_to_bank' | 'unpaid';
  dueDate: string;
  period?: string;
  payerName?: string;
}

interface Class { 
  id: string; 
  name: string; 
  level?: string;
  prices?: { education: number; canteen: number; transport: number; };
  seasons?: Record<string, {
    education?: number;
    canteen?: { full?: number; lunch?: number; breakfast?: number } | number;
    transport?: { round_trip?: number; morning?: number; return?: number } | number;
  }>;
}
interface User { uid: string; name: string; parentEmail1?: string; parentEmail2?: string; }

export default function Subscriptions() {
  const { schoolId, tenantId, role, schoolData } = useAuth();
  const { t } = useLanguage();
  const { primaryColor } = useTheme();

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<Record<string, Payment[]>>({});
  const [classes, setClasses] = useState<Record<string, Class>>({});
  const [students, setStudents] = useState<Record<string, User>>({});
  
  const [loading, setLoading] = useState(true);
  const [showAddSub, setShowAddSub] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState<string | null>(null);

  // Form State - Subscription
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [season, setSeason] = useState('2025/2026');
  const [services, setServices] = useState({ 
    education: { enabled: true, discount: 0 }, 
    canteen: { enabled: false, discount: 0, subType: 'full' }, 
    transport: { enabled: false, discount: 0, subType: 'round_trip' } 
  });
  const [overridePayment, setOverridePayment] = useState(false);

  // Form State - Payment
  const [payAmount, setPayAmount] = useState('');
  const [payRef, setPayRef] = useState('');
  const [payType, setPayType] = useState<'check' | 'transfer' | 'cash'>('cash');
  const [payStatus, setPayStatus] = useState<'pending' | 'paid' | 'sent_to_bank' | 'unpaid'>('paid');
  const [payDue, setPayDue] = useState('');
  const [payPeriod, setPayPeriod] = useState('');
  const [payPayer, setPayPayer] = useState('');

  const [showScheduleModal, setShowScheduleModal] = useState<Subscription | null>(null);

  const calculateMonthlyDue = (sub: Subscription) => {
    const cls = classes[sub.classId];
    let total = 0;
    if (cls) {
      const ed = sub.services.education as any;
      const ca = sub.services.canteen as any;
      const tr = sub.services.transport as any;

      const seasonPrices = cls.seasons?.[sub.season] || null;
      const levelPrices = cls.level ? schoolData?.levels?.[cls.level]?.prices : null;
      const basePrices = seasonPrices || levelPrices || cls.prices || { education: 0, canteen: { full: 0, lunch: 0, breakfast: 0 }, transport: { round_trip: 0, morning: 0, return: 0 } };
      
      if (ed === true || ed?.enabled) total += (basePrices.education || 0) - (ed?.discount || 0);
      if (ca === true || ca?.enabled) {
         const subType = ca?.subType || 'full';
         const cPrice = typeof basePrices.canteen === 'object' ? (basePrices.canteen[subType] || 0) : (basePrices.canteen || 0);
         total += cPrice - (ca?.discount || 0);
      }
      if (tr === true || tr?.enabled) {
         const subType = tr?.subType || 'round_trip';
         const tPrice = typeof basePrices.transport === 'object' ? (basePrices.transport[subType] || 0) : (basePrices.transport || 0);
         total += tPrice - (tr?.discount || 0);
      }
    }
    return total;
  };

  const openPaymentModal = (sub: Subscription) => {
    const cls = classes[sub.classId];
    let total = 0;
    if (cls) {
      const ed = sub.services.education as any;
      const ca = sub.services.canteen as any;
      const tr = sub.services.transport as any;

      // Fallback to class prices if level prices are not defined
      const seasonPrices = cls.seasons?.[sub.season] || null;
      const levelPrices = cls.level ? schoolData?.levels?.[cls.level]?.prices : null;
      const basePrices = seasonPrices || levelPrices || cls.prices || { education: 0, canteen: { full: 0, lunch: 0, breakfast: 0 }, transport: { round_trip: 0, morning: 0, return: 0 } };
      
      if (ed === true || ed?.enabled) total += (basePrices.education || 0) - (ed?.discount || 0);
      if (ca === true || ca?.enabled) {
         const subType = ca?.subType || 'full';
         const cPrice = typeof basePrices.canteen === 'object' ? (basePrices.canteen[subType] || 0) : (basePrices.canteen || 0);
         total += cPrice - (ca?.discount || 0);
      }
      if (tr === true || tr?.enabled) {
         const subType = tr?.subType || 'round_trip';
         const tPrice = typeof basePrices.transport === 'object' ? (basePrices.transport[subType] || 0) : (basePrices.transport || 0);
         total += tPrice - (tr?.discount || 0);
      }
    }
    
    const monthlyDue = calculateMonthlyDue(sub);
    setPayAmount(monthlyDue > 0 ? monthlyDue.toString() : '');
    setPayRef('');
    setPayType('cash');
    setPayStatus('paid');
    
    const today = new Date().toISOString().split('T')[0];
    setPayDue(today);
    setPayPeriod('');
    
    // Default Payer to parent email if string exists
    const stu = students[sub.studentId];
    setPayPayer(stu?.parentEmail1 || '');
    
    setShowPaymentModal(sub.id);
  };

  useEffect(() => {
    if (schoolId || role === 'superadmin' || role === 'group_admin') {
      fetchCoreData();
    }
  }, [schoolId, role]);

  const fetchCoreData = async () => {
    try {
      setLoading(true);
      
      let schoolIdsToFetch = schoolId ? [schoolId] : [];
      if (role === 'group_admin' && tenantId) {
        const sSnap = await getDocs(query(collection(db, 'schools'), where('tenantId', '==', tenantId)));
        schoolIdsToFetch = sSnap.docs.map(d => d.id);
      }
      
      // If group_admin has no schools, return early
      if (role === 'group_admin' && schoolIdsToFetch.length === 0) {
         setClasses({}); setStudents({}); setSubscriptions([]); setPayments({});
         return;
      }

      // Fetch classes
      let clsQuery = collection(db, 'classes') as any;
      if (schoolId) clsQuery = query(clsQuery, where('schoolId', '==', schoolId));
      else if (role === 'group_admin') clsQuery = query(clsQuery, where('schoolId', 'in', schoolIdsToFetch.slice(0, 30)));
      
      const clsSnap = await getDocs(clsQuery);
      const clsMap: Record<string, Class> = {};
      clsSnap.forEach(d => clsMap[d.id] = { id: d.id, ...d.data() } as Class);
      setClasses(clsMap);

      // Fetch students
      let stuQuery = query(collection(db, 'users'), where('role', '==', 'student')) as any;
      if (schoolId) stuQuery = query(stuQuery, where('schoolId', '==', schoolId));
      else if (role === 'group_admin') stuQuery = query(stuQuery, where('schoolId', 'in', schoolIdsToFetch.slice(0, 30)));

      const stuSnap = await getDocs(stuQuery);
      const stuMap: Record<string, User> = {};
      stuSnap.forEach(d => stuMap[d.id] = { uid: d.id, ...d.data() } as User);
      setStudents(stuMap);

      // Fetch subscriptions
      let subQuery = collection(db, 'subscriptions') as any;
      if (schoolId) subQuery = query(subQuery, where('schoolId', '==', schoolId));
      else if (role === 'group_admin') subQuery = query(subQuery, where('schoolId', 'in', schoolIdsToFetch.slice(0, 30)));

      const subSnap = await getDocs(subQuery);
      const subList: Subscription[] = [];
      subSnap.forEach(d => subList.push({ id: d.id, ...d.data() } as Subscription));
      setSubscriptions(subList);

      // Fetch payments
      let payQuery = collection(db, 'payments') as any;
      if (schoolId) payQuery = query(payQuery, where('schoolId', '==', schoolId));
      else if (role === 'group_admin') payQuery = query(payQuery, where('schoolId', 'in', schoolIdsToFetch.slice(0, 30)));

      const paySnap = await getDocs(payQuery);
      const pMap: Record<string, Payment[]> = {};
      paySnap.forEach(d => {
        const p = { id: d.id, ...d.data() } as Payment;
        if (!pMap[p.subscriptionId]) pMap[p.subscriptionId] = [];
        pMap[p.subscriptionId].push(p);
      });
      setPayments(pMap);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    const st = students[selectedStudent];
    if (!st || (!st.parentEmail1 && !st.parentEmail2)) {
      alert("Student must have at least one parent configured.");
      return;
    }
    
    // Check if subscription to this season already exists
    const exists = subscriptions.find(s => s.studentId === selectedStudent && s.season === season);
    if (exists) {
      alert("This student already has an inscription for this season.");
      return;
    }

    try {
      await addDoc(collection(db, 'subscriptions'), {
        schoolId,
        studentId: selectedStudent,
        classId: selectedClass,
        season,
        services,
        status: overridePayment ? 'active' : 'disabled',
        overridePayment,
        createdAt: serverTimestamp()
      });
      setShowAddSub(false);
      fetchCoreData();
    } catch (err: any) {
      console.error(err);
      alert('Error creating subscription');
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPaymentModal) return;
    try {
      await addDoc(collection(db, 'payments'), {
        schoolId,
        subscriptionId: showPaymentModal,
        amount: parseFloat(payAmount),
        reference: payRef,
        type: payType,
        status: payStatus,
        dueDate: payDue,
        period: payPeriod,
        payerName: payPayer,
        createdAt: serverTimestamp()
      });

      // Simple auto-activation logic if paid
      const sub = subscriptions.find(s => s.id === showPaymentModal);
      if (sub && sub.status === 'disabled' && payStatus === 'paid') {
        await updateDoc(doc(db, 'subscriptions', sub.id), { status: 'active' });
      }

      setShowPaymentModal(null);
      fetchCoreData();
    } catch (err) {
      console.error(err);
      alert('Error adding payment');
    }
  };

  const toggleSubStatus = async (sub: Subscription) => {
    const newStatus = sub.status === 'active' ? 'disabled' : 'active';
    try {
      await updateDoc(doc(db, 'subscriptions', sub.id), { status: newStatus });
      fetchCoreData();
    } catch (e) {
      console.error(e);
    }
  };

  const markPaymentPaid = async (payId: string, subId: string) => {
    try {
      await updateDoc(doc(db, 'payments', payId), { status: 'paid' });
      // Auto-activate the subscription too
      const sub = subscriptions.find(s => s.id === subId);
      if (sub && sub.status === 'disabled') {
         await updateDoc(doc(db, 'subscriptions', subId), { status: 'active' });
      }
      fetchCoreData();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Subscriptions & Payments')}</h1>
            <p className="text-gray-500 text-sm mt-1">{t('Manage student inscriptions and financial tracking')}</p>
          </div>
        </div>
        {(role === 'admin' || role === 'superadmin') && (
          <button
            onClick={() => setShowAddSub(!showAddSub)}
            className="px-5 py-2.5 rounded-xl text-white font-medium flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-transform"
            style={{ backgroundColor: primaryColor }}
          >
            <Plus className="w-5 h-5" /> New Inscription
          </button>
        )}
      </div>

      <AnimatePresence>
        {showAddSub && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden overflow-visible"
          >
            <form onSubmit={handleCreateSubscription} className="p-8 space-y-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('Student')}</label>
                  <select required value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none text-gray-900 dark:text-white">
                    <option value="">{t('Select... (Must have parent)')}</option>
                    {(Object.values(students) as User[]).map(s => (
                       <option key={s.uid} value={s.uid} disabled={!s.parentEmail1 && !s.parentEmail2}>
                         {s.name} {!s.parentEmail1 && !s.parentEmail2 ? `(${t('No Parent')})` : ''}
                       </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('Class')}</label>
                  <select required value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none text-gray-900 dark:text-white">
                    <option value="">{t('Select...')}</option>
                    {(Object.values(classes) as Class[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('Season')}</label>
                  <input required placeholder="2025/2026" value={season} onChange={e => setSeason(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none text-gray-900 dark:text-white" />
                </div>
              </div>

               <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-2xl">
                 <h4 className="font-bold text-gray-900 dark:text-white mb-4">{t('Required Services & Discounts')}</h4>
                 <div className="space-y-4">
                    
                    <div className="flex items-center gap-4 flex-wrap bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                      <label className="flex items-center gap-2 cursor-pointer min-w-[120px]">
                        <input type="checkbox" checked={services.education.enabled} onChange={e => setServices(s => ({...s, education: { ...s.education, enabled: e.target.checked }}))} className="w-5 h-5 rounded text-blue-600 border-gray-300 focus:ring-blue-500" />
                        <span className="font-bold text-gray-700 dark:text-gray-300">{t('Education')}</span>
                      </label>
                      {services.education.enabled && (
                        <div className="flex items-center gap-2 text-sm ml-auto">
                          <span className="text-gray-500">{t('Discount')}:</span>
                          <input type="number" min="0" value={services.education.discount} onChange={e => setServices(s => ({...s, education: { ...s.education, discount: Number(e.target.value) }}))} className="w-20 px-2 py-1 rounded bg-gray-50 dark:bg-gray-800 border-none outline-none" placeholder="$0" />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 flex-wrap bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                      <label className="flex items-center gap-2 cursor-pointer min-w-[120px]">
                        <input type="checkbox" checked={services.canteen.enabled} onChange={e => setServices(s => ({...s, canteen: { ...s.canteen, enabled: e.target.checked }}))} className="w-5 h-5 rounded text-blue-600 border-gray-300 focus:ring-blue-500" />
                        <span className="font-bold text-gray-700 dark:text-gray-300">{t('Canteen')}</span>
                      </label>
                      {services.canteen.enabled && (
                        <>
                          <select value={services.canteen.subType} onChange={e => setServices(s => ({...s, canteen: { ...s.canteen, subType: e.target.value }}))} className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 bg-gray-50 dark:bg-gray-800 outline-none">
                            <option value="full">{t('Full Meals')}</option>
                            <option value="lunch">{t('Lunch Only')}</option>
                            <option value="breakfast">{t('Breakfast Only')}</option>
                          </select>
                          <div className="flex items-center gap-2 text-sm ml-auto">
                            <span className="text-gray-500">{t('Discount')}:</span>
                            <input type="number" min="0" value={services.canteen.discount} onChange={e => setServices(s => ({...s, canteen: { ...s.canteen, discount: Number(e.target.value) }}))} className="w-20 px-2 py-1 rounded bg-gray-50 dark:bg-gray-800 border-none outline-none" placeholder="$0" />
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-4 flex-wrap bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                      <label className="flex items-center gap-2 cursor-pointer min-w-[120px]">
                        <input type="checkbox" checked={services.transport.enabled} onChange={e => setServices(s => ({...s, transport: { ...s.transport, enabled: e.target.checked }}))} className="w-5 h-5 rounded text-blue-600 border-gray-300 focus:ring-blue-500" />
                        <span className="font-bold text-gray-700 dark:text-gray-300">{t('Transport')}</span>
                      </label>
                      {services.transport.enabled && (
                        <>
                          <select value={services.transport.subType} onChange={e => setServices(s => ({...s, transport: { ...s.transport, subType: e.target.value }}))} className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 bg-gray-50 dark:bg-gray-800 outline-none">
                            <option value="round_trip">{t('Round Trip')}</option>
                            <option value="morning">{t('Morning Coming')}</option>
                            <option value="return">{t('Return Home')}</option>
                          </select>
                          <div className="flex items-center gap-2 text-sm ml-auto">
                            <span className="text-gray-500">{t('Discount')}:</span>
                            <input type="number" min="0" value={services.transport.discount} onChange={e => setServices(s => ({...s, transport: { ...s.transport, discount: Number(e.target.value) }}))} className="w-20 px-2 py-1 rounded bg-gray-50 dark:bg-gray-800 border-none outline-none" placeholder="$0" />
                          </div>
                        </>
                      )}
                    </div>

                 </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                 <input type="checkbox" checked={overridePayment} onChange={e => setOverridePayment(e.target.checked)} className="w-5 h-5 rounded text-yellow-600" />
                 <span className="text-yellow-800 dark:text-yellow-200 font-medium">{t('Auto-activate without payment (Director Override)')}</span>
              </label>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button type="submit" className="px-6 py-2.5 rounded-xl text-white font-medium" style={{ backgroundColor: primaryColor }}>{t('Create Inscription')}</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        {loading ? <div className="p-8 text-center">Loading...</div> : subscriptions.length === 0 ? <div className="p-8 text-center text-gray-500">No subscriptions found</div> : 
          subscriptions.map(sub => {
            const stu = students[sub.studentId];
            const cls = classes[sub.classId];
            const subPays = payments[sub.id] || [];

            return (
              <div key={sub.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{stu?.name || 'Unknown'}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${sub.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {sub.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Class: {cls?.name || 'Unknown'} | Season: {sub.season}</p>
                    </div>
                    <button onClick={() => toggleSubStatus(sub)} className="text-sm px-4 py-2 border rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800">Toggle Status</button>
                  </div>
                  
                  <div className="mt-4 flex gap-2 flex-wrap">
                    {Object.entries(sub.services).map(([key, val]) => {
                      const enabled = val === true || (val as any)?.enabled;
                      if (!enabled) return null;
                      const subType = (val as any)?.subType;
                      const discount = (val as any)?.discount;
                      return (
                        <span key={key} className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-lg text-sm flex items-center gap-1">
                          <span className="capitalize">{key}</span>
                          {subType && <span className="text-xs opacity-70">({t(subType)})</span>}
                          {discount > 0 && <span className="text-xs font-bold text-green-600">-{discount}</span>}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="w-full md:w-[400px] bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-gray-900 dark:text-white">{t('Payments')}</h4>
                    <div className="flex gap-2">
                       <button onClick={() => setShowScheduleModal(sub)} className="text-sm px-3 py-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-200 transition-colors flex items-center gap-1">{t('Schedule')}</button>
                       <button onClick={() => openPaymentModal(sub)} className="text-sm px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 transition-colors flex items-center gap-1">+ {t('Add')}</button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {subPays.length === 0 ? <p className="text-xs text-gray-500 text-center">No payments logged yet.</p> :
                      subPays.map(p => (
                         <div key={p.id} className="flex justify-between items-center bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-700 text-sm">
                           <div>
                              <div className="font-bold flex items-center gap-1">
                                {p.type} <span className="text-xs text-gray-400">({p.reference})</span>
                              </div>
                              <div className="text-xs text-gray-500">Due: {p.dueDate}</div>
                           </div>
                           <div className="text-right">
                              <div className="font-bold font-mono py-1">${p.amount}</div>
                              <div className="flex items-center justify-end gap-1 mt-1">
                                <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${
                                  p.status === 'paid' ? 'bg-green-100 text-green-700' :
                                  p.status === 'sent_to_bank' ? 'bg-blue-100 text-blue-700' :
                                  p.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                }`}>{t(p.status)}</span>
                                {p.status !== 'paid' && role !== 'teacher' && role !== 'student' && role !== 'parent' && (
                                  <button onClick={() => markPaymentPaid(p.id, sub.id)} className="text-gray-400 hover:text-green-600" title={t("Mark as Paid")}>
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                )}
                                <button onClick={() => {
                                  // Call print feature on Payments context or copy print logic here
                                  const printWindow = window.open('', '_blank');
                                  if (printWindow) {
                                    const logoHtml = schoolData?.logoUrl 
                                      ? `<img src="${schoolData.logoUrl}" alt="School Logo" style="max-height: 80px; max-width: 200px; object-fit: contain;">`
                                      : `<h2 style="color:${primaryColor}; margin:0; font-size: 28px; text-transform: uppercase;">${schoolData?.name || 'School Name'}</h2>`;

                                    printWindow.document.write(`
                                      <!DOCTYPE html>
                                      <html>
                                        <head>
                                          <title>Receipt_PDF_${p.reference || p.id}</title>
                                          <style>
                                            @page { size: A4 portrait; margin: 0; }
                                            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 40px; color: #1e293b; background: white; -webkit-print-color-adjust: exact; color-adjust: exact; print-color-adjust: exact; }
                                            .container { max-width: 800px; margin: 0 auto; box-sizing: border-box; }
                                            .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 30px; border-bottom: 2px solid #f1f5f9; margin-bottom: 40px; }
                                            .receipt-title { font-size: 32px; font-weight: 800; color: ${primaryColor || '#4f46e5'}; text-transform: uppercase; letter-spacing: 1px; margin: 0; line-height: 1; }
                                            .receipt-subtitle { font-size: 14px; color: #64748b; margin-top: 8px; font-weight: 600; }
                                            
                                            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 40px; }
                                            .item-group { background: #f8fafc; padding: 15px 20px; border-radius: 12px; border: 1px solid #e2e8f0; }
                                            .label { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin-bottom: 6px; font-weight: 700; }
                                            .value { font-size: 15px; font-weight: 600; color: #0f172a; }
                                            
                                            .amount-box { background: ${primaryColor || '#4f46e5'}; padding: 30px; border-radius: 16px; text-align: center; margin-top: 40px; color: white; display: flex; justify-content: space-between; align-items: center; }
                                            .amount-label { font-size: 14px; text-transform: uppercase; letter-spacing: 2px; font-weight: 700; opacity: 0.9; }
                                            .amount-value { font-size: 42px; font-weight: 900; }
                                            
                                            .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
                                            .stamp { font-size: 18px; font-weight: bold; color: #10b981; border: 3px solid #10b981; border-radius: 8px; padding: 10px 20px; display: inline-block; transform: rotate(-10deg); margin-top: 30px; }
                                            
                                            .action-buttons { text-align: right; margin-bottom: 30px; background: #f8fafc; padding: 15px; border-radius: 12px; }
                                            .print-btn { padding: 12px 24px; background: ${primaryColor || '#4f46e5'}; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
                                            .print-btn:hover { opacity: 0.9; }
                                            @media print { 
                                              body { padding: 20px; }
                                              .action-buttons { display: none !important; } 
                                              .container { width: 100%; max-width: none; }
                                              .item-group { break-inside: avoid; }
                                            }
                                          </style>
                                        </head>
                                        <body>
                                          <div class="container">
                                            <div class="action-buttons">
                                              <button class="print-btn" onclick="window.print()">Print or Save as PDF</button>
                                              <div style="font-size:12px; color:#64748b; margin-top:10px;">Select 'Save as PDF' in the print dialog.</div>
                                            </div>
                                            
                                            <div class="header">
                                              <div>
                                                ${logoHtml}
                                                <div style="margin-top:20px; color:#64748b; font-size:14px; font-weight:500;">
                                                  ${schoolData?.name || 'Academic Institution'}<br/>
                                                  Invoice No. #${p.reference || p.id.substring(0,8)}<br/>
                                                  Date: ${new Date().toLocaleDateString()}
                                                </div>
                                              </div>
                                              <div style="text-align: right;">
                                                <h1 class="receipt-title">RECEIPT</h1>
                                                <div class="receipt-subtitle">Official Payment Record</div>
                                              </div>
                                            </div>
                                            
                                            <div class="grid">
                                              <div class="item-group">
                                                <div class="label">Received From</div>
                                                <div class="value">${p.payerName || 'N/A'}</div>
                                              </div>
                                              <div class="item-group">
                                                <div class="label">For Student</div>
                                                <div class="value">${stu?.name || 'N/A'}</div>
                                              </div>
                                              <div class="item-group">
                                                <div class="label">Academic Season & Class</div>
                                                <div class="value">${sub.season || 'N/A'} — ${cls?.name || 'N/A'}</div>
                                              </div>
                                              <div class="item-group">
                                                <div class="label">Paid Period / Month</div>
                                                <div class="value">${p.period || 'N/A'}</div>
                                              </div>
                                              <div class="item-group">
                                                <div class="label">Payment Method</div>
                                                <div class="value" style="text-transform: capitalize;">${p.type || 'Cash'}</div>
                                              </div>
                                              <div class="item-group">
                                                <div class="label">Payment Status</div>
                                                <div class="value" style="text-transform: uppercase;">${p.status}</div>
                                              </div>
                                            </div>
                                            
                                            <div class="amount-box">
                                              <div class="amount-label">Total Amount Paid</div>
                                              <div class="amount-value">$${p.amount?.toFixed(2) || '0.00'}</div>
                                            </div>

                                            <div style="text-align: right; margin-top: 10px;">
                                              <div class="stamp">PAID / VERIFIED</div>
                                            </div>
                                            
                                            <div class="footer">
                                              This receipt is electronically generated and constitutes a valid proof of payment.<br/>
                                              Printed on ${new Date().toLocaleString()}
                                            </div>
                                          </div>
                                        </body>
                                      </html>
                                    `);
                                    printWindow.document.close();
                                  }
                                }} className="text-gray-400 hover:text-indigo-600 ml-2" title={t("Print Receipt")}>
                                  <FileText className="w-4 h-4" />
                                </button>
                              </div>
                           </div>
                         </div>
                      ))
                    }
                  </div>
                </div>
              </div>
            );
          })
        }
      </div>

      {showScheduleModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} flex-initial animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-gray-900 rounded-[2rem] w-full max-w-3xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold">{t('Payment Schedule')} - {students[showScheduleModal.studentId]?.name}</h3>
                <p className="text-gray-500 mt-1">{t('Monthly allocation of paid amounts')}</p>
              </div>
              <button onClick={() => setShowScheduleModal(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                 <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-xs uppercase text-gray-500 tracking-wider border-b border-gray-100 dark:border-gray-800">
                    <th className="pb-3">{t('Month')}</th>
                    <th className="pb-3">{t('Due')}</th>
                    <th className="pb-3">{t('Paid')}</th>
                    <th className="pb-3">{t('Balance')}</th>
                    <th className="pb-3">{t('Status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {(() => {
                    const monthlyDue = calculateMonthlyDue(showScheduleModal);
                    const months = ['September', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May', 'June'];
                    let totalPaid = payments[showScheduleModal.id]?.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0) || 0;
                    
                    return months.map((month, i) => {
                      let allocated = 0;
                      if (totalPaid >= monthlyDue) {
                        allocated = monthlyDue;
                        totalPaid -= monthlyDue;
                      } else if (totalPaid > 0) {
                        allocated = totalPaid;
                        totalPaid = 0;
                      }
                      
                      const balance = monthlyDue - allocated;
                      const status = balance === 0 ? 'PAID' : (allocated > 0 ? 'PARTIAL' : 'UNPAID');

                      return (
                        <tr key={month}>
                          <td className="py-4 font-bold text-gray-900 dark:text-white">{t(month)}</td>
                          <td className="py-4 font-mono">${monthlyDue}</td>
                          <td className="py-4 font-mono text-green-600">${allocated.toFixed(2)}</td>
                          <td className="py-4 font-mono text-red-600">${balance.toFixed(2)}</td>
                          <td className="py-4">
                            <span className={`px-2 py-1 rounded-md text-[10px] font-black tracking-widest ${status === 'PAID' ? 'bg-green-100 text-green-700' : status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                              {t(status)}
                            </span>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>

              {(() => {
                 const totalPaid = payments[showScheduleModal.id]?.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0) || 0;
                 const monthlyDue = calculateMonthlyDue(showScheduleModal);
                 const surplus = totalPaid - (monthlyDue * 10);
                 if (surplus > 0) {
                   return (
                     <div className="mt-6 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-300 font-bold flex justify-between items-center border border-indigo-100 dark:border-indigo-800">
                        <span>{t('Surplus from payments (carried forward)')}</span>
                        <span className="font-mono text-lg">+ ${surplus.toFixed(2)}</span>
                     </div>
                   );
                 }
                 return null;
              })()}
            </div>
          </motion.div>
        </div>
      )}

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 p-8 max-w-sm w-full">
            <h3 className="text-xl font-bold mb-6">{t('Log Payment')}</h3>
            <form onSubmit={handleAddPayment} className="space-y-4">
              <div>
                <label className="block text-sm mb-1">{t('Type')}</label>
                <select value={payType} onChange={e => setPayType(e.target.value as any)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <option value="cash">{t('cash')}</option>
                  <option value="check">{t('check')}</option>
                  <option value="transfer">{t('transfer')}</option>
                </select>
              </div>
              <div>
               <label className="block text-sm mb-1">{t('Amount')}</label>
               <input type="number" required min="0" value={payAmount} onChange={e => setPayAmount(e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
              </div>
              <div>
               <label className="block text-sm mb-1">{t('Reference/Check N°')}</label>
               <input type="text" required value={payRef} onChange={e => setPayRef(e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
              </div>
              <div>
               <label className="block text-sm mb-1">{t('Due Date')}</label>
               <input type="date" required value={payDue} onChange={e => setPayDue(e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
              </div>
              <div>
               <label className="block text-sm mb-1">{t('Paid Month/Period')}</label>
               <input type="text" placeholder="e.g. October 2026" required value={payPeriod} onChange={e => setPayPeriod(e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
              </div>
              <div>
               <label className="block text-sm mb-1">{t('Payer Name')}</label>
               <input type="text" required value={payPayer} onChange={e => setPayPayer(e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
              </div>
              <div>
                <label className="block text-sm mb-1">{t('Status')}</label>
                <select value={payStatus} onChange={e => setPayStatus(e.target.value as any)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <option value="pending">{t('pending')}</option>
                  <option value="sent_to_bank">{t('sent_to_bank')}</option>
                  <option value="paid">{t('paid')}</option>
                  <option value="unpaid">{t('unpaid')}</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowPaymentModal(null)} className="flex-1 py-3 bg-gray-200 text-gray-800 rounded-xl">{t('Cancel')}</button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl">{t('Save')}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
