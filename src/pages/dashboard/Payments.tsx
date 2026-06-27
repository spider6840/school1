import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { useTheme } from '../../hooks/useTheme';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { DollarSign, Search, CheckCircle } from 'lucide-react';

interface Payment {
  id: string;
  subscriptionId: string;
  amount: number;
  reference: string;
  type: 'check' | 'transfer' | 'cash';
  status: 'pending' | 'paid' | 'sent_to_bank' | 'unpaid';
  dueDate: string;
  schoolId: string;
  period?: string;
  payerName?: string;
  studentName?: string;
  className?: string;
  season?: string;
}

export default function Payments() {
  const { schoolId, role, schoolData } = useAuth();
  const { t } = useLanguage();
  const { primaryColor } = useTheme();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // We need to keep a map of subscriptions to auto-activate
  const [subscriptionsMap, setSubscriptionsMap] = useState<Record<string, any>>({});

  useEffect(() => {
    if (schoolId || role === 'superadmin' || role === 'group_admin') {
      fetchPayments();
    }
  }, [schoolId, role]);

  const fetchPayments = async () => {
    try {
      setLoading(true);

      let schoolIdsToFetch = schoolId ? [schoolId] : [];
      if (role === 'group_admin' && tenantId) {
        const sSnap = await getDocs(query(collection(db, 'schools'), where('tenantId', '==', tenantId)));
        schoolIdsToFetch = sSnap.docs.map(d => d.id);
      }

      if (role === 'group_admin' && schoolIdsToFetch.length === 0) {
        setPayments([]);
        return;
      }

      const getQuery = (colName: string) => {
         let q = collection(db, colName) as any;
         if (schoolId) q = query(q, where('schoolId', '==', schoolId));
         else if (role === 'group_admin') q = query(q, where('schoolId', 'in', schoolIdsToFetch.slice(0, 30)));
         return q;
      };

      const [subSnap, stuSnap, clsSnap, paySnap] = await Promise.all([
         getDocs(getQuery('subscriptions')),
         getDocs(role === 'superadmin' && !schoolId ? query(collection(db, 'users'), where('role', '==', 'student')) : query(getQuery('users'), where('role', '==', 'student'))),
         getDocs(getQuery('classes')),
         getDocs(getQuery('payments'))
      ]);

      const subMap: Record<string, any> = {};
      subSnap.forEach(d => subMap[d.id] = { id: d.id, ...d.data() });
      setSubscriptionsMap(subMap);

      const stuMap: Record<string, string> = {};
      stuSnap.forEach(d => stuMap[d.id] = d.data().name);

      const clsMap: Record<string, string> = {};
      clsSnap.forEach(d => clsMap[d.id] = d.data().name);

      const payList: Payment[] = [];
      paySnap.forEach(d => {
        const p = { id: d.id, ...d.data() } as Payment;
        const sub = subMap[p.subscriptionId];
        if (sub) {
          p.studentName = stuMap[sub.studentId] || 'Unknown';
          p.className = clsMap[sub.classId] || 'Unknown';
          p.season = sub.season || 'Unknown';
        }
        payList.push(p);
      });
      setPayments(payList.sort((a,b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()));

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const markPaymentStatus = async (payId: string, status: string, subId: string) => {
    try {
      await updateDoc(doc(db, 'payments', payId), { status });
      if (status === 'paid') {
        const sub = subscriptionsMap[subId];
        if (sub && sub.status === 'disabled') {
           await updateDoc(doc(db, 'subscriptions', subId), { status: 'active' });
        }
      }
      fetchPayments();
    } catch (e) { console.error(e); }
  };

  const printReceipt = (p: Payment) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const logoHtml = schoolData?.logoUrl 
        ? `<img src="${schoolData.logoUrl}" alt="Logo" style="height: 50px; object-fit: contain;">`
        : `<div class="logo">${schoolData?.name || 'ACMS'}</div>`;

      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt - ${p.reference || 'Payment'}</title>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
              .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
              .logo { font-size: 24px; font-weight: bold; color: ${primaryColor || '#4f46e5'}; }
              .receipt-title { font-size: 28px; font-weight: bold; color: #555; text-transform: uppercase; letter-spacing: 2px; }
              .row { display: flex; margin-bottom: 15px; }
              .col { flex: 1; }
              .label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 4px; font-weight: bold; }
              .value { font-size: 16px; font-weight: 500; }
              .amount-box { background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; margin-top: 30px; border: 1px solid #e2e8f0; }
              .amount-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; }
              .amount-value { font-size: 36px; font-weight: bold; color: #0f172a; margin-top: 5px; }
              @media print {
                body { padding: 0; }
                .action-buttons { display: none !important; }
              }
            </style>
          </head>
          <body>
            <div class="action-buttons" style="text-align: right; margin-bottom: 20px;">
              <button onclick="window.print()" style="padding: 10px 20px; background: ${primaryColor || '#4f46e5'}; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Print PDF</button>
            </div>
            <div class="header">
              ${logoHtml}
              <div class="receipt-title">Payment Receipt</div>
            </div>
            
            <div class="row">
              <div class="col">
                <div class="label">Date</div>
                <div class="value">${new Date().toLocaleDateString()}</div>
              </div>
              <div class="col">
                <div class="label">Reference</div>
                <div class="value">${p.reference || 'N/A'}</div>
              </div>
            </div>

            <div class="row">
              <div class="col">
                <div class="label">Student</div>
                <div class="value">${p.studentName || 'N/A'}</div>
              </div>
              <div class="col">
                <div class="label">Class & Season</div>
                <div class="value">${p.className || 'N/A'} - ${p.season || 'N/A'}</div>
              </div>
            </div>

            <div class="row">
              <div class="col">
                <div class="label">Payer Name</div>
                <div class="value">${p.payerName || 'N/A'}</div>
              </div>
              <div class="col">
                <div class="label">Paid Period/Month</div>
                <div class="value">${p.period || 'N/A'}</div>
              </div>
            </div>

            <div class="row">
              <div class="col">
                <div class="label">Payment Mode</div>
                <div class="value" style="text-transform: capitalize;">${p.type || 'Cash'}</div>
              </div>
              <div class="col">
                 <div class="label">Status</div>
                 <div class="value" style="text-transform:capitalize;">${p.status}</div>
              </div>
            </div>

            <div class="amount-box">
              <div class="amount-label">Amount Paid</div>
              <div class="amount-value">$${p.amount?.toFixed(2) || '0.00'}</div>
            </div>
            
            <div style="margin-top: 60px; font-size: 12px; color: #94a3b8; text-align: center;">
              This is an automatically generated receipt. Thank you for your payment.
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Payments')}</h1>
            <p className="text-gray-500 text-sm mt-1">{t('Manage and track all financial transactions')}</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50">
              <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">{t('Student')}</th>
              <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">{t('Type & Ref')}</th>
              <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">{t('Amount')}</th>
              <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">{t('Due Date')}</th>
              <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">{t('Status')}</th>
              <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest text-right">{t('Actions')}</th>
            </tr>
          </thead>
          <tbody>
             {loading ? <tr><td colSpan={6} className="px-8 py-10 text-center text-gray-500">{t('Loading...')}</td></tr> :
              payments.length === 0 ? <tr><td colSpan={6} className="px-8 py-10 text-center text-gray-500">{t('No payments found')}</td></tr> :
              payments.map(p => (
                <tr key={p.id} className="border-t border-gray-50 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                  <td className="px-8 py-5">
                    <div className="font-bold text-gray-900 dark:text-white">{p.studentName}</div>
                    <div className="text-sm text-gray-500">{p.className}</div>
                  </td>
                   <td className="px-8 py-5">
                    <div className="font-bold text-gray-900 dark:text-white capitalize">{t(p.type)}</div>
                    <div className="text-sm text-gray-500">{p.reference}</div>
                  </td>
                  <td className="px-8 py-5 font-mono font-bold">${p.amount}</td>
                  <td className="px-8 py-5 text-gray-600 dark:text-gray-400">{p.dueDate}</td>
                  <td className="px-8 py-5">
                     <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        p.status === 'paid' ? 'bg-green-100 text-green-700' :
                        p.status === 'sent_to_bank' ? 'bg-blue-100 text-blue-700' :
                        p.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {t(p.status)}
                      </span>
                  </td>
                  <td className="px-8 py-5 text-right flex items-center justify-end gap-2">
                    <button
                      onClick={() => printReceipt(p)}
                      className="px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 rounded-xl"
                    >
                      {t('Print Receipt')}
                    </button>
                    <select
                      value={p.status}
                      onChange={(e) => markPaymentStatus(p.id, e.target.value, p.subscriptionId)}
                      className="text-sm border border-gray-200 dark:border-gray-700 rounded-xl px-2 py-1 bg-white dark:bg-gray-800 outline-none"
                    >
                      <option value="pending">{t('Pending')}</option>
                      <option value="sent_to_bank">{t('Sent to Bank')}</option>
                      <option value="paid">{t('Paid')}</option>
                      <option value="unpaid">{t('Unpaid')}</option>
                    </select>
                  </td>
                </tr>
              ))
             }
          </tbody>
        </table>
      </div>
    </div>
  );
}
