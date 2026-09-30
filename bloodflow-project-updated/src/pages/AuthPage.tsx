import { useState, type ReactNode } from 'react';
import { Heart, Shield, Building2, ArrowRight, CheckCircle2, Activity, Users, Clock, Mail, Lock, User, Phone, MapPin, Globe, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Button, Input, Select, Spinner } from '@/components/ui';
import { cn } from '@/lib/utils';
import { BLOOD_GROUPS } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n';

type AuthMode = 'login' | 'signup';
type RoleChoice = 'donor' | 'hospital_admin' | 'admin';

export function AuthPage() {
  const { refreshProfile } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [mode, setMode] = useState<AuthMode>('login');
  const [role, setRole] = useState<RoleChoice>('donor');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (mode === 'signup' && !termsAccepted) {
      setError(t('termsRequired'));
      return;
    }
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role,
              full_name: fullName,
              phone,
              blood_group: role === 'donor' ? bloodGroup : null,
              date_of_birth: role === 'donor' ? dateOfBirth : null,
              city,
              address,
            },
          },
        });

        if (signUpError) throw signUpError;
        if (data.user && data.session) {
          await refreshProfile(data.user.id);
        } else if (data.user) {
          setError('Account created. Check your email to confirm your account, then sign in.');
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        if (!data.user || !data.session) {
          setError('Please confirm your email before signing in.');
          return;
        }
        await refreshProfile(data.user.id);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      if (msg.includes('Invalid login')) {
        setError('Invalid email or password. Please try again.');
      } else if (msg.includes('already registered')) {
        setError('An account with this email already exists. Please log in instead.');
      } else if (msg.includes('Password should be at least')) {
        setError('Password must be at least 6 characters long.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError('');
    if (mode === 'signup' && !termsAccepted) {
      setError(t('termsRequired'));
      return;
    }
    setLoading(true);

    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (googleError) {
      setError(googleError.message);
      setLoading(false);
    }
  }

  const roleOptions: { value: RoleChoice; label: string; icon: ReactNode; description: string }[] = [
    { value: 'donor', label: 'Donor', icon: <Heart className="h-4 w-4" />, description: 'Schedule donations & track impact' },
    { value: 'hospital_admin', label: 'Hospital', icon: <Building2 className="h-4 w-4" />, description: 'Manage inventory & incoming donors' },
    { value: 'admin', label: 'Admin', icon: <Shield className="h-4 w-4" />, description: 'Oversee the entire platform' },
  ];

  const visibleRoleOptions = mode === 'signup' ? roleOptions.filter((option) => option.value !== 'admin') : roleOptions;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:grid lg:grid-cols-12 font-sans">
      {/* Left panel — Healthcare branding */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-brand-950 lg:flex lg:col-span-5 xl:col-span-5 lg:flex-col lg:justify-between lg:p-12 text-white">
        {/* Ambient glow orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-30">
          <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-brand-500 blur-[100px]" />
          <div className="absolute right-0 top-1/2 h-96 w-96 rounded-full bg-teal-500 blur-[120px]" />
          <div className="absolute bottom-10 left-1/3 h-56 w-56 rounded-full bg-brand-600 blur-[100px]" />
        </div>

        {/* Top header */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 p-1 backdrop-blur-md ring-1 ring-white/20 shadow-lg">
              <img src="/logo.png" alt="BloodFlow" className="h-full w-full rounded-xl object-cover" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white block leading-none">BloodFlow</span>
              <span className="text-[10px] font-semibold text-teal-400 tracking-wider uppercase leading-none mt-1 block">
                Healthcare Network
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 backdrop-blur-sm">
            <Sparkles className="h-3 w-3 text-teal-400" />
            <span className="text-[11px] font-medium">Verified Platform</span>
          </div>
        </div>

        {/* Main message */}
        <div className="relative z-10 my-auto py-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-500/10 border border-brand-400/20 px-3 py-1 text-xs font-semibold text-brand-300 mb-6">
            <Activity className="h-3.5 w-3.5 text-brand-400" />
            Centralized Blood Coordination
          </div>
          <h1 className="text-3xl xl:text-4xl font-extrabold leading-tight tracking-tight text-white">
            Connecting donors, hospitals, and blood banks in real time.
          </h1>
          <p className="mt-4 text-base text-slate-300 leading-relaxed max-w-md">
            Streamlining emergency blood requests, inventory synchronization, and scheduled donor appointments with clinical precision.
          </p>

          <div className="mt-8 space-y-4 max-w-md">
            {[
              {
                icon: <Activity className="h-5 w-5 text-teal-400" />,
                title: 'Real-Time Inventory',
                text: 'Live stock tracking across hospitals and regional blood banks.',
              },
              {
                icon: <Clock className="h-5 w-5 text-amber-400" />,
                title: 'Emergency Broadcasting',
                text: 'Simultaneous automated telephone alerts for critical blood needs.',
              },
              {
                icon: <Users className="h-5 w-5 text-brand-400" />,
                title: 'Verified Donors',
                text: 'Scheduled appointments and verifiable donor certificates.',
              },
            ].map((f, i) => (
              <div
                key={i}
                className="flex items-start gap-3.5 rounded-xl border border-white/10 bg-white/[0.04] p-3.5 backdrop-blur-sm transition-all hover:bg-white/[0.07]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 shadow-xs">
                  {f.icon}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white leading-snug">{f.title}</h4>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer trust badge */}
        <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-6 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-400" />
            <span>Secure & HIPAA Aligned</span>
          </div>
          <span>v2.4 Production</span>
        </div>
      </div>

      {/* Right panel — Auth Form */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-10 lg:col-span-7 xl:col-span-7 overflow-y-auto">
        <div className="w-full max-w-md my-auto py-6">
          {/* Mobile brand header */}
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <div className="flex items-center gap-2.5">
              <img src="/logo.png" alt="BloodFlow" className="h-9 w-9 rounded-xl object-cover shadow-xs" />
              <div>
                <span className="text-base font-bold text-slate-900 leading-none block">BloodFlow</span>
                <span className="text-[10px] font-semibold text-brand-600 uppercase tracking-wider block mt-0.5">Healthcare</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-xs text-xs">
              <Globe className="h-3.5 w-3.5 text-slate-400" />
              <select
                aria-label={t('language')}
                value={language}
                onChange={(event) => setLanguage(event.target.value as 'en' | 'hi')}
                className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="en">English</option>
                <option value="hi">हिंदी</option>
              </select>
            </div>
          </div>

          {/* Desktop language picker header */}
          <div className="hidden lg:flex items-center justify-end mb-4">
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 shadow-xs text-xs text-slate-600">
              <Globe className="h-3.5 w-3.5 text-slate-400" />
              <select
                aria-label={t('language')}
                value={language}
                onChange={(event) => setLanguage(event.target.value as 'en' | 'hi')}
                className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="en">English</option>
                <option value="hi">हिंदी</option>
              </select>
            </div>
          </div>

          {/* Form Title & Subtitle */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              {mode === 'login' ? t('welcomeBack') : t('createAccount')}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {mode === 'login'
                ? 'Sign in to access your blood donation network dashboard.'
                : 'Join BloodFlow to connect donors, blood stock, and hospitals.'}
            </p>
          </div>

          {/* Role selector */}
          <div className="mb-6">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Select Your Role
            </label>
            <div className="grid grid-cols-3 gap-2">
              {visibleRoleOptions.map((opt) => {
                const isSelected = role === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRole(opt.value)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all duration-150',
                      isSelected
                        ? 'border-brand-600 bg-brand-50/80 text-brand-900 shadow-xs ring-1 ring-brand-500/30'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50/60',
                    )}
                  >
                    <div className={cn('p-1 rounded-lg', isSelected ? 'bg-brand-600 text-white' : 'text-slate-400')}>
                      {opt.icon}
                    </div>
                    <span className="text-xs font-semibold leading-tight">{opt.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {roleOptions.find((r) => r.value === role)?.description}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <Input
                  label={role === 'hospital_admin' ? 'Hospital Name' : 'Full Name'}
                  value={fullName}
                  onChange={setFullName}
                  placeholder={role === 'hospital_admin' ? 'e.g. City Central Medical Center' : 'John Doe'}
                  icon={<User className="h-4 w-4" />}
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Phone"
                    value={phone}
                    onChange={setPhone}
                    placeholder="+1 555 000 0000"
                    icon={<Phone className="h-4 w-4" />}
                    required
                  />
                  <Input
                    label="City"
                    value={city}
                    onChange={setCity}
                    placeholder="New York"
                    icon={<MapPin className="h-4 w-4" />}
                    required
                  />
                </div>
                {role === 'donor' && (
                  <div className="grid grid-cols-2 gap-3">
                    <Select
                      label="Blood Group"
                      value={bloodGroup}
                      onChange={setBloodGroup}
                      placeholder="Select group"
                      required
                      options={BLOOD_GROUPS.map((bg) => ({ value: bg, label: bg }))}
                    />
                    <Input
                      label="Date of Birth"
                      type="date"
                      value={dateOfBirth}
                      onChange={setDateOfBirth}
                      required
                    />
                  </div>
                )}
                {role === 'donor' && (
                  <Input
                    label="Address"
                    value={address}
                    onChange={setAddress}
                    placeholder="123 Main St, Suite 400"
                    icon={<MapPin className="h-4 w-4" />}
                  />
                )}
              </>
            )}

            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="name@hospital.org"
              icon={<Mail className="h-4 w-4" />}
              autoComplete="email"
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="Min. 6 characters"
              icon={<Lock className="h-4 w-4" />}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
            />

            {mode === 'signup' && (
              <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
                <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(event) => setTermsAccepted(event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="leading-relaxed">
                    {t('agreeTerms')}{' '}
                    <button
                      type="button"
                      onClick={() => setShowPolicy((visible) => !visible)}
                      className="font-semibold text-brand-600 hover:text-brand-700 underline underline-offset-2"
                    >
                      {showPolicy ? t('hidePolicy') : t('viewPolicy')}
                    </button>
                  </span>
                </label>
                {showPolicy && (
                  <div className="mt-3 border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-slate-500">
                    <p className="font-bold text-slate-800">{t('termsAndConditions')}</p>
                    <p className="mt-1">{t('policyText')}</p>
                    <p className="mt-2 font-bold text-slate-800">{t('privacyPolicy')}</p>
                    <p className="mt-1">{t('policyText')}</p>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-emergency-200 bg-emergency-50/80 px-4 py-3 text-xs sm:text-sm text-emergency-700 flex items-start gap-2.5">
                <div className="h-4 w-4 rounded-full bg-emergency-600 text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">!</div>
                <div className="flex-1 leading-snug">{error}</div>
              </div>
            )}

            <Button type="submit" fullWidth size="lg" disabled={loading} loading={loading}>
              {mode === 'login' ? t('signIn') : 'Create Account'}
              {!loading && <ArrowRight className="h-4 w-4 ml-1" />}
            </Button>
          </form>

          {/* Social divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">or</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <Button
            type="button"
            variant="outline"
            size="lg"
            fullWidth
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            {loading ? (
              <Spinner className="h-4 w-4 text-slate-600" />
            ) : (
              <div className="flex items-center gap-2.5">
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.29 21.41 7.36 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.29 2.59 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span className="text-sm font-medium text-slate-700">{t('continueWithGoogle')}</span>
              </div>
            )}
          </Button>

          {/* Toggle between login and signup */}
          <div className="mt-6 text-center text-xs sm:text-sm text-slate-500">
            {mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <button
                  onClick={() => { setMode('signup'); setError(''); }}
                  className="font-semibold text-brand-600 hover:text-brand-700 underline underline-offset-2"
                >
                  {t('signUp')}
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => { setMode('login'); setError(''); }}
                  className="font-semibold text-brand-600 hover:text-brand-700 underline underline-offset-2"
                >
                  {t('signIn')}
                </button>
              </>
            )}
          </div>

          {/* Role status info */}
          {mode === 'signup' && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-slate-200/80 bg-slate-100/70 p-3 text-xs text-slate-600">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              <span className="leading-relaxed">
                {role === 'hospital_admin'
                  ? 'Your hospital will be verified and approved by the network administration.'
                  : role === 'admin'
                  ? 'Admin accounts require manual security review and authorization.'
                  : 'Your donor account will be verified to enable appointment scheduling.'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

