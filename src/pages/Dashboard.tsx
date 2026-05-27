import { useState } from 'react';
import { Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
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
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import UserManagement from './dashboard/UserManagement';
import Classes from './dashboard/Classes';
import Attendance from './dashboard/Attendance';
import Settings from './dashboard/Settings';
import Schools from './dashboard/Schools';

export default function Dashboard() {
  const { user, role, isAdmin, isSuperAdmin } = useAuth();
  const { t, dir } = useLanguage();
  const { primaryColor } = useTheme();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const menuItems = [
    { icon: LayoutDashboard, label: 'Overview', path: '/dashboard', roles: ['superadmin', 'admin', 'teacher', 'student', 'parent'] },
    { icon: Building, label: 'Schools', path: '/dashboard/schools', roles: ['superadmin'] },
    { icon: Users, label: 'Admissions', path: '/dashboard/users', roles: ['superadmin', 'admin'] },
    { icon: BookOpen, label: 'Classes', path: '/dashboard/classes', roles: ['superadmin', 'admin'] },
    { icon: CalendarCheck, label: 'Attendance', path: '/dashboard/attendance', roles: ['superadmin', 'admin', 'teacher'] },
    { icon: GraduationCap, label: 'Grading', path: '/dashboard/grading', roles: ['superadmin', 'admin', 'teacher', 'student'] },
    { icon: MessageSquare, label: 'Messages', path: '/dashboard/messages', roles: ['superadmin', 'admin', 'teacher', 'student', 'parent'] },
    { icon: SettingsIcon, label: 'Settings', path: '/dashboard/settings', roles: ['superadmin', 'admin'] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(role || ''));

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
      <aside className={`fixed lg:sticky top-20 h-[calc(100vh-5rem)] w-64 bg-white dark:bg-gray-900 border-${dir === 'ltr' ? 'r' : 'l'} border-gray-100 dark:border-gray-800 flex-shrink-0 z-50 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 overflow-y-auto h-full">
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
          <Route path="classes" element={<Classes />} />
          <Route path="schools" element={<Schools />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="grading" element={<div>Grading Feature (Coming Soon)</div>} />
          <Route path="messages" element={<div>Messages Feature (Coming Soon)</div>} />
          <Route path="settings" element={<Settings />} />
        </Routes>
      </div>
    </div>
  );
}

function Overview() {
  const { user, role } = useAuth();
  const { primaryColor } = useTheme();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome back, {user?.displayName || user?.email}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Here's what's happening in your school today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Active Students', value: '1,234', icon: Users, color: 'blue' },
          { label: 'Staff Members', value: '86', icon: ShieldCheck, color: 'green' },
          { label: 'Classes Today', value: '42', icon: GraduationCap, color: 'purple' },
          { label: 'Unread Messages', value: '12', icon: MessageSquare, color: 'amber' },
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
         <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Recent Activity</h2>
         <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-4 items-center">
                 <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500">
                    <Users className="w-5 h-5" />
                 </div>
                 <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white">New admission processed</div>
                    <div className="text-xs text-gray-500">2 hours ago</div>
                 </div>
              </div>
            ))}
         </div>
      </div>
    </div>
  );
}
