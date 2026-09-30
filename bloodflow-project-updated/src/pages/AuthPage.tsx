import { useState, type ReactNode } from 'react';
import {
  Heart,
  Shield,
  Building2,
  ArrowRight,
  CheckCircle2,
  Activity,
  Users,
  Clock,
  Mail,
  Lock,
  User,
  Phone,
  MapPin,
  Globe,
  Droplets,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import { supabase, BLOOD_GROUPS } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Button, Select, Spinner } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';

type AuthMode = 'login' | 'signup';
type RoleChoice = 'donor' | 'hospital_admin' | 'admin';

export function AuthPage() {
  const { refreshProfile } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [mode, setMode] = useState<AuthMode>('login');
  const [role, setRole] = useState<RoleChoice>('donor');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);

  // Field touch/validation states
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const isEmailValid = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPasswordValid = !password || password.length >= 6;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setForgotMsg('');

    if (mode === 'signup' && !termsAccepted) {
      setError(t('termsRequired'));
      return;
    }

    if (!isEmailValid) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!isPasswordValid) {
      setError('Password must be at least 6 characters long.');
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
        setError('Invalid email or password. Please double check and try again.');
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

  async function handleForgotPassword() {
    if (!email || !isEmailValid) {
      setError('Please enter your email address first to reset your password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      });
      if (resetError) throw resetError;
      setForgotMsg(`Password reset link sent to ${email}. Please check your inbox.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset link.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError('');
    setForgotMsg('');
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
    { value: 'donor', label: 'Donor', icon: <Heart className="h-4 w-4" />, description: 'Schedule blood donations, receive emergency alerts & track your impact.' },
    { value: 'hospital_admin', label: 'Hospital', icon: <Building2 className="h-4 w-4" />, description: 'Manage blood inventory, issue certificates & request emergency stock.' },
    { value: 'admin', label: 'Admin', icon: <Shield className="h-4 w-4" />, description: 'Platform oversight, hospital verification & network security.' },
  ];

  const visibleRoleOptions = mode === 'signup' ? roleOptions.filter((option) => option.value !== 'admin') : roleOptions;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:grid lg:grid-cols-12 font-sans selection:bg-red-500 selection:text-white">
      {/* Left Panel — Simple, Clean & Human */}
      <div className="hidden bg-red-700 lg:flex lg:col-span-5 xl:col-span-5 lg:flex-col lg:justify-between lg:p-12 text-white">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="BloodFlow" className="h-10 w-10 rounded-xl bg-white p-1 object-cover shadow-sm" />
          <span className="text-xl font-bold tracking-tight text-white">BloodFlow</span>
        </div>

        {/* Main Content */}
        <div className="my-auto py-8">
          <h1 className="text-3xl xl:text-4xl font-extrabold leading-tight text-white">
            Connecting blood donors and hospitals when seconds count.
          </h1>

          <p className="mt-4 text-base text-red-100 leading-relaxed max-w-md">
            BloodFlow helps medical facilities find verified blood stock and reach nearby donors instantly during emergencies.
          </p>

          <ul className="mt-8 space-y-3.5 text-sm text-red-50">
            <li className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-red-200 shrink-0" />
              <span>Real-time blood stock tracking</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-red-200 shrink-0" />
              <span>Automated emergency alerts in English, Hindi &amp; Marathi</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-red-200 shrink-0" />
              <span>Verified donor appointments and certificates</span>
            </li>
          </ul>
        </div>

        {/* Simple Footer */}
        <div className="border-t border-red-600/60 pt-5 text-xs text-red-200 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-red-200" />
          <span>Secure Healthcare Network</span>
        </div>
      </div>

      {/* Right Panel — Elevated Auth Form Card */}
      <div className="flex flex-1 items-center justify-center p-4 sm:p-8 lg:p-12 lg:col-span-7 xl:col-span-7 overflow-y-auto">
        <div className="w-full max-w-lg my-auto py-4">
          {/* Top Header & Language Picker */}
          <div className="flex items-center justify-between mb-6">
            {/* Mobile Logo */}
            <div className="flex items-center gap-2.5 lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-rose-600 p-1.5 shadow-md">
                <Droplets className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-base font-extrabold text-slate-900 leading-none block">BloodFlow</span>
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block mt-0.5">Healthcare</span>
              </div>
            </div>

            <div className="hidden lg:block" />

            {/* Language Picker Dropdown */}
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-xs text-xs text-slate-700">
              <Globe className="h-3.5 w-3.5 text-slate-400" />
              <select
                aria-label={t('language')}
                value={language}
                onChange={(event) => setLanguage(event.target.value as 'en' | 'hi')}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="en">English</option>
                <option value="hi">हिंदी</option>
              </select>
            </div>
          </div>

          {/* Elevated Floating Form Card */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-10 shadow-xl shadow-slate-200/60 transition-all duration-300">
            {/* Form Title & Mode Subtitle */}
            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                {mode === 'login' ? t('welcomeBack') : t('createAccount')}
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-500 leading-relaxed">
                {mode === 'login'
                  ? 'Sign in to access your blood donation network dashboard.'
                  : 'Join BloodFlow to connect donors, blood stock, and hospitals.'}
              </p>
            </div>

            {/* Segmented Control Role Selector */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Select Your Account Role
                </label>
              </div>

              <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-slate-100/90 p-1.5 border border-slate-200/70">
                {visibleRoleOptions.map((opt) => {
                  const isSelected = role === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRole(opt.value)}
                      className={cn(
                        'flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-bold transition-all duration-200 select-none',
                        isSelected
                          ? 'bg-white text-red-600 shadow-sm border border-red-500/30'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                      )}
                    >
                      <span className={cn('transition-colors', isSelected ? 'text-red-600' : 'text-slate-400')}>
                        {opt.icon}
                      </span>
                      <span>{opt.label}</span>
                      {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-red-600 ml-auto shrink-0 hidden sm:inline" />}
                    </button>
                  );
                })}
              </div>

              {/* Animated Role Description */}
              <p className="mt-2.5 text-xs text-slate-500 min-h-[20px] transition-all duration-200 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                <span>{roleOptions.find((r) => r.value === role)?.description}</span>
              </p>
            </div>

            {/* Main Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <>
                  {/* Full Name / Hospital Name */}
                  <div className="w-full">
                    <label className="mb-1.5 block text-xs font-bold text-slate-700">
                      {role === 'hospital_admin' ? 'Hospital / Facility Name' : 'Full Name'}{' '}
                      <span className="text-red-500 font-bold">*</span>
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                        <User className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={role === 'hospital_admin' ? 'e.g. City Central Medical Center' : 'John Doe'}
                        required
                        className="w-full h-12 rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 hover:border-slate-300"
                      />
                    </div>
                  </div>

                  {/* Phone & City */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-700">
                        Phone Number <span className="text-red-500 font-bold">*</span>
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                          <Phone className="h-4 w-4" />
                        </div>
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          required
                          className="w-full h-12 rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 hover:border-slate-300"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-700">
                        City / Town <span className="text-red-500 font-bold">*</span>
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Kalmeshwar / Nagpur"
                          required
                          className="w-full h-12 rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 hover:border-slate-300"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Donor Specific Fields: Blood Group & DOB */}
                  {role === 'donor' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Select
                        label="Blood Group"
                        value={bloodGroup}
                        onChange={setBloodGroup}
                        placeholder="Select group"
                        required
                        options={BLOOD_GROUPS.map((bg) => ({ value: bg, label: bg }))}
                      />
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-700">
                          Date of Birth <span className="text-red-500 font-bold">*</span>
                        </label>
                        <input
                          type="date"
                          value={dateOfBirth}
                          onChange={(e) => setDateOfBirth(e.target.value)}
                          required
                          className="w-full h-12 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 hover:border-slate-300"
                        />
                      </div>
                    </div>
                  )}

                  {role === 'donor' && (
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-700">Address / Area</label>
                      <div className="relative">
                        <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="Main Road, Ward No. 3"
                          className="w-full h-12 rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 hover:border-slate-300"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Email Field with Validation */}
              <div className="w-full">
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  Email Address <span className="text-red-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setEmailTouched(true)}
                    placeholder="name@example.com"
                    autoComplete="email"
                    required
                    className={cn(
                      'w-full h-12 rounded-xl border bg-white pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 shadow-xs transition-all focus:outline-none focus:ring-2 hover:border-slate-300',
                      emailTouched && !isEmailValid
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                        : 'border-slate-200 focus:border-red-600 focus:ring-red-500/20'
                    )}
                  />
                </div>
                {emailTouched && !isEmailValid && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-red-600 font-medium">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    Please enter a valid email address.
                  </p>
                )}
              </div>

              {/* Password Field with Show/Hide Toggle & Forgot Password Link */}
              <div className="w-full">
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Password <span className="text-red-500 font-bold">*</span>
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-xs font-bold text-red-600 hover:text-red-700 transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setPasswordTouched(true)}
                    placeholder="Minimum 6 characters"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    required
                    className={cn(
                      'w-full h-12 rounded-xl border bg-white pl-10 pr-11 text-sm text-slate-900 placeholder-slate-400 shadow-xs transition-all focus:outline-none focus:ring-2 hover:border-slate-300',
                      passwordTouched && !isPasswordValid
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                        : 'border-slate-200 focus:border-red-600 focus:ring-red-500/20'
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordTouched && !isPasswordValid && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-red-600 font-medium">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    Password must be at least 6 characters long.
                  </p>
                )}
              </div>

              {/* Terms Checkbox in Signup Mode */}
              {mode === 'signup' && (
                <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3.5">
                  <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(event) => setTermsAccepted(event.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="leading-relaxed">
                      {t('agreeTerms')}{' '}
                      <button
                        type="button"
                        onClick={() => setShowPolicy((visible) => !visible)}
                        className="font-bold text-red-600 hover:text-red-700 underline underline-offset-2"
                      >
                        {showPolicy ? t('hidePolicy') : t('viewPolicy')}
                      </button>
                    </span>
                  </label>
                  {showPolicy && (
                    <div className="mt-3 border-t border-slate-200 pt-3 text-[11px] leading-relaxed text-slate-500">
                      <p className="font-bold text-slate-800">{t('termsAndConditions')}</p>
                      <p className="mt-1">{t('policyText')}</p>
                      <p className="mt-2 font-bold text-slate-800">{t('privacyPolicy')}</p>
                      <p className="mt-1">{t('policyText')}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Error Alert */}
              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs sm:text-sm text-red-700 flex items-start gap-2.5">
                  <div className="h-4 w-4 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">!</div>
                  <div className="flex-1 leading-snug">{error}</div>
                </div>
              )}

              {/* Password Reset Alert */}
              {forgotMsg && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs sm:text-sm text-emerald-700 flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1 leading-snug">{forgotMsg}</div>
                </div>
              )}

              {/* Primary Crimson Sign In Button */}
              <Button
                type="submit"
                fullWidth
                size="lg"
                disabled={loading}
                loading={loading}
                className="group relative h-12 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold rounded-xl shadow-lg shadow-red-600/30 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
              >
                <span>{mode === 'login' ? t('signIn') : 'Create Account'}</span>
                {!loading && (
                  <ArrowRight className="h-4 w-4 ml-1.5 transition-transform duration-200 group-hover:translate-x-1" />
                )}
              </Button>
            </form>

            {/* Social Divider */}
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">or</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            {/* Google Sign In Button */}
            <Button
              type="button"
              variant="outline"
              size="lg"
              fullWidth
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="h-12 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl shadow-xs transition-colors"
            >
              {loading ? (
                <Spinner className="h-4 w-4 text-slate-600" />
              ) : (
                <div className="flex items-center justify-center gap-2.5">
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
                  <span className="text-sm font-semibold text-slate-700">{t('continueWithGoogle')}</span>
                </div>
              )}
            </Button>

            {/* Toggle Mode (Sign In / Sign Up) */}
            <div className="mt-6 text-center text-xs sm:text-sm text-slate-500">
              {mode === 'login' ? (
                <>
                  Don't have an account?{' '}
                  <button
                    onClick={() => { setMode('signup'); setError(''); setForgotMsg(''); }}
                    className="font-bold text-red-600 hover:text-red-700 underline underline-offset-2 transition-colors"
                  >
                    {t('signUp')}
                  </button>
                </>
              ) : (
                <>
                  Already registered?{' '}
                  <button
                    onClick={() => { setMode('login'); setError(''); setForgotMsg(''); }}
                    className="font-bold text-red-600 hover:text-red-700 underline underline-offset-2 transition-colors"
                  >
                    {t('signIn')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
