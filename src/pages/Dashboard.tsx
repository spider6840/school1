import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
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
  DollarSign,
  Calendar,
  Network
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
import Marks from './dashboard/Marks';
import Subscriptions from './dashboard/Subscriptions';
import Payments from './dashboard/Payments';
import Leads from './dashboard/Leads';

import Overview from './dashboard/Overview';

export default function Dashboard() {
  const { user, role, isAdmin, isSuperAdmin, schoolData, setActiveSchoolId, setActiveTenantId, schoolId, tenantId, profileTenantId } = useAuth();
  const { t, dir } = useLanguage();
  const { primaryColor } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Hierarchy Data
  const [tenants, setTenants] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  
  // UI State for Tree
  const [openTenants, setOpenTenants] = useState<Record<string, boolean>>({});
  const [openSchools, setOpenSchools] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchHierarchy = async () => {
      try {
        if (role === 'superadmin') {
          const tSnap = await getDocs(collection(db, 'tenants'));
          const sSnap = await getDocs(collection(db, 'schools'));
          setTenants([{ id: 'unassigned', name: 'Global Platform' }, ...tSnap.docs.map(d => ({ id: d.id, ...d.data() }))]);
          setSchools(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } else if (role === 'group_admin') {
          // Just fetch schools for their tenant
          const [tSnap, sSnap] = await Promise.all([
             profileTenantId ? getDocs(query(collection(db, 'tenants'))) : Promise.resolve({ docs: [] }), // simplify for now or just fetch all tenants since it's admin
             getDocs(query(collection(db, 'schools'), where('tenantId', '==', profileTenantId)))
          ]);
          let myTenant = tSnap.docs.find(d => d.id === profileTenantId);
          setTenants(myTenant ? [{ id: myTenant.id, ...myTenant.data() }] : [{ id: profileTenantId || 'unknown', name: 'My Group' }]);
          setSchools(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch (err) {
        console.error("Error fetching hierarchy:", err);
      }
    };
    if (role === 'superadmin' || role === 'group_admin') fetchHierarchy();
  }, [role, profileTenantId]);

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
    { icon: Users, label: t('Users'), path: '/dashboard/users', roles: ['group_admin', 'admin'] },
    { icon: Users, label: t('Leads CRM'), path: '/dashboard/leads', roles: ['superadmin', 'group_admin', 'admin'] },
    { icon: FileText, label: t('Subscriptions'), path: '/dashboard/subscriptions', roles: ['superadmin', 'group_admin', 'admin', 'accountant'] },
    { icon: DollarSign, label: t('Payments'), path: '/dashboard/payments', roles: ['superadmin', 'group_admin', 'admin', 'accountant'] },
    { icon: BookOpen, label: t('Classes'), path: '/dashboard/classes', roles: ['superadmin', 'group_admin', 'admin'] },
    { icon: Building, label: t('Classrooms'), path: '/dashboard/classrooms', roles: ['superadmin', 'group_admin', 'admin'] },
    { icon: Calendar, label: t('Timetables'), path: '/dashboard/timetables', roles: ['superadmin', 'group_admin', 'admin', 'teacher', 'student'] },
    { icon: CalendarCheck, label: t('Attendance'), path: '/dashboard/attendance', roles: ['admin', 'teacher'] },
    { icon: BookOpen, label: t('Homeworks'), path: '/dashboard/homeworks', roles: ['admin', 'teacher', 'student', 'parent'] },
    { icon: GraduationCap, label: t('Grading'), path: '/dashboard/grading', roles: ['admin', 'teacher', 'student'] },
    { icon: MessageSquare, label: t('Messages'), path: '/dashboard/messages', roles: ['admin', 'teacher', 'student', 'parent'] },
    { icon: SettingsIcon, label: t('My Profile'), path: '/dashboard/profile', roles: ['admin', 'accountant', 'teacher', 'student', 'parent'] },
    { icon: SettingsIcon, label: t('School Settings'), path: '/dashboard/settings', roles: ['admin', 'group_admin'] },
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

        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
          {(!isAdmin || role === 'admin' || role === 'superadmin' || role === 'group_admin') && (
            <div className="space-y-1 mb-6">
              {genericMenu.filter(item => item.roles.includes(role || '') || role === 'superadmin').map((item, index) => {
                const isActive = location.pathname === item.path;
                return (
                <Link
                  key={index}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${isActive ? 'bg-indigo-50 text-indigo-600 font-bold dark:bg-indigo-900/20' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'}`}
                >
                  <item.icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="font-medium text-sm">{item.label}</span>
                </Link>
                );
              })}
            </div>
          )}

          {(role === 'superadmin' || role === 'group_admin') && (
            <div className="space-y-2">
               {/* SuperAdmin Global Nodes */}
               {role === 'superadmin' && (
                 <div className="mb-4">
                   <div className="text-xs font-black text-gray-400 uppercase tracking-widest px-4 mb-2">Platform Data</div>
                   {superAdminMenu.map((item, i) => (
                     <Link
                        key={i}
                        to={item.path}
                        onClick={() => {
                          setActiveTenantId(null);
                          setActiveSchoolId(null);
                          setIsSidebarOpen(false);
                        }}
                        className={`flex items-center gap-3 px-4 py-2 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all font-medium text-sm ${(!tenantId && !schoolId && location.pathname === item.path) ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' : ''}`}
                      >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </Link>
                   ))}
                 </div>
               )}

               <div className="text-xs font-black text-gray-400 uppercase tracking-widest px-4 mb-2">Hierarchical View</div>
               
               {/* Trees */}
               {tenants.map(tenant => {
                 if (role === 'group_admin' && profileTenantId && tenant.id !== profileTenantId) return null;
                 const tenantSchools = schools.filter(s => s.tenantId === tenant.id || (!s.tenantId && tenant.id === 'unassigned'));
                 if (role === 'group_admin' && tenantSchools.length === 0) return null;

                 return (
                   <div key={tenant.id} className="mb-2">
                      <button 
                        onClick={() => setOpenTenants(p => ({...p, [tenant.id]: !p[tenant.id]}))}
                        className="flex items-center w-full gap-2 px-3 py-2 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-bold transition text-sm"
                      >
                        <Network className="w-4 h-4 text-indigo-500" />
                        <span className="flex-1 text-left truncate">{tenant.name || tenant.id}</span>
                        <ChevronRight className={`w-4 h-4 transition-transform ${openTenants[tenant.id] ? 'rotate-90' : ''}`} />
                      </button>

                      <AnimatePresence>
                        {openTenants[tenant.id] && (
                          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden pl-4 mt-1 border-l-2 border-gray-100 dark:border-gray-800 ml-4 space-y-1">
                            {tenantSchools.map(sch => (
                              <div key={sch.id}>
                                <button 
                                  onClick={() => {
                                      setActiveTenantId(tenant.id === 'unassigned' ? null : tenant.id);
                                      setActiveSchoolId(sch.id);
                                      setIsSidebarOpen(false);
                                  }}
                                  className={`flex items-center w-full gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition ${schoolId === sch.id ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                >
                                  <Building className="w-3.5 h-3.5" />
                                  <span className="flex-1 text-left truncate">{sch.name || sch.id}</span>
                                </button>
                              </div>
                            ))}
                            {tenantSchools.length === 0 && <div className="text-xs text-gray-400 font-medium py-2 px-3">No schools...</div>}
                          </motion.div>
                        )}
                      </AnimatePresence>
                   </div>
                 );
               })}
            </div>
          )}
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
          <Route path="leads" element={<Leads />} />
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
          <Route path="grading" element={<Marks />} />
          <Route path="messages" element={<div>Messages Feature (Coming Soon)</div>} />
          <Route path="profile" element={<ProfileSettings />} />
          <Route path="settings" element={<Settings />} />
        </Routes>
      </div>
    </div>
  );
}
