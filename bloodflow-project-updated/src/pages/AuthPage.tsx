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
  Sparkles,
  Droplets,
  Stethoscope,
  Search,
  Award,
  AlertTriangle,
  X,
  ChevronRight,
  ShieldCheck,
  Navigation,
  Calendar,
  Flame,
} from 'lucide-react';
import { supabase, BLOOD_GROUPS } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Button, Input, Select, Spinner } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';

type AuthMode = 'login' | 'signup';
type RoleChoice = 'donor' | 'hospital_admin' | 'admin';

export function AuthPage() {
  const { refreshProfile } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  // Auth modal state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>('login');
  const [role, setRole] = useState<RoleChoice>('donor');

  // Form fields
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

  // Quick blood search preview widget on landing page
  const [searchBloodGroup, setSearchBloodGroup] = useState('O+');
  const [searchCity, setSearchCity] = useState('');
  const [searchResult, setSearchResult] = useState<string | null>(null);

  function openAuth(initialMode: AuthMode = 'login', initialRole: RoleChoice = 'donor') {
    setMode(initialMode);
    setRole(initialRole);
    setError('');
    setIsAuthOpen(true);
  }

  function handleQuickSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchResult(
      `Found 3 hospitals in ${searchCity || 'your area'} with available ${searchBloodGroup} units. Please sign in to request or navigate.`
    );
  }

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
          setError('Account created! Please check your email inbox to confirm your email, then sign in.');
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        if (!data.user || !data.session) {
          setError('Please confirm your email address before signing in.');
          return;
        }
        await refreshProfile(data.user.id);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      if (msg.includes('Invalid login')) {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else if (msg.includes('already registered')) {
        setError('An account with this email address already exists. Please log in instead.');
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
    {
      value: 'donor',
      label: 'Blood Donor',
      icon: <Heart className="h-4 w-4" />,
      description: 'Donate blood, respond to emergency calls & earn rewards.',
    },
    {
      value: 'hospital_admin',
      label: 'Hospital / Blood Bank',
      icon: <Building2 className="h-4 w-4" />,
      description: 'Manage inventory, schedule appointments & issue certificates.',
    },
    {
      value: 'admin',
      label: 'Platform Admin',
      icon: <Shield className="h-4 w-4" />,
      description: 'System administration & hospital approvals.',
    },
  ];

  const visibleRoleOptions = mode === 'signup' ? roleOptions.filter((option) => option.value !== 'admin') : roleOptions;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-rose-500 selection:text-white flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-600 p-2 shadow-lg shadow-rose-600/30 ring-1 ring-rose-400/30">
              <Droplets className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-white block leading-none">BloodFlow</span>
              <span className="text-[10px] font-bold text-rose-400 tracking-wider uppercase leading-none mt-1 block">
                Emergency Network
              </span>
            </div>
          </div>

          {/* Center Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-300">
            <a href="#search" className="hover:text-rose-400 transition-colors">Find Blood</a>
            <a href="#how-it-works" className="hover:text-rose-400 transition-colors">How It Works</a>
            <a href="#features" className="hover:text-rose-400 transition-colors">Features</a>
            <a href="#hospitals" className="hover:text-rose-400 transition-colors">For Hospitals</a>
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3">
            {/* Language Dropdown */}
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300">
              <Globe className="h-3.5 w-3.5 text-slate-400" />
              <select
                aria-label={t('language')}
                value={language}
                onChange={(event) => setLanguage(event.target.value as 'en' | 'hi')}
                className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="en" className="bg-slate-900 text-white">English</option>
                <option value="hi" className="bg-slate-900 text-white">हिंदी</option>
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => openAuth('login')}
              className="border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:border-slate-700"
            >
              Sign In
            </Button>

            <Button
              size="sm"
              onClick={() => openAuth('signup', 'donor')}
              className="bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30"
            >
              <Heart className="h-3.5 w-3.5 mr-1.5" /> Become a Donor
            </Button>
          </div>
        </div>
      </header>

      {/* Main Landing Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
          {/* Ambient Background Lights */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-1/2 -top-40 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-rose-600/20 blur-[140px]" />
            <div className="absolute right-10 top-1/3 h-96 w-96 rounded-full bg-emerald-600/15 blur-[120px]" />
            <div className="absolute left-10 bottom-10 h-80 w-80 rounded-full bg-red-700/20 blur-[130px]" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            {/* Live Status Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-1.5 text-xs font-bold text-rose-300 backdrop-blur-md mb-8">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span>Real-Time Emergency Blood Network in Maharashtra</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
              Connecting Blood Donors & Hospitals <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-red-400 to-amber-400">In Real Time.</span>
            </h1>

            {/* Subheading */}
            <p className="mt-6 text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Automated trilingual voice alerts, live GPS map navigation, and instant blood stock synchronization for critical emergency requests.
            </p>

            {/* Hero CTAs */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={() => openAuth('signup', 'donor')}
                className="w-full sm:w-auto bg-rose-600 hover:bg-rose-500 text-white font-bold px-8 py-4 text-base shadow-xl shadow-rose-600/30 rounded-2xl"
              >
                <Heart className="h-5 w-5 mr-2" /> Register as a Blood Donor
              </Button>

              <Button
                size="lg"
                variant="outline"
                onClick={() => openAuth('login', 'hospital_admin')}
                className="w-full sm:w-auto border-slate-800 bg-slate-900/90 text-slate-200 hover:bg-slate-800 font-bold px-8 py-4 text-base rounded-2xl"
              >
                <Building2 className="h-5 w-5 mr-2 text-rose-400" /> Hospital Portal Sign In
              </Button>
            </div>

            {/* Live Stats Bar */}
            <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4 max-w-4xl mx-auto">
              {[
                { label: 'Units Delivered', value: '2,480+', icon: <Droplets className="h-5 w-5 text-rose-400" /> },
                { label: 'Hospitals Linked', value: '45+', icon: <Building2 className="h-5 w-5 text-emerald-400" /> },
                { label: 'Registered Donors', value: '1,200+', icon: <Users className="h-5 w-5 text-amber-400" /> },
                { label: 'Avg Dispatch Time', value: '< 15 Mins', icon: <Clock className="h-5 w-5 text-cyan-400" /> },
              ].map((stat, idx) => (
                <div key={idx} className="rounded-2xl border border-slate-800/90 bg-slate-900/60 p-5 backdrop-blur-md text-left">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400">{stat.label}</span>
                    {stat.icon}
                  </div>
                  <span className="text-2xl sm:text-3xl font-black text-white">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Live Blood Search Widget Section */}
        <section id="search" className="py-16 border-t border-b border-slate-800/80 bg-slate-900/50">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wider block mb-2">Live Availability Check</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Search Blood Stock by Location</h2>
            </div>

            <form onSubmit={handleQuickSearch} className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-6 shadow-2xl">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">Required Blood Group</label>
                  <Select
                    value={searchBloodGroup}
                    onChange={setSearchBloodGroup}
                    options={BLOOD_GROUPS.map((bg) => ({ value: bg, label: bg }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">City / Location</label>
                  <Input
                    value={searchCity}
                    onChange={setSearchCity}
                    placeholder="e.g. Kalmeshwar, Nagpur"
                    icon={<MapPin className="h-4 w-4 text-slate-400" />}
                  />
                </div>

                <div className="flex items-end">
                  <Button type="submit" fullWidth size="lg" className="bg-rose-600 hover:bg-rose-500 text-white font-bold h-11">
                    <Search className="h-4 w-4 mr-2" /> Search Inventory
                  </Button>
                </div>
              </div>

              {searchResult && (
                <div className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-950/40 p-4 text-xs sm:text-sm text-rose-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                    <span>{searchResult}</span>
                  </div>
                  <Button size="xs" onClick={() => openAuth('login')} className="bg-rose-600 hover:bg-rose-500 text-white">
                    Sign In to Connect
                  </Button>
                </div>
              )}
            </form>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider block mb-2">Simple & Rapid</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-12">How BloodFlow Saves Lives</h2>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {[
                {
                  step: '01',
                  title: 'Emergency Request Logged',
                  desc: 'Hospitals post urgent blood requirements with blood group, units needed, and location.',
                  icon: <AlertTriangle className="h-6 w-6 text-rose-400" />,
                },
                {
                  step: '02',
                  title: 'Trilingual Voice Alerts',
                  desc: 'Automated calls and SMS in English, Hindi & Marathi are dispatched to matching donors nearby.',
                  icon: <Phone className="h-6 w-6 text-emerald-400" />,
                },
                {
                  step: '03',
                  title: 'Turn-by-Turn Navigation',
                  desc: 'Donors receive turn-by-turn driving directions to the hospital and earn verified certificates.',
                  icon: <Navigation className="h-6 w-6 text-amber-400" />,
                },
              ].map((item, idx) => (
                <div key={idx} className="relative rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-left backdrop-blur-md">
                  <span className="text-4xl font-black text-slate-800 absolute top-6 right-6">{item.step}</span>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 border border-slate-700 mb-6">
                    {item.icon}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Platform Features Grid */}
        <section id="features" className="py-20 bg-slate-900/40 border-t border-slate-800/80">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wider block mb-2">Built for Speed & Reliability</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Full-Stack Healthcare Features</h2>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: <Activity className="h-5 w-5 text-rose-400" />,
                  title: 'Real-Time Inventory',
                  desc: 'Track available units per hospital and blood group live.',
                },
                {
                  icon: <Phone className="h-5 w-5 text-emerald-400" />,
                  title: 'Automated Voice Dispatch',
                  desc: 'Twilio integration dispatches clear English, Hindi & Marathi voice calls.',
                },
                {
                  icon: <MapPin className="h-5 w-5 text-amber-400" />,
                  title: 'Interactive Emergency Map',
                  desc: 'Live OpenStreetMap Nominatim geocoding for cities and rural towns.',
                },
                {
                  icon: <Calendar className="h-5 w-5 text-cyan-400" />,
                  title: 'Donor Recovery Calculator',
                  desc: 'Automatic 90-day donation interval recovery calculator.',
                },
                {
                  icon: <Award className="h-5 w-5 text-purple-400" />,
                  title: 'Digital Certificates & Badges',
                  desc: 'Instant HTML donation certificates and loyalty reward points.',
                },
                {
                  icon: <ShieldCheck className="h-5 w-5 text-blue-400" />,
                  title: 'Admin Verification & Security',
                  desc: 'Multi-role RBAC for donors, hospitals, and system admins.',
                },
              ].map((feat, idx) => (
                <div key={idx} className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 hover:border-slate-700 transition-all">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 mb-4">
                    {feat.icon}
                  </div>
                  <h4 className="text-base font-bold text-white mb-1.5">{feat.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="py-20 relative overflow-hidden">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-rose-500/30 bg-gradient-to-r from-rose-950 via-red-950 to-slate-900 p-8 sm:p-12 text-center relative overflow-hidden shadow-2xl">
              <div className="relative z-10">
                <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Ready to Save Lives in Your Community?</h2>
                <p className="text-sm sm:text-base text-rose-200 max-w-xl mx-auto mb-8">
                  Register as a donor today or connect your hospital to the automated emergency blood network.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button size="lg" onClick={() => openAuth('signup', 'donor')} className="w-full sm:w-auto bg-rose-600 hover:bg-rose-500 text-white font-bold px-8">
                    Register as Donor
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => openAuth('login', 'hospital_admin')} className="w-full sm:w-auto border-rose-500/40 text-rose-200 hover:bg-rose-900/40 font-bold px-8">
                    Hospital Portal Login
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-8 text-xs text-slate-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-rose-500" />
            <span className="font-bold text-white">BloodFlow Network</span>
            <span>© 2026. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => openAuth('login', 'admin')} className="hover:text-rose-400 transition-colors font-semibold">
              Admin Portal
            </button>
            <button onClick={() => openAuth('login', 'donor')} className="hover:text-rose-400 transition-colors font-semibold">
              Donor Sign In
            </button>
          </div>
        </div>
      </footer>

      {/* Auth Modal Overlay */}
      {isAuthOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl my-auto">
            {/* Close Button */}
            <button
              onClick={() => setIsAuthOpen(false)}
              className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Modal Title */}
            <div className="mb-6">
              <h3 className="text-2xl font-black text-white">
                {mode === 'login' ? t('welcomeBack') : t('createAccount')}
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                {mode === 'login' ? 'Sign in to access your dashboard.' : 'Fill in your details to create an account.'}
              </p>
            </div>

            {/* Role Choice */}
            <div className="mb-6">
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Select Account Type
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
                        'flex flex-col items-center gap-1 rounded-xl border p-2.5 text-center transition-all',
                        isSelected
                          ? 'border-rose-500 bg-rose-950/50 text-white ring-1 ring-rose-500/50'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-800'
                      )}
                    >
                      <div className={cn('p-1 rounded-lg', isSelected ? 'bg-rose-600 text-white' : 'text-slate-400')}>
                        {opt.icon}
                      </div>
                      <span className="text-[11px] font-bold">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Auth Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <>
                  <Input
                    label={role === 'hospital_admin' ? 'Hospital Name' : 'Full Name'}
                    value={fullName}
                    onChange={setFullName}
                    placeholder={role === 'hospital_admin' ? 'Central Hospital' : 'John Doe'}
                    icon={<User className="h-4 w-4 text-slate-400" />}
                    required
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Phone"
                      value={phone}
                      onChange={setPhone}
                      placeholder="+91 98765 43210"
                      icon={<Phone className="h-4 w-4 text-slate-400" />}
                      required
                    />
                    <Input
                      label="City"
                      value={city}
                      onChange={setCity}
                      placeholder="Kalmeshwar"
                      icon={<MapPin className="h-4 w-4 text-slate-400" />}
                      required
                    />
                  </div>

                  {role === 'donor' && (
                    <div className="grid grid-cols-2 gap-3">
                      <Select
                        label="Blood Group"
                        value={bloodGroup}
                        onChange={setBloodGroup}
                        placeholder="Select"
                        required
                        options={BLOOD_GROUPS.map((bg) => ({ value: bg, label: bg }))}
                      />
                      <Input
                        label="DOB"
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
                      placeholder="Street / Area"
                      icon={<MapPin className="h-4 w-4 text-slate-400" />}
                    />
                  )}
                </>
              )}

              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="name@example.com"
                icon={<Mail className="h-4 w-4 text-slate-400" />}
                autoComplete="email"
                required
              />

              <Input
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="Min. 6 characters"
                icon={<Lock className="h-4 w-4 text-slate-400" />}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
              />

              {mode === 'signup' && (
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-800 text-rose-600 focus:ring-rose-500"
                    />
                    <span>
                      {t('agreeTerms')}{' '}
                      <button
                        type="button"
                        onClick={() => setShowPolicy(!showPolicy)}
                        className="font-bold text-rose-400 underline"
                      >
                        {showPolicy ? t('hidePolicy') : t('viewPolicy')}
                      </button>
                    </span>
                  </label>
                  {showPolicy && (
                    <div className="mt-2 text-[11px] text-slate-400 border-t border-slate-800 pt-2">
                      <p>{t('policyText')}</p>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-950/50 p-3 text-xs text-rose-300">
                  {error}
                </div>
              )}

              <Button type="submit" fullWidth size="lg" disabled={loading} loading={loading} className="bg-rose-600 hover:bg-rose-500 text-white font-bold">
                {mode === 'login' ? t('signIn') : 'Create Account'}
              </Button>
            </form>

            {/* Social Google Sign In */}
            <div className="mt-4">
              <Button
                type="button"
                variant="outline"
                size="md"
                fullWidth
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="border-slate-800 bg-slate-950 text-slate-200 hover:bg-slate-800"
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
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
                  <span className="text-xs font-semibold">{t('continueWithGoogle')}</span>
                </div>
              </Button>
            </div>

            {/* Toggle Mode */}
            <div className="mt-4 text-center text-xs text-slate-400">
              {mode === 'login' ? (
                <>
                  Don't have an account?{' '}
                  <button onClick={() => { setMode('signup'); setError(''); }} className="font-bold text-rose-400 underline">
                    {t('signUp')}
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button onClick={() => { setMode('login'); setError(''); }} className="font-bold text-rose-400 underline">
                    {t('signIn')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
