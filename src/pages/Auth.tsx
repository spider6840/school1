import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'motion/react';
import { LogIn, ShieldAlert } from 'lucide-react';

export default function Auth() {
  const { t } = useLanguage();
  const { primaryColor } = useTheme();
  const { login, emailLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      await login();
      navigate('/dashboard');
    } catch (err: any) {
      if (err.code === 'auth/network-request-failed' || err.message?.includes('network-request-failed') || err.code === 'auth/popup-blocked') {
        setError('Network error/Popup blocked: Please open the app in a new tab or disable adblockers.');
      } else {
        setError(err.message || 'Google login failed.');
      }
      console.error("Login failed:", err);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await emailLogin(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      if (err.code === 'auth/network-request-failed' || err.message?.includes('network-request-failed')) {
        setError('Network error: Login was blocked. Try opening the app in a new tab, or disable adblockers/strict privacy shields.');
      } else {
        setError(err.message || 'Invalid email or password.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-32 pb-20 bg-gray-50 dark:bg-gray-950 min-h-screen flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-[2.5rem] p-10 shadow-2xl border border-gray-100 dark:border-gray-800"
      >
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-blue-500/20">
            <LogIn className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('memberSpace')}</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Sign in with your authorized credentials</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-900/10 text-red-600 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:bg-white dark:focus:bg-gray-700 transition-all outline-none"
              style={{ '--tw-ring-color': primaryColor } as any}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:bg-white dark:focus:bg-gray-700 transition-all outline-none"
              style={{ '--tw-ring-color': primaryColor } as any}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl text-white font-bold shadow-xl transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            style={{ backgroundColor: primaryColor }}
          >
            {loading ? 'Connecting...' : 'Sign In'}
          </button>
        </form>

        <div className="relative py-8">
           <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100 dark:border-gray-800"></div></div>
           <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest"><span className="bg-white dark:bg-gray-900 px-4 text-gray-400">Or continue with</span></div>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            className="w-full py-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-bold flex items-center justify-center gap-3 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-750 transition-all active:scale-[0.98]"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google Login
          </button>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center gap-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 text-amber-800 dark:text-amber-400">
             <ShieldAlert className="w-5 h-5 shrink-0" />
             <p className="text-xs leading-relaxed font-medium text-center w-full">
               Admin project by r.elmougali@edupro.com
             </p>
          </div>
        </div>
      </motion.div>
    </div>
  );

}
