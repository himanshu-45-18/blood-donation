import { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Calendar,
  Droplet,
  Phone,
  Plus,
  Minus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Users,
  PhoneCall,
  Zap,
  MapPin,
  ShieldCheck,
  AlertCircle,
  Activity,
  ArrowUpRight,
  MessageSquare,
  Award,
} from 'lucide-react';
import { DashboardLayout, PageHeader, StatCard } from '@/components/DashboardLayout';
import { Button, Input, Select, Card, Badge, Modal, EmptyState, Skeleton, ConfirmDialog } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import {
  supabase,
  BLOOD_GROUPS,
  type Hospital,
  type BloodInventory,
  type Appointment,
  type EmergencyRequest,
  type EmergencyCall,
  type Profile,
} from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n';
import { RewardManagement } from '@/components/RewardManagement';

type View = 'overview' | 'donors' | 'inventory' | 'emergency' | 'settings' | 'rewards';

export function HospitalDashboard() {
  const { profile } = useAuth();
  const { tr } = useLanguage();
  const [view, setView] = useState<View>('overview');
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [inventory, setInventory] = useState<BloodInventory[]>([]);
  const [appointments, setAppointments] = useState<(Appointment & { donor?: Profile })[]>([]);
  const [emergencies, setEmergencies] = useState<EmergencyRequest[]>([]);
  const [allHospitals, setAllHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEmergency, setShowEmergency] = useState(false);

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);

    const { data: hospData } = await supabase.from('hospitals').select('*').eq('managed_by', profile.id).maybeSingle();
    setHospital(hospData as Hospital | null);

    if (hospData) {
      const [invRes, apptsRes, emergRes, allHospRes] = await Promise.all([
        supabase.from('blood_inventory').select('*').eq('hospital_id', hospData.id).order('blood_group'),
        supabase
          .from('appointments')
          .select('*, donor:profiles(*)')
          .eq('hospital_id', hospData.id)
          .order('appointment_date', { ascending: false }),
        supabase
          .from('emergency_requests')
          .select('*')
          .eq('requesting_hospital_id', hospData.id)
          .order('created_at', { ascending: false }),
        supabase.from('hospitals').select('*').neq('id', hospData.id).order('name'),
      ]);
      setInventory(invRes.data || []);
      setAppointments(apptsRes.data || []);
      setEmergencies(emergRes.data || []);
      setAllHospitals(allHospRes.data || []);
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const upcomingDonors = appointments.filter((a) => a.status === 'scheduled');
  const completedDonations = appointments.filter((a) => a.status === 'completed');
  const activeEmergencies = emergencies.filter((e) => e.status === 'active');
  const totalUnits = inventory.reduce((sum, inv) => sum + inv.units_available, 0);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: <Building2 className="h-4 w-4" /> },
    { id: 'donors', label: tr('Incoming Donors'), icon: <Users className="h-4 w-4" /> },
    { id: 'inventory', label: 'Blood Inventory', icon: <Droplet className="h-4 w-4" /> },
    { id: 'emergency', label: 'Emergency Requests', icon: <AlertTriangle className="h-4 w-4" /> },
    { id: 'settings', label: tr('Hospital Settings'), icon: <Building2 className="h-4 w-4" /> },
    { id: 'rewards', label: 'Rewards', icon: <Award className="h-4 w-4" /> },
  ];

  if (!loading && !hospital) {
    return (
      <DashboardLayout navItems={navItems} activeView={view} onNavigate={(v) => setView(v as View)} roleLabel="Hospital Admin">
        <HospitalRegistration onCreated={loadData} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} activeView={view} onNavigate={(v) => setView(v as View)} roleLabel="Hospital Admin">
      {view === 'overview' && (
        <>
          <PageHeader
            title={hospital?.name || 'Hospital'}
            description={`${hospital?.city || 'City'}, ${hospital?.address || 'Address'} · Facility Blood Operations`}
            badge={
              hospital?.is_approved ? (
                <Badge variant="green" dot>
                  <ShieldCheck className="h-3 w-3" /> Approved Facility
                </Badge>
              ) : (
                <Badge variant="yellow" dot>
                  Approval Pending
                </Badge>
              )
            }
            action={
              <Button variant="danger" onClick={() => setShowEmergency(true)}>
                <AlertTriangle className="h-4 w-4" /> {tr('Emergency Request')}
              </Button>
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
                label={tr('Total Blood Units')}
                value={totalUnits}
                icon={<Droplet className="h-5 w-5" />}
                color="red"
                subtitle="Combined inventory"
              />
              <StatCard
                label={tr('Incoming Donors')}
                value={upcomingDonors.length}
                icon={<Users className="h-5 w-5" />}
                color="blue"
                subtitle="Scheduled appointments"
              />
              <StatCard
                label={tr('Completed Donations')}
                value={completedDonations.length}
                icon={<CheckCircle2 className="h-5 w-5" />}
                color="green"
                subtitle="Fulfilled contributions"
              />
              <StatCard
                label={tr('Active Emergencies')}
                value={activeEmergencies.length}
                icon={<AlertTriangle className="h-5 w-5" />}
                color={activeEmergencies.length > 0 ? 'red' : 'teal'}
                subtitle={activeEmergencies.length > 0 ? 'Urgent requests broadcasted' : 'Normal facility status'}
              />
            </div>
          )}

          {/* Blood Inventory Centerpiece Summary */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Activity className="h-5 w-5 text-brand-600" />
                  {tr('Blood Inventory Summary')}
                </h2>
                <p className="text-xs text-slate-500">Live capacity status across all 8 blood groups</p>
              </div>
              <Button size="xs" variant="outline" onClick={() => setView('inventory')}>
                Manage Inventory <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <Card key={i} className="p-3">
                    <Skeleton className="h-5 w-10 mb-2" />
                    <Skeleton className="h-6 w-8 mb-1" />
                    <Skeleton className="h-3 w-12" />
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {inventory.map((inv) => {
                  const isCritical = inv.units_available < 5;
                  const isLow = inv.units_available >= 5 && inv.units_available < 10;
                  const statusBg = isCritical
                    ? 'border-emergency-200 bg-emergency-50/50 hover:bg-emergency-50'
                    : isLow
                    ? 'border-amber-200 bg-amber-50/40 hover:bg-amber-50/60'
                    : 'border-slate-200/90 bg-white hover:border-slate-300';
                  const fillPercent = Math.min(100, Math.round((inv.units_available / 20) * 100));

                  return (
                    <div
                      key={inv.id}
                      onClick={() => setView('inventory')}
                      className={`rounded-xl border p-3.5 text-center shadow-xs transition-all cursor-pointer ${statusBg}`}
                    >
                      <span className="text-base font-extrabold tracking-tight text-slate-900 block">{inv.blood_group}</span>
                      <p
                        className={`text-2xl font-extrabold my-1 tracking-tight ${
                          isCritical ? 'text-emergency-600' : isLow ? 'text-amber-600' : 'text-slate-800'
                        }`}
                      >
                        {inv.units_available}
                      </p>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden my-1.5">
                        <div
                          className={`h-full rounded-full ${
                            isCritical ? 'bg-emergency-500' : isLow ? 'bg-amber-500' : 'bg-brand-500'
                          }`}
                          style={{ width: `${fillPercent}%` }}
                        />
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider block ${
                          isCritical ? 'text-emergency-700' : isLow ? 'text-amber-700' : 'text-emerald-700'
                        }`}
                      >
                        {isCritical ? 'Critical' : isLow ? 'Low' : 'OK'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Upcoming Donors Preview */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{tr('Upcoming Donors')}</h3>
                  <p className="text-xs text-slate-500">Scheduled appointments today</p>
                </div>
                {upcomingDonors.length > 0 && (
                  <Button size="xs" variant="outline" onClick={() => setView('donors')}>
                    View All ({upcomingDonors.length})
                  </Button>
                )}
              </div>
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : upcomingDonors.length === 0 ? (
                <EmptyState
                  icon={<Users className="h-6 w-6" />}
                  title={tr('No upcoming donors')}
                  description={tr('No scheduled appointments.')}
                />
              ) : (
                <div className="space-y-2.5">
                  {upcomingDonors.slice(0, 5).map((apt) => (
                    <div
                      key={apt.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 transition-colors hover:bg-slate-50 hover:border-slate-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 font-bold text-white text-xs shadow-xs">
                          {apt.donor?.full_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{apt.donor?.full_name || 'Unknown'}</p>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <Clock className="h-3 w-3 text-slate-400" />
                            {apt.appointment_date} at {apt.appointment_time}
                          </p>
                        </div>
                      </div>
                      {apt.donor?.blood_group && <Badge variant="red">{apt.donor.blood_group}</Badge>}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Active Emergency Requests Preview */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Active Emergencies</h3>
                  <p className="text-xs text-slate-500">Live multi-hospital broadcast alerts</p>
                </div>
                <Button size="xs" variant="outline" onClick={() => setView('emergency')}>
                  View All
                </Button>
              </div>
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : activeEmergencies.length === 0 ? (
                <EmptyState
                  icon={<ShieldCheck className="h-6 w-6" />}
                  title="No active emergencies"
                  description="All blood requirements are currently satisfied."
                  action={
                    <Button size="xs" variant="outline" onClick={() => setShowEmergency(true)}>
                      <Plus className="h-3 w-3" /> New Emergency
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-3">
                  {activeEmergencies.slice(0, 3).map((emerg) => (
                    <div
                      key={emerg.id}
                      className="rounded-xl border border-emergency-200 bg-emergency-50/50 p-4 transition-all hover:border-emergency-300"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="red" dot>
                            {emerg.blood_group} · {emerg.units_needed} units
                          </Badge>
                          <Badge variant={emerg.urgency === 'critical' ? 'red' : 'yellow'}>{tr(emerg.urgency)}</Badge>
                        </div>
                        <span className="text-[11px] text-slate-500">
                          {new Date(emerg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {emerg.notes && <p className="mt-2 text-xs text-slate-600 line-clamp-1">"{emerg.notes}"</p>}
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
            title={tr('Incoming Donors')}
            description={tr('View and manage scheduled blood donation appointments.')}
            badge={<Badge variant="blue">{appointments.length} Total</Badge>}
          />
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-5">
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </Card>
              ))}
            </div>
          ) : appointments.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={<Users className="h-7 w-7" />}
                title={tr('No appointments')}
                description={tr('No donors have scheduled appointments yet.')}
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {appointments.map((apt) => (
                <DonorAppointmentRow key={apt.id} appointment={apt} onUpdate={loadData} />
              ))}
            </div>
          )}
        </>
      )}

      {/* BLOOD INVENTORY UX (THE VISUAL CENTERPIECE) */}
      {view === 'inventory' && (
        <>
          <PageHeader
            title={tr('Blood Inventory')}
            description="Manage and monitor blood reserve availability across all blood groups. Live status triggers critical warnings below 5 units."
            action={
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-white border border-slate-200/90 rounded-xl px-3 py-2 shadow-xs">
                <span className="font-semibold text-slate-800">Total Reserves:</span>
                <span className="font-extrabold text-brand-600 text-sm">{totalUnits} units</span>
              </div>
            }
          />

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Card key={i} className="p-5">
                  <Skeleton className="h-10 w-10 rounded-xl mb-3" />
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {inventory.map((inv) => (
                <InventoryCard key={inv.id} inventory={inv} hospitalCity={hospital?.city} onUpdate={loadData} />
              ))}
            </div>
          )}
        </>
      )}

      {view === 'emergency' && (
        <>
          <PageHeader
            title={tr('Emergency Requests')}
            description={tr('Create and track emergency blood requests. Call multiple hospitals simultaneously.')}
            action={
              <Button variant="danger" onClick={() => setShowEmergency(true)}>
                <Plus className="h-4 w-4" /> {tr('New Emergency Request')}
              </Button>
            }
          />
          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Card key={i} className="p-6">
                  <Skeleton className="h-6 w-48 mb-3" />
                  <Skeleton className="h-24 w-full" />
                </Card>
              ))}
            </div>
          ) : emergencies.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={<AlertTriangle className="h-7 w-7 text-amber-500" />}
                title={tr('No emergency requests')}
                description={tr('Create an emergency request when you urgently need blood.')}
                action={
                  <Button variant="danger" size="sm" onClick={() => setShowEmergency(true)}>
                    <Plus className="h-4 w-4" /> {tr('New Emergency Request')}
                  </Button>
                }
              />
            </Card>
          ) : (
            <div className="space-y-5">
              {emergencies.map((emerg) => (
                <EmergencyRequestCard key={emerg.id} emergency={emerg} onUpdate={loadData} />
              ))}
            </div>
          )}
        </>
      )}

      {view === 'settings' && <HospitalSettings hospital={hospital} onUpdated={loadData} />}

      {view === 'rewards' && (
        <>
          <PageHeader title="Reward Management" description="Configure donor incentives for verified contributions." />
          <RewardManagement />
        </>
      )}

      {showEmergency && hospital && (
        <EmergencyModal
          onClose={() => setShowEmergency(false)}
          onCreated={() => {
            setShowEmergency(false);
            loadData();
          }}
          hospital={hospital}
          allHospitals={allHospitals}
        />
      )}
    </DashboardLayout>
  );
}

function HospitalRegistration({ onCreated }: { onCreated: () => void }) {
  const { profile } = useAuth();
  const { tr } = useLanguage();
  const [name, setName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [city, setCity] = useState(profile?.city || '');
  const [address, setAddress] = useState(profile?.address || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function registerHospital() {
    if (!profile || !name.trim() || !phone.trim() || !city.trim() || !address.trim()) {
      setError(tr('Complete all hospital details before registering.'));
      return;
    }

    setSaving(true);
    setError('');
    const { data: newHospital, error: insertError } = await supabase
      .from('hospitals')
      .insert({
        name: name.trim(),
        phone: phone.trim(),
        city: city.trim(),
        address: address.trim(),
        managed_by: profile.id,
        is_approved: true,
      })
      .select()
      .single();

    if (insertError || !newHospital) {
      setError(insertError?.message || tr('Hospital registration failed.'));
      setSaving(false);
      return;
    }

    const { error: inventoryError } = await supabase.from('blood_inventory').upsert(
      BLOOD_GROUPS.map((bloodGroup) => ({ hospital_id: newHospital.id, blood_group: bloodGroup, units_available: 0 })),
      { onConflict: 'hospital_id,blood_group' },
    );
    setSaving(false);
    if (inventoryError) {
      setError(`${tr('Hospital created, but inventory setup failed:')} ${inventoryError.message}`);
      onCreated();
      return;
    }
    onCreated();
  }

  return (
    <>
      <PageHeader
        title={tr('Register your hospital')}
        description={tr('Set up your hospital profile before managing donors, inventory, and emergency requests.')}
      />
      <Card className="max-w-2xl p-6 sm:p-8">
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs sm:text-sm text-amber-900">
          <Building2 className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <span>{tr('Your hospital will remain pending until an administrator approves it.')}</span>
        </div>
        <div className="space-y-4">
          <Input label={tr('Hospital name')} value={name} onChange={setName} required placeholder="City General Hospital" />
          <Input label={tr('Phone')} value={phone} onChange={setPhone} required placeholder="+1 555 000 0000" />
          <div className="grid grid-cols-2 gap-3">
            <Input label={tr('City')} value={city} onChange={setCity} required placeholder="New York" />
            <Input label={tr('Address')} value={address} onChange={setAddress} required placeholder="123 Main Street" />
          </div>
          {error && (
            <div className="rounded-xl border border-emergency-200 bg-emergency-50 px-4 py-3 text-xs text-emergency-700">
              {error}
            </div>
          )}
          <Button onClick={registerHospital} disabled={saving} loading={saving}>
            <Building2 className="h-4 w-4" /> {tr('Register Hospital')}
          </Button>
        </div>
      </Card>
    </>
  );
}

function DonorAppointmentRow({
  appointment,
  onUpdate,
}: {
  appointment: Appointment & { donor?: Profile };
  onUpdate: () => void;
}) {
  const { tr } = useLanguage();
  const [updating, setUpdating] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const statusVariant =
    appointment.status === 'completed' ? 'green' : appointment.status === 'cancelled' ? 'gray' : 'blue';

  async function markComplete() {
    setUpdating(true);
    await supabase.from('appointments').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', appointment.id);
    setUpdating(false);
    onUpdate();
  }

  async function handleCancel() {
    setUpdating(true);
    await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', appointment.id);
    setUpdating(false);
    setShowCancelDialog(false);
    onUpdate();
  }

  return (
    <Card className="p-4 sm:p-5 hover:border-slate-300">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 font-bold text-white text-sm shadow-xs">
            {appointment.donor?.full_name?.charAt(0).toUpperCase() || '?'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-slate-900">{appointment.donor?.full_name || 'Unknown Donor'}</p>
              {appointment.donor?.is_verified && (
                <span title="Verified Donor">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1 font-medium text-slate-700">
                <Calendar className="h-3 w-3 text-slate-400" /> {appointment.appointment_date}
              </span>
              <span className="flex items-center gap-1 font-medium text-slate-700">
                <Clock className="h-3 w-3 text-slate-400" /> {appointment.appointment_time}
              </span>
              {appointment.donor?.phone && (
                <a
                  href={`tel:${appointment.donor.phone}`}
                  className="flex items-center gap-1 text-brand-600 hover:text-brand-700 font-medium"
                >
                  <Phone className="h-3 w-3" /> {appointment.donor.phone}
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5 self-end sm:self-center">
          {appointment.donor?.blood_group && <Badge variant="red">{appointment.donor.blood_group}</Badge>}
          <Badge variant={statusVariant} dot>
            {tr(appointment.status)}
          </Badge>
          {appointment.status === 'scheduled' && (
            <>
              <Button size="xs" variant="primary" onClick={markComplete} disabled={updating} loading={updating}>
                <CheckCircle2 className="h-3.5 w-3.5" /> {tr('Mark Donated')}
              </Button>
              <Button
                size="xs"
                variant="danger-subtle"
                onClick={() => setShowCancelDialog(true)}
                disabled={updating}
              >
                <XCircle className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>
      {appointment.notes && (
        <div className="mt-3 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-xs text-slate-600">
          <span className="font-semibold text-slate-700">Donor notes:</span> {appointment.notes}
        </div>
      )}

      <ConfirmDialog
        open={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={handleCancel}
        title="Cancel Donor Appointment"
        message={`Are you sure you want to cancel the scheduled donation appointment for ${
          appointment.donor?.full_name || 'this donor'
        }?`}
        confirmText="Cancel Appointment"
        danger
        loading={updating}
      />
    </Card>
  );
}

function InventoryCard({
  inventory,
  hospitalCity,
  onUpdate,
}: {
  inventory: BloodInventory;
  hospitalCity?: string;
  onUpdate: () => void;
}) {
  const { tr } = useLanguage();
  const [units, setUnits] = useState(inventory.units_available);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setUnits(inventory.units_available);
  }, [inventory.units_available]);

  async function update(val: number) {
    const newVal = Math.max(0, val);
    setUnits(newVal);
    setSaving(true);
    await supabase
      .from('blood_inventory')
      .update({ units_available: newVal, updated_at: new Date().toISOString() })
      .eq('id', inventory.id);
    setSaving(false);
    onUpdate();
  }

  // Visual state definitions
  const isCritical = units < 5;
  const isLow = units >= 5 && units < 10;
  const stateLabel = isCritical ? 'CRITICAL' : isLow ? 'LOW STOCK' : 'AVAILABLE';
  const stateVariant: 'red' | 'yellow' | 'green' = isCritical ? 'red' : isLow ? 'yellow' : 'green';
  const stateIcon = isCritical ? (
    <AlertCircle className="h-3 w-3 text-emergency-600" />
  ) : isLow ? (
    <AlertTriangle className="h-3 w-3 text-amber-600" />
  ) : (
    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
  );

  // Meter fill
  const capacityMax = 25;
  const fillPercent = Math.min(100, Math.round((units / capacityMax) * 100));

  return (
    <Card
      className={`p-5 transition-all relative overflow-hidden ${
        isCritical
          ? 'border-emergency-300 ring-1 ring-emergency-400/30 shadow-xs'
          : isLow
          ? 'border-amber-300 ring-1 ring-amber-400/20'
          : 'border-slate-200/90 hover:border-slate-300'
      }`}
    >
      {/* Top Header: Blood Group Emblem + State Badge */}
      <div className="flex items-center justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emergency-500 to-emergency-700 text-white font-black text-xl shadow-xs">
          {inventory.blood_group}
        </div>
        <Badge variant={stateVariant} dot>
          {stateIcon} {stateLabel}
        </Badge>
      </div>

      {/* Metric Count */}
      <div className="mt-4 flex items-baseline justify-between">
        <div>
          <p className="text-3xl font-extrabold tracking-tight text-slate-900 leading-none">{units}</p>
          <p className="text-xs text-slate-400 font-medium mt-1">{tr('units available')}</p>
        </div>
        <span className="text-[11px] font-semibold text-slate-400">Target ~25u</span>
      </div>

      {/* Visual Stock Meter */}
      <div className="mt-3">
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isCritical ? 'bg-emergency-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${fillPercent}%` }}
          />
        </div>
      </div>

      {/* Stepper Controls */}
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => update(units - 1)}
          aria-label={`Decrease ${inventory.blood_group} units`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 active:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <Minus className="h-4 w-4" />
        </button>
        <input
          type="number"
          min="0"
          value={units}
          onChange={(e) => setUnits(parseInt(e.target.value) || 0)}
          onBlur={() => update(parseInt(String(units)) || 0)}
          aria-label={`${inventory.blood_group} units`}
          className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-2 py-1.5 text-center text-sm font-bold text-slate-900 transition-colors focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        <button
          type="button"
          onClick={() => update(units + 1)}
          aria-label={`Increase ${inventory.blood_group} units`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 active:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Meta Footer */}
      <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <MapPin className="h-3 w-3" /> {hospitalCity || 'On-site'}
        </span>
        <span>{saving ? tr('Saving...') : 'Live synced'}</span>
      </div>
    </Card>
  );
}

function EmergencyModal({
  onClose,
  onCreated,
  hospital,
  allHospitals,
}: {
  onClose: () => void;
  onCreated: () => void;
  hospital: Hospital;
  allHospitals: Hospital[];
}) {
  const { tr } = useLanguage();
  const [bloodGroup, setBloodGroup] = useState('');
  const [unitsNeeded, setUnitsNeeded] = useState('2');
  const [urgency, setUrgency] = useState<'critical' | 'urgent' | 'moderate'>('urgent');
  const [notes, setNotes] = useState('');
  const [selectedHospitals, setSelectedHospitals] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!bloodGroup) {
      setError(tr('Please select a blood group.'));
      return;
    }
    if (selectedHospitals.length === 0) {
      setError(tr('Select at least one hospital to call.'));
      return;
    }
    setLoading(true);
    setError('');

    const { data, error: insertError } = await supabase
      .from('emergency_requests')
      .insert({
        requesting_hospital_id: hospital.id,
        blood_group: bloodGroup,
        units_needed: parseInt(unitsNeeded) || 1,
        urgency,
        notes,
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    const callsToInsert = selectedHospitals.map((hospId) => {
      const h = allHospitals.find((hp) => hp.id === hospId);
      return {
        emergency_request_id: data.id,
        hospital_id: hospId,
        hospital_name: h?.name || '',
        hospital_phone: h?.phone || '',
        call_status: 'pending' as const,
      };
    });

    await supabase.from('emergency_calls').insert(callsToInsert);

    const { data: sessionData } = await supabase.auth.getSession();
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/emergency-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionData.session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ emergencyRequestId: data.id }),
    });

    const result = await response.json().catch(() => null);
    const failedCall = result?.results?.find((call: { status?: string }) => call.status === 'failed');
    if (!response.ok || failedCall) {
      setError(
        result?.error ||
          failedCall?.error ||
          tr('Call initiation failed. Check telephony configuration and phone numbers.'),
      );
      setLoading(false);
      return;
    }

    setLoading(false);
    onCreated();
  }

  function toggleHospital(id: string) {
    setSelectedHospitals((prev) => (prev.includes(id) ? prev.filter((h) => h !== id) : [...prev, id]));
  }

  function selectAllHospitals() {
    if (selectedHospitals.length === allHospitals.length) {
      setSelectedHospitals([]);
    } else {
      setSelectedHospitals(allHospitals.map((h) => h.id));
    }
  }

  return (
    <Modal open onClose={onClose} title={tr('Create Emergency Request')} maxWidth="max-w-xl">
      <div className="space-y-4">
        {/* Automated Voice Broadcast Notice */}
        <div className="rounded-xl bg-emergency-50/80 border border-emergency-200 p-3.5 text-xs sm:text-sm text-emergency-800 flex items-start gap-2.5 shadow-xs">
          <Zap className="h-4 w-4 shrink-0 text-emergency-600 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">{tr('Automated Emergency Dispatch')}:</span> {tr('This will call all selected hospitals simultaneously.')}
          </div>
        </div>

        {/* Priority / Urgency Picker */}
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
            {tr('Urgency Level')}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'critical', label: 'Critical', desc: '< 1 hr need', color: 'border-emergency-500 bg-emergency-50/80 text-emergency-900' },
              { id: 'urgent', label: 'Urgent', desc: '1-4 hr need', color: 'border-amber-500 bg-amber-50/80 text-amber-900' },
              { id: 'moderate', label: 'Moderate', desc: '1-2 day need', color: 'border-brand-500 bg-brand-50/80 text-brand-900' },
            ].map((p) => {
              const isSelected = urgency === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setUrgency(p.id as 'critical' | 'urgent' | 'moderate')}
                  className={`rounded-xl border p-2.5 text-center transition-all ${
                    isSelected ? `${p.color} ring-1 font-bold shadow-xs` : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs block">{p.label}</span>
                  <span className="text-[10px] text-slate-500 font-normal block mt-0.5">{p.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select
            label={tr('Blood Group Needed')}
            value={bloodGroup}
            onChange={setBloodGroup}
            placeholder={tr('Select group')}
            required
            options={BLOOD_GROUPS.map((bg) => ({ value: bg, label: `${bg} Blood` }))}
          />
          <Input
            label={tr('Units Needed')}
            type="number"
            value={unitsNeeded}
            onChange={setUnitsNeeded}
            min="1"
            required
          />
        </div>

        <Input
          label={tr('Notes')}
          value={notes}
          onChange={setNotes}
          placeholder="e.g. Trauma unit patient, O-negative matching"
        />

        {/* Hospital multi-select list */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
              {tr('Select Hospitals to Call')} <span className="text-emergency-500">*</span>
            </label>
            {allHospitals.length > 0 && (
              <button
                type="button"
                onClick={selectAllHospitals}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                {selectedHospitals.length === allHospitals.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>
          <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 p-2.5 bg-slate-50/50">
            {allHospitals.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-4">{tr('No other approved hospitals available.')}</p>
            ) : (
              allHospitals.map((h) => {
                const checked = selectedHospitals.includes(h.id);
                return (
                  <label
                    key={h.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg p-2.5 transition-colors ${
                      checked ? 'bg-white border border-brand-200 shadow-xs' : 'hover:bg-white'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleHospital(h.id)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{h.name}</p>
                      <p className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-0.5">
                          <MapPin className="h-3 w-3 text-slate-400" /> {h.city}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Phone className="h-3 w-3 text-slate-400" /> {h.phone}
                        </span>
                      </p>
                    </div>
                  </label>
                );
              })
            )}
          </div>
          <p className="mt-1 text-[11px] text-slate-500 font-medium">
            {selectedHospitals.length} of {allHospitals.length} {tr('hospital(s) selected')}
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-emergency-200 bg-emergency-50 p-3 text-xs text-emergency-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-3">
          <Button variant="outline" fullWidth onClick={onClose}>
            {tr('Cancel')}
          </Button>
          <Button variant="danger" fullWidth onClick={handleCreate} disabled={loading} loading={loading}>
            <PhoneCall className="h-4 w-4" /> {tr('Create & Call Hospitals')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function EmergencyRequestCard({
  emergency,
  onUpdate,
}: {
  emergency: EmergencyRequest;
  onUpdate: () => void;
}) {
  const { tr } = useLanguage();
  const [calls, setCalls] = useState<EmergencyCall[]>([]);
  const [loadingCalls, setLoadingCalls] = useState(true);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    supabase
      .from('emergency_calls')
      .select('*')
      .eq('emergency_request_id', emergency.id)
      .then(({ data }) => {
        setCalls(data || []);
        setLoadingCalls(false);
      });
  }, [emergency.id]);

  useEffect(() => {
    if (!calls.some((call) => call.call_status === 'calling' || call.call_status === 'pending' || call.call_status === 'initiated')) return;
    const refresh = window.setInterval(async () => {
      const { data } = await supabase.from('emergency_calls').select('*').eq('emergency_request_id', emergency.id);
      setCalls(data || []);
    }, 4000);
    return () => window.clearInterval(refresh);
  }, [calls, emergency.id]);

  const urgencyVariant =
    emergency.urgency === 'critical' ? 'red' : emergency.urgency === 'urgent' ? 'yellow' : 'blue';
  const statusVariant =
    emergency.status === 'active' ? 'yellow' : emergency.status === 'fulfilled' ? 'green' : 'gray';

  async function closeEmergency() {
    setClosing(true);
    await supabase.from('emergency_requests').update({ status: 'closed' }).eq('id', emergency.id);
    setClosing(false);
    onUpdate();
  }

  return (
    <Card className="p-5 sm:p-6 border-slate-200/90 hover:border-slate-300">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="red" dot>
              {emergency.blood_group} · {emergency.units_needed} {tr('units')}
            </Badge>
            <Badge variant={urgencyVariant}>{tr(emergency.urgency).toUpperCase()}</Badge>
            <Badge variant={statusVariant} dot>
              {tr(emergency.status)}
            </Badge>
          </div>
          {emergency.notes && <p className="mt-2 text-xs sm:text-sm text-slate-700">"{emergency.notes}"</p>}
          <p className="mt-1.5 text-[11px] text-slate-400">
            Broadcast initiated {new Date(emergency.created_at).toLocaleString()}
          </p>
        </div>
        {emergency.status === 'active' && (
          <Button variant="outline" size="xs" onClick={closeEmergency} disabled={closing} loading={closing}>
            {tr('Close Request')}
          </Button>
        )}
      </div>

      {/* Live Hospital Calls section */}
      <div className="mt-5 border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <PhoneCall className="h-3.5 w-3.5 text-brand-600" />
            {tr('Hospital Calls')} ({calls.length})
          </p>
          <span className="text-[11px] text-slate-400">Real-time status updates</span>
        </div>

        {loadingCalls ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : calls.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">{tr('No calls made yet.')}</p>
        ) : (
          <div className="space-y-2">
            {calls.map((call) => {
              const statusVariant: 'green' | 'yellow' | 'red' =
                call.call_status === 'answered' || call.call_status === 'completed'
                  ? 'green'
                  : call.call_status === 'pending' ||
                    call.call_status === 'calling' ||
                    call.call_status === 'initiated' ||
                    call.call_status === 'ringing'
                  ? 'yellow'
                  : 'red';

              return (
                <div
                  key={call.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 transition-colors hover:bg-slate-50 hover:border-slate-200"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 shadow-2xs">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{call.hospital_name}</p>
                      <p className="text-[11px] text-slate-500">{call.hospital_phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={statusVariant} dot>
                      {tr(call.call_status)}
                    </Badge>
                    {call.hospital_phone && (
                      <a
                        href={`tel:${call.hospital_phone}`}
                        aria-label={`Call ${call.hospital_name}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white transition-colors hover:bg-emerald-700 shadow-xs"
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

function HospitalSettings({
  hospital,
  onUpdated,
}: {
  hospital: Hospital | null;
  onUpdated: () => void;
}) {
  const { tr } = useLanguage();
  const [name, setName] = useState(hospital?.name || '');
  const [address, setAddress] = useState(hospital?.address || '');
  const [city, setCity] = useState(hospital?.city || '');
  const [phone, setPhone] = useState(hospital?.phone || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    if (!hospital) return;
    setSaving(true);
    await supabase.from('hospitals').update({ name, address, city, phone }).eq('id', hospital.id);
    setSaving(false);
    setSaved(true);
    onUpdated();
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <>
      <PageHeader title={tr('Hospital Settings')} description={tr("Manage your hospital's information.")} />
      <Card className="max-w-2xl p-6 sm:p-8">
        <div className="space-y-4">
          <Input label={tr('Hospital Name')} value={name} onChange={setName} />
          <Input
            label={tr('Phone')}
            value={phone}
            onChange={setPhone}
            placeholder={tr('Phone number for emergency calls')}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label={tr('City')} value={city} onChange={setCity} />
            <Input label={tr('Address')} value={address} onChange={setAddress} />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving} loading={saving}>
              {tr('Save Changes')}
            </Button>
            {saved && (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> {tr('Saved successfully!')}
              </span>
            )}
          </div>
        </div>
      </Card>
      <TwilioAlertsConfig />
    </>
  );
}


function TwilioAlertsConfig() {
  const [testing, setTesting] = useState(false);
  const [testMode, setTestMode] = useState<'call' | 'sms'>('call');
  const [toNumber, setToNumber] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  async function handleSendTest(mode: 'call' | 'sms') {
    setTesting(true);
    setTestMode(mode);
    setTestResult(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/emergency-call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ testTwilio: true, mode, toNumber: toNumber.trim() || undefined }),
      });
      const res = await response.json().catch(() => ({}));
      if (response.ok && res.success) {
        setTestResult({
          success: true,
          message: res.message || (mode === 'call' ? 'Voice Call initiated! Check your phone.' : 'Test SMS sent! Check your phone.'),
        });
      } else {
        setTestResult({
          success: false,
          message:
            res.error ||
            'Twilio test failed. On Twilio free trial accounts, recipient numbers must be added to "Verified Caller IDs" in your Twilio Console.',
        });
      }
    } catch {
      setTestResult({
        success: false,
        message: 'Could not connect to Edge Function. Verify Supabase functions are deployed.',
      });
    } finally {
      setTesting(false);
    }
  }

  return (
    <Card className="mt-6 max-w-2xl p-6 sm:p-8">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-500 font-bold text-white text-[11px] shadow-xs">
            TW
          </span>
          <h3 className="text-base font-bold text-slate-900">Twilio Automated Voice Call Dispatch</h3>
          <Badge variant="green" dot>
            Free Trial
          </Badge>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Automatically dial hospital phone numbers and deliver spoken voice alerts during blood emergencies. Uses Twilio free trial credits — direct API call from Edge Function (100% free, no paid Supabase connectors).
        </p>
      </div>

      {/* Setup instructions */}
      <div className="mb-4 rounded-xl border border-red-100 bg-red-50/80 p-4 text-xs text-red-950 space-y-2">
        <p className="font-bold text-red-900">How to set up Twilio Voice Calls (Free Trial):</p>
        <ol className="list-decimal list-inside space-y-1.5 text-red-800 leading-relaxed">
          <li>
            Go to <b>twilio.com</b> and create a free trial account — includes <b>~$15.50 free trial credit</b>.
          </li>
          <li>
            In your Twilio Console, copy your <b>Account SID</b> and <b>Auth Token</b>.
          </li>
          <li>
            Get a free Twilio phone number (e.g. <code className="rounded bg-white/90 px-1 py-0.5 font-mono text-red-950">+1XXXXXXXXXX</code>).
          </li>
          <li>
            <b>Crucial for Free Trial:</b> Go to <b>Twilio Console → Phone Numbers → Verified Caller IDs</b> and add your personal phone number (e.g. <code className="rounded bg-white/90 px-1 py-0.5 font-mono text-red-950">+91XXXXXXXXXX</code>).
          </li>
          <li>
            In <b>Supabase → Project Settings → Edge Functions → Secrets</b>, set:
            <ul className="mt-1 ml-4 space-y-0.5 list-disc">
              <li><code className="rounded bg-white/90 px-1 py-0.5 font-mono text-red-950">TWILIO_ACCOUNT_SID</code></li>
              <li><code className="rounded bg-white/90 px-1 py-0.5 font-mono text-red-950">TWILIO_AUTH_TOKEN</code></li>
              <li><code className="rounded bg-white/90 px-1 py-0.5 font-mono text-red-950">TWILIO_FROM_NUMBER</code> (your Twilio number)</li>
              <li><code className="rounded bg-white/90 px-1 py-0.5 font-mono text-red-950">TWILIO_TEST_TO_NUMBER</code> (your verified phone number for test calls)</li>
            </ul>
          </li>
        </ol>
      </div>

      {/* Test input + buttons */}
      <div className="flex flex-col gap-3">
        <Input
          label="Test Phone Number"
          value={toNumber}
          onChange={setToNumber}
          placeholder="+91XXXXXXXXXX (leave blank to use TWILIO_TEST_TO_NUMBER secret)"
        />
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={() => handleSendTest('call')}
            disabled={testing}
            loading={testing && testMode === 'call'}
          >
            <PhoneCall className="h-3.5 w-3.5 mr-1" /> Make Test Voice Call
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSendTest('sms')}
            disabled={testing}
            loading={testing && testMode === 'sms'}
          >
            <MessageSquare className="h-3.5 w-3.5 text-red-600 mr-1" /> Send Test SMS
          </Button>
        </div>
      </div>

      {testResult && (
        <div
          className={cn(
            'mt-3 rounded-xl p-3 text-xs flex items-start gap-2',
            testResult.success
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border border-red-200 bg-red-50 text-red-800',
          )}
        >
          {testResult.success ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          )}
          <span>{testResult.message}</span>
        </div>
      )}
    </Card>
  );
}
