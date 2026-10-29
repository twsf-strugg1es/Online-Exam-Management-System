import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LuArrowLeft, LuSearch, LuFileQuestion } from 'react-icons/lu';
import api from '../api';
import AppShell from '../components/AppShell';
import {
  Alert, Badge, Button, Card, CardHeader, Checkbox, EmptyState, Field, Input, PageHeader, PageLoader, Select, Switch, cx,
} from '../components/ui';
import { QUESTION_TYPE_LABELS, errorMessage, fromZonedInput, timeZoneLabel, toZonedInput } from '../utils';
import { useI18n } from '../i18n';

const defaultTimes = () => {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start.getTime() + 2 * 3600 * 1000);
  return { start: toZonedInput(start), end: toZonedInput(end) };
};

// New exam (/admin-exams/new) or, with an exam ID, edit one that hasn't opened yet
function ExamFormPage() {
  const navigate = useNavigate();
  const { examId } = useParams();
  const editing = Boolean(examId);
  const { t, tn } = useI18n();
  const times = useMemo(defaultTimes, []);
  const [form, setForm] = useState({ title: '', start: times.start, end: times.end, duration: '60' });
  const [settings, setSettings] = useState({
    shuffle_questions: true,
    shuffle_options: true,
    require_fullscreen: true,
    block_copy_paste: true,
    max_violations: '3',
    results_release: 'immediate',
    show_rank: false,
  });
  const [questions, setQuestions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState(new Set());
  const [marks, setMarks] = useState({}); // questionId -> marks in this exam, when it differs from the bank
  const [selectedGroups, setSelectedGroups] = useState(new Set());
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(null); // 'draft' | 'publish' | 'save'
  const [existing, setExisting] = useState(editing ? null : {}); // the exam being edited

  useEffect(() => {
    api.get('/admin/questions/').then((res) => setQuestions(res.data || [])).catch(() => setQuestions([]));
    api.get('/org/groups').then((res) => setGroups(res.data || [])).catch(() => setGroups([]));
  }, []);

  useEffect(() => {
    if (!editing) return;
    api.get(`/admin/exams/${examId}`)
      .then(({ data }) => {
        setExisting(data);
        setForm({ title: data.title, start: toZonedInput(data.start_time), end: toZonedInput(data.end_time), duration: String(data.duration_minutes) });
        setSettings({
          shuffle_questions: data.shuffle_questions,
          shuffle_options: data.shuffle_options,
          require_fullscreen: data.require_fullscreen,
          block_copy_paste: data.block_copy_paste,
          max_violations: data.max_violations ? String(data.max_violations) : '',
          results_release: data.results_release || 'immediate',
          show_rank: Boolean(data.show_rank),
        });
        setSelectedQuestions(new Set(data.questions.map((q) => q.id)));
        setMarks(Object.fromEntries(data.questions.filter((q) => q.max_score !== q.bank_max_score).map((q) => [q.id, String(q.max_score)])));
        setSelectedGroups(new Set(data.groups.map((g) => g.id)));
      })
      .catch((err) => { setExisting({ edit_blocked: errorMessage(err, 'Exam not found') }); });
  }, [editing, examId]);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const toggleIn = (set, setter, id) => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    setter(next);
  };

  const visibleQuestions = questions.filter((q) => !search || q.title.toLowerCase().includes(search.toLowerCase()));
  const marksFor = (q) => {
    const n = Number(marks[q.id]);
    return Number.isInteger(n) && n >= 1 && n <= 100 ? n : q.max_score;
  };
  const totalPoints = questions.filter((q) => selectedQuestions.has(q.id)).reduce((sum, q) => sum + marksFor(q), 0);

  const windowMinutes = (fromZonedInput(form.end) - fromZonedInput(form.start)) / 60000;
  const scheduleProblem =
    !form.start || !form.end ? null
      : windowMinutes <= 0 ? t('The exam must close after it opens.')
        : Number(form.duration) > windowMinutes ? t('The window is only {{w}} minutes, so students who start late get less time than {{d}} minutes.', { w: Math.round(windowMinutes), d: form.duration })
          : null;

  const submit = async (publish) => {
    if (editing && existing?.edit_blocked) return;
    setError('');
    if (!form.title.trim()) return setError(t('Give the exam a title.'));
    if (!(Number(form.duration) > 0)) return setError(t('Set a duration in minutes.'));
    if (windowMinutes <= 0) return setError(t('The exam must close after it opens.'));
    if (selectedQuestions.size === 0) return setError(t('Pick at least one question.'));
    const badMarks = questions.find((q) => selectedQuestions.has(q.id) && marks[q.id] !== undefined && marks[q.id] !== '' && marksFor(q) !== Number(marks[q.id]));
    if (badMarks) return setError(t('Marks for “{{title}}” must be a whole number from 1 to 100.', { title: badMarks.title }));

    setSaving(editing ? 'save' : publish ? 'publish' : 'draft');
    const payload = {
        title: form.title.trim(),
        // Send real instants (UTC), so the exam opens at the same moment wherever the server runs
        start_time: fromZonedInput(form.start).toISOString(),
        end_time: fromZonedInput(form.end).toISOString(),
        duration_minutes: parseInt(form.duration, 10),
        question_ids: [...selectedQuestions],
        // Only the questions whose marks differ from the question bank
        question_marks: Object.fromEntries(questions.filter((q) => selectedQuestions.has(q.id) && marksFor(q) !== q.max_score).map((q) => [q.id, marksFor(q)])),
        group_ids: [...selectedGroups],
        shuffle_questions: settings.shuffle_questions,
        shuffle_options: settings.shuffle_options,
        require_fullscreen: settings.require_fullscreen,
        block_copy_paste: settings.block_copy_paste,
        max_violations: settings.max_violations ? parseInt(settings.max_violations, 10) : null,
        results_release: settings.results_release,
        show_rank: settings.show_rank,
    };
    try {
      if (editing) {
        await api.put(`/admin/exams/${examId}`, payload); // a published exam stays published
      } else {
        const res = await api.post('/admin/exams/', payload);
        if (publish) await api.post(`/admin/exams/${res.data.id}/publish`);
      }
      navigate('/admin-exams');
    } catch (err) {
      setError(errorMessage(err, editing ? 'Could not save the exam' : 'Could not create the exam'));
      setSaving(null);
    }
  };

  if (!existing) return <AppShell><PageLoader /></AppShell>;
  const locked = editing && existing.edit_blocked;

  return (
    <AppShell>
      <Link to="/admin-exams" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <LuArrowLeft className="h-4 w-4 rtl:-scale-x-100" /> {t('Exams')}
      </Link>
      <PageHeader title={editing ? t('Edit exam') : t('New exam')} />
      {locked && <Alert tone="warn" className="mb-6" title={t('Editing is closed')}>{t(existing.edit_blocked)}</Alert>}

      {/* A disabled fieldset disables every input and switch inside it */}
      <fieldset disabled={!!locked} className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title={t('Details and schedule')} description={t('Students can start any time in the window. Each attempt lasts the duration, but never past the closing time.')} />
            <div className="grid gap-5 p-5 sm:grid-cols-2">
              <Field label={t('Title')} htmlFor="title" className="sm:col-span-2">
                <Input id="title" value={form.title} onChange={update('title')} placeholder={t('e.g. Physics, chapter 3 test')} autoFocus />
              </Field>
              <Field label={t('Opens')} htmlFor="start">
                <Input id="start" type="datetime-local" value={form.start} onChange={update('start')} />
              </Field>
              <Field label={t('Closes')} htmlFor="end">
                <Input id="end" type="datetime-local" value={form.end} onChange={update('end')} />
              </Field>
              <Field label={t('Duration (minutes)')} htmlFor="duration">
                <Input id="duration" type="number" min="1" value={form.duration} onChange={update('duration')} />
              </Field>
              {timeZoneLabel() && (
                <p className="text-sm text-muted sm:col-span-2">
                  {t("Times are in your organization's timezone ({{zone}}), not your device's.", { zone: timeZoneLabel() })}
                </p>
              )}
              {scheduleProblem && <Alert tone="warn" className="sm:col-span-2">{scheduleProblem}</Alert>}
            </div>
          </Card>

          <Card>
            <CardHeader
              title={t('Questions')}
              description={t('Pick from your question bank.')}
              action={<Badge tone={selectedQuestions.size ? 'brand' : 'neutral'}>{t('{{n}} selected', { n: selectedQuestions.size })} · {t('{{n}} pts', { n: totalPoints })}</Badge>}
            />
            {questions.length === 0 ? (
              <EmptyState icon={LuFileQuestion} title={t('Your question bank is empty')}>
                <Link to="/admin-questions" className="link">{t('Import questions')}</Link> {t('first, then come back to build the exam.')}
              </EmptyState>
            ) : (
              <>
                <div className="border-b border-line p-3">
                  <div className="relative">
                    <LuSearch className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('Search questions')} className="ps-9" />
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
                          {t(QUESTION_TYPE_LABELS[q.type] || '')} · {t(q.complexity)} · {tn(q.max_score, '{{count}} pt', '{{count}} pts')}
                        </span>
                      </span>
                      {selectedQuestions.has(q.id) && (
                        <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted">
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            step={1}
                            inputMode="numeric"
                            value={marks[q.id] ?? String(q.max_score)}
                            onChange={(e) => setMarks({ ...marks, [q.id]: e.target.value })}
                            onBlur={() => { if (marks[q.id] === String(q.max_score)) setMarks((m) => { const next = { ...m }; delete next[q.id]; return next; }); }}
                            aria-label={t('Marks for “{{title}}” in this exam', { title: q.title })}
                            className={cx('h-8 w-16 text-end tabular-nums', marksFor(q) !== q.max_score && 'border-brand')}
                          />
                          {t('pts')}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
                <div className="flex gap-2 border-t border-line px-4 py-2.5">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedQuestions(new Set([...selectedQuestions, ...visibleQuestions.map((q) => q.id)]))}>
                    {search ? t('Select shown') : t('Select all')}
                  </Button>
                  {selectedQuestions.size > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setSelectedQuestions(new Set())}>{t('Clear')}</Button>
                  )}
                </div>
              </>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title={t('Who can take it')} />
            <div className="space-y-3 p-5">
              {groups.length === 0 ? (
                <p className="text-sm text-muted">
                  {t('Every student in your organization. To limit it,')} <Link to="/admin-organization" className="link">{t('create groups')}</Link>.
                </p>
              ) : (
                <>
                  {groups.map((g) => (
                    <Checkbox key={g.id} checked={selectedGroups.has(g.id)} onChange={() => toggleIn(selectedGroups, setSelectedGroups, g.id)}>
                      <span className="flex-1">{g.name}</span>
                      <span className="text-xs text-muted">{g.member_count}</span>
                    </Checkbox>
                  ))}
                  <p className="hint">{selectedGroups.size ? t('Only students in the ticked groups.') : t('None ticked: every student in your organization.')}</p>
                </>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title={t('Integrity')} description={t('What the exam page enforces and records.')} />
            <div className="space-y-5 p-5">
              <Switch
                label={t('Require fullscreen')}
                description={t('Questions are hidden whenever the student leaves fullscreen.')}
                checked={settings.require_fullscreen}
                onChange={(v) => setSettings({ ...settings, require_fullscreen: v })}
              />
              <Switch
                label={t('Shuffle question order')}
                description={t('Each student gets their own order.')}
                checked={settings.shuffle_questions}
                onChange={(v) => setSettings({ ...settings, shuffle_questions: v })}
              />
              <Switch
                label={t('Shuffle answer options')}
                checked={settings.shuffle_options}
                onChange={(v) => setSettings({ ...settings, shuffle_options: v })}
              />
              <Switch
                label={t('Block copy and paste')}
                description={t('Attempts are blocked, recorded, and the clipboard is emptied during the exam.')}
                checked={settings.block_copy_paste}
                onChange={(v) => setSettings({ ...settings, block_copy_paste: v })}
              />
              <Field
                label={t('Submit automatically after')}
                htmlFor="maxViolations"
                hint={t('A violation is leaving the exam (another tab, window or app) or exiting fullscreen. Every violation is recorded either way.')}
              >
                <Select id="maxViolations" value={settings.max_violations} onChange={(e) => setSettings({ ...settings, max_violations: e.target.value })}>
                  <option value="">{t('Never (only record violations)')}</option>
                  {[1, 2, 3, 5, 10].map((n) => <option key={n} value={n}>{tn(n, '{{count}} violation', '{{count}} violations')}</option>)}
                </Select>
              </Field>
              <Field
                label={t('Students see their results')}
                htmlFor="resultsRelease"
                hint={t('Until then, students see that their exam was submitted, but not their score or the correct answers.')}
              >
                <Select id="resultsRelease" value={settings.results_release} onChange={(e) => setSettings({ ...settings, results_release: e.target.value })}>
                  <option value="immediate">{t('Right after they submit')}</option>
                  <option value="on_close">{t('When the exam closes')}</option>
                  <option value="manual">{t('When I release them')}</option>
                </Select>
              </Field>
              <Switch
                label={t('Show students their rank')}
                description={t('With their results, students see their place on the merit list, e.g. 3rd of 40.')}
                checked={settings.show_rank}
                onChange={(v) => setSettings({ ...settings, show_rank: v })}
              />
            </div>
          </Card>
        </div>
      </fieldset>

      <div className="sticky bottom-0 z-10 -mx-4 mt-8 border-t border-line bg-paper px-4 py-4 sm:-mx-8 sm:px-8">
        {error && <Alert tone="danger" className="mb-3">{error}</Alert>}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => navigate('/admin-exams')}>{t('Cancel')}</Button>
          {editing ? (
            <Button loading={saving === 'save'} disabled={!!saving || !!locked} onClick={() => submit(false)}>{t('Save changes')}</Button>
          ) : (
            <>
              <Button variant="secondary" loading={saving === 'draft'} disabled={!!saving} onClick={() => submit(false)}>{t('Save as draft')}</Button>
              <Button loading={saving === 'publish'} disabled={!!saving} onClick={() => submit(true)}>{t('Create and publish')}</Button>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}

export default ExamFormPage;
