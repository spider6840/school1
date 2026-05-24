import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../hooks/useTheme';
import { motion } from 'motion/react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';

export default function Contact() {
  const { t } = useLanguage();
  const { primaryColor } = useTheme();

  return (
    <div className="pt-32 pb-20 bg-white dark:bg-gray-950 min-h-screen px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-20"
        >
          <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            {t('contactUs')}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Have questions about EduPro? We're here to help your institution grow.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-16">
          {/* Contact Info */}
          <div className="space-y-12">
            <div className="flex gap-6 items-start">
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20" style={{ color: primaryColor }}>
                <Mail className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('email')}</h3>
                <p className="text-gray-600 dark:text-gray-400">info@edupro.com</p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20" style={{ color: primaryColor }}>
                <Phone className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Phone</h3>
                <p className="text-gray-600 dark:text-gray-400">+1 (234) 567-890</p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20" style={{ color: primaryColor }}>
                <MapPin className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Location</h3>
                <p className="text-gray-600 dark:text-gray-400">123 Education Ave, Learning Suite 456</p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-50 dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800"
          >
            <form className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">{t('name')}</label>
                <input type="text" className="w-full px-6 py-4 rounded-2xl bg-white dark:bg-gray-800 border-none focus:ring-2 transition-all outline-none" style={{ '--tw-ring-color': primaryColor } as any} placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">{t('email')}</label>
                <input type="email" className="w-full px-6 py-4 rounded-2xl bg-white dark:bg-gray-800 border-none focus:ring-2 transition-all outline-none" style={{ '--tw-ring-color': primaryColor } as any} placeholder="john@example.com" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">{t('message')}</label>
                <textarea rows={4} className="w-full px-6 py-4 rounded-2xl bg-white dark:bg-gray-800 border-none focus:ring-2 transition-all outline-none resize-none" style={{ '--tw-ring-color': primaryColor } as any} placeholder="Your message..."></textarea>
              </div>
              <button
                type="button"
                className="w-full py-4 rounded-2xl text-white font-bold shadow-xl flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.99] transition-all"
                style={{ backgroundColor: primaryColor }}
              >
                <Send className="w-5 h-5" />
                {t('send')}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
