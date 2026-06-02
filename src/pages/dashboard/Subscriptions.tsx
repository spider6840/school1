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
    education: boolean;
    canteen: boolean;
    transport: boolean;
  };
}

interface Payment {
  id: string;
  subscriptionId: string;
  amount: number;
  reference: string;
  type: 'check' | 'transfer' | 'cash';
  status: 'pending' | 'paid' | 'unpaid';
  dueDate: string;
}

interface Class { id: string; name: string; }
interface User { uid: string; name: string; parentEmail1?: string; parentEmail2?: string; }

export default function Subscriptions() {
  const { schoolId, role } = useAuth();
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
  const [services, setServices] = useState({ education: true, canteen: false, transport: false });
  const [overridePayment, setOverridePayment] = useState(false);

  // Form State - Payment
  const [payAmount, setPayAmount] = useState('');
  const [payRef, setPayRef] = useState('');
  const [payType, setPayType] = useState<'check' | 'transfer' | 'cash'>('cash');
  const [payStatus, setPayStatus] = useState<'pending' | 'paid' | 'unpaid'>('paid');
  const [payDue, setPayDue] = useState('');

  useEffect(() => {
    if (schoolId) {
      fetchCoreData();
    }
  }, [schoolId]);

  const fetchCoreData = async () => {
    try {
      setLoading(true);
      // Fetch classes
      const clsSnap = await getDocs(query(collection(db, 'classes'), where('schoolId', '==', schoolId)));
      const clsMap: Record<string, Class> = {};
      clsSnap.forEach(d => clsMap[d.id] = { id: d.id, ...d.data() } as Class);
      setClasses(clsMap);

      // Fetch students
      const stuSnap = await getDocs(query(collection(db, 'users'), where('schoolId', '==', schoolId), where('role', '==', 'student')));
      const stuMap: Record<string, User> = {};
      stuSnap.forEach(d => stuMap[d.id] = { uid: d.id, ...d.data() } as User);
      setStudents(stuMap);

      // Fetch subscriptions
      const subSnap = await getDocs(query(collection(db, 'subscriptions'), where('schoolId', '==', schoolId)));
      const subList: Subscription[] = [];
      subSnap.forEach(d => subList.push({ id: d.id, ...d.data() } as Subscription));
      setSubscriptions(subList);

      // Fetch payments
      const paySnap = await getDocs(query(collection(db, 'payments'), where('schoolId', '==', schoolId)));
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

  const markPaymentPaid = async (payId: string) => {
    try {
      await updateDoc(doc(db, 'payments', payId), { status: 'paid' });
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Student</label>
                  <select required value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none text-gray-900 dark:text-white">
                    <option value="">Select... (Must have parent)</option>
                    {(Object.values(students) as User[]).map(s => (
                       <option key={s.uid} value={s.uid} disabled={!s.parentEmail1 && !s.parentEmail2}>
                         {s.name} {!s.parentEmail1 && !s.parentEmail2 ? '(No Parent)' : ''}
                       </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Class</label>
                  <select required value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none text-gray-900 dark:text-white">
                    <option value="">Select...</option>
                    {(Object.values(classes) as Class[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Season</label>
                  <input required placeholder="2025/2026" value={season} onChange={e => setSeason(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none text-gray-900 dark:text-white" />
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-2xl">
                 <h4 className="font-bold text-gray-900 dark:text-white mb-4">Required Services</h4>
                 <div className="flex gap-6 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={services.education} onChange={e => setServices(s => ({...s, education: e.target.checked}))} className="w-5 h-5 rounded text-blue-600 border-gray-300 focus:ring-blue-500" />
                      <span className="text-gray-700 dark:text-gray-300">Education</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={services.canteen} onChange={e => setServices(s => ({...s, canteen: e.target.checked}))} className="w-5 h-5 rounded text-blue-600 border-gray-300 focus:ring-blue-500" />
                      <span className="text-gray-700 dark:text-gray-300">Canteen</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={services.transport} onChange={e => setServices(s => ({...s, transport: e.target.checked}))} className="w-5 h-5 rounded text-blue-600 border-gray-300 focus:ring-blue-500" />
                      <span className="text-gray-700 dark:text-gray-300">Transport</span>
                    </label>
                 </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                 <input type="checkbox" checked={overridePayment} onChange={e => setOverridePayment(e.target.checked)} className="w-5 h-5 rounded text-yellow-600" />
                 <span className="text-yellow-800 dark:text-yellow-200 font-medium">Auto-activate without payment (Director Override)</span>
              </label>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button type="submit" className="px-6 py-2.5 rounded-xl text-white font-medium" style={{ backgroundColor: primaryColor }}>Create Inscription</button>
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
                    {Object.entries(sub.services).map(([key, isSubbed]) => isSubbed && (
                      <span key={key} className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-lg text-sm capitalize">{key}</span>
                    ))}
                  </div>
                </div>

                <div className="w-full md:w-[350px] bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-gray-900 dark:text-white">Payments</h4>
                    <button onClick={() => setShowPaymentModal(sub.id)} className="text-sm px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 transition-colors flex items-center gap-1">+ Add</button>
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
                              <div className="font-bold font-mono">${p.amount}</div>
                              <div className="flex items-center justify-end gap-1 mt-1">
                                <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${
                                  p.status === 'paid' ? 'bg-green-100 text-green-700' :
                                  p.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                }`}>{p.status}</span>
                                {p.status !== 'paid' && role !== 'teacher' && role !== 'student' && role !== 'parent' && (
                                  <button onClick={() => markPaymentPaid(p.id)} className="text-gray-400 hover:text-green-600" title="Mark as Paid">
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                )}
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

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 p-8 max-w-sm w-full">
            <h3 className="text-xl font-bold mb-6">Log Payment</h3>
            <form onSubmit={handleAddPayment} className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Type</label>
                <select value={payType} onChange={e => setPayType(e.target.value as any)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <option value="cash">Cash</option><option value="check">Check</option><option value="transfer">Bank Transfer</option>
                </select>
              </div>
              <div>
               <label className="block text-sm mb-1">Amount</label>
               <input type="number" required min="0" value={payAmount} onChange={e => setPayAmount(e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
              </div>
              <div>
               <label className="block text-sm mb-1">Reference/Check N°</label>
               <input type="text" required value={payRef} onChange={e => setPayRef(e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
              </div>
              <div>
               <label className="block text-sm mb-1">Due Date</label>
               <input type="date" required value={payDue} onChange={e => setPayDue(e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
              </div>
              <div>
                <label className="block text-sm mb-1">Status</label>
                <select value={payStatus} onChange={e => setPayStatus(e.target.value as any)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <option value="pending">Pending</option><option value="paid">Paid</option><option value="unpaid">Unpaid</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowPaymentModal(null)} className="flex-1 py-3 bg-gray-200 text-gray-800 rounded-xl">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl">Save</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
