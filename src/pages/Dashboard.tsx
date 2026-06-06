import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../hooks/useTheme';
import { 
  Users, 
  CalendarCheck, 
  GraduationCap, 
  MessageSquare, 
  LayoutDashboard,
  ShieldCheck,
  ChevronRight,
  BookOpen,
  Settings as SettingsIcon,
  Building,
  Menu,
  X,
  FileText,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import UserManagement from './dashboard/UserManagement';
import Classes from './dashboard/Classes';
import Classrooms from './dashboard/Classrooms';
import Timetables from './dashboard/Timetables';
import Vacations from './dashboard/Vacations';
import Attendance from './dashboard/Attendance';
import Settings from './dashboard/Settings';
import ProfileSettings from './dashboard/ProfileSettings';
import Schools from './dashboard/Schools';
import Subjects from './dashboard/Subjects';
import Homeworks from './dashboard/Homeworks';
import Subscriptions from './dashboard/Subscriptions';
import Payments from './dashboard/Payments';

export default function Dashboard() {
  const { user, role, isAdmin, isSuperAdmin, schoolData } = useAuth();
  const { t, dir } = useLanguage();
  const { primaryColor } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (role === 'superadmin' && (location.pathname === '/dashboard' || location.pathname === '/dashboard/')) {
    return <Navigate to="/superadmin" replace />;
  }

  const superAdminMenu = [
    { icon: LayoutDashboard, label: t('Platform Overview'), path: '/superadmin', roles: ['superadmin'] },
    { icon: Building, label: t('Tenant Schools'), path: '/superadmin/schools', roles: ['superadmin'] },
    { icon: Users, label: t('Global Admins'), path: '/superadmin/users', roles: ['superadmin'] },
    { icon: SettingsIcon, label: t('Global Settings'), path: '/superadmin/settings', roles: ['superadmin'] },
  ];

  const genericMenu = [
    { icon: LayoutDashboard, label: t('Overview'), path: '/dashboard', roles: ['superadmin', 'group_admin', 'admin', 'accountant', 'teacher', 'student', 'parent'] },
    { icon: BookOpen, label: t('Subjects'), path: '/dashboard/subjects', roles: ['superadmin', 'group_admin', 'admin', 'teacher'] },
    { icon: Users, label: t('Users'), path: '/dashboard/users', roles: ['superadmin', 'group_admin', 'admin'] },
    { icon: FileText, label: t('Subscriptions'), path: '/dashboard/subscriptions', roles: ['superadmin', 'group_admin', 'admin', 'accountant'] },
    { icon: DollarSign, label: t('Payments'), path: '/dashboard/payments', roles: ['superadmin', 'group_admin', 'admin', 'accountant'] },
    { icon: BookOpen, label: t('Classes'), path: '/dashboard/classes', roles: ['superadmin', 'group_admin', 'admin'] },
    { icon: Building, label: t('Classrooms'), path: '/dashboard/classrooms', roles: ['superadmin', 'group_admin', 'admin'] },
    { icon: Calendar, label: t('Timetables'), path: '/dashboard/timetables', roles: ['superadmin', 'group_admin', 'admin', 'teacher', 'student'] },
    { icon: Calendar, label: t('Vacations'), path: '/dashboard/vacations', roles: ['superadmin', 'group_admin', 'admin', 'teacher', 'student', 'parent'] },
    { icon: CalendarCheck, label: t('Attendance'), path: '/dashboard/attendance', roles: ['admin', 'teacher'] },
    { icon: BookOpen, label: t('Homeworks'), path: '/dashboard/homeworks', roles: ['admin', 'teacher', 'student', 'parent'] },
    { icon: GraduationCap, label: t('Grading'), path: '/dashboard/grading', roles: ['admin', 'teacher', 'student'] },
    { icon: MessageSquare, label: t('Messages'), path: '/dashboard/messages', roles: ['admin', 'teacher', 'student', 'parent'] },
    { icon: SettingsIcon, label: t('My Profile'), path: '/dashboard/profile', roles: ['admin', 'accountant', 'teacher', 'student', 'parent'] },
    { icon: SettingsIcon, label: t('School Settings'), path: '/dashboard/settings', roles: ['admin'] },
  ];

  const menuItems = role === 'superadmin' ? [...superAdminMenu, ...genericMenu] : genericMenu;
  const filteredMenu = menuItems.filter(item => item.roles.includes(role || '') || role === 'superadmin');

  return (
    <div className="pt-20 min-h-screen bg-gray-50 dark:bg-gray-950 flex transition-colors duration-300">
      
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-20 h-[calc(100vh-5rem)] w-64 bg-white dark:bg-gray-900 border-${dir === 'ltr' ? 'r' : 'l'} border-gray-100 dark:border-gray-800 flex-shrink-0 z-50 transition-transform duration-300 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        
        {/* School Info */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
           <div className="flex items-center gap-3">
              {schoolData?.logoUrl ? (
                <img src={schoolData.logoUrl} alt="Logo" className="w-10 h-10 rounded-xl object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600">
                  <Building className="w-5 h-5" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-gray-900 dark:text-white truncate">
                  {schoolData?.name || schoolData?.schoolName || (role === 'superadmin' ? 'Global Platform' : 'My School')}
                </div>
                <div className="text-xs text-gray-500 truncate capitalize">{role}</div>
              </div>
           </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-2">
            {filteredMenu.map((item, index) => (
              <Link
                key={index}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all group"
              >
                <item.icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="font-medium">{item.label}</span>
                <ChevronRight className={`ml-auto w-4 h-4 opacity-0 group-hover:opacity-100 transition-all ${dir === 'rtl' ? 'rotate-180' : ''}`} />
              </Link>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 sm:p-8 w-full max-w-full relative">
        {/* Mobile Menu Button - Sticky and Prominent */}
        <div className="lg:hidden sticky top-0 z-30 mb-6 bg-gray-50/90 dark:bg-gray-950/90 backdrop-blur-md pb-4 pt-2 -mt-4 -mx-4 px-4 sm:-mx-8 sm:px-8 shadow-sm">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="flex items-center gap-3 w-full p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-bold transition-transform active:scale-95"
            style={{ borderLeftWidth: '4px', borderLeftColor: primaryColor }}
          >
            <Menu className="w-6 h-6" />
            <span>Open Navigation Menu</span>
          </button>
        </div>

        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="subscriptions" element={<Subscriptions />} />
          <Route path="payments" element={<Payments />} />
          <Route path="classes" element={<Classes />} />
          <Route path="classrooms" element={<Classrooms />} />
          <Route path="timetables" element={<Timetables />} />
          <Route path="vacations" element={<Vacations />} />
          <Route path="schools" element={<Schools />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="subjects" element={<Subjects />} />
          <Route path="homeworks" element={<Homeworks />} />
          <Route path="grading" element={<div>Grading Feature (Coming Soon)</div>} />
          <Route path="messages" element={<div>Messages Feature (Coming Soon)</div>} />
          <Route path="profile" element={<ProfileSettings />} />
          <Route path="settings" element={<Settings />} />
        </Routes>
      </div>
    </div>
  );
}

function Overview() {
  const { user, role, schoolId } = useAuth();
  const { primaryColor } = useTheme();
  const { t } = useLanguage();

  const [stats, setStats] = useState({
    students: 0,
    staff: 0,
    totalPayments: 0,
    schools: 0
  });
  
  const [schoolsList, setSchoolsList] = useState<any[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string>('all');

  useEffect(() => {
    if (role === 'superadmin') {
      import('firebase/firestore').then(({ collection, getDocs }) => {
         getDocs(collection(db, 'schools')).then(snap => {
            setSchoolsList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
         });
      });
    }
  }, [role]);

  useEffect(() => {
    import('firebase/firestore').then(({ collection, getDocs, query, where }) => {
      const fetchStats = async () => {
        try {
          if (role === 'superadmin' && selectedSchool === 'all') {
            const [schoolsSnap, usersSnap, paySnap] = await Promise.all([
              getDocs(collection(db, 'schools')),
              getDocs(collection(db, 'users')),
              getDocs(collection(db, 'payments'))
            ]);
            let paidSum = 0;
            paySnap.forEach(d => { if (d.data().status === 'paid') paidSum += d.data().amount || 0; });
            setStats({
              schools: schoolsSnap.size,
              students: usersSnap.docs.filter(d => d.data().role === 'student').length,
              staff: usersSnap.docs.filter(d => d.data().role === 'admin' || d.data().role === 'teacher').length,
              totalPayments: paidSum
            });
          } else if (schoolId || (role === 'superadmin' && selectedSchool !== 'all')) {
             const targetSchool = role === 'superadmin' ? selectedSchool : schoolId;
             const [usersSnap, paySnap] = await Promise.all([
              getDocs(query(collection(db, 'users'), where('schoolId', '==', targetSchool))),
              getDocs(query(collection(db, 'payments'), where('schoolId', '==', targetSchool)))
            ]);
            let paidSum = 0;
            paySnap.forEach(d => { if (d.data().status === 'paid') paidSum += d.data().amount || 0; });
            setStats({
              schools: 1,
              students: usersSnap.docs.filter(d => d.data().role === 'student').length,
              staff: usersSnap.docs.filter(d => d.data().role === 'admin' || d.data().role === 'teacher').length,
              totalPayments: paidSum
            });
          }
        } catch (e) {
          console.error(e);
        }
      };
      // give a tiny delay to ensure db is ready
      setTimeout(fetchStats, 100);
    });
  }, [schoolId, role, selectedSchool]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('Welcome back')}, {user?.displayName || user?.email}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {role === 'superadmin' ? t('Global platform 360 overview.') : t('Here\'s what\'s happening in your school today.')}
          </p>
        </div>
        {role === 'superadmin' && (
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: role === 'superadmin' ? t('Tenant Schools') : t('Active Students'), value: role === 'superadmin' ? stats.schools : stats.students, icon: role === 'superadmin' ? Building : Users, color: 'blue' },
          { label: t('Staff Members'), value: stats.staff, icon: ShieldCheck, color: 'green' },
          { label: role === 'superadmin' ? t('Total Inscriptions') : t('Inscriptions'), value: stats.students, icon: GraduationCap, color: 'purple' },
          { label: t('Total Revenue'), value: `$${stats.totalPayments.toLocaleString()}`, icon: DollarSign, color: 'amber' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800"
          >
            <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-50 dark:bg-${stat.color}-900/20 flex items-center justify-center mb-4`}>
              <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800">
         <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">{t('Recent Activity')}</h2>
         <div className="space-y-6">
             <div className="text-sm text-gray-500 text-center py-4">{t('No recent activity')}</div>
         </div>
      </div>
    </div>
  );
}
