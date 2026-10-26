import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LuArrowLeft, LuCalendar, LuClock, LuUsers, LuSearch, LuShieldAlert, LuPencil, LuInbox } from 'react-icons/lu';
import api from '../api';
import AppShell from '../components/AppShell';
import { Alert, Badge, Card, EmptyState, Input, PageLoader, Stat, Tabs } from '../components/ui';
import { ProtectionIcons, StatusBadge } from './AdminExamsPage';
import { errorMessage, formatDateTime, formatDuration, formatExamTime, percent } from '../utils';
import { useI18n } from '../i18n';

export const RISK = {
  clean: { label: 'Clean', tone: 'brand' },
  review: { label: 'Review', tone: 'warn' },
  high: { label: 'High risk', tone: 'danger' },
};

export const SUBMIT_REASONS = {
  student: 'Submitted',
  time_up: 'Time ran out',
  violations: 'Auto-submitted for violations',
};

export function RiskBadge({ integrity }) {
  const { t } = useI18n();
  if (!integrity) return null;
  const risk = RISK[integrity.risk] || RISK.clean;
  return <Badge tone={risk.tone}>{t(risk.label)}</Badge>;
}

function ExamResultsPage() {
  const { examId } = useParams();
  const { t, tn } = useI18n();
  const [exam, setExam] = useState(null);
  const [attempts, setAttempts] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([api.get('/admin/exams/'), api.get(`/admin/exams/${examId}/attempts`)])
      .then(([examsRes, attemptsRes]) => {
        setExam(examsRes.data.find((e) => e.id === examId) || null);
        setAttempts(attemptsRes.data);
      })
      .catch((err) => {
        setError(errorMessage(err, 'Failed to load results'));
        setAttempts([]);
      });
  }, [examId]);

  const needsGrading = exam?.questions?.some((q) => q.type === 'text' || q.type === 'image_upload');

  const stats = useMemo(() => {
    const list = attempts || [];
    const submitted = list.filter((a) => a.is_submitted);
    const flagged = list.filter((a) => a.integrity?.risk !== 'clean');
    const avg = submitted.length
      ? Math.round(submitted.reduce((sum, a) => sum + percent(a.score, a.total_possible_score), 0) / submitted.length)
      : null;
    return { started: list.length, submitted: submitted.length, flagged: flagged.length, avg };
  }, [attempts]);

  const shown = (attempts || [])
    .filter((a) => filter === 'all' || (filter === 'review' ? a.integrity?.risk !== 'clean' : !a.is_submitted))
    .filter((a) => {
      const q = search.toLowerCase();
      return !q || a.student?.email?.toLowerCase().includes(q) || a.student?.full_name?.toLowerCase().includes(q);
    })
    // Highest risk first, then by score
    .sort((a, b) => ['high', 'review', 'clean'].indexOf(a.integrity?.risk) - ['high', 'review', 'clean'].indexOf(b.integrity?.risk)
      || (b.score || 0) - (a.score || 0));

  if (attempts === null) return <AppShell><PageLoader /></AppShell>;

  return (
    <AppShell>
      <Link to="/admin-exams" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <LuArrowLeft className="h-4 w-4" /> {t('Exams')}
      </Link>

      {error && <Alert tone="danger" className="mb-6">{error}</Alert>}

      {exam && (
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{exam.title}</h1>
            <StatusBadge exam={exam} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted">
            <span className="flex items-center gap-1.5"><LuCalendar className="h-3.5 w-3.5" />{formatDateTime(exam.start_time)} – {formatExamTime(exam.end_time)}</span>
            <span className="flex items-center gap-1.5"><LuClock className="h-3.5 w-3.5" />{t('{{n}} min', { n: exam.duration_minutes })}</span>
            <span className="flex items-center gap-1.5"><LuUsers className="h-3.5 w-3.5" />{exam.groups?.length ? exam.groups.map((g) => g.name).join(', ') : t('Everyone')}</span>
            <ProtectionIcons exam={exam} />
          </div>
        </div>
      )}

      <Card className="mb-6 grid grid-cols-2 gap-6 p-5 sm:grid-cols-4">
        <Stat label={t('Started')} value={stats.started} />
        <Stat label={t('Submitted')} value={stats.submitted} />
        <Stat label={t('Average score')} value={stats.avg === null ? '—' : `${stats.avg}%`} />
        <Stat label={t('Need review')} value={stats.flagged} tone={stats.flagged ? 'danger' : undefined} hint={t('Integrity flags or violations')} />
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 px-4 pt-3">
          <Tabs
            value={filter}
            onChange={setFilter}
            className="border-b-0"
            tabs={[
              { value: 'all', label: t('All'), count: attempts.length },
              { value: 'review', label: t('Needs review'), count: stats.flagged },
              { value: 'progress', label: t('In progress'), count: attempts.length - stats.submitted },
            ]}
          />
          <div className="relative mb-2 w-full sm:w-64">
            <LuSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('Search students')} className="h-9 pl-9" />
          </div>
        </div>

        {attempts.length === 0 ? (
          <EmptyState icon={LuInbox} title={t('No attempts yet')} className="border-t border-line">
            {t("Students' attempts appear here as soon as they start the exam.")}
          </EmptyState>
        ) : (
          <div className="overflow-x-auto border-t border-line">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('Student')}</th>
                  <th>{t('Status')}</th>
                  <th className="text-right">{t('Score')}</th>
                  <th>{t('Integrity')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shown.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <p className="font-medium">{a.student?.full_name || a.student?.email}</p>
                      {a.student?.full_name && <p className="text-xs text-muted">{a.student.email}</p>}
                    </td>
                    <td>
                      {a.is_submitted ? (
                        <>
                          <p className={a.submit_reason === 'violations' ? 'font-medium text-danger' : ''}>
                            {t(SUBMIT_REASONS[a.submit_reason] || 'Submitted')}
                          </p>
                          <p className="text-xs text-muted">{formatDateTime(a.submitted_at)}</p>
                        </>
                      ) : (
                        <Badge tone="info">{t('In progress')}</Badge>
                      )}
                    </td>
                    <td className="tabular whitespace-nowrap text-right">
                      {a.is_submitted ? (
                        <>
                          <span className="font-medium">{a.score}</span>
                          <span className="text-muted"> / {a.total_possible_score}</span>
                          {needsGrading && !a.is_evaluated && <p className="text-xs text-warn">{t('Not graded yet')}</p>}
                        </>
                      ) : '—'}
                    </td>
                    <td>
                      <div className="flex flex-wrap items-center gap-2">
                        <RiskBadge integrity={a.integrity} />
                        {a.integrity?.violations > 0 && (
                          <span className="text-xs text-muted">
                            {tn(a.integrity.violations, '{{count}} violation', '{{count}} violations')}
                            {a.integrity.seconds_away > 0 && ` · ${t('away {{time}}', { time: formatDuration(a.integrity.seconds_away) })}`}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <Link to={`/admin-integrity/${a.id}`} className="btn btn-ghost btn-sm">
                          <LuShieldAlert className="h-4 w-4" /> {t('Report')}
                        </Link>
                        {needsGrading && a.is_submitted && (
                          <Link to={`/admin-evaluate-answers/${a.id}`} className="btn btn-secondary btn-sm">
                            <LuPencil className="h-4 w-4" /> {t('Grade')}
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {shown.length === 0 && <EmptyState title={t('Nothing here')}>{t('No attempts match this filter.')}</EmptyState>}
          </div>
        )}
      </Card>
    </AppShell>
  );
}

export default ExamResultsPage;
