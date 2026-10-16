import { useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { AuthPage } from '@/pages/AuthPage';
import { LandingPage } from '@/pages/LandingPage';
import { DonorDashboard } from '@/pages/DonorDashboard';
import { HospitalDashboard } from '@/pages/HospitalDashboard';
import { AdminDashboard } from '@/pages/AdminDashboard';
import { Spinner } from '@/components/ui';
import { LanguageProvider } from '@/lib/i18n';
import { ThemeProvider } from '@/lib/theme';

function AppContent() {
  const { session, profile, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors">
        <Spinner className="h-8 w-8 text-brand-600" />
      </div>
    );
  }

  // Not logged in: Show Landing Page first, transition to AuthPage when user clicks Get Started or Sign In
  if (!session || !profile) {
    if (showAuth) {
      return <AuthPage onBack={() => setShowAuth(false)} />;
    }
    return (
      <LandingPage
        onGetStarted={() => setShowAuth(true)}
        onLogin={() => setShowAuth(true)}
      />
    );
  }

  if (profile.role === 'donor') return <DonorDashboard />;
  if (profile.role === 'hospital_admin') return <HospitalDashboard />;
  if (profile.role === 'admin') return <AdminDashboard />;

  return <AuthPage onBack={() => setShowAuth(false)} />;
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
