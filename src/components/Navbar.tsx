import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { Sun, Moon, Languages, GraduationCap, LayoutDashboard, LogOut, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';

export default function Navbar() {
  const { t, setLanguage, language } = useLanguage();
  const { theme, toggleTheme, primaryColor } = useTheme();
  const { user, logout, role } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="p-2 rounded-xl" style={{ backgroundColor: primaryColor }}>
              <GraduationCap className="text-white w-6 h-6" />
            </div>
            <span className="font-bold text-xl tracking-tight text-gray-900 dark:text-white">EduPro</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">{t('home')}</Link>
            <Link to="/contact" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">{t('contact')}</Link>
            {user && (
              <Link to="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <div className="relative group">
              <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400">
                <Languages className="w-5 h-5" />
              </button>
              <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <button onClick={() => setLanguage('en')} className={`w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 ${language === 'en' ? 'font-bold' : ''}`}>English</button>
                <button onClick={() => setLanguage('fr')} className={`w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 ${language === 'fr' ? 'font-bold' : ''}`}>Français</button>
                <button onClick={() => setLanguage('ar')} className={`w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 ${language === 'ar' ? 'font-bold' : ''}`}>العربية</button>
              </div>
            </div>

            {/* Theme Toggle */}
            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400">
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>

            {/* Auth Button */}
            {user ? (
              <div className="relative group">
                <button className="flex items-center gap-2 p-1.5 pr-4 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center" style={{ color: primaryColor }}>
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <div className="text-left hidden sm:block">
                    <div className="text-xs font-bold text-gray-900 dark:text-white truncate max-w-[100px]">{user.displayName || user.email}</div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider">{role || 'User'}</div>
                  </div>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors">
                    <LogOut className="w-4 h-4" />
                    <span className="font-medium">Logout</span>
                  </button>
                </div>
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/auth')}
                className="px-6 py-2.5 rounded-full text-white font-medium shadow-lg shadow-blue-500/20 transition-all hover:brightness-110"
                style={{ backgroundColor: primaryColor }}
              >
                {t('memberSpace')}
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
