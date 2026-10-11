import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LuArrowLeft, LuSearch, LuFileQuestion } from 'react-icons/lu';
import api from '../api';
import AppShell from '../components/AppShell';
import {
  Alert, Badge, Button, Card, CardHeader, Checkbox, EmptyState, Field, Input, PageHeader, Select, Switch, cx,
} from '../components/ui';
import { QUESTION_TYPE_LABELS, errorMessage } from '../utils';

// datetime-local inputs work in the browser's local time without a timezone
const toLocalInput = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

const defaultTimes = () => {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start.getTime() + 2 * 3600 * 1000);
  return { start: toLocalInput(start), end: toLocalInput(end) };
};

function ExamFormPage() {
  const navigate = useNavigate();
  const times = useMemo(defaultTimes, []);
  const [form, setForm] = useState({ title: '', start: times.start, end: times.end, duration: '60' });
  const [settings, setSettings] = useState({
    shuffle_questions: true,
    shuffle_options: true,
    require_fullscreen: true,
    block_copy_paste: true,
    max_violations: '3',
  });
  const [questions, setQuestions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState(new Set());
  const [selectedGroups, setSelectedGroups] = useState(new Set());
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(null); // 'draft' | 'publish'

  useEffect(() => {
    api.get('/admin/questions/').then((res) => setQuestions(res.data || [])).catch(() => setQuestions([]));
    api.get('/org/groups').then((res) => setGroups(res.data || [])).catch(() => setGroups([]));
  }, []);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const toggleIn = (set, setter, id) => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    setter(next);
  };

  const visibleQuestions = questions.filter((q) => !search || q.title.toLowerCase().includes(search.toLowerCase()));
  const totalPoints = questions.filter((q) => selectedQuestions.has(q.id)).reduce((sum, q) => sum + q.max_score, 0);

  const windowMinutes = (new Date(form.end) - new Date(form.start)) / 60000;
  const scheduleProblem =
    !form.start || !form.end ? null
      : windowMinutes <= 0 ? 'The exam must close after it opens.'
        : Number(form.duration) > windowMinutes ? `The window is only ${Math.round(windowMinutes)} minutes, so students who start late get less time than ${form.duration} minutes.`
          : null;

  const submit = async (publish) => {
    setError('');
    if (!form.title.trim()) return setError('Give the exam a title.');
    if (!(Number(form.duration) > 0)) return setError('Set a duration in minutes.');
    if (windowMinutes <= 0) return setError('The exam must close after it opens.');
    if (selectedQuestions.size === 0) return setError('Pick at least one question.');

    setSaving(publish ? 'publish' : 'draft');
    try {
      const res = await api.post('/admin/exams/', {
        title: form.title.trim(),
        // Send real instants (UTC), so the exam opens at the same moment wherever the server runs
        start_time: new Date(form.start).toISOString(),
        end_time: new Date(form.end).toISOString(),
        duration_minutes: parseInt(form.duration, 10),
        question_ids: [...selectedQuestions],
        group_ids: [...selectedGroups],
        shuffle_questions: settings.shuffle_questions,
        shuffle_options: settings.shuffle_options,
        require_fullscreen: settings.require_fullscreen,
        block_copy_paste: settings.block_copy_paste,
        max_violations: settings.max_violations ? parseInt(settings.max_violations, 10) : null,
      });
      if (publish) await api.post(`/admin/exams/${res.data.id}/publish`);
      navigate('/admin-exams');
    } catch (err) {
      setError(errorMessage(err, 'Could not create the exam'));
      setSaving(null);
    }
  };

  return (
    <AppShell>
      <Link to="/admin-exams" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <LuArrowLeft className="h-4 w-4" /> Exams
      </Link>
      <PageHeader title="New exam" />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Details and schedule" description="Students can start any time in the window. Each attempt lasts the duration, but never past the closing time." />
            <div className="grid gap-5 p-5 sm:grid-cols-2">
              <Field label="Title" htmlFor="title" className="sm:col-span-2">
                <Input id="title" value={form.title} onChange={update('title')} placeholder="e.g. Physics — Chapter 3 test" autoFocus />
              </Field>
              <Field label="Opens" htmlFor="start">
                <Input id="start" type="datetime-local" value={form.start} onChange={update('start')} />
              </Field>
              <Field label="Closes" htmlFor="end">
                <Input id="end" type="datetime-local" value={form.end} onChange={update('end')} />
              </Field>
              <Field label="Duration (minutes)" htmlFor="duration">
                <Input id="duration" type="number" min="1" value={form.duration} onChange={update('duration')} />
              </Field>
              {scheduleProblem && <Alert tone="warn" className="sm:col-span-2">{scheduleProblem}</Alert>}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Questions"
              description="Pick from your question bank."
              action={<Badge tone={selectedQuestions.size ? 'brand' : 'neutral'}>{selectedQuestions.size} selected · {totalPoints} pts</Badge>}
            />
            {questions.length === 0 ? (
              <EmptyState icon={LuFileQuestion} title="Your question bank is empty">
                <Link to="/admin-questions" className="link">Import questions</Link> first, then come back to build the exam.
              </EmptyState>
            ) : (
              <>
                <div className="border-b border-line p-3">
                  <div className="relative">
                    <LuSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search questions" className="pl-9" />
                  </div>
                </div>
                <div className="max-h-[420px] divide-y divide-line overflow-y-auto">
                  {visibleQuestions.map((q) => (
                    <label
                      key={q.id}
                      className={cx('flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-sunken/50', selectedQuestions.has(q.id) && 'bg-brand-soft/30')}
                    >
                      <input
                        type="checkbox"
                        checked={selectedQuestions.has(q.id)}
                        onChange={() => toggleIn(selectedQuestions, setSelectedQuestions, q.id)}
                        className="mt-0.5 h-4 w-4 accent-[rgb(var(--brand))]"
                      />
                      <span className="min-w-0 flex-1 text-sm">
                        <span className="block font-medium">{q.title}</span>
                        <span className="mt-0.5 block text-xs text-muted">
                          {QUESTION_TYPE_LABELS[q.type]} · {q.complexity} · {q.max_score} pt{q.max_score === 1 ? '' : 's'}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2 border-t border-line px-4 py-2.5">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedQuestions(new Set([...selectedQuestions, ...visibleQuestions.map((q) => q.id)]))}>
                    Select {search ? 'shown' : 'all'}
                  </Button>
                  {selectedQuestions.size > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setSelectedQuestions(new Set())}>Clear</Button>
                  )}
                </div>
              </>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Who can take it" />
            <div className="space-y-3 p-5">
              {groups.length === 0 ? (
                <p className="text-sm text-muted">
                  Every student in your organization. To limit it, <Link to="/admin-organization" className="link">create groups</Link>.
                </p>
              ) : (
                <>
                  {groups.map((g) => (
                    <Checkbox key={g.id} checked={selectedGroups.has(g.id)} onChange={() => toggleIn(selectedGroups, setSelectedGroups, g.id)}>
                      <span className="flex-1">{g.name}</span>
                      <span className="text-xs text-muted">{g.member_count}</span>
                    </Checkbox>
                  ))}
                  <p className="hint">{selectedGroups.size ? 'Only students in the ticked groups.' : 'None ticked: every student in your organization.'}</p>
                </>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Integrity" description="What the exam page enforces and records." />
            <div className="space-y-5 p-5">
              <Switch
                label="Require fullscreen"
                description="Questions are hidden whenever the student leaves fullscreen."
                checked={settings.require_fullscreen}
                onChange={(v) => setSettings({ ...settings, require_fullscreen: v })}
              />
              <Switch
                label="Shuffle question order"
                description="Each student gets their own order."
                checked={settings.shuffle_questions}
                onChange={(v) => setSettings({ ...settings, shuffle_questions: v })}
              />
              <Switch
                label="Shuffle answer options"
                checked={settings.shuffle_options}
                onChange={(v) => setSettings({ ...settings, shuffle_options: v })}
              />
              <Switch
                label="Block copy and paste"
                description="Attempts are blocked and recorded."
                checked={settings.block_copy_paste}
                onChange={(v) => setSettings({ ...settings, block_copy_paste: v })}
              />
              <Field
                label="Submit automatically after"
                htmlFor="maxViolations"
                hint="A violation is leaving the exam (another tab, window or app) or exiting fullscreen. Every violation is recorded either way."
              >
                <Select id="maxViolations" value={settings.max_violations} onChange={(e) => setSettings({ ...settings, max_violations: e.target.value })}>
                  <option value="">Never — only record violations</option>
                  {[1, 2, 3, 5, 10].map((n) => <option key={n} value={n}>{n} violation{n === 1 ? '' : 's'}</option>)}
                </Select>
              </Field>
            </div>
          </Card>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 mt-8 border-t border-line bg-paper/90 px-4 py-4 backdrop-blur sm:-mx-8 sm:px-8">
        {error && <Alert tone="danger" className="mb-3">{error}</Alert>}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => navigate('/admin-exams')}>Cancel</Button>
          <Button variant="secondary" loading={saving === 'draft'} disabled={!!saving} onClick={() => submit(false)}>Save as draft</Button>
          <Button loading={saving === 'publish'} disabled={!!saving} onClick={() => submit(true)}>Create and publish</Button>
        </div>
      </div>
    </AppShell>
  );
}

export default ExamFormPage;
