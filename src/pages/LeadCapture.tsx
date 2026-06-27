import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Building, Send, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function LeadCapture() {
  const [schools, setSchools] = useState<any[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', phone: '', email: '', type: 'Agency', reason: '', description: '', schoolId: ''
  });

  useEffect(() => {
    // In a real app we might only expose certain schools or use a specific tenant ID from URL
    getDocs(collection(db, 'schools')).then(snap => {
       setSchools(snap.docs.map(d => ({ id: d.id, ...d.data() })));
       if (snap.docs.length > 0) {
          setFormData(prev => ({ ...prev, schoolId: snap.docs[0].id }));
       }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'leads'), {
        ...formData,
        status: 'New',
        actions: [],
        createdAt: serverTimestamp()
      });
      setSubmitted(true);
    } catch (e) {
      console.error(e);
      alert('Failed to submit form. Please try again.');
    }
    setLoading(false);
  };

  if (submitted) {
     return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
           <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-12 rounded-[2.5rem] shadow-xl max-w-md text-center">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                 <CheckCircle className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Request Submitted!</h2>
              <p className="text-gray-500 mb-8">Thank you for your interest. A member of our admissions team will contact you shortly.</p>
              <button onClick={() => setSubmitted(false)} className="text-blue-600 font-bold hover:underline">Submit another request</button>
           </motion.div>
        </div>
     );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 py-12">
       <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden max-w-4xl w-full flex flex-col md:flex-row">
          
          <div className="w-full md:w-1/3 bg-blue-600 p-10 text-white flex flex-col justify-center">
             <div className="mb-8">
               <Building className="w-12 h-12 mb-4 opacity-80" />
               <h1 className="text-3xl font-bold mb-2">Join Our School</h1>
               <p className="text-blue-100">Fill out the form to request information or schedule a campus visit.</p>
             </div>
             <div className="space-y-4 text-sm text-blue-100">
                <div className="flex items-center gap-3"><CheckCircle className="w-4 h-4"/> Certified Programs</div>
                <div className="flex items-center gap-3"><CheckCircle className="w-4 h-4"/> Expert Teachers</div>
                <div className="flex items-center gap-3"><CheckCircle className="w-4 h-4"/> Modern Campus</div>
             </div>
          </div>

          <div className="w-full md:w-2/3 p-10">
             <h2 className="text-2xl font-bold text-gray-900 mb-6">Admissions Inquiry</h2>
             <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">First Name</label>
                     <input type="text" required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" />
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Last Name</label>
                     <input type="text" required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" />
                   </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Phone Number</label>
                     <input type="tel" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" />
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Email Address</label>
                     <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" />
                   </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Campus / School</label>
                     <select required value={formData.schoolId} onChange={e => setFormData({...formData, schoolId: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
                        {schools.map(s => <option key={s.id} value={s.id}>{s.name || s.id}</option>)}
                     </select>
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Interest / Reason</label>
                     <select value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
                        <option value="Enrollment">New Enrollment</option>
                        <option value="Transfer">Transfer Info</option>
                        <option value="Visit">Campus Visit</option>
                        <option value="Other">Other</option>
                     </select>
                   </div>
                </div>

                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Additional Notes</label>
                   <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl min-h-[100px]" placeholder="Tell us more about your child or any questions you have..."></textarea>
                </div>

                <button type="submit" disabled={loading} className="w-full py-4 bg-gray-900 hover:bg-black text-white font-bold rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-70 mt-4">
                   {loading ? 'Submitting...' : <><Send className="w-5 h-5"/> Send Request</>}
                </button>
             </form>
          </div>
       </motion.div>
    </div>
  );
}
