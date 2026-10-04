import { useState, useEffect, useCallback } from 'react';
import {
  Thermometer,
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
} from 'lucide-react';
import { Card, Badge, Button, Input, Select, Modal, EmptyState } from '@/components/ui';
import {
  supabase,
  BLOOD_GROUPS,
  type StorageUnit,
  type IoTDevice,
  type TemperatureReading,
  type RFIDBloodUnit,
  type RFIDEvent,
  type IoTAlert,
  type Hospital,
} from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

type IoTSubTab = 'overview' | 'temp' | 'devices' | 'rfid' | 'inventory' | 'alerts' | 'logs';

interface SmartBloodBankIoTProps {
  hospital: Hospital | null;
}

// Initial realistic fallback/demo dataset
const INITIAL_STORAGE_UNITS: StorageUnit[] = [
  {
    id: 'unit-st001',
    storage_code: 'ST001',
    name: 'Cold Vault A (Whole Blood)',
    location: 'Blood Bank Wing A - Room 101',
    status: 'normal',
    current_temperature: 4.2,
    min_temp_threshold: 2.0,
    max_temp_threshold: 6.0,
    hospital_id: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'unit-st002',
    storage_code: 'ST002',
    name: 'Cold Vault B (Plasma & RBC)',
    location: 'Blood Bank Wing A - Room 102',
    status: 'warning',
    current_temperature: 7.4,
    min_temp_threshold: 2.0,
    max_temp_threshold: 6.0,
    hospital_id: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'unit-st003',
    storage_code: 'ST003',
    name: 'Emergency Unit C',
    location: 'ICU Emergency Ward - Floor 2',
    status: 'critical',
    current_temperature: 11.8,
    min_temp_threshold: 2.0,
    max_temp_threshold: 6.0,
    hospital_id: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'unit-st004',
    storage_code: 'ST004',
    name: 'Reserve Storage D',
    location: 'Sub-Basement Storage',
    status: 'offline',
    current_temperature: 4.0,
    min_temp_threshold: 2.0,
    max_temp_threshold: 6.0,
    hospital_id: null,
    created_at: new Date().toISOString(),
  },
];

const INITIAL_DEVICES: IoTDevice[] = [
  {
    id: 'dev-001',
    device_id: 'ESP32-001',
    storage_unit_id: 'unit-st001',
    device_type: 'ESP32_DS18B20_RC522',
    status: 'online',
    wifi_status: 'connected',
    last_seen: new Date(Date.now() - 5000).toISOString(),
    last_temperature: 4.2,
    firmware_version: 'v1.4.2-iot',
    ip_address: '192.168.1.105',
    created_at: new Date().toISOString(),
  },
  {
    id: 'dev-002',
    device_id: 'ESP32-002',
    storage_unit_id: 'unit-st002',
    device_type: 'ESP32_DS18B20_RC522',
    status: 'online',
    wifi_status: 'connected',
    last_seen: new Date(Date.now() - 12000).toISOString(),
    last_temperature: 7.4,
    firmware_version: 'v1.4.2-iot',
    ip_address: '192.168.1.106',
    created_at: new Date().toISOString(),
  },
  {
    id: 'dev-003',
    device_id: 'ESP32-003',
    storage_unit_id: 'unit-st003',
    device_type: 'ESP32_DS18B20_RC522',
    status: 'online',
    wifi_status: 'weak',
    last_seen: new Date(Date.now() - 25000).toISOString(),
    last_temperature: 11.8,
    firmware_version: 'v1.4.2-iot',
    ip_address: '192.168.1.107',
    created_at: new Date().toISOString(),
  },
  {
    id: 'dev-004',
    device_id: 'ESP32-004',
    storage_unit_id: 'unit-st004',
    device_type: 'ESP32_DS18B20_RC522',
    status: 'offline',
    wifi_status: 'disconnected',
    last_seen: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    last_temperature: 4.0,
    firmware_version: 'v1.4.0-iot',
    ip_address: '192.168.1.108',
    created_at: new Date().toISOString(),
  },
];

