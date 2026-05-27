import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../hooks/useTheme';
import { motion } from 'motion/react';
import { Users, BookOpen, Calendar, CheckCircle } from 'lucide-react';

export default function Home() {
  const { t } = useLanguage();
  const { primaryColor } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="pt-20 bg-white dark:bg-gray-950 min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight mb-6">
              {t('heroTitle')}
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-lg leading-relaxed">
              {t('heroSub')}
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => navigate('/contact')}
                className="px-8 py-4 rounded-2xl text-white font-semibold shadow-xl transition-transform hover:scale-105 active:scale-95"
                style={{ backgroundColor: primaryColor }}
              >
                {t('contactUs')}
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative h-[500px] rounded-3xl overflow-hidden shadow-2xl"
          >
             <img
                src="https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80"
                alt="Modern School Management"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              {/* Floating Dashboard Elements */}
              <div className="absolute top-8 left-8 bg-white/90 dark:bg-gray-800/90 backdrop-blur p-4 rounded-2xl shadow-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Attendance</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">98% Today</div>
                </div>
              </div>
          </motion.div>
        </div>
      </section>

      {/* Quick Stats/Features */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Users, label: t('featAdmissions'), count: t('featAdmissionsDesc') },
              { icon: BookOpen, label: t('featGrading'), count: t('featGradingDesc') },
              { icon: Calendar, label: t('featScheduling'), count: t('featSchedulingDesc') },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-6" style={{ color: primaryColor }}>
                  <feature.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{feature.label}</h3>
                <p className="text-gray-600 dark:text-gray-400">{feature.count}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
