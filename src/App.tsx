import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import React, { useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './lib/firebase';
import { LanguageProvider, useLanguage } from './hooks/useLanguage';
import { ThemeProvider, useTheme } from './hooks/useTheme';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Contact from './pages/Contact';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';

function AppInitializer({ children }: { children: React.ReactNode }) {
  const { setPrimaryColor } = useTheme();
  const { setLanguage } = useLanguage();
  const { schoolData, loading: authLoading } = useAuth();

  useEffect(() => {
    const fetchGlobalSettings = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'general'));
        if (snap.exists()) {
          const data = snap.data();
          if (data.themeColor && !schoolData?.themeColor) setPrimaryColor(data.themeColor);
          if (data.defaultLanguage && !schoolData?.defaultLanguage) setLanguage(data.defaultLanguage);
        }
      } catch (error) {
        console.error("Failed to load global settings:", error);
      }
    };

    if (schoolData) {
       if (schoolData.themeColor) setPrimaryColor(schoolData.themeColor);
       if (schoolData.defaultLanguage) setLanguage(schoolData.defaultLanguage);
    } else if (!authLoading) {
      fetchGlobalSettings();
    }
  }, [schoolData, authLoading, setPrimaryColor, setLanguage]);

  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <AppInitializer>
            <Router>
              <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-300">
                <Navbar />
                <main>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/dashboard/*" element={<Dashboard />} />
                    <Route path="/superadmin/*" element={<Dashboard />} />
                  </Routes>
                </main>
              </div>
            </Router>
          </AppInitializer>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