const INITIAL_BLOOD_UNITS: RFIDBloodUnit[] = [
  {
    id: 'bu-001',
    blood_unit_code: 'BF-001',
    rfid_uid: 'A3-72-19-8F',
    blood_group: 'O+',
    storage_unit_id: 'unit-st001',
    hospital_id: null,
    status: 'AVAILABLE',
    volume_ml: 350,
    collection_date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
    expiry_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    last_scanned_at: new Date(Date.now() - 10 * 60000).toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 'bu-002',
    blood_unit_code: 'BF-002',
    rfid_uid: 'B2-91-44-7C',
    blood_group: 'A+',
    storage_unit_id: 'unit-st001',
    hospital_id: null,
    status: 'AVAILABLE',
    volume_ml: 450,
    collection_date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
    expiry_date: new Date(Date.now() + 32 * 86400000).toISOString().split('T')[0],
    last_scanned_at: new Date(Date.now() - 25 * 60000).toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 'bu-003',
    blood_unit_code: 'BF-003',
    rfid_uid: 'C1-82-32-6D',
    blood_group: 'B+',
    storage_unit_id: 'unit-st002',
    hospital_id: null,
    status: 'DISPATCHED',
    volume_ml: 350,
    collection_date: new Date(Date.now() - 8 * 86400000).toISOString().split('T')[0],
    expiry_date: new Date(Date.now() + 27 * 86400000).toISOString().split('T')[0],
    last_scanned_at: new Date(Date.now() - 40 * 60000).toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 'bu-004',
    blood_unit_code: 'BF-004',
    rfid_uid: 'D4-65-88-2E',
    blood_group: 'O-',
    storage_unit_id: 'unit-st001',
    hospital_id: null,
    status: 'RESERVED',
    volume_ml: 350,
    collection_date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    expiry_date: new Date(Date.now() + 33 * 86400000).toISOString().split('T')[0],
    last_scanned_at: new Date(Date.now() - 5 * 60000).toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 'bu-005',
    blood_unit_code: 'BF-005',
    rfid_uid: 'E5-12-99-3A',
    blood_group: 'AB+',
    storage_unit_id: 'unit-st002',
    hospital_id: null,
    status: 'AVAILABLE',
    volume_ml: 400,
    collection_date: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0],
    expiry_date: new Date(Date.now() + 31 * 86400000).toISOString().split('T')[0],
    last_scanned_at: new Date(Date.now() - 15 * 60000).toISOString(),
    created_at: new Date().toISOString(),
  },
];

