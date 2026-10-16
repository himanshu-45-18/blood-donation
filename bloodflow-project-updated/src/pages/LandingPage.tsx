import {
  Droplets,
  Heart,
  Phone,
  ShieldCheck,
  Building2,
  ArrowRight,
  Globe,
  Download,
  Smartphone,
  CheckCircle2,
  Ambulance,
} from 'lucide-react';
import { ThemeToggle } from '@/lib/theme';
import { useLanguage } from '@/lib/i18n';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export function LandingPage({ onGetStarted, onLogin }: LandingPageProps) {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* ── Minimal Navigation Bar ── */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-rose-600 p-2 shadow-sm text-white">
              <Droplets className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white leading-none block">
                BloodFlow
              </span>
              <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-widest block">
                Healthcare
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
              className="hidden sm:inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-xs"
            >
              Sign In
            </button>

            <button
              onClick={onGetStarted}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-red-500/20 active:scale-95 transition-all"
            >
              <span>Get Started</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Simple Clean Hero Section ── */}
      <main className="flex-1">
        <section className="py-14 sm:py-20 max-w-4xl mx-auto px-4 sm:px-6 text-center">
          {/* Subtle Live Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-semibold mb-6">
            <span className="flex h-2 w-2 rounded-full bg-red-600 animate-pulse" />
            <span>24/7 Lifesaving Blood &amp; Ambulance Network</span>
          </div>

          {/* Clean Main Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.15]">
            Every Drop Counts.{' '}
            <span className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 bg-clip-text text-transparent">
              Every Second Matters.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto font-normal">
            BloodFlow connects voluntary blood donors, verified hospital blood banks, and critical care emergency response into one fast, reliable platform.
          </p>

          {/* Main Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onGetStarted}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 px-6 py-3 text-sm font-bold text-white shadow-md shadow-red-500/20 active:scale-95 transition-all"
            >
              <Heart className="h-4 w-4" />
              <span>Register as Donor</span>
            </button>

            <button
              onClick={onLogin}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 px-6 py-3 text-sm font-bold text-slate-800 dark:text-slate-200 shadow-xs transition-all"
            >
              <Building2 className="h-4 w-4 text-red-600" />
              <span>Hospital &amp; Admin Login</span>
            </button>
          </div>

          {/* Minimal 24/7 Emergency Ambulance Callout */}
          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-xs text-slate-600 dark:text-slate-300 shadow-xs">
            <Phone className="h-3.5 w-3.5 text-red-600 animate-pulse" />
            <span>Emergency Ambulance Helpline:</span>
            <a href="tel:108" className="font-bold text-red-600 dark:text-red-400 hover:underline">
              Call 108 (Toll-Free)
            </a>
          </div>
        </section>

        {/* ── 3 Simple Feature Cards ── */}
        <section className="py-10 max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 mb-4">
                <Droplets className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Instant Blood Matching</h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Connect compatible donors directly with urgent hospital patient requirements in real-time.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 mb-4">
                <Building2 className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Hospital Network</h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Live blood inventory management, emergency broadcast alerts, and verified donation certificates.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mb-4">
                <Ambulance className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Emergency Calling</h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                One-tap rapid ambulance dispatch and automated Twilio voice notifications in critical situations.
              </p>
            </div>
          </div>
        </section>

        {/* ── App Download Card (Landing Page Only) ── */}
        <section className="py-10 max-w-4xl mx-auto px-4 sm:px-6">
          <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-red-950 text-white p-6 sm:p-8 shadow-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-600/30 text-red-400 border border-red-500/30">
                <Smartphone className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Download BloodFlow Mobile App</h2>
                <p className="text-xs text-slate-300 mt-1">
                  Get the official Android APK for one-tap emergency calling and instant donation alerts.
                </p>
              </div>
            </div>
            <a
              href="/BloodFlow.apk"
              download="BloodFlow.apk"
              className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 text-xs font-bold shadow-md shadow-red-600/30 active:scale-95 transition-all"
            >
              <Download className="h-4 w-4" />
              <span>Download APK</span>
            </a>
          </div>
        </section>
      </main>

      {/* ── Clean Footer ── */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-6 text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">BloodFlow Healthcare Network</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onLogin} className="hover:text-red-600 dark:hover:text-red-400 transition-colors">
              Sign In
            </button>
            <button onClick={onGetStarted} className="hover:text-red-600 dark:hover:text-red-400 transition-colors">
              Register
            </button>
            <a href="tel:108" className="font-bold text-red-600 dark:text-red-400 hover:underline">
              Ambulance: 108
            </a>
          </div>
          <p>© {new Date().getFullYear()} BloodFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
