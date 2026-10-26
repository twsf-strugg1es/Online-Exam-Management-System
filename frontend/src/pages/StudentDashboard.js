import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuBookOpen } from 'react-icons/lu';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import AppShell from '../components/AppShell';
import { Alert, Button, Card, EmptyState, PageLoader, cx } from '../components/ui';
import { errorMessage, formatDateTime } from '../utils';

const greeting = () => {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
};

const opensIn = (start) => {
  const minutes = Math.round((new Date(start) - Date.now()) / 60000);
  if (minutes < 60) return `Opens in ${Math.max(1, minutes)} min`;
  if (minutes < 24 * 60) return `Opens in ${Math.round(minutes / 60)} h`;
  return `Opens ${formatDateTime(start)}`;
};

function ExamCard({ exam, attempt, onOpen }) {
  const inProgress = Boolean(attempt);
  const available = exam.is_active && !exam.is_submitted;
  const [label, tone, dot] = inProgress ? ['In progress, timer running', 'text-warn', 'bg-current']
    : exam.is_submitted ? ['Submitted', 'text-faint', 'bg-current opacity-50']
      : exam.is_upcoming ? [opensIn(exam.start_time), 'text-ink', 'bg-[linear-gradient(90deg,currentColor_50%,transparent_50%)]']
        : exam.is_expired ? ['Closed', 'text-faint', '']
          : ['Open now', 'text-brand', 'bg-current'];
  return (
    <article className={cx('sheet flex flex-col px-5 pb-4 pt-5', inProgress && 'border-warn/60')}>
      <h3 className="text-[1.05rem] font-semibold leading-snug">{exam.title}</h3>
      <p className={cx('mt-2 flex items-center gap-2 text-sm font-medium', tone)}>
        <span className={cx('status-dot', dot)} aria-hidden="true" />{label}
      </p>
      <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-3 font-mono text-[13px]">
        <div><dt className="eyebrow">Time</dt><dd className="tabular mt-1">{exam.duration_minutes} min</dd></div>
        <div><dt className="eyebrow">Qs</dt><dd className="tabular mt-1">{exam.question_count}</dd></div>
        <div><dt className="eyebrow">{exam.is_upcoming ? 'Opens' : 'Closes'}</dt><dd className="tabular mt-1">{new Date(exam.is_upcoming ? exam.start_time : exam.end_time).toLocaleDateString([], { day: 'numeric', month: 'short' })}</dd></div>
      </dl>
      {(available || inProgress) && (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
          <span className="font-mono text-xs text-faint">{exam.integrity?.require_fullscreen ? 'Runs in fullscreen' : 'Timed exam'}</span>
          <Button size="sm" onClick={() => onOpen(exam, attempt)}>{inProgress ? 'Continue' : 'Start'}</Button>
        </div>
      )}
    </article>
  );
}

function Section({ title, hint, count, children }) {
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-baseline justify-between gap-3 border-b border-line-strong pb-2">
        <h2 className="flex items-baseline gap-2.5 text-[15px] font-semibold">{title}<span className="tabular font-mono text-xs font-normal text-faint">{count}</span></h2>
        {hint && <p className="font-mono text-xs text-faint">{hint}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}

function StudentDashboard() {
  const { user, currentMembership } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState(null);
  const [unfinished, setUnfinished] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/student/exams/'), api.get('/student/unfinished-attempts/')])
      .then(([examsRes, attemptsRes]) => {
        setExams(examsRes.data);
        setUnfinished(attemptsRes.data);
      })
      .catch((err) => {
        setError(errorMessage(err, 'Failed to load exams'));
        setExams([]);
      });
  }, []);

  const attemptFor = (exam) => unfinished.find((a) => a.exam_id === exam.id);
  const open = (exam, attempt) => navigate(attempt ? `/exam/resume/${attempt.id}` : `/exam/${exam.id}`);

  const list = exams || [];
  const inProgress = list.filter((e) => attemptFor(e) && !e.is_expired && !e.is_submitted);
  const available = list.filter((e) => e.is_active && !e.is_submitted && !attemptFor(e));
  const upcoming = list.filter((e) => e.is_upcoming).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  const done = list.filter((e) => (e.is_submitted || e.is_expired) && !inProgress.includes(e));
  const firstName = (user?.full_name || '').split(' ')[0];

  return (
    <AppShell>
      <div className="mb-10 border-b-2 border-ink pb-5">
        <p className="eyebrow mb-2">{currentMembership?.organization_name}</p>
        <h1 className="text-[2rem] font-semibold leading-none tracking-[-0.025em]">{greeting()}{firstName && `, ${firstName}`}</h1>
        <p className="mt-2.5 text-sm text-muted">
          {available.length + inProgress.length
            ? `You have ${available.length + inProgress.length} exam${available.length + inProgress.length === 1 ? '' : 's'} you can take right now.`
            : upcoming.length ? `Your next exam ${opensIn(upcoming[0].start_time).toLowerCase()}.` : 'No exams are open right now.'}
        </p>
      </div>

      {error && <Alert tone="danger" className="mb-6">{error}</Alert>}

      {exams === null ? (
        <PageLoader />
      ) : list.length === 0 ? (
        <Card>
          <EmptyState icon={LuBookOpen} title="No exams yet">
            When {currentMembership?.organization_name || 'your organization'} publishes an exam for you, it appears here.
          </EmptyState>
        </Card>
      ) : (
        <>
          {inProgress.length > 0 && (
            <Section title="Continue where you left off" count={inProgress.length} hint="The timer keeps running while you're away">
              {inProgress.map((e) => <ExamCard key={e.id} exam={e} attempt={attemptFor(e)} onOpen={open} />)}
            </Section>
          )}
          {available.length > 0 && (
            <Section title="Open now" count={available.length}>
              {available.map((e) => <ExamCard key={e.id} exam={e} onOpen={open} />)}
            </Section>
          )}
          {upcoming.length > 0 && (
            <Section title="Upcoming" count={upcoming.length}>
              {upcoming.map((e) => <ExamCard key={e.id} exam={e} onOpen={open} />)}
            </Section>
          )}
          {done.length > 0 && (
            <Section title="Done" count={done.length}>
              {done.map((e) => <ExamCard key={e.id} exam={e} onOpen={open} />)}
            </Section>
          )}
        </>
      )}
    </AppShell>
  );
}

export default StudentDashboard;