const INITIAL_RFID_EVENTS: RFIDEvent[] = [
  {
    id: 'evt-101',
    rfid_uid: 'A3-72-19-8F',
    blood_unit_id: 'bu-001',
    blood_unit_code: 'BF-001',
    blood_group: 'O+',
    storage_unit_id: 'unit-st001',
    action: 'ENTERED',
    result: 'SUCCESS',
    scanned_at: new Date(Date.now() - 10 * 60000).toISOString(),
  },
  {
    id: 'evt-102',
    rfid_uid: 'B2-91-44-7C',
    blood_unit_id: 'bu-002',
    blood_unit_code: 'BF-002',
    blood_group: 'A+',
    storage_unit_id: 'unit-st001',
    action: 'ENTERED',
    result: 'SUCCESS',
    scanned_at: new Date(Date.now() - 25 * 60000).toISOString(),
  },
  {
    id: 'evt-103',
    rfid_uid: 'C1-82-32-6D',
    blood_unit_id: 'bu-003',
    blood_unit_code: 'BF-003',
    blood_group: 'B+',
    storage_unit_id: 'unit-st002',
    action: 'DISPATCHED',
    result: 'SUCCESS',
    scanned_at: new Date(Date.now() - 40 * 60000).toISOString(),
  },
  {
    id: 'evt-104',
    rfid_uid: 'FF-99-88-77',
    blood_unit_id: null,
    blood_unit_code: 'UNKNOWN',
    blood_group: 'N/A',
    storage_unit_id: 'unit-st003',
    action: 'UNKNOWN_TAG',
    result: 'FLAGGED',
    scanned_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
];

const INITIAL_ALERTS: IoTAlert[] = [
  {
    id: 'alt-001',
    device_id: 'ESP32-003',
    storage_unit_id: 'unit-st003',
    alert_type: 'temperature_exceeded',
    severity: 'CRITICAL',
    message: 'Storage Unit ST003 temperature is 11.8°C (Exceeds safe range 2.0°C – 6.0°C). Immediate action required.',
    acknowledged: false,
    acknowledged_at: null,
    acknowledged_by: null,
    created_at: new Date(Date.now() - 15 * 60000).toISOString(),
  },
  {
    id: 'alt-002',
    device_id: 'ESP32-002',
    storage_unit_id: 'unit-st002',
    alert_type: 'temperature_warning',
    severity: 'WARNING',
    message: 'Storage Unit ST002 temperature warning at 7.4°C. Check door seal.',
    acknowledged: false,
    acknowledged_at: null,
    acknowledged_by: null,
    created_at: new Date(Date.now() - 45 * 60000).toISOString(),
  },
  {
    id: 'alt-003',
    device_id: 'ESP32-004',
    storage_unit_id: 'unit-st004',
    alert_type: 'esp32_offline',
    severity: 'WARNING',
    message: 'ESP32-004 has not sent a heartbeat signal for over 8 minutes.',
    acknowledged: true,
    acknowledged_at: new Date(Date.now() - 5 * 60000).toISOString(),
    acknowledged_by: null,
    created_at: new Date(Date.now() - 120 * 60000).toISOString(),
  },
];

export function SmartBloodBankIoT({ hospital }: SmartBloodBankIoTProps) {
  const { profile } = useAuth();
  const [subTab, setSubTab] = useState<IoTSubTab>('overview');

  // Core IoT State
  const [storageUnits, setStorageUnits] = useState<StorageUnit[]>(INITIAL_STORAGE_UNITS);
  const [devices, setDevices] = useState<IoTDevice[]>(INITIAL_DEVICES);
  const [bloodUnits, setBloodUnits] = useState<RFIDBloodUnit[]>(INITIAL_BLOOD_UNITS);
  const [rfidEvents, setRfidEvents] = useState<RFIDEvent[]>(INITIAL_RFID_EVENTS);
  const [alerts, setAlerts] = useState<IoTAlert[]>(INITIAL_ALERTS);
  const [tempHistory, setTempHistory] = useState<{ time: string; ST001: number; ST002: number; ST003: number }[]>([]);

  // Demo Simulation State
  const [demoMode, setDemoMode] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '6h' | '24h'>('1h');
  const [selectedDeviceModal, setSelectedDeviceModal] = useState<IoTDevice | null>(null);
  const [showHardwareGuideModal, setShowHardwareGuideModal] = useState(false);

  // Filters for RFID Activity
  const [rfidFilterAction, setRfidFilterAction] = useState<string>('ALL');
  const [rfidSearchQuery, setRfidSearchQuery] = useState('');

  // Threshold Configuration Modal
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [minThreshold, setMinThreshold] = useState(2.0);
  const [maxThreshold, setMaxThreshold] = useState(6.0);

  // Initialize temperature graph history
  useEffect(() => {
    const history = [];
    const now = Date.now();
    for (let i = 12; i >= 0; i--) {
      const t = new Date(now - i * 5 * 60000);
      history.push({
        time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        ST001: Number((4.0 + Math.sin(i) * 0.3).toFixed(1)),
        ST002: Number((6.8 + Math.cos(i) * 0.5).toFixed(1)),
        ST003: Number((10.5 + Math.sin(i * 0.8) * 1.2).toFixed(1)),
      });
    }
    setTempHistory(history);
  }, []);

  // Fetch real data from Supabase if connected
  const fetchSupabaseIoTData = useCallback(async () => {
    try {
      const [unitsRes, devRes, bloodRes, rfidRes, alertRes] = await Promise.all([
        supabase.from('storage_units').select('*').order('storage_code'),
        supabase.from('iot_devices').select('*').order('device_id'),
        supabase.from('blood_units').select('*').order('created_at', { ascending: false }),
        supabase.from('rfid_events').select('*').order('scanned_at', { ascending: false }),
        supabase.from('iot_alerts').select('*').order('created_at', { ascending: false }),
      ]);

      if (unitsRes.data && unitsRes.data.length > 0) setStorageUnits(unitsRes.data);
      if (devRes.data && devRes.data.length > 0) setDevices(devRes.data);
      if (bloodRes.data && bloodRes.data.length > 0) setBloodUnits(bloodRes.data);
      if (rfidRes.data && rfidRes.data.length > 0) setRfidEvents(rfidRes.data);
      if (alertRes.data && alertRes.data.length > 0) setAlerts(alertRes.data);
    } catch {
      // Fallback to local state if tables are not populated yet
    }
  }, []);

  useEffect(() => {
    fetchSupabaseIoTData();

    // Supabase Realtime Channels for IoT tables
    const channel = supabase
      .channel('bloodflow-iot-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'storage_units' }, fetchSupabaseIoTData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'iot_devices' }, fetchSupabaseIoTData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blood_units' }, fetchSupabaseIoTData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rfid_events' }, fetchSupabaseIoTData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'iot_alerts' }, fetchSupabaseIoTData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSupabaseIoTData]);

  // Demo IoT Simulation Engine (runs when demoMode is active)
  useEffect(() => {
    if (!demoMode) return;

    const interval = setInterval(() => {
      // 1. Simulate minor temperature fluctuations
      setStorageUnits((prevUnits) =>
        prevUnits.map((unit) => {
          if (unit.status === 'offline') return unit;
          const fluctuation = (Math.random() - 0.5) * 0.4;
          const newTemp = Number(Math.max(1.0, Math.min(16.0, unit.current_temperature + fluctuation)).toFixed(1));
          
          let newStatus: StorageUnit['status'] = 'normal';
          if (newTemp > maxThreshold + 3.0 || newTemp < minThreshold - 1.0) {
            newStatus = 'critical';
          } else if (newTemp > maxThreshold || newTemp < minThreshold) {
            newStatus = 'warning';
          }

          return {
            ...unit,
            current_temperature: newTemp,
            status: newStatus,
          };
        })
      );

      // 2. Append history point for chart
      setTempHistory((prev) => {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const last = prev[prev.length - 1] || { ST001: 4.2, ST002: 7.4, ST003: 11.8 };
        const newPoint = {
          time: timeStr,
          ST001: Number((last.ST001 + (Math.random() - 0.5) * 0.2).toFixed(1)),
          ST002: Number((last.ST002 + (Math.random() - 0.5) * 0.3).toFixed(1)),
          ST003: Number((last.ST003 + (Math.random() - 0.5) * 0.4).toFixed(1)),
        };
        return [...prev.slice(-15), newPoint];
      });

      // 3. Update device heartbeats
      setDevices((prevDevs) =>
        prevDevs.map((d) => (d.status === 'online' ? { ...d, last_seen: new Date().toISOString() } : d))
      );
    }, 4000);

    return () => clearInterval(interval);
  }, [demoMode, minThreshold, maxThreshold]);

  // Demo Actions to manually trigger events
  function triggerSimulatedRfidScan(action: 'ENTERED' | 'DISPATCHED') {
    const randomGroup = BLOOD_GROUPS[Math.floor(Math.random() * BLOOD_GROUPS.length)];
    const randomUid = `${Math.floor(Math.random() * 89 + 10).toString(16).toUpperCase()}-${Math.floor(Math.random() * 89 + 10).toString(16).toUpperCase()}-${Math.floor(Math.random() * 89 + 10).toString(16).toUpperCase()}-${Math.floor(Math.random() * 89 + 10).toString(16).toUpperCase()}`;
    const newCode = `BF-${Math.floor(Math.random() * 900 + 100)}`;

    const newEvent: RFIDEvent = {
      id: `evt-sim-${Date.now()}`,
      rfid_uid: randomUid,
      blood_unit_id: `bu-sim-${Date.now()}`,
      blood_unit_code: newCode,
      blood_group: randomGroup,
      storage_unit_id: 'unit-st001',
      action,
      result: 'SUCCESS',
      scanned_at: new Date().toISOString(),
    };

    setRfidEvents((prev) => [newEvent, ...prev]);

    if (action === 'ENTERED') {
      const newUnit: RFIDBloodUnit = {
        id: `bu-sim-${Date.now()}`,
        blood_unit_code: newCode,
        rfid_uid: randomUid,
        blood_group: randomGroup,
        storage_unit_id: 'unit-st001',
        hospital_id: hospital?.id || null,
        status: 'AVAILABLE',
        volume_ml: 350,
        collection_date: new Date().toISOString().split('T')[0],
        expiry_date: new Date(Date.now() + 35 * 86400000).toISOString().split('T')[0],
        last_scanned_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      setBloodUnits((prev) => [newUnit, ...prev]);
    } else {
      setBloodUnits((prev) =>
        prev.map((unit, idx) => (idx === 0 ? { ...unit, status: 'DISPATCHED' } : unit))
      );
    }
  }

  function triggerSimulatedTempSpike() {
    setStorageUnits((prev) =>
      prev.map((u) => (u.storage_code === 'ST001' ? { ...u, current_temperature: 13.5, status: 'critical' } : u))
    );

    const newAlert: IoTAlert = {
      id: `alt-sim-${Date.now()}`,
      device_id: 'ESP32-001',
      storage_unit_id: 'unit-st001',
      alert_type: 'temperature_exceeded',
      severity: 'CRITICAL',
      message: 'CRITICAL: Cold Vault A (ST001) temperature spiked to 13.5°C! Immediate medical review required.',
      acknowledged: false,
      acknowledged_at: null,
      acknowledged_by: null,
      created_at: new Date().toISOString(),
    };

    setAlerts((prev) => [newAlert, ...prev]);
  }

  function acknowledgeAlert(alertId: string) {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId ? { ...a, acknowledged: true, acknowledged_at: new Date().toISOString() } : a
      )
    );
  }

  // Summary Metrics calculations
  const onlineUnitsCount = storageUnits.filter((u) => u.status !== 'offline').length;
  const offlineUnitsCount = storageUnits.filter((u) => u.status === 'offline').length;
  const normalTempCount = storageUnits.filter((u) => u.status === 'normal').length;
  const warningTempCount = storageUnits.filter((u) => u.status === 'warning').length;
  const criticalTempCount = storageUnits.filter((u) => u.status === 'critical').length;
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

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Smart Blood Bank IoT</h2>
            <Badge variant="red" dot>
              ESP32 (DS18B20 + RC522)
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time cold storage temperature monitoring &amp; RFID blood unit tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Demo Mode Toggle */}
          <button
            onClick={() => setDemoMode(!demoMode)}
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs select-none',
              demoMode
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-slate-100 text-slate-600'
            )}
          >
            {demoMode ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Demo IoT Simulation: ON</span>
              </>
            ) : (
              <>
                <Pause className="h-3.5 w-3.5" />
                <span>Demo Simulation: PAUSED</span>
              </>
            )}
          </button>

          {/* Threshold Config Button */}
          <Button size="xs" variant="outline" onClick={() => setShowConfigModal(true)}>
            <Sliders className="h-3.5 w-3.5 mr-1" /> Prototype Thresholds
          </Button>

          {/* Hardware Guide Button */}
          <Button size="xs" variant="primary" onClick={() => setShowHardwareGuideModal(true)}>
            <Code2 className="h-3.5 w-3.5 mr-1" /> Hardware Setup Guide
          </Button>
        </div>
      </div>

      {/* Demo Actions Strip */}
      {demoMode && (
        <Card className="p-3.5 bg-amber-50/50 border-amber-200/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-amber-800 font-bold">
              <Zap className="h-4 w-4 text-amber-600" />
              <span>Simulated Data Controls (Test without physical hardware):</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button size="xs" variant="outline" onClick={() => triggerSimulatedRfidScan('ENTERED')}>
                + Simulate RFID Scan (ENTERED)
              </Button>
              <Button size="xs" variant="outline" onClick={() => triggerSimulatedRfidScan('DISPATCHED')}>
                - Simulate RFID Scan (DISPATCHED)
              </Button>
              <Button size="xs" variant="danger" onClick={triggerSimulatedTempSpike}>
                🚨 Trigger Temp Spike
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* IoT Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 overflow-x-auto pb-1">
        {[
          { id: 'overview', label: 'Overview', icon: <Layers className="h-4 w-4" /> },
          { id: 'temp', label: 'Storage Temperature', icon: <Thermometer className="h-4 w-4" /> },
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

            {/* Temperature Status */}
            <Card className="p-5 border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Temperature Status</span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Thermometer className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-emerald-600">{normalTempCount}</span>
                <span className="text-xs text-slate-500">Normal (2°C – 6°C)</span>
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs border-t border-slate-100 pt-2.5">
                <span className="text-amber-600 font-bold">{warningTempCount} Warning</span>
                <span className="text-slate-400">|</span>
                <span className="text-red-600 font-bold">{criticalTempCount} Critical</span>
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
                Tracked across {storageUnits.length} Cold Storage Units
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
                <h3 className="text-base font-bold text-slate-900">Live Storage Unit Temperatures</h3>
                <span className="text-xs text-slate-500">Safe Range: {minThreshold}°C – {maxThreshold}°C</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {storageUnits.map((unit) => {
                  const isNormal = unit.status === 'normal';
                  const isWarning = unit.status === 'warning';
                  const isCritical = unit.status === 'critical';
                  const isOffline = unit.status === 'offline';

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

                        {isNormal && (
                          <Badge variant="green" dot>
                            NORMAL
                          </Badge>
                        )}
                        {isWarning && (
                          <Badge variant="yellow" dot>
                            WARNING
                          </Badge>
                        )}
                        {isCritical && (
                          <Badge variant="red" dot>
                            CRITICAL
                          </Badge>
                        )}
                        {isOffline && (
                          <Badge variant="gray" dot>
                            OFFLINE
                          </Badge>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                        <div>
                          <span className="text-2xl font-black text-slate-900">{unit.current_temperature}°C</span>
                          <span className="text-[10px] text-slate-400 block">Current Temp</span>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold text-slate-700 block">
                            {isOffline ? 'Disconnected' : 'ESP32 Online'}
                          </span>
                          <span className="text-[10px] text-slate-400">Updated seconds ago</span>
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

      {/* 2. TEMPERATURE MONITORING TAB */}
      {subTab === 'temp' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">🌡️ Storage Temperature Monitoring</h3>
              <p className="text-xs text-slate-500">
                Configured Prototype Thresholds: Safe ({minThreshold}°C – {maxThreshold}°C)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">Graph Window:</span>
              <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 text-xs">
                {(['1h', '6h', '24h'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setSelectedTimeRange(r)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg font-bold transition-all',
                      selectedTimeRange === r ? 'bg-red-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SVG Temperature Graph */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4 text-xs font-bold">
                <span className="flex items-center gap-1.5 text-blue-600">
                  <span className="h-3 w-3 rounded-full bg-blue-600" /> ST001 (Cold Vault A)
                </span>
                <span className="flex items-center gap-1.5 text-amber-600">
                  <span className="h-3 w-3 rounded-full bg-amber-600" /> ST002 (Cold Vault B)
                </span>
                <span className="flex items-center gap-1.5 text-red-600">
                  <span className="h-3 w-3 rounded-full bg-red-600" /> ST003 (Emergency C)
                </span>
              </div>

              <span className="text-[11px] font-mono text-slate-400">Live Auto-Update</span>
            </div>

            {/* Custom SVG Line Chart */}
            <div className="w-full overflow-x-auto">
              <svg className="w-full h-64 min-w-[600px]" viewBox="0 0 700 240" fill="none">
                {/* Background grid lines */}
                <line x1="40" y1="30" x2="680" y2="30" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="40" y1="80" x2="680" y2="80" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="40" y1="130" x2="680" y2="130" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="40" y1="180" x2="680" y2="180" stroke="#f1f5f9" strokeWidth="1" />

                {/* Safe Threshold Band Highlight (2.0°C to 6.0°C) */}
                <rect x="40" y="110" width="640" height="50" fill="#ecfdf5" opacity="0.7" />
                <line x1="40" y1="110" x2="680" y2="110" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4" />
                <line x1="40" y1="160" x2="680" y2="160" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4" />

                <text x="685" y="114" fill="#10b981" fontSize="10" fontWeight="bold">6°C Max</text>
                <text x="685" y="164" fill="#10b981" fontSize="10" fontWeight="bold">2°C Min</text>

                {/* Plot Lines */}
                {/* ST001 Line */}
                <polyline
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="3"
                  points={tempHistory
                    .map((d, i) => `${40 + i * 50},${180 - ((d.ST001 - 1) / 14) * 150}`)
                    .join(' ')}
                />

                {/* ST002 Line */}
                <polyline
                  fill="none"
                  stroke="#d97706"
                  strokeWidth="3"
                  points={tempHistory
                    .map((d, i) => `${40 + i * 50},${180 - ((d.ST002 - 1) / 14) * 150}`)
                    .join(' ')}
                />

                {/* ST003 Line */}
                <polyline
                  fill="none"
                  stroke="#dc2626"
                  strokeWidth="3"
                  points={tempHistory
                    .map((d, i) => `${40 + i * 50},${180 - ((d.ST003 - 1) / 14) * 150}`)
                    .join(' ')}
                />

                {/* Time Axis Labels */}
                {tempHistory.map((d, i) => (
                  <text key={i} x={40 + i * 50} y="210" fill="#64748b" fontSize="9" textAnchor="middle">
                    {d.time}
                  </text>
                ))}
              </svg>
            </div>
          </Card>

          {/* Storage Units Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {storageUnits.map((unit) => (
              <Card key={unit.id} className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="red" className="font-mono">
                      {unit.storage_code}
                    </Badge>
                    <h4 className="font-bold text-slate-900">{unit.name}</h4>
                  </div>
                  <Badge variant={unit.status === 'normal' ? 'green' : unit.status === 'warning' ? 'yellow' : 'red'}>
                    {unit.status.toUpperCase()}
                  </Badge>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-3 text-center">
                  <div>
                    <span className="text-xl font-black text-slate-900">{unit.current_temperature}°C</span>
                    <span className="text-[10px] text-slate-400 block">Current Temp</span>
                  </div>
                  <div>
                    <span className="text-sm font-bold text-emerald-600">{unit.min_temp_threshold}°C</span>
                    <span className="text-[10px] text-slate-400 block">Min Threshold</span>
                  </div>
                  <div>
                    <span className="text-sm font-bold text-red-600">{unit.max_temp_threshold}°C</span>
                    <span className="text-[10px] text-slate-400 block">Max Threshold</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 3. IOT DEVICES TAB */}
      {subTab === 'devices' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">📡 ESP32 Hardware Status</h3>
              <p className="text-xs text-slate-500">Connected IoT Microcontrollers &amp; Sensors</p>
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
                    <span className="text-slate-400">Last Temp:</span>
                    <span className="font-bold text-red-600">{dev.last_temperature}°C</span>
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
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">🏷️ RFID Blood Unit Tracking</h3>
              <p className="text-xs text-slate-500">Tracked RFID Bags &amp; Storage Assignment</p>
            </div>
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
                  {bloodUnits.map((unit) => (
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
                        {new Date(unit.last_scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
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
              <h3 className="text-lg font-bold text-slate-900">📋 RFID Activity Logs</h3>
              <p className="text-xs text-slate-500">Real-time scan entries &amp; dispatches</p>
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={rfidFilterAction}
                onChange={setRfidFilterAction}
                options={[
                  { value: 'ALL', label: 'All Actions' },
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
                  {rfidEvents
                    .filter((evt) => rfidFilterAction === 'ALL' || evt.action === rfidFilterAction)
                    .map((evt) => (
                      <tr key={evt.id} className="hover:bg-slate-50">
                        <td className="p-3.5 font-mono text-slate-500">
                          {new Date(evt.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-blue-600">{evt.rfid_uid}</td>
                        <td className="p-3.5 font-bold text-slate-900">{evt.blood_unit_code || '—'}</td>
                        <td className="p-3.5">
                          <Badge variant="red">{evt.blood_group || 'N/A'}</Badge>
                        </td>
                        <td className="p-3.5 font-mono text-slate-700">ST001</td>
                        <td className="p-3.5">
                          <Badge variant={evt.action === 'ENTERED' ? 'green' : 'yellow'}>{evt.action}</Badge>
                        </td>
                        <td className="p-3.5">
                          <Badge variant={evt.result === 'SUCCESS' ? 'green' : 'red'}>{evt.result}</Badge>
                        </td>
                      </tr>
                    ))}
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

      {/* Modal: ESP32 Hardware Setup Guide */}
      {showHardwareGuideModal && (
        <Modal
          open
          onClose={() => setShowHardwareGuideModal(false)}
          title="ESP32 Physical Hardware Connection Guide"
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
            <div className="rounded-xl bg-red-50 p-3 border border-red-200">
              <h4 className="font-bold text-red-900 text-sm">Step-by-Step Hardware Wiring:</h4>
              <p className="text-red-700 mt-1">
                Connect your physical <strong>ESP32 NodeMCU board</strong> to the sensors as follows:
              </p>
            </div>

            {/* Wiring Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 font-bold text-slate-700">
                  <tr>
                    <th className="p-2.5">Component</th>
                    <th className="p-2.5">Sensor Pin</th>
                    <th className="p-2.5">ESP32 Pin</th>
                    <th className="p-2.5">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  <tr>
                    <td className="p-2.5 font-bold">DS18B20 Temp Sensor</td>
                    <td className="p-2.5">VCC, GND, DATA</td>
                    <td className="p-2.5 font-mono text-red-600 font-bold">GPIO 4</td>
                    <td className="p-2.5">Requires 4.7kΩ pull-up resistor to 3.3V</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">RC522 RFID Reader</td>
                    <td className="p-2.5">SDA / SS</td>
                    <td className="p-2.5 font-mono text-blue-600 font-bold">GPIO 5</td>
                    <td className="p-2.5">SPI Chip Select</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">RC522 RFID Reader</td>
                    <td className="p-2.5">SCK / MOSI / MISO</td>
                    <td className="p-2.5 font-mono text-blue-600 font-bold">GPIO 18 / 23 / 19</td>
                    <td className="p-2.5">Standard ESP32 Hardware SPI</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">RC522 RFID Reader</td>
                    <td className="p-2.5">RST</td>
                    <td className="p-2.5 font-mono text-blue-600 font-bold">GPIO 22</td>
                    <td className="p-2.5">Reset Pin</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Arduino Sketch Snippet */}
            <div>
              <h4 className="font-bold text-slate-900 mb-1.5">ESP32 C++ Code Snippet (Arduino IDE):</h4>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-slate-200 font-mono text-[11px] overflow-x-auto">
                <pre>{`#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* supabaseUrl = "https://gvwdrbrepbpmhjckdcyq.supabase.co/rest/v1/temperature_readings";
const char* anonKey = "YOUR_SUPABASE_ANON_KEY";

void sendTemperature(float tempC) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(supabaseUrl);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("apikey", anonKey);

    String jsonPayload = "{\\"device_id\\":\\"ESP32-001\\",\\"temperature\\":" + String(tempC) + "}";
    int httpResponseCode = http.POST(jsonPayload);
    http.end();
  }
}`}</pre>
              </div>
            </div>

            <p className="text-slate-500 text-[11px]">
              Once powered on, the ESP32 will transmit readings directly into Supabase tables via REST API and automatically trigger real-time updates in BloodFlow!
            </p>
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

      {/* Modal: Prototype Threshold Configuration */}
      {showConfigModal && (
        <Modal
          open
          onClose={() => setShowConfigModal(false)}
          title="Configure Prototype Temperature Thresholds"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-500">
              Note: Thresholds set here are labeled as prototype/demo limits and do not replace clinical regulatory validation.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Min Temp (°C)"
                type="number"
                value={String(minThreshold)}
                onChange={(v) => setMinThreshold(Number(v))}
              />
              <Input
                label="Max Temp (°C)"
                type="number"
                value={String(maxThreshold)}
                onChange={(v) => setMaxThreshold(Number(v))}
              />
            </div>
            <Button fullWidth onClick={() => setShowConfigModal(false)}>
              Save Prototype Thresholds
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
