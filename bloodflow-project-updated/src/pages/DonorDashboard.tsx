import { useState, useEffect, useCallback } from 'react';
import { Calendar, Award, User, Droplet, Plus, Clock, Download, CheckCircle2, AlertCircle, MapPin, ShieldCheck, Trophy, Star, Sparkles } from 'lucide-react';
import { DashboardLayout, PageHeader, StatCard } from '@/components/DashboardLayout';
import { Button, Input, Select, Card, Badge, Modal, EmptyState, Skeleton, ConfirmDialog } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { supabase, BLOOD_GROUPS, type Hospital, type Appointment, type Certificate, type Donation, type DonorReward, type RewardRule } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n';
import { buildCertificateHtml } from '@/lib/certificateTemplate';

type View = 'overview' | 'appointments' | 'certificates' | 'profile';
type AppointmentFilter = 'all' | 'scheduled' | 'completed' | 'cancelled';

export function DonorDashboard() {
  const { profile, refreshProfile } = useAuth();
  const { tr } = useLanguage();
  const [view, setView] = useState<View>('overview');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [rewards, setRewards] = useState<DonorReward[]>([]);
  const [rewardRules, setRewardRules] = useState<RewardRule[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSchedule, setShowSchedule] = useState(false);
  const [appointmentFilter, setAppointmentFilter] = useState<AppointmentFilter>('all');
  const [cancelAppointmentId, setCancelAppointmentId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const [apptsRes, certsRes, hospRes, donationsRes, rewardsRes, rulesRes] = await Promise.all([
      supabase.from('appointments').select('*').eq('donor_id', profile.id).order('appointment_date', { ascending: false }),
      supabase.from('certificates').select('*').eq('donor_id', profile.id).order('issued_at', { ascending: false }),
      supabase.from('hospitals').select('*').order('name'),
      supabase.from('donations').select('*').eq('donor_id', profile.id).eq('verified', true).order('donation_date', { ascending: false }),
      supabase.from('donor_rewards').select('*').eq('donor_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('reward_rules').select('*').eq('active', true).order('donation_count'),
    ]);
    setAppointments(apptsRes.data || []);
    setCertificates(certsRes.data || []);
    setHospitals(hospRes.data || []);
    setDonations(donationsRes.data || []);
    setRewards(rewardsRes.data || []);
    setRewardRules(rulesRes.data || []);
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel(`donor-rewards-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'donations', filter: `donor_id=eq.${profile.id}` }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'donor_rewards', filter: `donor_id=eq.${profile.id}` }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${profile.id}` }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile, loadData]);

  async function handleConfirmCancel() {
    if (!cancelAppointmentId) return;
    setCancelling(true);
    await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', cancelAppointmentId);
    setCancelling(false);
    setCancelAppointmentId(null);
    loadData();
  }

  const upcoming = appointments.filter((a) => a.status === 'scheduled');
  const completed = appointments.filter((a) => a.status === 'completed');

  const filteredAppointments = appointments.filter((apt) => {
    if (appointmentFilter === 'all') return true;
    return apt.status === appointmentFilter;
  });

  const navItems = [
    { id: 'overview', label: 'Overview', icon: <Droplet className="h-4 w-4" /> },
    { id: 'appointments', label: tr('My Appointments'), icon: <Calendar className="h-4 w-4" /> },
    { id: 'certificates', label: 'Certificates', icon: <Award className="h-4 w-4" /> },
    { id: 'profile', label: tr('My Profile'), icon: <User className="h-4 w-4" /> },
  ];

  return (
    <DashboardLayout navItems={navItems} activeView={view} onNavigate={(v) => setView(v as View)} roleLabel="Donor">
      {view === 'overview' && (
        <>
          <PageHeader
            title={`Welcome back, ${profile?.full_name?.split(' ')[0] || 'Donor'}`}
            description={tr('Track your donations and schedule your next contribution.')}
            badge={
              profile?.is_verified ? (
                <Badge variant="green" dot><ShieldCheck className="h-3 w-3" /> Verified Donor</Badge>
              ) : (
                <Badge variant="yellow" dot>Pending Review</Badge>
              )
            }
            action={
              <Button onClick={() => setShowSchedule(true)}>
                <Plus className="h-4 w-4" /> {tr('Schedule Donation')}
              </Button>
            }
          />

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="p-5">
                  <Skeleton className="h-4 w-20 mb-3" />
                  <Skeleton className="h-8 w-16" />
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label={tr('Blood Group')}
                value={profile?.blood_group || '—'}
                icon={<Droplet className="h-5 w-5" />}
                color="red"
                subtitle="Registered blood type"
              />
              <StatCard
                label={tr('Total Donations')}
                value={completed.length}
                icon={<CheckCircle2 className="h-5 w-5" />}
                color="green"
                subtitle="Verified contributions"
              />
              <StatCard
                label={tr('Upcoming')}
                value={upcoming.length}
                icon={<Calendar className="h-5 w-5" />}
                color="blue"
                subtitle="Scheduled visits"
              />
              <StatCard
                label={tr('Certificates')}
                value={certificates.length}
                icon={<Award className="h-5 w-5" />}
                color="amber"
                subtitle="Honors received"
              />
            </div>
          )}

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <DonationJourney
              profile={profile}
              rewardRules={rewardRules}
              rewards={rewards}
              donations={donations}
            />
            <RewardsSection rewardRules={rewardRules} rewards={rewards} completedCount={donations.length} />

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{tr('Upcoming Appointments')}</h3>
                  <p className="text-xs text-slate-500">Your scheduled donation visits</p>
                </div>
                {upcoming.length > 0 && (
                  <Badge variant="blue" dot>{upcoming.length} scheduled</Badge>
                )}
              </div>
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : upcoming.length === 0 ? (
                <EmptyState
                  icon={<Calendar className="h-6 w-6" />}
                  title={tr('No upcoming appointments')}
                  description={tr('Schedule a donation to get started.')}
                  action={
                    <Button size="sm" variant="outline" onClick={() => setShowSchedule(true)}>
                      <Plus className="h-3.5 w-3.5" /> Schedule Now
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-3">
                  {upcoming.slice(0, 4).map((apt) => (
                    <AppointmentRow
                      key={apt.id}
                      appointment={apt}
                      hospitals={hospitals}
                      onCancel={() => setCancelAppointmentId(apt.id)}
                      compact
                    />
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{tr('Recent Certificates')}</h3>
                  <p className="text-xs text-slate-500">Official donation recognitions</p>
                </div>
                {certificates.length > 0 && (
                  <Badge variant="green">{certificates.length} earned</Badge>
                )}
              </div>
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : certificates.length === 0 ? (
                <EmptyState
                  icon={<Award className="h-6 w-6" />}
                  title={tr('No certificates yet')}
                  description={tr('Complete a donation to earn your first certificate.')}
                />
              ) : (
                <div className="space-y-3">
                  {certificates.slice(0, 4).map((cert) => (
                    <div
                      key={cert.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 transition-colors hover:bg-slate-50 hover:border-slate-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 border border-amber-200/80 text-amber-600">
                          <Award className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-mono font-semibold text-slate-800">{cert.certificate_number}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{cert.hospital_name} · {cert.donation_date}</p>
                        </div>
                      </div>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          const html = buildCertificateHtml(cert);
                          const blob = new Blob([html], { type: 'text/html' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${cert.certificate_number}.html`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <DonationHistory donations={donations} hospitals={hospitals} rewards={rewards} />
        </>
      )}

      {view === 'appointments' && (
        <>
          <PageHeader
            title={tr('My Appointments')}
            description={tr('Manage your scheduled and past donations.')}
            action={
              <Button onClick={() => setShowSchedule(true)}>
                <Plus className="h-4 w-4" /> {tr('Schedule Donation')}
              </Button>
            }
          />

          {/* Filter Pills */}
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'All' },
              { id: 'scheduled', label: 'Scheduled' },
              { id: 'completed', label: 'Completed' },
              { id: 'cancelled', label: 'Cancelled' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setAppointmentFilter(f.id as AppointmentFilter)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  appointmentFilter === f.id
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-5">
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </Card>
              ))}
            </div>
          ) : filteredAppointments.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={<Calendar className="h-7 w-7" />}
                title={tr('No appointments yet')}
                description={tr('Schedule your first blood donation appointment.')}
                action={
                  <Button size="sm" onClick={() => setShowSchedule(true)}>
                    <Plus className="h-3.5 w-3.5" /> {tr('Schedule Donation')}
                  </Button>
                }
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredAppointments.map((apt) => (
                <AppointmentRow
                  key={apt.id}
                  appointment={apt}
                  hospitals={hospitals}
                  onCancel={() => setCancelAppointmentId(apt.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {view === 'certificates' && (
        <>
          <PageHeader
            title={tr('My Certificates')}
            description={tr('Download and share your official blood donation certificates.')}
          />
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6">
                  <Skeleton className="h-28 w-full mb-4" />
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </Card>
              ))}
            </div>
          ) : certificates.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={<Award className="h-7 w-7" />}
                title={tr('No certificates yet')}
                description={tr('Complete a donation to earn your first certificate.')}
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {certificates.map((cert) => (
                <CertificateCard key={cert.id} certificate={cert} />
              ))}
            </div>
          )}
        </>
      )}

      {view === 'profile' && <ProfileView onUpdated={refreshProfile} />}

      {showSchedule && (
        <ScheduleModal
          onClose={() => setShowSchedule(false)}
          onScheduled={() => {
            setShowSchedule(false);
            loadData();
          }}
          hospitals={hospitals}
        />
      )}

      {/* Confirmation Dialog for Cancelling Appointments */}
      <ConfirmDialog
        open={Boolean(cancelAppointmentId)}
        onClose={() => setCancelAppointmentId(null)}
        onConfirm={handleConfirmCancel}
        title="Cancel Appointment"
        message="Are you sure you want to cancel this scheduled blood donation appointment? You can reschedule at any time."
        confirmText="Yes, Cancel Appointment"
        cancelText="Keep Appointment"
        danger
        loading={cancelling}
      />
    </DashboardLayout>
  );
}

function DonationJourney({
  profile,
  rewardRules,
  rewards,
  donations,
}: {
  profile: ReturnType<typeof useAuth>['profile'];
  rewardRules: RewardRule[];
  rewards: DonorReward[];
  donations: Donation[];
}) {
  const completed = profile?.completed_donations ?? donations.length;
  const nextRule = rewardRules.find((rule) => rule.donation_count > completed);
  const previousCount = rewardRules.filter((rule) => rule.donation_count <= completed).slice(-1)[0]?.donation_count || 0;
  const progress = nextRule
    ? Math.min(100, Math.round(((completed - previousCount) / (nextRule.donation_count - previousCount)) * 100))
    : 100;

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">Donation Journey</h3>
          <p className="mt-1 text-xs text-slate-500">Your verified impact and next milestone</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <Trophy className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <JourneyMetric label="Completed" value={completed} />
        <JourneyMetric label="Units donated" value={profile?.total_units_donated ?? donations.reduce((sum, donation) => sum + donation.units, 0)} />
        <JourneyMetric label="Reward points" value={profile?.reward_points ?? rewards.reduce((sum, reward) => sum + reward.points, 0)} />
        <JourneyMetric label="Level" value={profile?.donor_level || getDonorLevel(completed)} />
      </div>
      <div className="mt-5 rounded-xl border border-brand-100 bg-brand-50/60 p-4">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="font-semibold text-brand-900">{nextRule ? `Next: ${nextRule.title}` : 'All milestones unlocked'}</span>
          <span className="font-bold text-brand-700">{nextRule ? `${nextRule.donation_count - completed} donation${nextRule.donation_count - completed === 1 ? '' : 's'} to go` : 'Platinum level'}</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-brand-600 transition-[width] duration-500" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-[11px] text-brand-700">{nextRule ? `${progress}% toward ${nextRule.donation_count} donations` : 'Thank you for making a lasting difference.'}</p>
      </div>
    </Card>
  );
}

function JourneyMetric({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"><p className="text-[11px] text-slate-500">{label}</p><p className="mt-1 text-lg font-bold text-slate-900">{value}</p></div>;
}

function RewardsSection({ rewardRules, rewards, completedCount }: { rewardRules: RewardRule[]; rewards: DonorReward[]; completedCount: number }) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">Rewards & Incentives</h3>
          <p className="mt-1 text-xs text-slate-500">Milestones configured by BloodFlow management</p>
        </div>
        <Star className="h-5 w-5 text-amber-500" />
      </div>
      <div className="mt-4 space-y-2.5">
        {rewardRules.length === 0 ? <EmptyState icon={<Award className="h-6 w-6" />} title="Rewards are coming soon" description="Complete verified donations to build your reward journey." /> : rewardRules.map((rule) => {
          const earned = completedCount >= rule.donation_count;
          return <div key={rule.id} className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${earned ? 'border-amber-200 bg-amber-50/60' : 'border-slate-100 bg-slate-50/50'}`}>
            <div className="flex min-w-0 items-center gap-3"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${earned ? 'bg-amber-100 text-amber-700' : 'bg-white text-slate-400'}`}><Award className="h-4 w-4" /></div><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-800">{rule.title}</p><p className="truncate text-[11px] text-slate-500">{rule.donation_count} donations · {rule.badge || 'Milestone badge'}</p></div></div>
            <Badge variant={earned ? 'yellow' : 'gray'}>{earned ? 'Earned' : `${rule.points} pts`}</Badge>
          </div>;
        })}
      </div>
      {rewards.length > 0 && <p className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-amber-700"><Sparkles className="h-3.5 w-3.5" /> {rewards.length} achievement{rewards.length === 1 ? '' : 's'} unlocked</p>}
    </Card>
  );
}

function DonationHistory({ donations, hospitals, rewards }: { donations: Donation[]; hospitals: Hospital[]; rewards: DonorReward[] }) {
  return <Card className="mt-6 overflow-hidden"><div className="border-b border-slate-100 px-6 py-5"><h3 className="text-base font-bold text-slate-900">Donation History</h3><p className="mt-1 text-xs text-slate-500">Verified contributions recorded by authorized facilities</p></div>{donations.length === 0 ? <EmptyState icon={<Droplet className="h-6 w-6" />} title="No verified donations yet" description="Your donation history will appear after a hospital verifies a completed donation." /> : <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-xs"><thead className="border-b border-slate-100 bg-slate-50/70 font-bold uppercase tracking-wider text-[10px] text-slate-500"><tr><th className="px-6 py-3">Donation date</th><th className="px-6 py-3">Hospital</th><th className="px-6 py-3">Blood group</th><th className="px-6 py-3">Units</th><th className="px-6 py-3">Verification</th><th className="px-6 py-3">Reward</th></tr></thead><tbody className="divide-y divide-slate-100">{donations.map((donation) => <tr key={donation.id}><td className="px-6 py-3.5 font-semibold text-slate-800">{donation.donation_date}</td><td className="px-6 py-3.5 text-slate-600">{hospitals.find((hospital) => hospital.id === donation.hospital_id)?.name || 'BloodFlow facility'}</td><td className="px-6 py-3.5"><Badge variant="red">{donation.blood_group || '—'}</Badge></td><td className="px-6 py-3.5 font-semibold text-slate-700">{donation.units}</td><td className="px-6 py-3.5"><Badge variant="green" dot>Verified</Badge></td><td className="px-6 py-3.5 font-semibold text-amber-700">{rewards.find((reward) => reward.donation_id === donation.id)?.reward_title || 'Completed'}</td></tr>)}</tbody></table></div>}</Card>;
}

function getDonorLevel(completed: number) {
  if (completed >= 10) return 'Platinum';
  if (completed >= 5) return 'Gold';
  if (completed >= 3) return 'Silver';
  if (completed >= 1) return 'Bronze';
  return 'Starter';
}

function AppointmentRow({
  appointment,
  hospitals,
  onCancel,
  compact,
}: {
  appointment: Appointment;
  hospitals: Hospital[];
  onCancel?: () => void;
  compact?: boolean;
}) {
  const hospital = hospitals.find((h) => h.id === appointment.hospital_id);
  const statusVariant = appointment.status === 'completed' ? 'green' : appointment.status === 'cancelled' ? 'gray' : 'blue';
  const statusLabel = appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1);

  return (
    <div
      className={`group flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200/80 bg-white shadow-xs transition-all hover:border-slate-300 ${
        compact ? 'p-3.5' : 'p-4 sm:p-5'
      }`}
    >
      <div className="flex items-start gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 border border-brand-100 text-brand-600 shadow-2xs">
          <Droplet className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900 leading-snug">{hospital?.name || 'Hospital'}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            {hospital?.city && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-slate-400" /> {hospital.city}
              </span>
            )}
            <span className="flex items-center gap-1 font-medium text-slate-700">
              <Calendar className="h-3 w-3 text-slate-400" /> {appointment.appointment_date}
            </span>
            <span className="flex items-center gap-1 font-medium text-slate-700">
              <Clock className="h-3 w-3 text-slate-400" /> {appointment.appointment_time}
            </span>
          </div>
          {appointment.notes && (
            <p className="mt-2 text-xs text-slate-500 italic bg-slate-50 rounded px-2 py-1 inline-block">
              "{appointment.notes}"
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2.5 self-end sm:self-center">
        <Badge variant={statusVariant} dot>
          {statusLabel}
        </Badge>
        {onCancel && appointment.status === 'scheduled' && (
          <Button variant="danger-subtle" size="xs" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

function CertificateCard({ certificate }: { certificate: Certificate }) {
  function downloadCertificate() {
    const certificateHtml = buildCertificateHtml(certificate);
    const blob = new Blob([certificateHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${certificate.certificate_number}.html`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="overflow-hidden group hover:border-slate-300">
      {/* Visual Top Ribbon with Healthcare Navy & Crimson Emblem */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 p-5 text-white">
        <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-emergency-500/10 blur-2xl" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-amber-400 shadow-xs">
            <Award className="h-5 w-5" />
          </div>
          <img src="/logo.png" alt="BloodFlow" className="h-8 w-8 rounded-lg object-cover ring-1 ring-white/20" />
        </div>
        <p className="relative z-10 mt-4 text-[10px] font-bold uppercase tracking-widest text-teal-300">
          Official Certificate
        </p>
        <p className="relative z-10 mt-0.5 text-base font-extrabold tracking-tight truncate">
          {certificate.donor_name}
        </p>
      </div>

      <div className="p-5">
        <div className="space-y-2.5 text-xs">
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <span className="text-slate-500 font-medium">Certificate No.</span>
            <span className="font-mono font-bold text-slate-900">{certificate.certificate_number}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <span className="text-slate-500 font-medium">Hospital</span>
            <span className="font-semibold text-slate-800 truncate max-w-[160px] text-right">
              {certificate.hospital_name}
            </span>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <span className="text-slate-500 font-medium">Donation Date</span>
            <span className="font-medium text-slate-800">{certificate.donation_date}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Blood Group</span>
            <Badge variant="red">{certificate.donor_blood_group || '—'}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Units Collected</span>
            <span className="font-bold text-slate-900">{certificate.units_collected} unit(s)</span>
          </div>
        </div>

        <Button variant="outline" size="sm" fullWidth className="mt-5" onClick={downloadCertificate}>
          <Download className="h-3.5 w-3.5" /> Download Certificate
        </Button>
      </div>
    </Card>
  );
}

function ScheduleModal({
  onClose,
  onScheduled,
  hospitals,
}: {
  onClose: () => void;
  onScheduled: () => void;
  hospitals: Hospital[];
}) {
  const { profile } = useAuth();
  const [hospitalId, setHospitalId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const today = new Date().toISOString().split('T')[0];

  async function handleSchedule() {
    if (!hospitalId || !date || !time || !profile) {
      setError('Please fill in all required fields.');
      return;
    }
    setLoading(true);
    setError('');
    const { error: insertError } = await supabase.from('appointments').insert({
      donor_id: profile.id,
      hospital_id: hospitalId,
      appointment_date: date,
      appointment_time: time,
      notes,
    });
    setLoading(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    onScheduled();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Schedule Blood Donation"
      description="Choose an authorized hospital and pick a convenient date & time slot."
    >
      <div className="space-y-4">
        {hospitals.length === 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
            <span>No hospitals are currently registered on the network.</span>
          </div>
        )}

        <Select
          label="Authorized Hospital"
          value={hospitalId}
          onChange={setHospitalId}
          placeholder="Choose hospital location"
          required
          options={hospitals.map((h) => ({ value: h.id, label: `${h.name} (${h.city})` }))}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input label="Appointment Date" type="date" value={date} onChange={setDate} min={today} required />
          <Input label="Preferred Time" type="time" value={time} onChange={setTime} required />
        </div>

        <Input
          label="Health Notes (optional)"
          value={notes}
          onChange={setNotes}
          placeholder="e.g. Preferred arm, previous donation date, etc."
        />

        {error && (
          <div className="rounded-xl border border-emergency-200 bg-emergency-50 p-3 text-xs text-emergency-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-3">
          <Button variant="outline" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button fullWidth onClick={handleSchedule} disabled={loading} loading={loading}>
            Schedule Appointment
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ProfileView({ onUpdated }: { onUpdated: () => void }) {
  const { profile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [bloodGroup, setBloodGroup] = useState(profile?.blood_group || '');
  const [city, setCity] = useState(profile?.city || '');
  const [address, setAddress] = useState(profile?.address || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    await supabase.from('profiles').update({
      full_name: fullName,
      phone,
      blood_group: bloodGroup || null,
      city,
      address,
    }).eq('id', profile.id);
    setSaving(false);
    setSaved(true);
    onUpdated();
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <>
      <PageHeader title="My Profile" description="Manage your donor contact details and health profile." />
      <div className="max-w-2xl space-y-5">
        {/* Verification Status Banner */}
        {profile?.is_verified ? (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-900 shadow-xs">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold">Verified Donor Status</p>
              <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed">
                Your credentials have been verified by network administrators. You are eligible to schedule appointments at any approved facility.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-amber-900 shadow-xs">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white shadow-xs">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold">Verification Pending</p>
              <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                Your donor profile is currently being reviewed by an administrator. You may still schedule appointments in advance.
              </p>
            </div>
          </div>
        )}

        <Card className="p-6">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-xl font-bold text-white shadow-xs">
              {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <p className="text-base font-bold text-slate-900">{profile?.full_name}</p>
              <p className="text-xs text-slate-500">{profile?.email}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <Badge variant={profile?.blood_group ? 'red' : 'gray'}>
                  {profile?.blood_group ? `${profile.blood_group} Blood` : 'Group unset'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Input label="Full Name" value={fullName} onChange={setFullName} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Phone Number" value={phone} onChange={setPhone} />
              <Select
                label="Blood Group"
                value={bloodGroup}
                onChange={setBloodGroup}
                placeholder="Select group"
                options={BLOOD_GROUPS.map((bg) => ({ value: bg, label: bg }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="City" value={city} onChange={setCity} />
              <Input label="Address" value={address} onChange={setAddress} placeholder="Street, Apt / Suite" />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving} loading={saving}>
                Save Changes
              </Button>
              {saved && (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Saved successfully!
                </span>
              )}
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

