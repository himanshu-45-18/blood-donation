import { useCallback, useEffect, useState } from 'react';
import { Award, Edit3, Plus, Save, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button, Card, EmptyState, Input, Modal, Badge } from '@/components/ui';
import { supabase, type RewardRule } from '@/lib/supabase';

const emptyForm = { donation_count: '2', points: '5', title: '', description: '', badge: '' };

export function RewardManagement() {
  const [rules, setRules] = useState<RewardRule[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadRules = useCallback(async () => {
    const { data } = await supabase.from('reward_rules').select('*').order('donation_count');
    setRules(data || []);
  }, []);

  useEffect(() => { loadRules(); }, [loadRules]);

  function startEdit(rule?: RewardRule) {
    setEditingId(rule?.id || null);
    setForm(rule ? { donation_count: String(rule.donation_count), points: String(rule.points), title: rule.title, description: rule.description, badge: rule.badge } : emptyForm);
    setError('');
    setOpen(true);
  }

  async function saveRule() {
    const donationCount = Number(form.donation_count);
    const points = Number(form.points);
    if (!donationCount || !points || !form.title.trim()) { setError('Donation count, points, and title are required.'); return; }
    setSaving(true); setError('');
    const payload = { donation_count: donationCount, points, title: form.title.trim(), description: form.description.trim(), badge: form.badge.trim() };
    const result = editingId
      ? await supabase.from('reward_rules').update(payload).eq('id', editingId)
      : await supabase.from('reward_rules').insert(payload);
    setSaving(false);
    if (result.error) { setError(result.error.message); return; }
    setOpen(false); loadRules();
  }

  async function toggleRule(rule: RewardRule) {
    await supabase.from('reward_rules').update({ active: !rule.active }).eq('id', rule.id);
    loadRules();
  }

  return (
    <>
      <Card className="p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div><h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><Award className="h-5 w-5 text-amber-600" /> Reward Management</h2><p className="mt-1 text-xs text-slate-500">Configure milestone incentives for verified donations.</p></div>
          <Button size="sm" onClick={() => startEdit()}><Plus className="h-4 w-4" /> Add rule</Button>
        </div>
        {rules.length === 0 ? <EmptyState icon={<Award className="h-6 w-6" />} title="No reward rules" description="Create the first incentive milestone for donors." /> : <div className="mt-5 space-y-2.5">{rules.map((rule) => <div key={rule.id} className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><Award className="h-5 w-5" /></div><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold text-slate-900">{rule.title}</p><Badge variant={rule.active ? 'green' : 'gray'}>{rule.active ? 'Active' : 'Inactive'}</Badge></div><p className="mt-1 text-xs text-slate-500">{rule.donation_count} donations · {rule.points} points · {rule.badge || 'No badge'}</p></div></div><div className="flex items-center gap-2"><Button size="xs" variant="outline" onClick={() => startEdit(rule)}><Edit3 className="h-3.5 w-3.5" /> Edit</Button><Button size="xs" variant="ghost" onClick={() => toggleRule(rule)}>{rule.active ? <ToggleRight className="h-4 w-4 text-emerald-600" /> : <ToggleLeft className="h-4 w-4" />}<span className="sr-only">Toggle rule</span></Button></div></div>)}</div>}
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title={editingId ? 'Edit Reward Rule' : 'Create Reward Rule'} description="Rules apply only when a hospital verifies a completed donation.">
        <div className="space-y-4"><div className="grid grid-cols-2 gap-3"><Input label="Required donations" type="number" min="1" value={form.donation_count} onChange={(value) => setForm({ ...form, donation_count: value })} /><Input label="Reward points" type="number" min="1" value={form.points} onChange={(value) => setForm({ ...form, points: value })} /></div><Input label="Reward title" value={form.title} onChange={(value) => setForm({ ...form, title: value })} placeholder="Community Supporter" /><Input label="Badge" value={form.badge} onChange={(value) => setForm({ ...form, badge: value })} placeholder="Community Hero" /><Input label="Description" value={form.description} onChange={(value) => setForm({ ...form, description: value })} placeholder="Complete three verified donations." />{error && <p className="rounded-lg bg-emergency-50 p-3 text-xs text-emergency-700">{error}</p>}<div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={saveRule} loading={saving}><Save className="h-4 w-4" /> Save rule</Button></div></div>
      </Modal>
    </>
  );
}