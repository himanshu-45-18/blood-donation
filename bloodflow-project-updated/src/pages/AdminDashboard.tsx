import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Users,
  Building2,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  Search,
  Phone,
  MapPin,
  Download,
  ShieldAlert,
  Activity,
  Droplets,
  UserPlus,
  ClipboardCheck,
} from 'lucide-react';
import { DashboardLayout, PageHeader, StatCard } from '@/components/DashboardLayout';
import { Card, Badge, Input, Button, EmptyState, Skeleton, ConfirmDialog } from '@/components/ui';
import { supabase, BLOOD_GROUPS, type Profile, type Hospital, type Appointment, type Certificate, type EmergencyRequest } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n';
import { buildCertificateHtml } from '@/lib/certificateTemplate';
import { RewardManagement } from '@/components/RewardManagement';

type View = 'overview' | 'donors' | 'hospitals' | 'appointments' | 'certificates' | 'emergencies' | 'rewards';

export function AdminDashboard() {
  const { tr } = useLanguage();
  const [view, setView] = useState<View>('overview');
  const [donors, setDonors] = useState<Profile[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [appointments, setAppointments] = useState<(Appointment & { donor?: Profile; hospital?: Hospital })[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [emergencies, setEmergencies] = useState<(EmergencyRequest & { requesting_hospital?: Hospital })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionError, setActionError] = useState('');

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    danger?: boolean;
    onConfirm: () => Promise<void>;
  }>({
    open: false,
    title: '',
    message: '',
    onConfirm: async () => {},
  });
  const [confirmLoading, setConfirmLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [donorsRes, hospRes, apptsRes, certsRes, emergRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('hospitals').select('*').order('created_at', { ascending: false }),
      supabase.from('appointments').select('*, donor:profiles(*), hospital:hospitals(*)').order('created_at', { ascending: false }),
      supabase.from('certificates').select('*').order('issued_at', { ascending: false }),
      supabase.from('emergency_requests').select('*, requesting_hospital:hospitals(*)').order('created_at', { ascending: false }),
    ]);
    setDonors(donorsRes.data || []);
    setHospitals(hospRes.data || []);
    setAppointments(apptsRes.data || []);
    setCertificates(certsRes.data || []);
    setEmergencies(emergRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const channel = supabase
      .channel('admin-donor-summary')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'certificates' }, loadData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  async function updateHospitalApproval(hospitalId: string, isApproved: boolean) {
    setActionError('');
    const { data, error } = await supabase.rpc('approve_hospital_v4', {
      hospital_id: hospitalId,
      approved: isApproved,
    });

    if (error) {
      setActionError(`Hospital approval failed: ${error.message}`);
      return;
    }
    if (!data || (Array.isArray(data) && data.length === 0)) {
      setActionError(
        'Hospital approval failed: no hospital was updated. Apply the latest Supabase migration and make sure this account has the admin role.',
      );
      return;
    }
    await loadData();
  }

  const unverifiedDonors = donors.filter((d) => d.role === 'donor' && !d.is_verified);
  const pendingHospitals = hospitals.filter((h) => !h.is_approved);
  const activeEmergencies = emergencies.filter((e) => e.status === 'active');

  const navItems = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'donors', label: 'Donors', icon: <Users className="h-4 w-4" /> },
    { id: 'hospitals', label: tr('Hospitals'), icon: <Building2 className="h-4 w-4" /> },
    { id: 'appointments', label: 'Appointments', icon: <Calendar className="h-4 w-4" /> },
    { id: 'certificates', label: 'Certificates', icon: <Award className="h-4 w-4" /> },
    { id: 'emergencies', label: tr('Emergencies'), icon: <AlertTriangle className="h-4 w-4" /> },
    { id: 'rewards', label: 'Rewards', icon: <Award className="h-4 w-4" /> },
  ];

  return (
    <DashboardLayout navItems={navItems} activeView={view} onNavigate={(v) => setView(v as View)} roleLabel="Administrator">
      {actionError && (
        <div className="mb-6 rounded-xl border border-emergency-200 bg-emergency-50 p-4 text-xs sm:text-sm text-emergency-700 flex items-start gap-2.5 shadow-xs">
          <ShieldAlert className="h-5 w-5 shrink-0 text-emergency-600 mt-0.5" />
          <div className="flex-1">{actionError}</div>
          <button
            onClick={() => setActionError('')}
            className="text-emergency-500 hover:text-emergency-800 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {view === 'overview' && (
        <>
          <PageHeader
            title={tr('Admin Dashboard')}
            description={tr('Platform-wide overview of all activity.')}
            badge={
              <Badge variant="purple" dot>
                Platform Oversight
              </Badge>
            }
          />

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="p-5">
                  <Skeleton className="h-4 w-24 mb-3" />
                  <Skeleton className="h-8 w-16" />
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label={tr('Total Donors')}
                value={donors.filter((d) => d.role === 'donor').length}
                icon={<Users className="h-5 w-5" />}
                color="blue"
                subtitle={`${unverifiedDonors.length} pending verification`}
              />
              <StatCard
                label={tr('Hospitals')}
                value={hospitals.length}
                icon={<Building2 className="h-5 w-5" />}
                color="teal"
                subtitle={`${pendingHospitals.length} pending approval`}
              />
              <StatCard
                label={tr('Total Appointments')}
                value={appointments.length}
                icon={<Calendar className="h-5 w-5" />}
                color="green"
                subtitle="All-time network bookings"
              />
              <StatCard
                label={tr('Active Emergencies')}
                value={activeEmergencies.length}
                icon={<AlertTriangle className="h-5 w-5" />}
                color={activeEmergencies.length > 0 ? 'red' : 'green'}
                subtitle={activeEmergencies.length > 0 ? 'Urgent blood needed' : 'All requests fulfilled'}
              />
            </div>
          )}

          {!loading && <TodaysDonorSummary donors={donors} appointments={appointments} certificates={certificates} />}

          {/* Pending Triage Action Cards */}
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Pending Donor Verifications */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{tr('Pending Verifications')}</h3>
                  <p className="text-xs text-slate-500">Donors awaiting identity clearance</p>
                </div>
                <Badge variant="yellow" dot>
                  {unverifiedDonors.length} pending
                </Badge>
              </div>
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : unverifiedDonors.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 className="h-6 w-6 text-emerald-500" />}
                  title={tr('All donors verified')}
                  description={tr('No pending verifications.')}
                />
              ) : (
                <div className="space-y-2.5">
                  {unverifiedDonors.slice(0, 5).map((donor) => (
                    <div
                      key={donor.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 transition-colors hover:bg-slate-50 hover:border-slate-200"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900 truncate">{donor.full_name}</p>
                          {donor.blood_group && <Badge variant="red">{donor.blood_group}</Badge>}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{donor.email}</p>
                      </div>
                      <Button
                        size="xs"
                        variant="primary"
                        onClick={async () => {
                          await supabase.from('profiles').update({ is_verified: true }).eq('id', donor.id);
                          loadData();
                        }}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> {tr('Verify')}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Pending Hospital Approvals */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{tr('Pending Hospital Approvals')}</h3>
                  <p className="text-xs text-slate-500">Medical facilities requesting network access</p>
                </div>
                <Badge variant="yellow" dot>
                  {pendingHospitals.length} pending
                </Badge>
              </div>
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : pendingHospitals.length === 0 ? (
                <EmptyState
                  icon={<Building2 className="h-6 w-6 text-brand-500" />}
                  title={tr('All hospitals approved')}
                  description={tr('No pending approvals.')}
                />
              ) : (
                <div className="space-y-2.5">
                  {pendingHospitals.slice(0, 5).map((hosp) => (
                    <div
                      key={hosp.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 transition-colors hover:bg-slate-50 hover:border-slate-200"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-bold text-slate-900 truncate">{hosp.name}</p>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <MapPin className="h-3 w-3 text-slate-400" /> {hosp.city} · {hosp.phone}
                        </p>
                      </div>
                      <Button size="xs" variant="primary" onClick={() => updateHospitalApproval(hosp.id, true)}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> {tr('Approve')}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      {view === 'donors' && (
        <>
          <PageHeader
            title={tr('All Donors')}
            description={tr('View and verify all registered donors.')}
            badge={<Badge variant="blue">{donors.filter((d) => d.role === 'donor').length} Registered</Badge>}
          />
          <div className="mb-5 max-w-md">
            <Input
              value={search}
              onChange={setSearch}
              placeholder={tr('Search by name, email, or blood group...')}
              icon={<Search className="h-4 w-4" />}
            />
          </div>
          {loading ? (
            <Card className="p-6">
              <Skeleton className="h-8 w-full mb-3" />
              <Skeleton className="h-8 w-full mb-3" />
              <Skeleton className="h-8 w-full" />
            </Card>
          ) : (
            <DonorsTable
              donors={donors
                .filter((d) => d.role === 'donor')
                .filter((d) => {
                  const q = search.toLowerCase();
                  return (
                    !q ||
                    d.full_name.toLowerCase().includes(q) ||
                    d.email.toLowerCase().includes(q) ||
                    (d.blood_group || '').toLowerCase().includes(q)
                  );
                })}
              onUpdate={loadData}
              onRequestConfirm={(opts) => setConfirmDialog({ open: true, ...opts })}
            />
          )}
        </>
      )}

      {view === 'rewards' && (
        <>
          <PageHeader title="Reward Management" description="Configure donor incentives for verified contributions." />
          <RewardManagement />
        </>
      )}

      {view === 'hospitals' && (
        <>
          <PageHeader
            title={tr('All Hospitals')}
            description={tr('View and manage all registered hospitals.')}
            badge={<Badge variant="teal">{hospitals.length} Facilities</Badge>}
          />
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-5">
                  <Skeleton className="h-10 w-10 rounded-xl mb-3" />
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {hospitals.map((hosp) => (
                <Card key={hosp.id} className="p-5 sm:p-6 hover:border-slate-300">
                  <div className="flex items-start justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 border border-brand-100 text-brand-600 shadow-2xs">
                      <Building2 className="h-5 w-5" />
                    </div>
                    {hosp.is_approved ? (
                      <Badge variant="green" dot>
                        <CheckCircle2 className="h-3 w-3" /> {tr('Approved')}
                      </Badge>
                    ) : (
                      <Badge variant="yellow" dot>
                        {tr('Pending')}
                      </Badge>
                    )}
                  </div>
                  <h3 className="mt-4 text-base font-bold text-slate-900 leading-snug">{hosp.name}</h3>
                  <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {hosp.address}, {hosp.city}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    {hosp.phone}
                  </p>
                  <div className="mt-5 pt-3 border-t border-slate-100 flex gap-2">
                    {!hosp.is_approved ? (
                      <Button size="xs" variant="primary" onClick={() => updateHospitalApproval(hosp.id, true)}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> {tr('Approve')}
                      </Button>
                    ) : (
                      <Button
                        size="xs"
                        variant="danger-subtle"
                        onClick={() =>
                          setConfirmDialog({
                            open: true,
                            title: 'Revoke Hospital Approval',
                            message: `Are you sure you want to revoke network authorization for "${hosp.name}"? This facility will no longer be able to manage blood stock or receive emergency calls.`,
                            danger: true,
                            onConfirm: async () => {
                              await updateHospitalApproval(hosp.id, false);
                            },
                          })
                        }
                      >
                        <XCircle className="h-3.5 w-3.5" /> {tr('Revoke')}
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {view === 'appointments' && (
        <>
          <PageHeader
            title={tr('All Appointments')}
            description={tr('Every appointment across the platform.')}
            badge={<Badge variant="blue">{appointments.length} Total</Badge>}
          />
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-5">
                  <Skeleton className="h-5 w-48 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </Card>
              ))}
            </div>
          ) : appointments.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={<Calendar className="h-7 w-7" />}
                title={tr('No appointments')}
                description={tr('No appointments have been scheduled.')}
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {appointments.map((apt) => (
                <Card key={apt.id} className="p-4 sm:p-5 hover:border-slate-300">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 font-bold text-white text-xs shadow-xs">
                        {apt.donor?.full_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900">{apt.donor?.full_name || 'Unknown Donor'}</p>
                          {apt.donor?.blood_group && <Badge variant="red">{apt.donor.blood_group}</Badge>}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {apt.hospital?.name || 'Unknown Hospital'} · {apt.appointment_date} at {apt.appointment_time}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          apt.status === 'completed' ? 'green' : apt.status === 'cancelled' ? 'gray' : 'blue'
                        }
                        dot
                      >
                        {apt.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {view === 'certificates' && (
        <>
          <PageHeader
            title={tr('All Certificates')}
            description={tr('Every certificate issued across the platform.')}
            badge={<Badge variant="green">{certificates.length} Issued</Badge>}
          />
          {loading ? (
            <Card className="p-6">
              <Skeleton className="h-8 w-full mb-2" />
              <Skeleton className="h-8 w-full mb-2" />
              <Skeleton className="h-8 w-full" />
            </Card>
          ) : certificates.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={<Award className="h-7 w-7" />}
                title={tr('No certificates')}
                description={tr('No certificates have been issued yet.')}
              />
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200/80 bg-slate-50/75 uppercase tracking-wider text-[11px] font-bold text-slate-500">
                    <tr>
                      <th className="px-5 py-3.5">Certificate No.</th>
                      <th className="px-5 py-3.5">Donor</th>
                      <th className="px-5 py-3.5">Hospital</th>
                      <th className="px-5 py-3.5">Date</th>
                      <th className="px-5 py-3.5">Blood Group</th>
                      <th className="px-5 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {certificates.map((cert) => (
                      <tr key={cert.id} className="transition-colors hover:bg-slate-50/60">
                        <td className="px-5 py-3.5 font-mono font-bold text-slate-900">{cert.certificate_number}</td>
                        <td className="px-5 py-3.5 font-semibold text-slate-900">{cert.donor_name}</td>
                        <td className="px-5 py-3.5 text-slate-600">{cert.hospital_name}</td>
                        <td className="px-5 py-3.5 text-slate-600">{cert.donation_date}</td>
                        <td className="px-5 py-3.5">
                          <Badge variant="red">{cert.donor_blood_group || '—'}</Badge>
                        </td>
                        <td className="px-5 py-3.5 text-right">
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
                            <Download className="h-3 w-3" /> Download
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {view === 'emergencies' && (
        <>
          <PageHeader
            title={tr('Emergency Requests')}
            description={tr('All emergency blood requests across the platform.')}
            badge={<Badge variant="red">{emergencies.length} Requests</Badge>}
          />
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Card key={i} className="p-5">
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </Card>
              ))}
            </div>
          ) : emergencies.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={<AlertTriangle className="h-7 w-7 text-emerald-500" />}
                title={tr('No emergencies')}
                description={tr('No emergency requests have been created.')}
              />
            </Card>
          ) : (
            <div className="space-y-4">
              {emergencies.map((emerg) => (
                <Card key={emerg.id} className="p-5 hover:border-slate-300">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={
                            emerg.urgency === 'critical' ? 'red' : emerg.urgency === 'urgent' ? 'yellow' : 'blue'
                          }
                        >
                          {tr(emerg.urgency).toUpperCase()}
                        </Badge>
                        <Badge
                          variant={
                            emerg.status === 'active' ? 'yellow' : emerg.status === 'fulfilled' ? 'green' : 'gray'
                          }
                          dot
                        >
                          {tr(emerg.status)}
                        </Badge>
                        <Badge variant="red">
                          {emerg.blood_group} · {emerg.units_needed} {tr('units')}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm font-bold text-slate-800">
                        {emerg.requesting_hospital?.name || 'Unknown hospital'}
                      </p>
                      {emerg.notes && <p className="mt-1 text-xs text-slate-600">"{emerg.notes}"</p>}
                      <p className="mt-1.5 text-[11px] text-slate-400">
                        {new Date(emerg.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
        onConfirm={async () => {
          setConfirmLoading(true);
          await confirmDialog.onConfirm();
          setConfirmLoading(false);
          setConfirmDialog((prev) => ({ ...prev, open: false }));
        }}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Confirm Action"
        danger={confirmDialog.danger}
        loading={confirmLoading}
      />
    </DashboardLayout>
  );
}

function TodaysDonorSummary({
  donors,
  appointments,
  certificates,
}: {
  donors: Profile[];
  appointments: (Appointment & { donor?: Profile; hospital?: Hospital })[];
  certificates: Certificate[];
}) {
  const today = formatLocalDate(new Date());
  const donorsRegisteredToday = donors.filter((donor) => donor.role === 'donor' && isTodayTimestamp(donor.created_at, today)).length;
  const todayAppointments = appointments.filter((appointment) => appointment.appointment_date === today);
  const completedToday = appointments.filter(
    (appointment) => appointment.status === 'completed' && isTodayTimestamp(appointment.completed_at || appointment.appointment_date, today),
  );
  const certificatesByAppointment = new Map(certificates.map((certificate) => [certificate.appointment_id, certificate]));
  const unitsCollectedToday = completedToday.reduce(
    (total, appointment) => total + (certificatesByAppointment.get(appointment.id)?.units_collected ?? 1),
    0,
  );
  const bloodGroupCounts = Object.fromEntries(
    BLOOD_GROUPS.map((bloodGroup) => [
      bloodGroup,
      completedToday.filter((appointment) => appointment.donor?.blood_group === bloodGroup).length,
    ]),
  ) as Record<(typeof BLOOD_GROUPS)[number], number>;
  const activityAppointments = Array.from(
    new Map([...todayAppointments, ...completedToday].map((appointment) => [appointment.id, appointment])).values(),
  );
  const activityByHour = Array.from({ length: 24 }, (_, hour) =>
    activityAppointments.filter((appointment) => getActivityHour(appointment) === hour).length,
  );
  const maxActivity = Math.max(...activityByHour, 1);

  return (
    <section className="mt-8" aria-labelledby="todays-donor-summary-title">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="todays-donor-summary-title" className="text-lg font-bold text-slate-900">Today's Donor Summary</h2>
          <p className="text-xs text-slate-500">Live activity across the BloodFlow network</p>
        </div>
        <Badge variant="teal" dot>Updated automatically</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Donors Registered Today" value={donorsRegisteredToday} icon={<UserPlus className="h-5 w-5" />} color="blue" />
        <StatCard label="Donors Who Donated" value={completedToday.length} icon={<CheckCircle2 className="h-5 w-5" />} color="green" />
        <StatCard label="Appointments Scheduled" value={todayAppointments.filter((appointment) => appointment.status === 'scheduled').length} icon={<Calendar className="h-5 w-5" />} color="teal" />
        <StatCard label="Cancelled Appointments" value={todayAppointments.filter((appointment) => appointment.status === 'cancelled').length} icon={<XCircle className="h-5 w-5" />} color="red" />
        <StatCard label="Blood Units Collected" value={unitsCollectedToday} icon={<Droplets className="h-5 w-5" />} color="amber" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Blood Group Distribution Today</h3>
              <p className="mt-1 text-xs text-slate-500">Completed donors by blood group</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emergency-50 text-emergency-600">
              <Droplets className="h-5 w-5" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {BLOOD_GROUPS.map((bloodGroup) => (
              <div key={bloodGroup} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-center">
                <div className="text-sm font-bold text-emergency-700">{bloodGroup}</div>
                <div className="mt-1 text-xl font-bold text-slate-900">{bloodGroupCounts[bloodGroup]}</div>
                <div className="text-[11px] text-slate-500">donors</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Donor Activity by Hour</h3>
              <p className="mt-1 text-xs text-slate-500">Appointments and completed donations today</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Activity className="h-5 w-5" />
            </div>
          </div>
          {completedToday.length === 0 ? (
            <EmptyState
              icon={<ClipboardCheck className="h-6 w-6 text-brand-500" />}
              title="No donations today"
              description="Completed donations will appear here as hospitals record them."
            />
          ) : (
            <div className="overflow-x-auto pb-1">
              <div className="flex h-36 min-w-[540px] items-end gap-1.5 border-b border-slate-200 px-1">
                {activityByHour.map((activity, hour) => (
                  <div key={hour} className="flex h-full min-w-4 flex-1 flex-col items-center justify-end gap-1">
                    <span className="text-[10px] font-semibold text-slate-500">{activity || ''}</span>
                    <div
                      className="w-full rounded-t-md bg-brand-500"
                      style={{ height: `${activity === 0 ? 3 : Math.max((activity / maxActivity) * 100, 8)}%` }}
                      title={`${activity} activities at ${formatHour(hour)}`}
                    />
                    <span className="text-[10px] text-slate-400">{hour % 3 === 0 ? formatHour(hour) : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </section>
  );
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isTodayTimestamp(value: string, today: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value === today;
  return formatLocalDate(new Date(value)) === today;
}

function getActivityHour(appointment: Appointment) {
  if (appointment.status === 'completed' && appointment.completed_at) {
    return new Date(appointment.completed_at).getHours();
  }
  const hour = Number(appointment.appointment_time.split(':')[0]);
  return Number.isFinite(hour) ? hour : 0;
}

function formatHour(hour: number) {
  return new Date(2000, 0, 1, hour).toLocaleTimeString([], { hour: 'numeric' });
}

function DonorsTable({
  donors,
  onUpdate,
  onRequestConfirm,
}: {
  donors: Profile[];
  onUpdate: () => void;
  onRequestConfirm: (opts: { title: string; message: string; danger?: boolean; onConfirm: () => Promise<void> }) => void;
}) {
  const { tr } = useLanguage();
  if (donors.length === 0) {
    return (
      <Card className="p-8">
        <EmptyState
          icon={<Users className="h-7 w-7" />}
          title={tr('No donors found')}
          description={tr('No donors match your search.')}
        />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200/80 bg-slate-50/75 uppercase tracking-wider text-[11px] font-bold text-slate-500">
            <tr>
              <th className="px-5 py-3.5">Donor Name</th>
              <th className="px-5 py-3.5">Email</th>
              <th className="px-5 py-3.5">Blood Group</th>
              <th className="px-5 py-3.5">City</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {donors.map((donor) => (
              <tr key={donor.id} className="transition-colors hover:bg-slate-50/60">
                <td className="px-5 py-3.5 font-bold text-slate-900 flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white font-bold text-xs shadow-2xs">
                    {donor.full_name?.charAt(0).toUpperCase() || 'D'}
                  </div>
                  <span>{donor.full_name}</span>
                </td>
                <td className="px-5 py-3.5 text-slate-600">{donor.email}</td>
                <td className="px-5 py-3.5">
                  <Badge variant="red">{donor.blood_group || '—'}</Badge>
                </td>
                <td className="px-5 py-3.5 text-slate-600">{donor.city || '—'}</td>
                <td className="px-5 py-3.5">
                  {donor.is_verified ? (
                    <Badge variant="green" dot>
                      <CheckCircle2 className="h-3 w-3" /> Verified
                    </Badge>
                  ) : (
                    <Badge variant="yellow" dot>
                      Pending
                    </Badge>
                  )}
                </td>
                <td className="px-5 py-3.5 text-right">
                  {donor.is_verified ? (
                    <Button
                      size="xs"
                      variant="danger-subtle"
                      onClick={() =>
                        onRequestConfirm({
                          title: 'Revoke Donor Verification',
                          message: `Are you sure you want to revoke verification for ${donor.full_name}? The donor will need administrator review before scheduling further appointments.`,
                          danger: true,
                          onConfirm: async () => {
                            await supabase.from('profiles').update({ is_verified: false }).eq('id', donor.id);
                            onUpdate();
                          },
                        })
                      }
                    >
                      Revoke
                    </Button>
                  ) : (
                    <Button
                      size="xs"
                      variant="primary"
                      onClick={async () => {
                        await supabase.from('profiles').update({ is_verified: true }).eq('id', donor.id);
                        onUpdate();
                      }}
                    >
                      Verify
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

