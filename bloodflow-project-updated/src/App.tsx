import { AuthProvider, useAuth } from '@/lib/auth';
import { AuthPage } from '@/pages/AuthPage';
import { DonorDashboard } from '@/pages/DonorDashboard';
import { HospitalDashboard } from '@/pages/HospitalDashboard';
import { AdminDashboard } from '@/pages/AdminDashboard';
import { Spinner } from '@/components/ui';
import { LanguageProvider } from '@/lib/i18n';

function AppContent() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!session || !profile) {
    return <AuthPage />;
  }

  if (profile.role === 'donor') return <DonorDashboard />;
  if (profile.role === 'hospital_admin') return <HospitalDashboard />;
  if (profile.role === 'admin') return <AdminDashboard />;

  return <AuthPage />;
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}
