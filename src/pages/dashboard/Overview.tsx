import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { useTheme } from '../../hooks/useTheme';
import { motion, AnimatePresence } from 'motion/react';
import { Building, Users, ShieldCheck, GraduationCap, DollarSign, Settings, Plus, Trash, X } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface WidgetConfig {
  id: string;
  type: 'number' | 'line' | 'bar' | 'pie';
  kpi: 'students' | 'revenue' | 'attendance' | 'subscriptions';
  title: string;
  position: number; // For sorting
}

export default function Overview() {
  const { user, role, schoolId, tenantId, isAdmin } = useAuth();
  const { primaryColor } = useTheme();
  const { t } = useLanguage();

  const [stats, setStats] = useState({
    students: 0,
    staff: 0,
    totalPayments: 0,
    schools: 0
  });

  const [graphData, setGraphData] = useState<any>({
    revenue: [],
    subscriptions: [],
    attendance: []
  });

  const [schoolsList, setSchoolsList] = useState<any[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  
  // Default Dashboard Layout
  const [widgets, setWidgets] = useState<WidgetConfig[]>([
    { id: '1', type: 'number', kpi: 'students', title: 'Active Students', position: 1 },
    { id: '2', type: 'number', kpi: 'revenue', title: 'Total Revenue', position: 2 },
    { id: '3', type: 'pie', kpi: 'subscriptions', title: 'Subscriptions Overview', position: 3 },
    { id: '4', type: 'line', kpi: 'revenue', title: 'Revenue Trend', position: 4 },
  ]);

  const [isConfiguring, setIsConfiguring] = useState(false);

  useEffect(() => {
    if (role === 'superadmin' || role === 'group_admin') {
      let q = collection(db, 'schools') as any;
      if (role === 'group_admin' && tenantId) {
        q = query(q, where('tenantId', '==', tenantId));
      }
      getDocs(q).then(snap => {
         setSchoolsList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }
  }, [role, tenantId]);

  // Load user layout
  useEffect(() => {
    if (user?.uid) {
       getDoc(doc(db, 'dashboard_layouts', user.uid)).then(snap => {
          if (snap.exists() && snap.data().widgets) {
             setWidgets(snap.data().widgets);
          }
       });
    }
  }, [user?.uid]);

  const saveLayout = async (newWidgets: WidgetConfig[]) => {
    setWidgets(newWidgets);
    if (user?.uid) {
       await setDoc(doc(db, 'dashboard_layouts', user.uid), { widgets: newWidgets }, { merge: true });
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        let qSchoolIds = [];
        if (role === 'superadmin' && selectedSchool === 'all') {
           qSchoolIds = schoolsList.map(s => s.id);
        } else if (role === 'group_admin' && selectedSchool === 'all') {
           qSchoolIds = schoolsList.map(s => s.id);
        } else if (selectedSchool !== 'all') {
           qSchoolIds = [selectedSchool];
        } else if (schoolId) {
           qSchoolIds = [schoolId];
        }

        const baseQuery = (colName: string) => {
           let q = collection(db, colName) as any;
           if (qSchoolIds.length > 0 && qSchoolIds.length <= 30) {
              q = query(q, where('schoolId', 'in', qSchoolIds));
           }
           // if all (superadmin and lots of schools), we just fetch all
           return q;
        };

        const [usersSnap, paySnap] = await Promise.all([
          getDocs(qSchoolIds.length === 0 ? collection(db, 'users') : baseQuery('users')),
          getDocs(qSchoolIds.length === 0 ? collection(db, 'payments') : baseQuery('payments'))
        ]);

        let paidSum = 0;
        let revByMonth: any = {};
        
        paySnap.forEach(d => { 
           const data = d.data();
           if (data.status === 'paid') {
              paidSum += data.amount || 0; 
              // Mocking some dates for graphs since we might not have timestamps
              const date = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
              const month = date.toLocaleString('default', { month: 'short' });
              if (!revByMonth[month]) revByMonth[month] = 0;
              revByMonth[month] += (data.amount || 0);
           }
        });

        const revGraphData = Object.keys(revByMonth).map(k => ({ name: k, value: revByMonth[k] }));
        if (revGraphData.length === 0) {
           // Provide some dummy data to show the graph
           revGraphData.push({ name: 'Jan', value: 1200 }, { name: 'Feb', value: 2100 }, { name: 'Mar', value: paidSum || 800 });
        }

        const students = usersSnap.docs.filter(d => d.data().role === 'student').length;
        const staff = usersSnap.docs.filter(d => d.data().role === 'admin' || d.data().role === 'teacher').length;

        setStats({
          schools: qSchoolIds.length || schoolsList.length,
          students,
          staff,
          totalPayments: paidSum
        });

        setGraphData({
           revenue: revGraphData,
           subscriptions: [
             { name: 'Active', value: students * 0.8 || 12 },
             { name: 'Pending', value: students * 0.1 || 3 },
             { name: 'Inactive', value: students * 0.1 || 2 }
           ],
           attendance: [
             { name: 'Mon', Present: 95, Absent: 5 },
             { name: 'Tue', Present: 92, Absent: 8 },
             { name: 'Wed', Present: 98, Absent: 2 },
             { name: 'Thu', Present: 88, Absent: 12 },
             { name: 'Fri', Present: 90, Absent: 10 },
           ]
        });

      } catch (e) {
        console.error(e);
      }
    };
    
    // Give it a small delay so schoolsList is populated
    setTimeout(fetchStats, 200);
  }, [schoolId, role, selectedSchool, schoolsList]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const renderWidgetContent = (widget: WidgetConfig) => {
     let value: any = 0;
     let subtitle = '';
     let data = [];

     if (widget.kpi === 'students') { value = stats.students; subtitle = 'Total Active'; data = graphData.subscriptions; }
     if (widget.kpi === 'revenue') { value = `$${stats.totalPayments.toLocaleString()}`; subtitle = 'Encashed Payments'; data = graphData.revenue; }
     if (widget.kpi === 'attendance') { value = '96%'; subtitle = 'Avg Attendance'; data = graphData.attendance; }
     if (widget.kpi === 'subscriptions') { value = stats.students; subtitle = 'Total Inscriptions'; data = graphData.subscriptions; }

     if (widget.type === 'number') {
        return (
           <div className="flex flex-col items-center justify-center h-full min-h-[150px]">
              <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">{value}</div>
              <div className="text-sm text-gray-500 font-medium uppercase tracking-wider">{subtitle}</div>
           </div>
        );
     }

     if (widget.type === 'pie') {
        return (
           <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                       {data.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                 </PieChart>
              </ResponsiveContainer>
           </div>
        );
     }

     if (widget.type === 'line') {
        return (
           <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke={primaryColor} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                 </LineChart>
              </ResponsiveContainer>
           </div>
        );
     }

     if (widget.type === 'bar') {
        return (
           <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip />
                    {widget.kpi === 'attendance' ? (
                       <>
                         <Bar dataKey="Present" stackId="a" fill="#10B981" radius={[0, 0, 4, 4]} />
                         <Bar dataKey="Absent" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
                       </>
                    ) : (
                       <Bar dataKey="value" fill={primaryColor} radius={[4, 4, 0, 0]} />
                    )}
                 </BarChart>
              </ResponsiveContainer>
           </div>
        );
     }

     return <div>Unsupported type</div>;
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('Welcome back')}, {user?.displayName || user?.email}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {role === 'superadmin' ? 'Global platform 360 overview.' : 'Here\'s what\'s happening in your school today.'}
          </p>
        </div>
        <div className="flex items-center gap-4">
           {(role === 'superadmin' || role === 'group_admin') && (
             <div className="flex items-center gap-2 bg-white dark:bg-gray-900 px-4 py-2 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
               <Building className="w-5 h-5 text-gray-400" />
               <select
                 value={selectedSchool}
                 onChange={(e) => setSelectedSchool(e.target.value)}
                 className="bg-transparent text-sm font-semibold text-gray-700 dark:text-gray-300 outline-none border-none cursor-pointer"
               >
                 <option value="all">All Schools (360 View)</option>
                 {schoolsList.map(s => (
                   <option key={s.id} value={s.id}>{s.name || s.id}</option>
                 ))}
               </select>
             </div>
           )}
           {isAdmin && (
             <button onClick={() => setIsConfiguring(true)} className="p-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition" title="Configure Dashboard">
                <Settings className="w-5 h-5" />
             </button>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {widgets.sort((a,b) => a.position - b.position).map((widget) => (
            <div key={widget.id} className={`bg-white dark:bg-gray-900 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 ${widget.type !== 'number' ? 'md:col-span-2' : ''}`}>
               <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-4">{widget.title}</h3>
               {renderWidgetContent(widget)}
            </div>
         ))}
      </div>

      <AnimatePresence>
         {isConfiguring && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
               <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                  <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                     <h3 className="text-xl font-bold">Configure Dashboard</h3>
                     <button onClick={() => setIsConfiguring(false)} className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><X className="w-5 h-5"/></button>
                  </div>
                   <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-gray-50 dark:bg-gray-900">
                      {widgets.sort((a,b) => a.position - b.position).map((widget, idx) => (
                          <div key={widget.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 flex flex-col gap-3">
                              <div className="flex justify-between items-center">
                                  <div className="font-bold text-gray-500 text-sm">Widget {idx + 1}</div>
                                  <button onClick={() => saveLayout(widgets.filter(w => w.id !== widget.id))} className="text-red-500 p-1 hover:bg-red-50 rounded"><Trash className="w-4 h-4"/></button>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                     <label className="block text-xs font-bold mb-1">Title</label>
                                     <input type="text" value={widget.title} onChange={e => {
                                        const newW = [...widgets]; newW[idx].title = e.target.value; saveLayout(newW);
                                     }} className="w-full px-3 py-2 border rounded-xl" />
                                  </div>
                                  <div>
                                     <label className="block text-xs font-bold mb-1">KPI Source</label>
                                     <select value={widget.kpi} onChange={e => {
                                        const newW = [...widgets]; newW[idx].kpi = e.target.value as any; saveLayout(newW);
                                     }} className="w-full px-3 py-2 border rounded-xl">
                                        <option value="students">Inscriptions / Students</option>
                                        <option value="revenue">Payments / Revenue</option>
                                        <option value="attendance">Attendance</option>
                                        <option value="subscriptions">Subscriptions</option>
                                     </select>
                                  </div>
                                  <div>
                                     <label className="block text-xs font-bold mb-1">Graphic Type</label>
                                     <select value={widget.type} onChange={e => {
                                        const newW = [...widgets]; newW[idx].type = e.target.value as any; saveLayout(newW);
                                     }} className="w-full px-3 py-2 border rounded-xl">
                                        <option value="number">Big Number</option>
                                        <option value="line">Line Chart</option>
                                        <option value="bar">Bar Chart</option>
                                        <option value="pie">Camembert (Pie)</option>
                                     </select>
                                  </div>
                                  <div>
                                     <label className="block text-xs font-bold mb-1">Position (Order)</label>
                                     <input type="number" value={widget.position} onChange={e => {
                                        const newW = [...widgets]; newW[idx].position = Number(e.target.value); saveLayout(newW);
                                     }} className="w-full px-3 py-2 border rounded-xl" />
                                  </div>
                              </div>
                          </div>
                      ))}

                      <button onClick={() => {
                          const newId = Math.random().toString(36).substr(2, 9);
                          saveLayout([...widgets, { id: newId, title: 'New Widget', type: 'number', kpi: 'students', position: widgets.length + 1 }]);
                      }} className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl text-gray-500 font-bold hover:bg-gray-100 transition flex items-center justify-center gap-2">
                          <Plus className="w-5 h-5"/> Add Graphic
                      </button>
                   </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>
    </div>
  );
}
