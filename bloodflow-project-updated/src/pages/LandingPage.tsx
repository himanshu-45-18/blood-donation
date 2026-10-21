import {
  Droplets,
  Heart,
  ShieldCheck,
  Building2,
  ArrowRight,
  Globe,
  Download,
  Smartphone,
  Award,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { ThemeToggle } from '@/lib/theme';
import { useLanguage } from '@/lib/i18n';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export function LandingPage({ onGetStarted, onLogin }: LandingPageProps) {
  const { language, setLanguage, tr } = useLanguage();

  const bloodGroups = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* ── Minimal Navigation Bar ── */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-white shadow-xs">
              <Droplets className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-none block">
                BloodFlow
              </span>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mt-0.5">
                {tr('Healthcare Network')}
              </span>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2.5">
            {/* Dark / Light Mode Toggle */}
            <ThemeToggle />

            {/* Language Switcher */}
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-slate-700 dark:text-slate-200 shadow-xs">
              <Globe className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <select
                aria-label="Language"
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'en' | 'hi')}
                className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="en" className="dark:bg-slate-900">EN</option>
                <option value="hi" className="dark:bg-slate-900">हिंदी</option>
              </select>
            </div>

            <button
              onClick={onLogin}
              className="hidden sm:inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-xs"
            >
              {tr('Sign In')}
            </button>

            <button
              onClick={onGetStarted}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-semibold text-white shadow-xs active:scale-95 transition-all"
            >
              <span>{tr('Get Started')}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Human, Clean, Direct Hero Section ── */}
      <main className="flex-1">
        <section className="pt-16 pb-12 sm:pt-20 sm:pb-16 max-w-4xl mx-auto px-4 sm:px-6 text-center">
          {/* Subtle Verified Network Label */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-medium mb-6 shadow-xs">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{tr('Verified Blood Donation & Hospital Registry')}</span>
          </div>

          {/* Clean, Non-AI Human Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.18]">
            {language === 'hi' ? (
              tr('Connecting voluntary blood donors with hospitals in real need.')
            ) : (
              <>
                Connecting voluntary blood donors with hospitals in{' '}
                <span className="text-red-600 dark:text-red-500 underline decoration-red-200 dark:decoration-red-950 underline-offset-4">
                  real need
                </span>
                .
              </>
            )}
          </h1>

          {/* Simple, Honest Subtitle */}
          <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto font-normal">
            {tr('A reliable medical platform built to eliminate shortages. Check live blood stock across partner facilities, schedule voluntary donations, and support emergency patients.')}
          </p>

          {/* Main Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onGetStarted}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-6 py-3 text-sm font-semibold text-white shadow-xs active:scale-95 transition-all"
            >
              <Heart className="h-4 w-4" />
              <span>{tr('Register as a Donor')}</span>
            </button>

            <button
              onClick={onLogin}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 px-6 py-3 text-sm font-semibold text-slate-800 dark:text-slate-200 shadow-xs transition-all"
            >
              <Building2 className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <span>{tr('Hospital & Admin Portal')}</span>
            </button>
          </div>

          {/* Active Blood Group Checker Strip */}
          <div className="mt-10 pt-6 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1">
              {tr('Supported Blood Groups:')}
            </span>
            {bloodGroups.map((group) => (
              <span
                key={group}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-xs"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
                {group}
              </span>
            ))}
          </div>
        </section>

        {/* ── Real Hospital & Donor Care Showcase (User Photo Grid) ── */}
        <section className="pb-12 max-w-5xl mx-auto px-4 sm:px-6">
          <div className="relative rounded-2xl overflow-hidden border border-slate-200/90 dark:border-slate-800 bg-slate-900 shadow-xl transition-all duration-300">
            <img
              src="/images/healthcare-grid.png"
              alt="Specialist Doctors, Volunteer Blood Donors, Compassionate Helpers, Green Corridors"
              className="w-full h-auto object-cover rounded-2xl"
              loading="eager"
            />
          </div>
        </section>

        {/* ── 3 Grounded, Honest Feature Cards ── */}
        <section className="py-8 max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 mb-4">
                <Droplets className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">{tr('Live Inventory Tracking')}</h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                {tr('Hospitals monitor blood units across all 8 blood groups in real time to avoid shortages and unnecessary waste.')}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 mb-4">
                <Building2 className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">{tr('Hospital Direct Broadcast')}</h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                {tr('Approved medical centers broadcast urgent patient blood requirements directly to compatible local donors.')}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mb-4">
                <Award className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">{tr('Verified Certificates')}</h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                {tr('Donors earn verified digital contribution certificates and maintain their lifetime donation history securely.')}
              </p>
            </div>
          </div>
        </section>

        {/* ── App Download Card (Landing Page Only) ── */}
        <section className="py-10 max-w-4xl mx-auto px-4 sm:px-6">
          <div className="rounded-2xl bg-slate-900 text-white p-6 sm:p-8 shadow-lg border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-red-400 border border-slate-700">
                <Smartphone className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{tr('BloodFlow Mobile App')}</h2>
                <p className="text-xs text-slate-300 mt-1">
                  {tr('Download the official Android APK for fast donation slot booking and digital certificate access.')}
                </p>
              </div>
            </div>
            <a
              href="/BloodFlow.apk"
              download="BloodFlow.apk"
              className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 text-xs font-semibold shadow-xs active:scale-95 transition-all"
            >
              <Download className="h-4 w-4" />
              <span>{tr('Download APK')}</span>
            </a>
          </div>
        </section>
      </main>

      {/* ── Clean Human Footer ── */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-6 text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">{tr('BloodFlow Healthcare Network')}</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onLogin} className="hover:text-slate-900 dark:hover:text-white transition-colors">
              {tr('Hospital Portal')}
            </button>
            <button onClick={onGetStarted} className="hover:text-slate-900 dark:hover:text-white transition-colors">
              {tr('Donor Registration')}
            </button>
          </div>
          <p>© {new Date().getFullYear()} BloodFlow. {tr('Voluntary healthcare initiative.')}</p>
        </div>
      </footer>
    </div>
  );
}
