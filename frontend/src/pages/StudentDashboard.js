import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuClock, LuCalendar, LuListChecks, LuMaximize, LuArrowRight, LuPlay, LuCircleCheck, LuBookOpen } from 'react-icons/lu';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import AppShell from '../components/AppShell';
import { Alert, Badge, Button, Card, EmptyState, PageLoader, cx } from '../components/ui';
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
  return (
    <Card className={cx('flex flex-col p-5', inProgress && 'border-brand/50 ring-1 ring-brand/20')}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold leading-snug">{exam.title}</h3>
        {inProgress ? <Badge tone="brand">In progress</Badge>
          : exam.is_submitted ? <Badge icon={LuCircleCheck}>Submitted</Badge>
            : exam.is_upcoming ? <Badge tone="info">{opensIn(exam.start_time)}</Badge>
              : exam.is_expired ? <Badge>Closed</Badge>
                : <Badge tone="brand">Open now</Badge>}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm text-muted">
        <div className="flex items-center gap-2"><LuClock className="h-4 w-4" />{exam.duration_minutes} min</div>
        <div className="flex items-center gap-2"><LuListChecks className="h-4 w-4" />{exam.question_count} question{exam.question_count === 1 ? '' : 's'}</div>
        <div className="col-span-2 flex items-center gap-2">
          <LuCalendar className="h-4 w-4" />
          {exam.is_upcoming ? `Opens ${formatDateTime(exam.start_time)}` : `Closes ${formatDateTime(exam.end_time)}`}
        </div>
      </dl>

      {(available || inProgress) && (
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <LuMaximize className="h-3.5 w-3.5" /> Runs in fullscreen
          </span>
          <Button size="sm" icon={inProgress ? LuArrowRight : LuPlay} onClick={() => onOpen(exam, attempt)}>
            {inProgress ? 'Continue' : 'Start'}
          </Button>
        </div>
      )}
    </Card>
  );
}

function Section({ title, hint, children }) {
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {hint && <p className="text-xs text-muted">{hint}</p>}
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
      <div className="mb-10">
        <p className="eyebrow mb-1.5">{currentMembership?.organization_name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{greeting()}{firstName && `, ${firstName}`}</h1>
        <p className="mt-1.5 text-sm text-muted">
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
            <Section title="Continue where you left off" hint="The timer keeps running while you're away">
              {inProgress.map((e) => <ExamCard key={e.id} exam={e} attempt={attemptFor(e)} onOpen={open} />)}
            </Section>
          )}
          {available.length > 0 && (
            <Section title="Open now">
              {available.map((e) => <ExamCard key={e.id} exam={e} onOpen={open} />)}
            </Section>
          )}
          {upcoming.length > 0 && (
            <Section title="Upcoming">
              {upcoming.map((e) => <ExamCard key={e.id} exam={e} onOpen={open} />)}
            </Section>
          )}
          {done.length > 0 && (
            <Section title="Done">
              {done.map((e) => <ExamCard key={e.id} exam={e} onOpen={open} />)}
            </Section>
          )}
        </>
      )}
    </AppShell>
  );
}

export default StudentDashboard;
