import { useState, useEffect } from 'react';
import { Card, Button, Input, Select, Badge } from '@/components/ui';
import { Calendar, Clock, CheckCircle2, AlertCircle, Heart, Bell, ShieldCheck } from 'lucide-react';
import { supabase, type Profile } from '@/lib/supabase';

interface DonorEligibilityProps {
  profile: Profile | null;
  onUpdate?: () => void;
}

export function DonorEligibilityCalculator({ profile, onUpdate }: DonorEligibilityProps) {
  const [lastDate, setLastDate] = useState(
    profile?.last_donation_date ? new Date(profile.last_donation_date).toISOString().split('T')[0] : '',
  );
  const [gender, setGender] = useState<'male' | 'female'>(profile?.gender === 'female' ? 'female' : 'male');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Recovery period rules: 90 days for males (whole blood), 120 days for females
  const recoveryDays = gender === 'female' ? 120 : 90;

  let daysElapsed = 999;
  let daysRemaining = 0;
  let progressPercent = 100;
  let nextEligibleDate: Date | null = null;
  let isEligible = true;

  if (lastDate) {
    const last = new Date(lastDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - last.getTime());
    daysElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    nextEligibleDate = new Date(last);
    nextEligibleDate.setDate(nextEligibleDate.getDate() + recoveryDays);

    if (daysElapsed < recoveryDays) {
      isEligible = false;
      daysRemaining = recoveryDays - daysElapsed;
      progressPercent = Math.min(100, Math.round((daysElapsed / recoveryDays) * 100));
    } else {
      isEligible = true;
      daysRemaining = 0;
      progressPercent = 100;
    }
  }

  async function handleSaveDate() {
    if (!profile) return;
    setSaving(true);
    setSavedSuccess(false);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          last_donation_date: lastDate || null,
          gender: gender,
        })
        .eq('id', profile.id);

      if (!error) {
        setSavedSuccess(true);
        if (onUpdate) onUpdate();
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (_) {
    } finally {
      setSaving(false);
    }
  }

  function handleAddCalendarReminder() {
    if (!nextEligibleDate) return;
    const title = 'Blood Donation Eligibility Date — BloodFlow';
    const details = 'You are now eligible to donate blood again! Check active emergency requests on BloodFlow.';
    const startDate = nextEligibleDate.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      title,
    )}&dates=${startDate}/${startDate}&details=${encodeURIComponent(details)}`;
    window.open(googleCalendarUrl, '_blank');
  }

  return (
    <Card className="p-6 mt-6 max-w-2xl bg-gradient-to-br from-white to-red-50/30 border border-red-100">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-600 text-white shadow-xs">
            <Heart className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Donor Eligibility & Recovery Calculator</h3>
            <p className="text-xs text-slate-500">
              Clinical 90-day recovery calculation to safeguard donor health before your next donation.
            </p>
          </div>
        </div>
        <Badge variant={isEligible ? 'green' : 'amber'} dot>
          {isEligible ? 'Eligible Today' : 'Recovery Active'}
        </Badge>
      </div>

      {/* Progress Card */}
      <div className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
        {isEligible ? (
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-xs">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-emerald-700">You Are Fully Eligible to Donate!</span>
                <Badge variant="green">Ready</Badge>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                It has been {lastDate ? `${daysElapsed} days` : 'over 90 days'} since your last donation. Your red blood cells and iron levels are fully restored.
              </p>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-700">
                <Clock className="h-4 w-4 text-amber-600" />
                Recovery In Progress — {daysRemaining} Days Remaining
              </div>
              <span className="text-xs font-extrabold text-slate-700">{progressPercent}% Restored</span>
            </div>

            {/* Progress Bar */}
            <div className="h-3.5 w-full rounded-full bg-slate-100 overflow-hidden p-0.5 border border-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>Last Donated: {lastDate}</span>
              <span className="font-bold text-slate-700">
                Next Eligible Date: {nextEligibleDate?.toLocaleDateString()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Calculator Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <Input
          label="Last Donation Date"
          type="date"
          value={lastDate}
          onChange={setLastDate}
        />
        <Select
          label="Gender Recovery Rule"
          value={gender}
          onChange={(val) => setGender(val as 'male' | 'female')}
          options={[
            { value: 'male', label: 'Male (90 days recovery period)' },
            { value: 'female', label: 'Female (120 days recovery period)' },
          ]}
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button size="sm" onClick={handleSaveDate} disabled={saving} loading={saving}>
          <ShieldCheck className="h-4 w-4 mr-1" /> Save Recovery Date
        </Button>

        {nextEligibleDate && !isEligible && (
          <Button size="sm" variant="outline" onClick={handleAddCalendarReminder}>
            <Bell className="h-4 w-4 text-red-600 mr-1" /> Add Google Calendar Reminder
          </Button>
        )}

        {savedSuccess && (
          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Saved!
          </span>
        )}
      </div>
    </Card>
  );
}
