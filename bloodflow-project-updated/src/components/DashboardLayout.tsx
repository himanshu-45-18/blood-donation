import type { ReactNode } from 'react';
import { useState } from 'react';
import { LogOut, Menu, X, Globe, Shield, Heart, Building2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { useLanguage, type Language } from '@/lib/i18n';
import { ThemeToggle } from '@/lib/theme';

type NavItem = {
  id: string;
  label: string;
  icon: ReactNode;
};

type DashboardLayoutProps = {
  children: ReactNode;
  navItems: NavItem[];
  activeView: string;
  onNavigate: (id: string) => void;
  roleLabel: string;
};

export function DashboardLayout({ children, navItems, activeView, onNavigate, roleLabel }: DashboardLayoutProps) {
  const { profile, signOut } = useAuth();
  const { language, setLanguage, t, tr } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);

  const roleIcon =
    profile?.role === 'hospital_admin' ? (
      <Building2 className="h-3.5 w-3.5 text-brand-600" />
    ) : profile?.role === 'admin' ? (
      <Shield className="h-3.5 w-3.5 text-amber-600" />
    ) : (
      <Heart className="h-3.5 w-3.5 text-emergency-600" />
    );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Sidebar — desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs lg:flex">
        {/* Brand header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4">
          <div className="flex items-center gap-2">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 p-0.5 shadow-xs">
              <img src="/logo.png" alt="BloodFlow" className="h-full w-full rounded-[10px] object-cover" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 block leading-none">BloodFlow</span>
              <span className="text-[10px] font-semibold text-brand-600 dark:text-brand-400 tracking-wider uppercase leading-none mt-1 block">Healthcare</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <LanguageSwitcher language={language} setLanguage={setLanguage} label={t('language')} />
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 space-y-1.5 p-4 overflow-y-auto">
          <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{tr('Navigation')}</div>
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 relative text-left',
                  isActive
                    ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-800 dark:text-brand-300 font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100',
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-brand-600" aria-hidden="true" />
                )}
                <span className={cn('transition-colors', isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300')}>
                  {item.icon}
                </span>
                <span className="truncate">{translatedNavLabel(item.id, item.label, t, tr)}</span>
              </button>
            );
          })}
        </nav>

        {/* User profile footer */}
        <div className="border-t border-slate-100 dark:border-slate-800 p-3.5 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850 p-2.5 shadow-xs">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white shadow-xs">
              {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                {profile?.full_name || 'User'}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                {roleIcon}
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 capitalize leading-none">{tr(roleLabel)}</span>
              </div>
            </div>
            <button
              onClick={signOut}
              title={t('signOut')}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              aria-label={t('signOut')}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 lg:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 p-0.5">
            <img src="/logo.png" alt="BloodFlow" className="h-full w-full rounded-md object-cover" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 block leading-none">BloodFlow</span>
            <span className="text-[9px] font-semibold text-brand-600 dark:text-brand-400 tracking-wider uppercase leading-none mt-0.5 block">{roleLabel}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageSwitcher language={language} setLanguage={setLanguage} label={t('language')} />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity" onClick={() => setMobileOpen(false)} />
          <div className="fixed inset-y-0 left-0 flex w-72 flex-col bg-white dark:bg-slate-900 shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5">
              <div className="flex items-center gap-2.5">
                <img src="/logo.png" alt="BloodFlow" className="h-8 w-8 rounded-lg object-cover" />
                <span className="text-base font-bold text-slate-900 dark:text-slate-100">BloodFlow</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setMobileOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors text-left',
                      isActive
                        ? 'bg-brand-50 text-brand-800 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                    )}
                  >
                    <span className={isActive ? 'text-brand-600' : 'text-slate-400'}>{item.icon}</span>
                    <span className="truncate">{translatedNavLabel(item.id, item.label, t, tr)}</span>
                  </button>
                );
              })}
            </nav>
            <div className="border-t border-slate-100 dark:border-slate-800 p-4 bg-slate-50/60 dark:bg-slate-900/60">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
                  {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">{profile?.full_name || 'User'}</p>
                  <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{tr(roleLabel)}</p>
                </div>
              </div>
              <button
                onClick={signOut}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs"
              >
                <LogOut className="h-4 w-4 text-slate-400" />
                {t('signOut')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main workspace */}
      <main className="flex-1 lg:pl-64">
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}

