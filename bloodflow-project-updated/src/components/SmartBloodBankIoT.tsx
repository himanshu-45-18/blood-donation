import { useState, useEffect, useCallback } from 'react';
import {
  Cpu,
  Radio,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Activity,
  RefreshCw,
  Clock,
  Play,
  Pause,
  Sliders,
  Database,
  Search,
  Check,
  Zap,
  Info,
  Layers,
  Code2,
  PhoneCall,
  Flame,
  ShieldAlert,
  Plus,
} from 'lucide-react';
import { Card, Badge, Button, Input, Select, Modal, EmptyState } from '@/components/ui';
import {
  supabase,
  BLOOD_GROUPS,
  type StorageUnit,
  type IoTDevice,
  type RFIDBloodUnit,
  type RFIDEvent,
  type IoTAlert,
  type Hospital,
  type EmergencyEvent,
} from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/i18n';

type IoTSubTab = 'overview' | 'devices' | 'rfid' | 'inventory' | 'alerts' | 'logs';

interface SmartBloodBankIoTProps {
  hospital: Hospital | null;
}

export function SmartBloodBankIoT({ hospital }: SmartBloodBankIoTProps) {
  const { profile } = useAuth();
  const { tr } = useLanguage();
  const [subTab, setSubTab] = useState<IoTSubTab>('overview');

  // Core IoT State (Reads from Supabase)
  const [storageUnits, setStorageUnits] = useState<StorageUnit[]>([]);
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [bloodUnits, setBloodUnits] = useState<RFIDBloodUnit[]>([]);
  const [rfidEvents, setRfidEvents] = useState<RFIDEvent[]>([]);
  const [alerts, setAlerts] = useState<IoTAlert[]>([]);

  // Register Blood Bag Modal State
  const [showRegisterBagModal, setShowRegisterBagModal] = useState(false);
  const [registerRfidUid, setRegisterRfidUid] = useState('');
  const [registerBloodGroup, setRegisterBloodGroup] = useState('O+');
  const [registerUnitCode, setRegisterUnitCode] = useState('');
  const [registerStorageId, setRegisterStorageId] = useState('');
  const [registerVolume, setRegisterVolume] = useState('350');
  const [registerExpiryDate, setRegisterExpiryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 35);
    return d.toISOString().split('T')[0];
  });
  const [savingBag, setSavingBag] = useState(false);
  const [bagSaveError, setBagSaveError] = useState<string | null>(null);

  function openRegisterModal(prefillUid?: string) {
    const uid = prefillUid || (rfidEvents.find(e => !bloodUnits.some(b => b.rfid_uid === e.rfid_uid))?.rfid_uid || '');
    setRegisterRfidUid(uid);
    setRegisterBloodGroup('O+');
    setRegisterUnitCode(`BU-${Math.floor(1000 + Math.random() * 9000)}`);
    setRegisterStorageId(storageUnits[0]?.id || '');
    setRegisterVolume('350');
    const d = new Date();
    d.setDate(d.getDate() + 35);
    setRegisterExpiryDate(d.toISOString().split('T')[0]);
    setBagSaveError(null);
    setShowRegisterBagModal(true);
  }

  async function handleSaveBloodBag() {
    if (!registerRfidUid.trim()) {
      setBagSaveError('RFID UID is required. Please scan or enter a tag UID.');
      return;
    }
    if (!registerUnitCode.trim()) {
      setBagSaveError('Blood Unit Code is required.');
      return;
    }

    setSavingBag(true);
    setBagSaveError(null);

    try {
      const { data, error } = await supabase.from('blood_units').insert({
        blood_unit_code: registerUnitCode.trim().toUpperCase(),
        rfid_uid: registerRfidUid.trim().toUpperCase(),
        blood_group: registerBloodGroup,
        storage_unit_id: registerStorageId || storageUnits[0]?.id || null,
        hospital_id: hospital?.id || null,
        status: 'AVAILABLE',
        volume_ml: parseInt(registerVolume, 10) || 350,
        expiry_date: registerExpiryDate,
        last_scanned_at: new Date().toISOString(),
      }).select().single();

      if (error) {
        throw error;
      }

      // Also update any previous rfid_events with this UID to link unit_code and group
      await supabase
        .from('rfid_events')
        .update({
          blood_unit_id: data.id,
          blood_unit_code: data.blood_unit_code,
          blood_group: data.blood_group,
          result: 'SUCCESS',
        })
        .ilike('rfid_uid', registerRfidUid.trim());

      setShowRegisterBagModal(false);
      await fetchSupabaseIoTData();
    } catch (err) {
      setBagSaveError(err instanceof Error ? err.message : 'Failed to register blood unit');
    } finally {
      setSavingBag(false);
    }
  }

  // Fire & Emergency Alert IoT State
  const [latestEmergencyEvent, setLatestEmergencyEvent] = useState<EmergencyEvent | null>(null);
  const [showEmergencyConfirmModal, setShowEmergencyConfirmModal] = useState(false);
  const [triggeringEmergency, setTriggeringEmergency] = useState(false);
  const [emergencyCallStatus, setEmergencyCallStatus] = useState<'Ready' | 'Calling...' | 'Call Initiated' | 'Call Failed'>('Ready');
  const [emergencyErrorMessage, setEmergencyErrorMessage] = useState<string | null>(null);
  const [fireCallToPhone, setFireCallToPhone] = useState<string>(() => {
    return localStorage.getItem('BLOODFLOW_FIRE_CALL_TO') || import.meta.env.VITE_FIRE_CALL_TO || '';
  });
  const [showPhoneSettingsModal, setShowPhoneSettingsModal] = useState(false);

  const [selectedDeviceModal, setSelectedDeviceModal] = useState<IoTDevice | null>(null);
  const [showHardwareGuideModal, setShowHardwareGuideModal] = useState(false);
  const [hardwareGuideTab, setHardwareGuideTab] = useState<'esp8266' | 'picow' | 'raspberrypi'>('esp8266');

  // Filters for RFID Activity
  const [rfidFilterAction, setRfidFilterAction] = useState<string>('ALL');
  const [rfidSearchQuery, setRfidSearchQuery] = useState('');

  // Fetch real data from Supabase
  const fetchSupabaseIoTData = useCallback(async () => {
    try {
      const [unitsRes, devRes, bloodRes, rfidRes, alertRes, emergencyRes] = await Promise.all([
        supabase.from('storage_units').select('*').order('storage_code'),
        supabase.from('iot_devices').select('*').order('device_id'),
        supabase.from('blood_units').select('*').order('created_at', { ascending: false }),
        supabase.from('rfid_events').select('*').order('scanned_at', { ascending: false }),
        supabase.from('iot_alerts').select('*').order('created_at', { ascending: false }),
        supabase.from('emergency_events').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ]);

      if (unitsRes.data) setStorageUnits(unitsRes.data);
      if (devRes.data) setDevices(devRes.data);
      if (bloodRes.data) setBloodUnits(bloodRes.data);
      if (rfidRes.data) setRfidEvents(rfidRes.data);
      if (alertRes.data) setAlerts(alertRes.data);
      if (emergencyRes.data) {
        const ev = emergencyRes.data as EmergencyEvent;
        setLatestEmergencyEvent(ev);
        if (ev.status === 'CALL_INITIATED') {
          setEmergencyCallStatus('Call Initiated');
        } else if (ev.status === 'CALL_FAILED') {
          setEmergencyCallStatus('Call Failed');
          setEmergencyErrorMessage(ev.error_message || 'Call failed');
        }
      }
    } catch (err) {
      console.error('Error fetching Supabase IoT data:', err);
    }
  }, []);

  useEffect(() => {
    fetchSupabaseIoTData();

    // Supabase Realtime Channels for IoT tables & Emergency Events
    const channel = supabase
      .channel('bloodflow-iot-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'storage_units' }, fetchSupabaseIoTData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'iot_devices' }, fetchSupabaseIoTData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blood_units' }, fetchSupabaseIoTData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rfid_events' }, fetchSupabaseIoTData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'iot_alerts' }, fetchSupabaseIoTData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_events' }, (payload) => {
        fetchSupabaseIoTData();
        if (payload.new) {
          const ev = payload.new as EmergencyEvent;
          setLatestEmergencyEvent(ev);
          if (ev.status === 'CALL_INITIATED') {
            setEmergencyCallStatus('Call Initiated');
          } else if (ev.status === 'CALL_FAILED') {
            setEmergencyCallStatus('Call Failed');
            setEmergencyErrorMessage(ev.error_message || 'Call failed');
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSupabaseIoTData]);

  async function handleTriggerEmergency() {
    setShowEmergencyConfirmModal(false);
    setTriggeringEmergency(true);
    setEmergencyCallStatus('Calling...');
    setEmergencyErrorMessage(null);

    try {
      // Dispatch automated Twilio emergency call via Edge Function
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const targetPhone = fireCallToPhone.trim() || localStorage.getItem('BLOODFLOW_FIRE_CALL_TO') || import.meta.env.VITE_FIRE_CALL_TO || '';

      const callPayload: Record<string, unknown> = {
        testTwilio: true,
        mode: 'call',
        action: 'fire_emergency',
        device_id: 'BLOOD-BANK-01',
        source: 'web_button',
        emergency_type: 'FIRE',
        message: 'Fire emergency button activated from Doctor Dashboard Web UI',
      };

      if (targetPhone) {
        callPayload.toNumber = targetPhone;
        callPayload.toPhone = targetPhone;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/emergency-call?action=fire_emergency`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(callPayload),
      });

      const res = await response.json().catch(() => ({}));

      if (response.status === 429 || res.cooldown) {
        setEmergencyCallStatus('Call Initiated');
        setEmergencyErrorMessage('Emergency call already triggered. Please wait a few seconds before triggering another call.');
      } else if (response.ok && (res.success || res.status === 'CALL_INITIATED')) {
        setEmergencyCallStatus('Call Initiated');
        if (res.event) {
          setLatestEmergencyEvent(res.event as EmergencyEvent);
        }
      } else {
        const errorMsg = res.error || 'Emergency call dispatch failed. Check Twilio configuration.';
        setEmergencyCallStatus('Call Failed');
        setEmergencyErrorMessage(errorMsg);
      }
    } catch (err) {
      setEmergencyCallStatus('Call Failed');
      setEmergencyErrorMessage(err instanceof Error ? err.message : 'Network error');
    } finally {
      setTriggeringEmergency(false);
    }
  }

  function handleResetEmergencyAlert() {
    setLatestEmergencyEvent(null);
    setEmergencyCallStatus('Ready');
    setEmergencyErrorMessage(null);
  }

  async function acknowledgeAlert(alertId: string) {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId ? { ...a, acknowledged: true, acknowledged_at: new Date().toISOString() } : a
      )
    );
    try {
      await supabase.from('iot_alerts').update({ acknowledged: true, acknowledged_at: new Date().toISOString() }).eq('id', alertId);
    } catch {
      // ignore
    }
  }

  // Summary Metrics calculations
  const onlineUnitsCount = storageUnits.filter((u) => u.status !== 'offline').length;
  const offlineUnitsCount = storageUnits.filter((u) => u.status === 'offline').length;
  const availableBloodUnitsCount = bloodUnits.filter((b) => b.status === 'AVAILABLE').length;

  const unitsEnteredToday = rfidEvents.filter(
    (e) => e.action === 'ENTERED' && new Date(e.scanned_at).toDateString() === new Date().toDateString()
  ).length;

  const unitsDispatchedToday = rfidEvents.filter(
    (e) => e.action === 'DISPATCHED' && new Date(e.scanned_at).toDateString() === new Date().toDateString()
  ).length;

  const unacknowledgedAlertsCount = alerts.filter((a) => !a.acknowledged).length;

  // Group inventory breakdown
  const inventoryByGroup = BLOOD_GROUPS.map((group) => {
    const count = bloodUnits.filter((bu) => bu.blood_group === group && bu.status === 'AVAILABLE').length;
    return { group, count };
  });

  const isEmergencyActive = !!(
    latestEmergencyEvent &&
    (Date.now() - new Date(latestEmergencyEvent.created_at).getTime()) < 5 * 60 * 1000 &&
    latestEmergencyEvent.status !== 'CALL_FAILED'
  );

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Smart Blood Bank IoT</h2>
            <Badge variant="red" dot>
              NodeMCU ESP8266 (RC522 + Alert)
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time RFID blood unit tracking &amp; emergency alert system.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Hardware Guide Button */}
          <Button size="xs" variant="primary" onClick={() => setShowHardwareGuideModal(true)}>
            <Code2 className="h-3.5 w-3.5 mr-1" /> Hardware Setup Guide
          </Button>
        </div>
      </div>

      {/* IoT Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 overflow-x-auto pb-1">
        {[
          { id: 'overview', label: 'Overview', icon: <Layers className="h-4 w-4" /> },
          { id: 'devices', label: 'IoT Devices', icon: <Radio className="h-4 w-4" /> },
          { id: 'rfid', label: 'RFID Units', icon: <Cpu className="h-4 w-4" /> },
          { id: 'logs', label: 'Scan Logs', icon: <Activity className="h-4 w-4" /> },
          { id: 'inventory', label: 'Stock Breakdown', icon: <Database className="h-4 w-4" /> },
          {
            id: 'alerts',
            label: 'IoT Alerts',
            icon: <AlertTriangle className="h-4 w-4" />,
            badgeCount: unacknowledgedAlertsCount,
          },
        ].map((tab) => {
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id as IoTSubTab)}
              className={cn(
                'flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap select-none',
                isActive
                  ? 'border-red-600 text-red-600 bg-red-50/60 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                <span className="h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-bold">
                  {tab.badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 1. OVERVIEW TAB */}
      {subTab === 'overview' && (
        <div className="space-y-6">
          {/* 🚨 FIRE & EMERGENCY ALERT IOT CARD */}
          <Card className={cn("p-6 transition-all border-2", isEmergencyActive ? "bg-red-50/80 border-red-500 shadow-lg shadow-red-500/10" : "bg-white border-slate-200")}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className={cn("p-3 rounded-2xl", isEmergencyActive ? "bg-red-600 text-white animate-bounce" : "bg-red-100 text-red-600")}>
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    🚨 Fire &amp; Emergency Alert
                  </h3>
                  <p className="text-xs text-slate-500">
                    Hardware push button &amp; web trigger linked to automated Twilio emergency calling.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setShowPhoneSettingsModal(true)}
                  className="text-[11px] h-7 px-2.5 font-mono"
                  title="Configure target recipient phone number"
                >
                  <Sliders className="h-3 w-3 mr-1 text-slate-500" />
                  {fireCallToPhone ? fireCallToPhone : 'Set Target Phone'}
                </Button>
                {isEmergencyActive && (
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={handleResetEmergencyAlert}
                    className="text-[11px] h-7 px-2 font-semibold text-slate-600 hover:text-slate-900"
                    title="Clear emergency alert and reset status to normal"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" /> Reset Alert
                  </Button>
                )}
                <span className="text-xs text-slate-500 font-semibold">Status:</span>
                {isEmergencyActive ? (
                  <Badge variant="red" dot className="px-3 py-1 text-xs font-black animate-pulse">
                    🔴 EMERGENCY ACTIVE
                  </Badge>
                ) : (
                  <Badge variant="green" dot className="px-3 py-1 text-xs font-bold">
                    🟢 NORMAL
                  </Badge>
                )}
              </div>
            </div>

            {isEmergencyActive && latestEmergencyEvent ? (
              <div className="bg-red-600 text-white rounded-2xl p-5 mb-5 space-y-3 shadow-md animate-fade-in">
                <div className="flex items-center justify-between border-b border-red-500/80 pb-2">
                  <div className="flex items-center gap-2 text-base font-extrabold tracking-wide">
                    <Zap className="h-5 w-5 text-amber-300 animate-pulse" />
                    <span>🔥 FIRE / EMERGENCY DETECTED</span>
                  </div>
                  <span className="text-xs bg-red-800/80 text-red-100 px-2.5 py-1 rounded-lg font-mono">
                    {new Date(latestEmergencyEvent.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-red-200 block text-[10px] uppercase tracking-wider font-semibold">Source</span>
                    <span className="font-bold text-white text-sm">
                      {latestEmergencyEvent.source === 'hardware_button' ? '🔘 Hardware Button' : '💻 Web Button'}
                    </span>
                  </div>
                  <div>
                    <span className="text-red-200 block text-[10px] uppercase tracking-wider font-semibold">Device</span>
                    <span className="font-bold text-white text-sm">{latestEmergencyEvent.device_id || 'BLOOD-BANK-01'}</span>
                  </div>
                  <div>
                    <span className="text-red-200 block text-[10px] uppercase tracking-wider font-semibold">Call Status</span>
                    <span className="font-bold text-white text-sm flex items-center gap-1.5">
                      <PhoneCall className="h-3.5 w-3.5 animate-pulse" />
                      {emergencyCallStatus === 'Calling...' ? 'Calling emergency contact...' : emergencyCallStatus}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Controls & Last Event Strip */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-xs text-slate-600 text-center sm:text-left w-full sm:w-auto">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="font-medium text-slate-500">Last Event:</span>
                  <span className="font-semibold text-slate-800">
                    {latestEmergencyEvent ? `${latestEmergencyEvent.emergency_type} (${latestEmergencyEvent.source === 'hardware_button' ? 'Hardware Button' : 'Web Button'})` : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="font-medium text-slate-500">Call Status:</span>
                  <span className={cn(
                    "font-bold px-2 py-0.5 rounded text-[11px]",
                    emergencyCallStatus === 'Call Initiated' ? "bg-emerald-100 text-emerald-800" :
                    emergencyCallStatus === 'Call Failed' ? "bg-red-100 text-red-800" :
                    "bg-slate-100 text-slate-700"
                  )}>
                    {emergencyCallStatus}
                  </span>
                </div>
              </div>

              <Button
                variant="danger"
                size="lg"
                disabled={triggeringEmergency}
                onClick={() => setShowEmergencyConfirmModal(true)}
                className="w-full sm:w-auto font-extrabold text-sm py-3 px-6 shadow-md hover:shadow-lg transition-all"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                {triggeringEmergency ? 'Calling...' : '🚨 TRIGGER EMERGENCY'}
              </Button>
            </div>

            {emergencyErrorMessage && (
              <div className="mt-3 p-3 bg-red-100/90 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
                <XCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{emergencyErrorMessage}</span>
              </div>
            )}
          </Card>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Storage Units */}
            <Card className="p-5 border-l-4 border-l-red-600">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Storage Units</span>
                <div className="p-2 rounded-xl bg-red-50 text-red-600">
                  <Database className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">{storageUnits.length}</span>
                <span className="text-xs text-slate-500">Total Units</span>
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs border-t border-slate-100 pt-2.5">
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> {onlineUnitsCount} Online
                </span>
                <span className="text-slate-400">|</span>
                <span className="text-slate-500 font-bold flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-slate-400" /> {offlineUnitsCount} Offline
                </span>
              </div>
            </Card>

            {/* IoT Device Status */}
            <Card className="p-5 border-l-4 border-l-blue-500">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">IoT Controllers</span>
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Radio className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">{devices.length}</span>
                <span className="text-xs text-slate-500">Active Devices</span>
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs border-t border-slate-100 pt-2.5">
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> {devices.filter((d) => d.status === 'online').length} Online
                </span>
                <span className="text-slate-400">|</span>
                <span className="text-slate-500 font-bold flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-slate-400" /> {devices.filter((d) => d.status !== 'online').length} Offline
                </span>
              </div>
            </Card>

            {/* Blood Inventory Summary */}
            <Card className="p-5 border-l-4 border-l-cyan-500">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">RFID Blood Units</span>
                <div className="p-2 rounded-xl bg-cyan-50 text-cyan-600">
                  <Cpu className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">{availableBloodUnitsCount}</span>
                <span className="text-xs text-slate-500">Available Bags</span>
              </div>
              <div className="mt-3 text-xs text-slate-500 border-t border-slate-100 pt-2.5 truncate">
                Tracked across {storageUnits.length} Storage Units
              </div>
            </Card>

            {/* RFID Activity Summary */}
            <Card className="p-5 border-l-4 border-l-purple-500">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">RFID Activity Today</span>
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <Activity className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-purple-600">{unitsEnteredToday + unitsDispatchedToday}</span>
                <span className="text-xs text-slate-500">Scans Today</span>
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs border-t border-slate-100 pt-2.5">
                <span className="text-emerald-600 font-bold">+{unitsEnteredToday} Entered</span>
                <span className="text-slate-400">|</span>
                <span className="text-amber-600 font-bold">-{unitsDispatchedToday} Dispatched</span>
              </div>
            </Card>
          </div>

          {/* Quick Storage Status Cards & Active Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Storage Units Status Column */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Storage Units & Hardware Allocation</h3>
                <span className="text-xs text-slate-500">{storageUnits.length} Monitored Units</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {storageUnits.map((unit) => {
                  const isOffline = unit.status === 'offline';
                  const unitBags = bloodUnits.filter((b) => b.storage_unit_id === unit.id && b.status === 'AVAILABLE').length;

                  return (
                    <Card key={unit.id} className="p-5 hover:border-slate-300 transition-all">
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge variant="gray" className="font-mono text-[10px]">
                            {unit.storage_code}
                          </Badge>
                          <h4 className="text-sm font-bold text-slate-900 mt-1">{unit.name}</h4>
                          <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{unit.location}</p>
                        </div>

                        {isOffline ? (
                          <Badge variant="gray" dot>
                            OFFLINE
                          </Badge>
                        ) : (
                          <Badge variant="green" dot>
                            ACTIVE
                          </Badge>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                        <div>
                          <span className="text-2xl font-black text-slate-900">{unitBags}</span>
                          <span className="text-[10px] text-slate-400 block">Units Stored</span>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold text-slate-700 block">
                            {isOffline ? 'Disconnected' : 'NodeMCU Linked'}
                          </span>
                          <span className="text-[10px] text-slate-400">RFID Scanner Ready</span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Unacknowledged Alerts Column */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Recent Alerts</h3>
                <button onClick={() => setSubTab('alerts')} className="text-xs font-bold text-red-600 hover:underline">
                  View All ({alerts.length})
                </button>
              </div>

              <div className="space-y-3">
                {alerts.slice(0, 3).map((alert) => (
                  <Card
                    key={alert.id}
                    className={cn(
                      'p-4 border-l-4 transition-all',
                      alert.severity === 'CRITICAL' && 'border-l-red-600 bg-red-50/40',
                      alert.severity === 'WARNING' && 'border-l-amber-500 bg-amber-50/40',
                      alert.severity === 'INFO' && 'border-l-blue-500 bg-blue-50/40'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle
                          className={cn(
                            'h-4 w-4 shrink-0',
                            alert.severity === 'CRITICAL' && 'text-red-600',
                            alert.severity === 'WARNING' && 'text-amber-600',
                            alert.severity === 'INFO' && 'text-blue-600'
                          )}
                        />
                        <span className="text-xs font-bold uppercase tracking-wider">{alert.severity}</span>
                      </div>
                      {!alert.acknowledged && (
                        <button
                          onClick={() => acknowledgeAlert(alert.id)}
                          className="text-[10px] font-bold text-slate-600 hover:text-slate-900 underline"
                        >
                          Acknowledge
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 font-medium mt-1.5 leading-snug">{alert.message}</p>
                    <span className="text-[10px] text-slate-400 mt-2 block">
                      {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. IOT DEVICES TAB */}
      {subTab === 'devices' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">📡 IoT Hardware Controllers</h3>
              <p className="text-xs text-slate-500">Connected Microcontrollers &amp; Hardware Status</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {devices.map((dev) => (
              <Card key={dev.id} className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="blue" className="font-mono">
                    {dev.device_id}
                  </Badge>
                  <Badge variant={dev.status === 'online' ? 'green' : 'gray'} dot>
                    {dev.status.toUpperCase()}
                  </Badge>
                </div>

                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Storage Unit:</span>
                    <span className="font-bold text-slate-800">
                      {storageUnits.find((u) => u.id === dev.storage_unit_id)?.storage_code || 'Unassigned'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Wi-Fi Status:</span>
                    <span className="font-medium text-slate-800 capitalize">{dev.wifi_status}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Firmware:</span>
                    <span className="font-mono text-slate-700">{dev.firmware_version}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Last Seen:</span>
                    <span className="font-semibold text-slate-800">
                      {new Date(dev.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <Button
                  size="xs"
                  variant="outline"
                  fullWidth
                  onClick={() => setSelectedDeviceModal(dev)}
                  className="mt-4"
                >
                  View Details
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 4. RFID BLOOD UNITS TAB */}
      {subTab === 'rfid' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900">🏷️ {tr('RFID Blood Unit Tracking')}</h3>
              <p className="text-xs text-slate-500">Tracked RFID Bags &amp; Storage Assignment</p>
            </div>

            <Button size="sm" variant="primary" onClick={() => openRegisterModal()}>
              <Plus className="h-4 w-4 mr-1.5" /> {tr('Register Blood Bag')}
            </Button>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3.5">Blood Unit ID</th>
                    <th className="p-3.5">RFID UID</th>
                    <th className="p-3.5">Blood Group</th>
                    <th className="p-3.5">Storage Code</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Expiry Date</th>
                    <th className="p-3.5">Last Scanned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bloodUnits.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No blood bags registered yet. Scan an RFID tag on your hardware or click <strong>Register Blood Bag</strong> to add one.
                      </td>
                    </tr>
                  ) : (
                    bloodUnits.map((unit) => (
                      <tr key={unit.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900">{unit.blood_unit_code}</td>
                        <td className="p-3.5 font-mono text-xs text-blue-600 font-semibold">{unit.rfid_uid}</td>
                        <td className="p-3.5">
                          <Badge variant="red">{unit.blood_group}</Badge>
                        </td>
                        <td className="p-3.5 font-mono text-slate-700">
                          {storageUnits.find((u) => u.id === unit.storage_unit_id)?.storage_code || 'ST001'}
                        </td>
                        <td className="p-3.5">
                          <Badge
                            variant={
                              unit.status === 'AVAILABLE'
                                ? 'green'
                                : unit.status === 'DISPATCHED'
                                ? 'yellow'
                                : 'blue'
                            }
                          >
                            {unit.status}
                          </Badge>
                        </td>
                        <td className="p-3.5 text-slate-600">{unit.expiry_date}</td>
                        <td className="p-3.5 text-slate-500">
                          {unit.last_scanned_at ? new Date(unit.last_scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* 5. RFID ACTIVITY LOGS TAB */}
      {subTab === 'logs' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900">📋 {tr('Scan Logs')}</h3>
              <p className="text-xs text-slate-500">Real-time scan entries &amp; hardware dispatches</p>
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={rfidFilterAction}
                onChange={setRfidFilterAction}
                options={[
                  { value: 'ALL', label: tr('All Actions') },
                  { value: 'ENTERED', label: 'ENTERED' },
                  { value: 'DISPATCHED', label: 'DISPATCHED' },
                ]}
                className="w-36 text-xs"
              />
            </div>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3.5">Time</th>
                    <th className="p-3.5">RFID UID</th>
                    <th className="p-3.5">Unit Code</th>
                    <th className="p-3.5">Group</th>
                    <th className="p-3.5">Storage</th>
                    <th className="p-3.5">Action</th>
                    <th className="p-3.5">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rfidEvents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No scan activity recorded yet. Swipe an RFID card on your ESP8266 scanner to view live logs!
                      </td>
                    </tr>
                  ) : (
                    rfidEvents
                      .filter((evt) => rfidFilterAction === 'ALL' || evt.action === rfidFilterAction)
                      .map((evt) => {
                        const matchedBag = bloodUnits.find((b) => b.rfid_uid.toLowerCase() === evt.rfid_uid.toLowerCase());
                        const unitCode = evt.blood_unit_code && evt.blood_unit_code !== 'UNKNOWN' ? evt.blood_unit_code : matchedBag?.blood_unit_code;
                        const bloodGroup = evt.blood_group && evt.blood_group !== 'N/A' ? evt.blood_group : matchedBag?.blood_group;

                        return (
                          <tr key={evt.id} className="hover:bg-slate-50">
                            <td className="p-3.5 font-mono text-slate-500">
                              {new Date(evt.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </td>
                            <td className="p-3.5 font-mono font-bold text-blue-600">{evt.rfid_uid}</td>
                            <td className="p-3.5 font-bold text-slate-900">
                              {unitCode ? (
                                <span>{unitCode}</span>
                              ) : (
                                <Button
                                  size="xs"
                                  variant="outline"
                                  onClick={() => openRegisterModal(evt.rfid_uid)}
                                  className="text-[10px] h-6 px-2 text-red-600 border-red-200 hover:bg-red-50 inline-flex items-center"
                                >
                                  <Plus className="h-3 w-3 mr-1" /> {tr('Tag as Blood Bag')}
                                </Button>
                              )}
                            </td>
                            <td className="p-3.5">
                              {bloodGroup ? (
                                <Badge variant="red">{bloodGroup}</Badge>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">Unregistered Tag</span>
                              )}
                            </td>
                            <td className="p-3.5 font-mono text-slate-700">
                              {storageUnits.find((u) => u.id === evt.storage_unit_id)?.storage_code || 'ST001'}
                            </td>
                            <td className="p-3.5">
                              <Badge variant={evt.action === 'ENTERED' ? 'green' : 'yellow'}>{evt.action}</Badge>
                            </td>
                            <td className="p-3.5">
                              <Badge variant={evt.result === 'SUCCESS' ? 'green' : 'red'}>{evt.result}</Badge>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* 6. BLOOD INVENTORY BREAKDOWN TAB */}
      {subTab === 'inventory' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">🩸 RFID Blood Stock Inventory</h3>
            <p className="text-xs text-slate-500">Breakdown of available units by blood group</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {inventoryByGroup.map((item) => (
              <Card key={item.group} className="p-5 text-center">
                <span className="text-lg font-black text-red-600">{item.group}</span>
                <div className="mt-2 text-3xl font-black text-slate-900">{item.count}</div>
                <span className="text-xs text-slate-500 mt-1 block">Units Available</span>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 7. ALERTS TAB */}
      {subTab === 'alerts' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">🚨 IoT Alerts &amp; Notifications</h3>
            <p className="text-xs text-slate-500">System warnings, temperature breaches &amp; offline devices</p>
          </div>

          <div className="space-y-3">
            {alerts.map((alert) => (
              <Card
                key={alert.id}
                className={cn(
                  'p-4 border-l-4 flex items-center justify-between gap-4',
                  alert.severity === 'CRITICAL' && 'border-l-red-600 bg-red-50/40',
                  alert.severity === 'WARNING' && 'border-l-amber-500 bg-amber-50/40',
                  alert.severity === 'INFO' && 'border-l-blue-500 bg-blue-50/40'
                )}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant={alert.severity === 'CRITICAL' ? 'red' : 'yellow'}>{alert.severity}</Badge>
                    <span className="text-xs font-mono text-slate-500">
                      {new Date(alert.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 mt-1.5">{alert.message}</p>
                </div>

                {!alert.acknowledged ? (
                  <Button size="xs" variant="outline" onClick={() => acknowledgeAlert(alert.id)}>
                    Mark Acknowledged
                  </Button>
                ) : (
                  <Badge variant="green">Acknowledged</Badge>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Physical Hardware Setup Guide */}
      {showHardwareGuideModal && (
        <Modal
          open
          onClose={() => setShowHardwareGuideModal(false)}
          title="Hardware Setup & Wiring Guide"
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
            {/* Board Selector Tabs */}
            <div className="flex border-b border-slate-200 gap-1 pb-1">
              <button
                type="button"
                onClick={() => setHardwareGuideTab('esp8266')}
                className={cn(
                  "px-3 py-1.5 font-bold rounded-lg text-xs transition-all",
                  hardwareGuideTab === 'esp8266'
                    ? "bg-red-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                ⚡ NodeMCU ESP8266 (Primary)
              </button>
              <button
                type="button"
                onClick={() => setHardwareGuideTab('picow')}
                className={cn(
                  "px-3 py-1.5 font-bold rounded-lg text-xs transition-all",
                  hardwareGuideTab === 'picow'
                    ? "bg-red-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                🍓 Raspberry Pi Pico 2W
              </button>
              <button
                type="button"
                onClick={() => setHardwareGuideTab('raspberrypi')}
                className={cn(
                  "px-3 py-1.5 font-bold rounded-lg text-xs transition-all",
                  hardwareGuideTab === 'raspberrypi'
                    ? "bg-red-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                🖥️ Raspberry Pi 3/4/5 (Python)
              </button>
            </div>

            {/* TAB 1: RASPBERRY PI PICO 2W */}
            {hardwareGuideTab === 'picow' && (
              <div className="space-y-3">
                <div className="rounded-xl bg-red-50 p-3 border border-red-200">
                  <h4 className="font-bold text-red-900 text-sm">🍓 Raspberry Pi Pico 2W (Arduino C++)</h4>
                  <p className="text-red-700 mt-1">
                    Uses file <code className="font-mono bg-red-100 px-1 py-0.5 rounded text-red-900 font-bold">BloodFlow_PicoW2_All_Hardware.ino</code>. Fast dual-core RP2350 microcontroller with built-in Wi-Fi and native internal pull-ups!
                  </p>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 font-bold text-slate-700">
                      <tr>
                        <th className="p-2">Module</th>
                        <th className="p-2">Module Pin</th>
                        <th className="p-2">Pico 2W GPIO</th>
                        <th className="p-2">Pico Pin #</th>
                        <th className="p-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      <tr>
                        <td className="p-2 font-bold" rowSpan={7}>RC522 RFID (SPI1)</td>
                        <td className="p-2">VCC</td>
                        <td className="p-2 font-mono text-red-600 font-bold">3V3 (OUT)</td>
                        <td className="p-2 font-mono">Pin 36</td>
                        <td className="p-2 text-red-600 font-bold">⚠️ 3.3V ONLY — NEVER 5V!</td>
                      </tr>
                      <tr>
                        <td className="p-2">GND</td>
                        <td className="p-2 font-mono">GND</td>
                        <td className="p-2 font-mono">Pin 38</td>
                        <td className="p-2">Ground</td>
                      </tr>
                      <tr>
                        <td className="p-2">RST</td>
                        <td className="p-2 font-mono text-blue-600 font-bold">GPIO 14</td>
                        <td className="p-2 font-mono">Pin 19</td>
                        <td className="p-2">Reset</td>
                      </tr>
                      <tr>
                        <td className="p-2">SDA (SS)</td>
                        <td className="p-2 font-mono text-blue-600 font-bold">GPIO 13</td>
                        <td className="p-2 font-mono">Pin 17</td>
                        <td className="p-2">SPI1 Chip Select</td>
                      </tr>
                      <tr>
                        <td className="p-2">SCK</td>
                        <td className="p-2 font-mono text-blue-600 font-bold">GPIO 10</td>
                        <td className="p-2 font-mono">Pin 14</td>
                        <td className="p-2">SPI1 Clock</td>
                      </tr>
                      <tr>
                        <td className="p-2">MISO</td>
                        <td className="p-2 font-mono text-blue-600 font-bold">GPIO 12</td>
                        <td className="p-2 font-mono">Pin 16</td>
                        <td className="p-2">SPI1 Master In</td>
                      </tr>
                      <tr>
                        <td className="p-2">MOSI</td>
                        <td className="p-2 font-mono text-blue-600 font-bold">GPIO 11</td>
                        <td className="p-2 font-mono">Pin 15</td>
                        <td className="p-2">SPI1 Master Out</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold" rowSpan={4}>LCD 16x2 I2C Display</td>
                        <td className="p-2">VCC</td>
                        <td className="p-2 font-mono text-red-600 font-bold">VBUS (5V)</td>
                        <td className="p-2 font-mono">Pin 40</td>
                        <td className="p-2">Power from USB 5V rail</td>
                      </tr>
                      <tr>
                        <td className="p-2">GND</td>
                        <td className="p-2 font-mono">GND</td>
                        <td className="p-2 font-mono">Pin 38</td>
                        <td className="p-2">Ground</td>
                      </tr>
                      <tr>
                        <td className="p-2">SDA</td>
                        <td className="p-2 font-mono text-emerald-600 font-bold">GPIO 4</td>
                        <td className="p-2 font-mono">Pin 6</td>
                        <td className="p-2">I2C0 SDA</td>
                      </tr>
                      <tr>
                        <td className="p-2">SCL</td>
                        <td className="p-2 font-mono text-emerald-600 font-bold">GPIO 5</td>
                        <td className="p-2 font-mono">Pin 7</td>
                        <td className="p-2">I2C0 SCL</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold" rowSpan={2}>Emergency Push Button</td>
                        <td className="p-2">Terminal 1</td>
                        <td className="p-2 font-mono text-red-600 font-bold">GPIO 15</td>
                        <td className="p-2 font-mono">Pin 20</td>
                        <td className="p-2">Internal INPUT_PULLUP (no resistor needed!)</td>
                      </tr>
                      <tr>
                        <td className="p-2">Terminal 2</td>
                        <td className="p-2 font-mono">GND</td>
                        <td className="p-2 font-mono">Pin 38</td>
                        <td className="p-2">Pressing pulls pin to LOW</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2: STANDARD RASPBERRY PI */}
            {hardwareGuideTab === 'raspberrypi' && (
              <div className="space-y-3">
                <div className="rounded-xl bg-purple-50 p-3 border border-purple-200">
                  <h4 className="font-bold text-purple-900 text-sm">🖥️ Raspberry Pi 3 / 4 / 5 / Zero 2W (Python)</h4>
                  <p className="text-purple-700 mt-1">
                    Uses script <code className="font-mono bg-purple-100 px-1 py-0.5 rounded text-purple-900 font-bold">bloodflow_raspberry_pi.py</code> with <code className="font-mono text-xs">mfrc522</code> and <code className="font-mono text-xs">RPLCD</code>. Runs directly on Raspberry Pi OS!
                  </p>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 font-bold text-slate-700">
                      <tr>
                        <th className="p-2">Module</th>
                        <th className="p-2">Module Pin</th>
                        <th className="p-2">Pi 40-Pin Header</th>
                        <th className="p-2">BCM GPIO</th>
                        <th className="p-2">Function</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      <tr>
                        <td className="p-2 font-bold" rowSpan={7}>RC522 RFID (SPI0)</td>
                        <td className="p-2">VCC</td>
                        <td className="p-2 font-mono text-red-600 font-bold">Pin 1</td>
                        <td className="p-2 font-mono">3.3V</td>
                        <td className="p-2 text-red-600 font-bold">⚠️ 3.3V ONLY — NEVER 5V!</td>
                      </tr>
                      <tr>
                        <td className="p-2">GND</td>
                        <td className="p-2 font-mono">Pin 6</td>
                        <td className="p-2 font-mono">GND</td>
                        <td className="p-2">Ground</td>
                      </tr>
                      <tr>
                        <td className="p-2">RST</td>
                        <td className="p-2 font-mono text-blue-600 font-bold">Pin 22</td>
                        <td className="p-2 font-mono">GPIO 25</td>
                        <td className="p-2">Reset</td>
                      </tr>
                      <tr>
                        <td className="p-2">SDA (SS)</td>
                        <td className="p-2 font-mono text-blue-600 font-bold">Pin 24</td>
                        <td className="p-2 font-mono">GPIO 8</td>
                        <td className="p-2">SPI CE0</td>
                      </tr>
                      <tr>
                        <td className="p-2">SCK</td>
                        <td className="p-2 font-mono text-blue-600 font-bold">Pin 23</td>
                        <td className="p-2 font-mono">GPIO 11</td>
                        <td className="p-2">SPI SCLK</td>
                      </tr>
                      <tr>
                        <td className="p-2">MISO</td>
                        <td className="p-2 font-mono text-blue-600 font-bold">Pin 21</td>
                        <td className="p-2 font-mono">GPIO 9</td>
                        <td className="p-2">SPI MISO</td>
                      </tr>
                      <tr>
                        <td className="p-2">MOSI</td>
                        <td className="p-2 font-mono text-blue-600 font-bold">Pin 19</td>
                        <td className="p-2 font-mono">GPIO 10</td>
                        <td className="p-2">SPI MOSI</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold" rowSpan={4}>LCD 16x2 I2C Display</td>
                        <td className="p-2">VCC</td>
                        <td className="p-2 font-mono text-red-600 font-bold">Pin 2</td>
                        <td className="p-2 font-mono">5V</td>
                        <td className="p-2">5V Power</td>
                      </tr>
                      <tr>
                        <td className="p-2">GND</td>
                        <td className="p-2 font-mono">Pin 9</td>
                        <td className="p-2 font-mono">GND</td>
                        <td className="p-2">Ground</td>
                      </tr>
                      <tr>
                        <td className="p-2">SDA</td>
                        <td className="p-2 font-mono text-emerald-600 font-bold">Pin 3</td>
                        <td className="p-2 font-mono">GPIO 2 (SDA)</td>
                        <td className="p-2">I2C Data Bus</td>
                      </tr>
                      <tr>
                        <td className="p-2">SCL</td>
                        <td className="p-2 font-mono text-emerald-600 font-bold">Pin 5</td>
                        <td className="p-2 font-mono">GPIO 3 (SCL)</td>
                        <td className="p-2">I2C Clock Bus</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold" rowSpan={2}>Emergency Push Button</td>
                        <td className="p-2">Terminal 1</td>
                        <td className="p-2 font-mono text-red-600 font-bold">Pin 11</td>
                        <td className="p-2 font-mono">GPIO 17</td>
                        <td className="p-2">Internal pull-up enabled</td>
                      </tr>
                      <tr>
                        <td className="p-2">Terminal 2</td>
                        <td className="p-2 font-mono">Pin 14</td>
                        <td className="p-2 font-mono">GND</td>
                        <td className="p-2">Ground</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-[11px] space-y-1">
                  <div className="text-slate-400"># Run on Raspberry Pi terminal:</div>
                  <div>sudo raspi-config <span className="text-slate-400"># Enable SPI &amp; I2C in Interface Options</span></div>
                  <div>pip3 install spidev mfrc522 RPLCD requests RPi.GPIO</div>
                  <div>python3 bloodflow_raspberry_pi.py</div>
                </div>
              </div>
            )}

            {/* TAB 3: ESP8266 */}
            {hardwareGuideTab === 'esp8266' && (
              <div className="space-y-3">
                <div className="rounded-xl bg-blue-50 p-3 border border-blue-200">
                  <h4 className="font-bold text-blue-900 text-sm">⚡ NodeMCU ESP8266 Pinout</h4>
                  <p className="text-blue-700 mt-1">
                    Uses file <code className="font-mono bg-blue-100 px-1 py-0.5 rounded text-blue-900 font-bold">BloodFlow_ESP8266_All_Hardware.ino</code>.
                  </p>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 font-bold text-slate-700">
                      <tr>
                        <th className="p-2">Module</th>
                        <th className="p-2">Module Pin</th>
                        <th className="p-2">ESP8266 Pin</th>
                        <th className="p-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      <tr>
                        <td className="p-2 font-bold" rowSpan={7}>RC522 RFID Reader</td>
                        <td className="p-2">VCC</td>
                        <td className="p-2 font-mono text-red-600 font-bold">3V3</td>
                        <td className="p-2 text-red-600 font-medium">⚠️ 3.3V ONLY (Never connect to 5V!)</td>
                      </tr>
                      <tr>
                        <td className="p-2">GND</td>
                        <td className="p-2 font-mono">GND</td>
                        <td className="p-2">Common Ground</td>
                      </tr>
                      <tr>
                        <td className="p-2">RST</td>
                        <td className="p-2 font-mono text-blue-600 font-bold">D3 (GPIO 0)</td>
                        <td className="p-2">Reset Pin</td>
                      </tr>
                      <tr>
                        <td className="p-2">SDA (SS)</td>
                        <td className="p-2 font-mono text-blue-600 font-bold">D4 (GPIO 2)</td>
                        <td className="p-2">SPI Chip Select / Slave Select</td>
                      </tr>
                      <tr>
                        <td className="p-2">SCK</td>
                        <td className="p-2 font-mono text-blue-600 font-bold">D5 (GPIO 14)</td>
                        <td className="p-2">SPI Clock</td>
                      </tr>
                      <tr>
                        <td className="p-2">MISO</td>
                        <td className="p-2 font-mono text-blue-600 font-bold">D6 (GPIO 12)</td>
                        <td className="p-2">SPI Master In Slave Out</td>
                      </tr>
                      <tr>
                        <td className="p-2">MOSI</td>
                        <td className="p-2 font-mono text-blue-600 font-bold">D7 (GPIO 13)</td>
                        <td className="p-2">SPI Master Out Slave In</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold" rowSpan={4}>LCD 16x2 I2C Display</td>
                        <td className="p-2">VCC</td>
                        <td className="p-2 font-mono text-red-600 font-bold">VIN / 5V</td>
                        <td className="p-2">I2C Backpack requires 5V</td>
                      </tr>
                      <tr>
                        <td className="p-2">GND</td>
                        <td className="p-2 font-mono">GND</td>
                        <td className="p-2">Common Ground</td>
                      </tr>
                      <tr>
                        <td className="p-2">SDA</td>
                        <td className="p-2 font-mono text-emerald-600 font-bold">D2 (GPIO 4)</td>
                        <td className="p-2">I2C Data Bus</td>
                      </tr>
                      <tr>
                        <td className="p-2">SCL</td>
                        <td className="p-2 font-mono text-emerald-600 font-bold">D1 (GPIO 5)</td>
                        <td className="p-2">I2C Clock Bus</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold" rowSpan={2}>Emergency Push Button</td>
                        <td className="p-2">Terminal 1</td>
                        <td className="p-2 font-mono text-red-600 font-bold">D2 (GPIO 4)</td>
                        <td className="p-2">Internal pull-up enabled (no resistor needed)</td>
                      </tr>
                      <tr>
                        <td className="p-2">Terminal 2</td>
                        <td className="p-2 font-mono">GND</td>
                        <td className="p-2">Pressing pulls pin to LOW</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold" rowSpan={2}>Warning Buzzer</td>
                        <td className="p-2">Positive (+)</td>
                        <td className="p-2 font-mono text-amber-600 font-bold">D1 (GPIO 5)</td>
                        <td className="p-2">Beeps on RFID scan; sirens on emergency</td>
                      </tr>
                      <tr>
                        <td className="p-2">Negative (-)</td>
                        <td className="p-2 font-mono">GND</td>
                        <td className="p-2">Common Ground</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Modal: Emergency Trigger Confirmation */}
      {showEmergencyConfirmModal && (
        <Modal
          open
          onClose={() => setShowEmergencyConfirmModal(false)}
          title="🚨 Confirm BloodFlow Emergency Trigger"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs text-red-900 space-y-1">
                <p className="font-bold text-sm">Are you sure you want to trigger a BloodFlow emergency call?</p>
                <p className="leading-relaxed">
                  This will immediately trigger an automated Twilio emergency voice call to your configured fire alert recipient (<code className="bg-red-100 px-1 py-0.5 rounded font-mono text-red-900 font-bold">FIRE_CALL_TO</code>).
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowEmergencyConfirmModal(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleTriggerEmergency}>
                🚨 Confirm &amp; Dispatch Call
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Configure Emergency Phone Number */}
      {showPhoneSettingsModal && (
        <Modal
          open
          onClose={() => setShowPhoneSettingsModal(false)}
          title="⚙️ Emergency Recipient Phone Number"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600">
              Enter your verified recipient phone number where you want to receive automated fire alert voice calls (e.g. <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800">+919876543210</code>).
            </p>
            <Input
              label="Emergency Recipient Phone Number (FIRE_CALL_TO)"
              placeholder="+919876543210"
              value={fireCallToPhone}
              onChange={(v) => {
                setFireCallToPhone(v);
                localStorage.setItem('BLOODFLOW_FIRE_CALL_TO', v);
              }}
              helperText="Saved in local browser state and sent with emergency dispatch requests."
            />
            <div className="flex justify-end pt-2">
              <Button onClick={() => setShowPhoneSettingsModal(false)}>
                Save Target Phone Number
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Device Details */}
      {selectedDeviceModal && (
        <Modal
          open
          onClose={() => setSelectedDeviceModal(null)}
          title={`Device Details: ${selectedDeviceModal.device_id}`}
        >
          <div className="space-y-3 text-xs">
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500">Device Type:</span>
              <span className="font-bold">{selectedDeviceModal.device_type}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500">Firmware:</span>
              <span className="font-mono">{selectedDeviceModal.firmware_version}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500">IP Address:</span>
              <span className="font-mono">{selectedDeviceModal.ip_address}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500">Wi-Fi Link:</span>
              <span className="capitalize">{selectedDeviceModal.wifi_status}</span>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Register Blood Bag to RFID Tag */}
      {showRegisterBagModal && (
        <Modal
          open
          onClose={() => setShowRegisterBagModal(false)}
          title="🏷️ Register Blood Bag to RFID Tag"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600">
              Assign this scanned RFID card or sticker to a physical blood unit in your hospital bank. Once saved, it tracks live in stock breakdown and storage capacity!
            </p>

            {bagSaveError && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs border border-red-200">
                {bagSaveError}
              </div>
            )}

            <div className="space-y-3">
              <Input
                label="RFID Tag UID (Physical Card)"
                placeholder="e.g. 93:6A:B2:1A or E4:A2:3B:1F"
                value={registerRfidUid}
                onChange={(v) => setRegisterRfidUid(v)}
                helperText="Physical tag identifier read by the RC522 reader."
              />

              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Blood Group"
                  value={registerBloodGroup}
                  onChange={(v) => setRegisterBloodGroup(v)}
                  options={BLOOD_GROUPS.map((g) => ({ value: g, label: g }))}
                />

                <Input
                  label="Blood Unit Code"
                  placeholder="e.g. BU-1048"
                  value={registerUnitCode}
                  onChange={(v) => setRegisterUnitCode(v)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Storage Unit Location"
                  value={registerStorageId}
                  onChange={(v) => setRegisterStorageId(v)}
                  options={storageUnits.map((u) => ({ value: u.id, label: `${u.storage_code} - ${u.name}` }))}
                />

                <Input
                  label="Volume (ml)"
                  type="number"
                  value={registerVolume}
                  onChange={(v) => setRegisterVolume(v)}
                />
              </div>

              <Input
                label="Expiry Date"
                type="date"
                value={registerExpiryDate}
                onChange={(v) => setRegisterExpiryDate(v)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" onClick={() => setShowRegisterBagModal(false)} disabled={savingBag}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveBloodBag} loading={savingBag}>
                Save Blood Bag &amp; Link Tag
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
