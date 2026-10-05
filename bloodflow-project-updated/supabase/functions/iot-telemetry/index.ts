import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const body = await req.json();

    // 1. ESP32 Temperature Reading Submission (DS18B20)
    if (url.pathname.endsWith('/temperature') || body.type === 'temperature') {
      const { device_id, storage_code, temperature } = body;

      // Find storage unit ID
      const { data: unit } = await supabase
        .from('storage_units')
        .select('id, min_temp_threshold, max_temp_threshold')
        .eq('storage_code', storage_code || 'ST001')
        .maybeSingle();

      const unitId = unit?.id;
      const tempVal = Number(temperature);

      let status: 'normal' | 'warning' | 'critical' = 'normal';
      if (tempVal > (unit?.max_temp_threshold || 6.0) + 3.0 || tempVal < (unit?.min_temp_threshold || 2.0) - 1.0) {
        status = 'critical';
      } else if (tempVal > (unit?.max_temp_threshold || 6.0) || tempVal < (unit?.min_temp_threshold || 2.0)) {
        status = 'warning';
      }

      // Record reading
      await supabase.from('temperature_readings').insert({
        device_id: device_id || 'ESP32-001',
        storage_unit_id: unitId,
        temperature: tempVal,
        status,
        recorded_at: new Date().toISOString(),
      });

      // Update storage unit current temperature & status
      if (unitId) {
        await supabase
          .from('storage_units')
          .update({ current_temperature: tempVal, status })
          .eq('id', unitId);
      }

      // Trigger alert if abnormal
      if (status !== 'normal') {
        await supabase.from('iot_alerts').insert({
          device_id: device_id || 'ESP32-001',
          storage_unit_id: unitId,
          alert_type: 'temperature_exceeded',
          severity: status === 'critical' ? 'CRITICAL' : 'WARNING',
          message: `Storage Unit ${storage_code || 'ST001'} temperature is ${tempVal}°C (${status.toUpperCase()}).`,
        });
      }

      return new Response(JSON.stringify({ success: true, status, temperature: tempVal }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. ESP32 RFID Scan Event Submission (RC522)
    if (url.pathname.endsWith('/rfid') || body.type === 'rfid') {
      const { device_id, rfid_uid, storage_code, action } = body;

      const { data: unit } = await supabase
        .from('storage_units')
        .select('id')
        .eq('storage_code', storage_code || 'ST001')
        .maybeSingle();

      const { data: bloodUnit } = await supabase
        .from('blood_units')
        .select('*')
        .eq('rfid_uid', rfid_uid)
        .maybeSingle();

      const eventAction = action || (bloodUnit ? 'ENTERED' : 'UNKNOWN_TAG');

      await supabase.from('rfid_events').insert({
        rfid_uid,
        blood_unit_id: bloodUnit?.id || null,
        blood_unit_code: bloodUnit?.blood_unit_code || 'UNKNOWN',
        blood_group: bloodUnit?.blood_group || 'N/A',
        storage_unit_id: unit?.id,
        action: eventAction,
        result: bloodUnit ? 'SUCCESS' : 'FLAGGED',
      });

      if (bloodUnit && unit?.id) {
        await supabase
          .from('blood_units')
          .update({
            storage_unit_id: unit.id,
            status: eventAction === 'DISPATCHED' ? 'DISPATCHED' : 'AVAILABLE',
            last_scanned_at: new Date().toISOString(),
          })
          .eq('id', bloodUnit.id);
      }

      return new Response(JSON.stringify({ success: true, rfid_uid, action: eventAction }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Fire & Emergency Alert Submission (ESP32 Push Button)
    if (url.pathname.endsWith('/emergency') || body.type === 'emergency' || body.emergency_type === 'FIRE' || body.source === 'hardware_button') {
      const emergencyRes = await fetch(`${supabaseUrl}/functions/v1/emergency-call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          device_id: body.device_id || 'BLOOD-BANK-01',
          source: body.source || 'hardware_button',
          emergency_type: body.emergency_type || 'FIRE',
          message: body.message || 'Fire emergency button activated at Blood Bank Unit 01',
        }),
      });

      const data = await emergencyRes.json().catch(() => ({}));
      return new Response(JSON.stringify(data), {
        status: emergencyRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Default Heartbeat Response
    return new Response(JSON.stringify({ success: true, timestamp: new Date().toISOString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