function translatedNavLabel(
  id: string,
  fallback: string,
  t: (key: 'overview' | 'incomingDonors' | 'bloodInventory' | 'emergencyRequests' | 'settings' | 'donors' | 'appointments' | 'certificates' | 'allHospitals') => string,
  tr?: (text: string) => string,
) {
  const labels = {
    overview: 'overview',
    donors: 'donors',
    inventory: 'bloodInventory',
    emergency: 'emergencyRequests',
    settings: 'settings',
    appointments: 'appointments',
    certificates: 'certificates',
    hospitals: 'allHospitals',
  } as const;
  if (id in labels) {
    return t(labels[id as keyof typeof labels]);
  }
  return tr ? tr(fallback) : fallback;
}

function LanguageSwitcher({ language, setLanguage, label }: { language: Language; setLanguage: (language: Language) => void; label: string }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1.5 py-1 shadow-xs">
      <Globe className="h-3.5 w-3.5 text-slate-400 shrink-0" />
      <select
        aria-label={label}
        value={language}
        onChange={(event) => setLanguage(event.target.value as Language)}
        className="bg-transparent text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer pr-1"
      >
        <option value="en" className="dark:bg-slate-800">EN</option>
        <option value="hi" className="dark:bg-slate-800">हिंदी</option>
      </select>
    </div>
  );
}

type PageHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  badge?: ReactNode;
};

export function PageHeader({ title, description, action, badge }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/60 dark:border-slate-800 pb-5">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{title}</h1>
          {badge}
        </div>
        {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-2xl">{description}</p>}
      </div>
      {action && <div className="flex items-center gap-2.5 shrink-0">{action}</div>}
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: string | number;
  icon: ReactNode;
  color?: 'red' | 'blue' | 'green' | 'amber' | 'purple' | 'teal';
  subtitle?: string;
};

const statColors: Record<string, { bg: string; text: string; ring: string }> = {
  red: { bg: 'bg-emergency-50 dark:bg-emergency-950/60', text: 'text-emergency-600 dark:text-emergency-400', ring: 'border-emergency-100 dark:border-emergency-900/60' },
  blue: { bg: 'bg-brand-50 dark:bg-brand-950/60', text: 'text-brand-600 dark:text-brand-400', ring: 'border-brand-100 dark:border-brand-900/60' },
  green: { bg: 'bg-emerald-50 dark:bg-emerald-950/60', text: 'text-emerald-600 dark:text-emerald-400', ring: 'border-emerald-100 dark:border-emerald-900/60' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-950/60', text: 'text-amber-600 dark:text-amber-400', ring: 'border-amber-100 dark:border-amber-900/60' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-950/60', text: 'text-purple-600 dark:text-purple-400', ring: 'border-purple-100 dark:border-purple-900/60' },
  teal: { bg: 'bg-teal-50 dark:bg-teal-950/60', text: 'text-teal-600 dark:text-teal-400', ring: 'border-teal-100 dark:border-teal-900/60' },
};

export function StatCard({ label, value, icon, color = 'blue', subtitle }: StatCardProps) {
  const styles = statColors[color] || statColors.blue;
  return (
    <div className="group rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-card transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-elevated">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl border shadow-2xs transition-transform duration-200 group-hover:scale-105',
            styles.bg,
            styles.text,
            styles.ring,
          )}
        >
          {icon}
        </div>
      </div>
      <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 font-medium">{subtitle}</p>}
    </div>
  );
}

