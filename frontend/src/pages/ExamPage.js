import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  LuArrowLeft, LuArrowRight, LuClock, LuFlag, LuMaximize, LuShieldAlert, LuShieldCheck, LuCheck, LuCloud,
  LuCloudOff, LuLoaderCircle, LuImage, LuMonitorOff, LuClipboard, LuShuffle, LuListChecks, LuCircleAlert, LuEyeOff,
} from 'react-icons/lu';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import useExamIntegrity, { enterFullscreen, exitFullscreen, fullscreenSupported } from '../hooks/useExamIntegrity';
import { Alert, Badge, Button, Card, Logo, Modal, PageLoader, Textarea, cx } from '../components/ui';
import { errorMessage, formatClock, formatDateTime } from '../utils';

const TEXT_SAVE_DELAY = 700; // save written answers once the student pauses typing
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const isAnswered = (value) => value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0);

// --- Before the exam: what will be enforced; the timer starts only when they press Start ---

function RulesScreen({ exam, resuming, onStart, starting, error }) {
  const s = exam.integrity || {};
  const fullscreen = s.require_fullscreen && fullscreenSupported();
  const rules = [
    fullscreen && { icon: LuMaximize, text: 'The exam runs in fullscreen. Questions are hidden whenever you leave fullscreen.' },
    { icon: LuMonitorOff, text: 'Switching to another tab, window or app is recorded and counted as a violation.' },
    s.max_violations
      ? { icon: LuShieldAlert, text: `After ${s.max_violations} violation${s.max_violations === 1 ? '' : 's'} your exam is submitted automatically.`, strong: true }
      : { icon: LuShieldCheck, text: 'Violations are recorded and shown to your examiner.' },
    s.block_copy_paste && { icon: LuClipboard, text: 'Copy, paste and right-click are disabled.' },
    (s.shuffle_questions || s.shuffle_options) && { icon: LuShuffle, text: 'Questions and options are in a different order for every student.' },
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-paper">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Logo />
        <Link to="/student-account" className="btn btn-ghost btn-sm"><LuArrowLeft className="h-4 w-4" />Back</Link>
      </header>
      <main className="mx-auto max-w-xl px-5 pb-16 pt-6">
        <p className="eyebrow mb-2">{resuming ? 'Continue exam' : 'Before you start'}</p>
        <h1 className="text-3xl font-semibold tracking-tight">{exam.title}</h1>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          <span className="flex items-center gap-2"><LuClock className="h-4 w-4" />{exam.duration_minutes} minutes</span>
          <span className="flex items-center gap-2"><LuListChecks className="h-4 w-4" />{exam.question_count} question{exam.question_count === 1 ? '' : 's'}</span>
          <span>Closes {formatDateTime(exam.end_time)}</span>
        </div>

        {resuming && (
          <Alert tone="warn" className="mt-6" title="Your timer has been running">
            It started when you first opened the exam and doesn't pause. Violations recorded earlier still count.
          </Alert>
        )}

        <Card className="mt-8 divide-y divide-line">
          {rules.map(({ icon: Icon, text, strong }) => (
            <div key={text} className="flex gap-3.5 px-5 py-3.5">
              <Icon className={cx('mt-0.5 h-[18px] w-[18px] shrink-0', strong ? 'text-danger' : 'text-muted')} />
              <p className={cx('text-sm leading-relaxed', strong && 'font-medium')}>{text}</p>
            </div>
          ))}
        </Card>

        <p className="mt-6 text-sm leading-relaxed text-muted">
          {resuming ? 'Your saved answers are restored.' : 'Once you start, the timer runs even if you close the page.'} Answers save automatically as you go.
        </p>

        {error && <Alert tone="danger" className="mt-6">{error}</Alert>}

        <Button size="lg" className="mt-8 w-full" onClick={onStart} loading={starting} icon={fullscreen ? LuMaximize : undefined}>
          {resuming ? 'Continue exam' : 'Start exam'}{fullscreen && ' in fullscreen'}
        </Button>
      </main>
    </div>
  );
}

// --- During the exam ---

function Timer({ seconds }) {
  const urgent = seconds <= 60;
  const low = seconds <= 300;
  return (
    <span
      className={cx(
        'tabular flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-sm font-medium',
        urgent ? 'animate-pulse bg-danger text-white' : low ? 'bg-warn-soft text-warn-ink' : 'bg-sunken text-ink',
      )}
      aria-label={`${formatClock(seconds)} left`}
    >
      <LuClock className="h-4 w-4" />
      {formatClock(seconds)}
    </span>
  );
}

function SaveStatus({ status }) {
  const states = {
    saving: [LuLoaderCircle, 'Saving…', 'animate-spin'],
    saved: [LuCloud, 'Saved', ''],
    error: [LuCloudOff, 'Not saved', ''],
  };
  if (!states[status]) return null;
  const [Icon, label, spin] = states[status];
  return (
    <span className={cx('hidden items-center gap-1.5 text-xs sm:flex', status === 'error' ? 'text-danger' : 'text-muted')}>
      <Icon className={cx('h-3.5 w-3.5', spin)} />
      {label}
    </span>
  );
}

function ViolationChip({ count, max }) {
  const tone = !count ? 'text-muted bg-sunken' : max && count >= max - 1 ? 'bg-danger-soft text-danger-ink' : 'bg-warn-soft text-warn-ink';
  return (
    <span className={cx('tabular flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium', tone)} title="Violations recorded">
      {count ? <LuShieldAlert className="h-4 w-4" /> : <LuShieldCheck className="h-4 w-4" />}
      {count}{max ? ` / ${max}` : ''}
    </span>
  );
}

function BlockedOverlay({ integrity, onReturn }) {
  const remaining = integrity.maxViolations ? integrity.maxViolations - integrity.violations : null;
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-paper/95 p-6 backdrop-blur-sm">
      <div className="max-w-md animate-rise-in text-center">
        <span className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-danger-soft text-danger">
          <LuEyeOff className="h-6 w-6" />
        </span>
        <h2 className="text-xl font-semibold">
          {integrity.isAway ? 'You left the exam' : 'Fullscreen is required'}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          The questions are hidden until you come back{integrity.fullscreenLost ? ' to fullscreen' : ''}.
          {integrity.violations > 0 && ` ${integrity.violations} violation${integrity.violations === 1 ? ' has' : 's have'} been recorded.`}
        </p>
        {remaining !== null && remaining > 0 && (
          <p className="mt-3 text-sm font-medium text-danger">
            {remaining === 1 ? 'One more violation and your exam is submitted automatically.' : `${remaining} more and your exam is submitted automatically.`}
          </p>
        )}
        <Button size="lg" className="mt-6" icon={LuMaximize} onClick={onReturn}>Return to the exam</Button>
      </div>
    </div>
  );
}

function QuestionNav({ questions, answers, flagged, current, onJump }) {
  return (
    <div>
      <div className="grid grid-cols-5 gap-1.5">
        {questions.map((q, i) => (
          <button
            key={q.id}
            type="button"
            onClick={() => onJump(i)}
            className={cx(
              'tabular relative h-9 rounded-md border text-sm font-medium transition-colors',
              i === current ? 'border-brand ring-2 ring-brand/25' : 'border-line',
              isAnswered(answers[q.id]) ? 'bg-brand-soft text-brand-ink' : 'bg-surface text-muted hover:bg-sunken',
            )}
            aria-label={`Question ${i + 1}${isAnswered(answers[q.id]) ? ', answered' : ''}${flagged.has(q.id) ? ', marked for review' : ''}`}
          >
            {i + 1}
            {flagged.has(q.id) && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-warn ring-2 ring-surface" />}
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-1.5 text-xs text-muted">
        <p className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-brand-soft ring-1 ring-brand/30" />Answered</p>
        <p className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-warn" />Marked for review</p>
      </div>
    </div>
  );
}

function ChoiceOption({ type, label, checked, onChange }) {
  return (
    <label
      className={cx(
        'flex cursor-pointer items-center gap-3.5 rounded-lg border px-4 py-3.5 transition-colors',
        checked ? 'border-brand bg-brand-soft/50' : 'border-line bg-surface hover:border-muted/40 hover:bg-sunken/40',
      )}
    >
      <span
        className={cx(
          'grid h-5 w-5 shrink-0 place-items-center border-2 transition-colors',
          type === 'radio' ? 'rounded-full' : 'rounded-[5px]',
          checked ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface',
        )}
      >
        {checked && (type === 'radio' ? <span className="h-1.5 w-1.5 rounded-full bg-on-brand" /> : <LuCheck className="h-3.5 w-3.5" />)}
      </span>
      <input type={type} className="sr-only" checked={checked} onChange={onChange} />
      <span className="text-[15px]">{label}</span>
    </label>
  );
}

function QuestionBody({ question, value, onChange, onImage, onPickFile }) {
  if (question.type === 'single_choice') {
    return (
      <div className="space-y-2.5" role="radiogroup">
        {(question.options || []).map((option) => (
          <ChoiceOption key={option} type="radio" label={option} checked={value === option} onChange={() => onChange(option)} />
        ))}
      </div>
    );
  }
  if (question.type === 'multi_choice') {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className="space-y-2.5">
        <p className="text-xs text-muted">Select all that apply.</p>
        {(question.options || []).map((option) => (
          <ChoiceOption
            key={option}
            type="checkbox"
            label={option}
            checked={selected.includes(option)}
            onChange={() => onChange(selected.includes(option) ? selected.filter((o) => o !== option) : [...selected, option])}
          />
        ))}
      </div>
    );
  }
  if (question.type === 'text') {
    return (
      <Textarea
        rows={10}
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value, { debounce: true })}
        placeholder="Write your answer here"
        className="text-[15px]"
        spellCheck={false}
      />
    );
  }
  if (question.type === 'image_upload') {
    return (
      <div>
        <label
          className="flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-line px-6 py-10 text-center transition-colors hover:border-muted/50 hover:bg-sunken/40"
          onClick={onPickFile}
        >
          <LuImage className="h-8 w-8 text-muted" />
          <span className="mt-3 text-sm font-medium">{value?.name ? 'Choose a different image' : 'Upload an image of your answer'}</span>
          <span className="mt-1 text-xs text-muted">JPG or PNG, up to 2 MB</span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && onImage(e.target.files[0])} />
        </label>
        {value?.preview && (
          <img src={value.preview} alt="Your uploaded answer" className="mt-4 max-h-80 rounded-lg border border-line object-contain" />
        )}
      </div>
    );
  }
  return null;
}

// --- After the exam ---

const SUBMIT_MESSAGES = {
  violations: { tone: 'danger', title: 'Your exam was submitted automatically', text: 'The violation limit was reached. Your examiner can see what was recorded.' },
  time_up: { tone: 'warn', title: 'Time ran out', text: 'Your exam was submitted with the answers you had saved.' },
};

function ResultsScreen({ results, submitReason }) {
  const attempt = results.attempt || {};
  const exam = results.exam || {};
  const answerMap = Object.fromEntries((attempt.answers || []).map((a) => [a.question_id, a.answer_data]));
  const objective = (exam.questions || []).filter((q) => q.type === 'single_choice' || q.type === 'multi_choice');
  const objectivePoints = objective.reduce((sum, q) => sum + (q.max_score || 0), 0);
  const manual = (exam.questions || []).some((q) => q.type === 'text' || q.type === 'image_upload');
  const reason = SUBMIT_MESSAGES[submitReason || attempt.submit_reason];

  const fmt = (v) => (Array.isArray(v) ? v.join(', ') : v && typeof v === 'object' ? v.name || 'Image uploaded' : v ?? '—');
  const isCorrect = (q) => {
    if (q.correct_answers == null) return null;
    const norm = (v) => (Array.isArray(v) ? v.map(String).sort() : [String(v)]).join('|');
    return norm(q.correct_answers) === norm(answerMap[q.id] ?? []);
  };

  return (
    <div className="min-h-screen bg-paper">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Logo />
        <Link to="/student-account" className="btn btn-secondary btn-sm">Back to exams</Link>
      </header>
      <main className="mx-auto max-w-2xl px-5 pb-16 pt-6">
        <p className="eyebrow mb-2">Submitted</p>
        <h1 className="text-3xl font-semibold tracking-tight">{exam.title}</h1>

        {reason && <Alert tone={reason.tone} title={reason.title} className="mt-6">{reason.text}</Alert>}

        <Card className="mt-6 flex flex-wrap items-center justify-between gap-6 p-6">
          <div>
            <p className="text-sm text-muted">{manual ? 'Score so far' : 'Your score'}</p>
            {manual && objectivePoints === 0 ? (
              <p className="mt-1 text-2xl font-semibold tracking-tight">Awaiting grading</p>
            ) : (
              <p className="tabular mt-1 text-4xl font-semibold tracking-tight">
                {attempt.score ?? 0}
                <span className="text-xl font-normal text-muted"> / {manual ? objectivePoints : attempt.total_possible_score}</span>
              </p>
            )}
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-muted">
            {manual
              ? 'Multiple-choice questions are graded. Written and image answers are graded by your examiner; check Results later for your final score.'
              : 'All questions were graded automatically.'}
          </p>
        </Card>

        <h2 className="mb-3 mt-10 text-[15px] font-semibold">Your answers</h2>
        {exam.answers_revealed === false && (
          <Alert tone="info" className="mb-4">Correct answers are shown after the exam closes for everyone ({formatDateTime(exam.end_time)}).</Alert>
        )}
        <div className="space-y-2.5">
          {(exam.questions || []).map((q, i) => {
            const correct = isCorrect(q);
            return (
              <Card key={q.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium"><span className="tabular mr-2 text-muted">{i + 1}.</span>{q.title}</p>
                  {correct === true && <Badge tone="brand">Correct</Badge>}
                  {correct === false && <Badge tone="danger">Incorrect</Badge>}
                  {correct === null && (q.type === 'text' || q.type === 'image_upload') && <Badge>Graded later</Badge>}
                </div>
                <p className="mt-2 text-sm text-muted">Your answer: <span className="text-ink">{fmt(answerMap[q.id])}</span></p>
                {exam.answers_revealed && q.correct_answers != null && correct === false && (
                  <p className="mt-1 text-sm text-muted">Correct answer: <span className="font-medium text-brand">{fmt(q.correct_answers)}</span></p>
                )}
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}

// --- The page ---

function ExamPage() {
  const { id: examIdParam, attemptId: resumeAttemptId } = useParams();
  const navigate = useNavigate();
  const { refreshSession } = useAuth();

  const [phase, setPhase] = useState('loading'); // loading | rules | running | finished | error
  const [meta, setMeta] = useState(null); // exam summary for the rules screen
  const [session, setSession] = useState(null); // { exam, attempt, integrity } from start/resume
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [flagged, setFlagged] = useState(new Set());
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const [submitReason, setSubmitReason] = useState(null);
  const [showWarning, setShowWarning] = useState(false);

  const deadline = useRef(null);
  const saveTimers = useRef({}); // questionId -> { id, flush } for written answers waiting to be saved
  const finishing = useRef(false);
  const attemptId = session?.attempt?.id;

  // Load the exam summary (and any unfinished attempt) for the rules screen
  useEffect(() => {
    Promise.all([api.get('/student/exams/'), api.get('/student/unfinished-attempts/')])
      .then(([examsRes, unfinishedRes]) => {
        const attempt = resumeAttemptId
          ? unfinishedRes.data.find((a) => a.id === resumeAttemptId)
          : unfinishedRes.data.find((a) => a.exam_id === examIdParam);
        const examId = resumeAttemptId ? attempt?.exam_id : examIdParam;
        const exam = examsRes.data.find((e) => e.id === examId);
        if (!exam) throw new Error('This exam is not available to you.');
        if (exam.is_submitted && !attempt) throw new Error("You've already submitted this exam.");
        setMeta({ ...exam, resumeAttemptId: attempt?.id });
        setPhase('rules');
      })
      .catch((err) => {
        setError(err.response ? errorMessage(err) : err.message);
        setPhase('error');
      });
  }, [examIdParam, resumeAttemptId]);

  const finish = useCallback(async (reason) => {
    if (finishing.current) return;
    finishing.current = true;
    Object.values(saveTimers.current).forEach((pending) => clearTimeout(pending.id));
    if (reason) setSubmitReason(reason);
    exitFullscreen();
    setPhase('finished');
    try {
      const res = await api.get(`/student/attempts/${attemptId}/results`);
      setResults(res.data);
    } catch (err) {
      setError(errorMessage(err, 'Your exam was submitted, but the results could not be loaded.'));
    }
  }, [attemptId]);

  const integrity = useExamIntegrity({
    attemptId,
    settings: session?.integrity,
    active: phase === 'running',
    initialViolations: session?.integrity?.violations || 0,
    onSubmitted: (reason) => finish(reason),
  });

  // Show the warning banner for a few seconds after each violation
  useEffect(() => {
    if (!integrity.lastViolation) return undefined;
    setShowWarning(true);
    const t = setTimeout(() => setShowWarning(false), 7000);
    return () => clearTimeout(t);
  }, [integrity.lastViolation]);

  const start = async () => {
    setError('');
    setStarting(true);
    // Fullscreen must be requested directly in the click, before any network call
    if (meta.integrity?.require_fullscreen) enterFullscreen();
    try {
      const res = meta.resumeAttemptId
        ? await api.post(`/student/attempts/${meta.resumeAttemptId}/resume`)
        : await api.post(`/student/exams/${meta.id}/start`);

      if (res.data.exam?.auto_submitted) {
        setSession(res.data);
        setSubmitReason('time_up');
        exitFullscreen();
        setPhase('finished');
        setResults((await api.get(`/student/attempts/${res.data.attempt.id}/results`)).data);
        return;
      }

      const saved = await api.get(`/student/attempts/${res.data.attempt.id}/answers`);
      setAnswers(Object.fromEntries(saved.data.map((a) => [a.question_id, a.answer_data])));
      try {
        setFlagged(new Set(JSON.parse(sessionStorage.getItem(`flagged:${res.data.attempt.id}`) || '[]')));
      } catch {
        // nothing flagged
      }
      deadline.current = Date.now() + res.data.exam.time_remaining_seconds * 1000;
      setSecondsLeft(res.data.exam.time_remaining_seconds);
      setSession(res.data);
      setPhase('running');
    } catch (err) {
      exitFullscreen();
      setError(errorMessage(err, 'Could not start the exam'));
    } finally {
      setStarting(false);
    }
  };

  const submit = useCallback(async () => {
    setSubmitting(true);
    try {
      // Send any answer still waiting for its typing pause
      await Promise.all(Object.values(saveTimers.current).map((pending) => pending.flush()));
      const res = await api.post(`/student/attempts/${attemptId}/submit`);
      setConfirmSubmit(false);
      finish(res.data.submit_reason);
    } catch (err) {
      if (err.response?.status === 400) finish(); // already submitted (e.g. by the violation limit)
      else setError(errorMessage(err, 'Could not submit. Check your connection and try again.'));
    } finally {
      setSubmitting(false);
    }
  }, [attemptId, finish]);

  // Countdown from the server's remaining time; submits when it reaches zero
  useEffect(() => {
    if (phase !== 'running') return undefined;
    const tick = setInterval(() => {
      const left = Math.max(0, Math.round((deadline.current - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) {
        clearInterval(tick);
        submit();
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [phase, submit]);

  // Keep the student signed in for the whole exam
  useEffect(() => {
    if (phase !== 'running') return undefined;
    refreshSession();
    const keepAlive = setInterval(refreshSession, 60 * 1000);
    return () => clearInterval(keepAlive);
  }, [phase, refreshSession]);

  const persist = useCallback(async (questionId, value) => {
    setSaveStatus('saving');
    try {
      await api.post(`/student/attempts/${attemptId}/save-answer`, { question_id: questionId, answer_data: value });
      setSaveStatus('saved');
    } catch (err) {
      setSaveStatus('error');
      const detail = err.response?.data?.detail || '';
      if (/submitted|time is over/i.test(detail)) finish();
    }
  }, [attemptId, finish]);

  const answer = (questionId, value, { debounce = false } = {}) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    clearTimeout(saveTimers.current[questionId]?.id);
    delete saveTimers.current[questionId];
    if (!debounce) {
      persist(questionId, value);
      return;
    }
    setSaveStatus('saving');
    // setTimeout returns a plain number in browsers, so keep the timer and its flush together
    const pending = {
      id: setTimeout(() => pending.flush(), TEXT_SAVE_DELAY),
      flush: () => {
        clearTimeout(pending.id);
        delete saveTimers.current[questionId];
        return persist(questionId, value);
      },
    };
    saveTimers.current[questionId] = pending;
  };

  const uploadImage = (questionId, file) => {
    if (file.size > MAX_IMAGE_BYTES) {
      setError('That image is larger than 2 MB. Take a smaller photo or crop it.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => answer(questionId, {
      name: file.name, size: file.size, type: file.type, lastModified: file.lastModified, preview: e.target.result,
    });
    reader.readAsDataURL(file);
  };

  const toggleFlag = (questionId) => {
    const next = new Set(flagged);
    next.has(questionId) ? next.delete(questionId) : next.add(questionId);
    setFlagged(next);
    try {
      sessionStorage.setItem(`flagged:${attemptId}`, JSON.stringify([...next]));
    } catch {
      // flags just won't survive a reload
    }
  };

  const questions = useMemo(() => session?.exam?.questions || [], [session]);
  const answeredCount = questions.filter((q) => isAnswered(answers[q.id])).length;

  if (phase === 'loading') return <div className="min-h-screen bg-paper"><PageLoader /></div>;

  if (phase === 'error') {
    return (
      <div className="grid min-h-screen place-items-center bg-paper p-6">
        <Card className="max-w-md p-8 text-center">
          <LuCircleAlert className="mx-auto h-8 w-8 text-muted" />
          <p className="mt-4 font-medium">{error}</p>
          <Button variant="secondary" className="mt-6" onClick={() => navigate('/student-account')}>Back to exams</Button>
        </Card>
      </div>
    );
  }

  if (phase === 'rules') {
    return <RulesScreen exam={meta} resuming={Boolean(meta.resumeAttemptId)} onStart={start} starting={starting} error={error} />;
  }

  if (phase === 'finished') {
    if (results) return <ResultsScreen results={results} submitReason={submitReason} />;
    return (
      <div className="min-h-screen bg-paper">
        {error ? <div className="mx-auto max-w-md p-10"><Alert tone="warn">{error}</Alert></div> : <PageLoader label="Submitting…" />}
      </div>
    );
  }

  const question = questions[current];
  const isLast = current === questions.length - 1;
  const remainingViolations = integrity.maxViolations ? integrity.maxViolations - integrity.violations : null;

  return (
    <div className={cx('min-h-screen bg-paper', session.integrity.block_copy_paste && 'select-none')}>
      {integrity.blocked && <BlockedOverlay integrity={integrity} onReturn={() => integrity.requireFullscreen && enterFullscreen()} />}

      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6">
          <Logo compact />
          <p className="min-w-0 flex-1 truncate text-sm font-medium">{session.exam.title}</p>
          <SaveStatus status={saveStatus} />
          <ViolationChip count={integrity.violations} max={integrity.maxViolations} />
          <Timer seconds={secondsLeft ?? 0} />
          <Button size="sm" onClick={() => setConfirmSubmit(true)}>Submit</Button>
        </div>
        {showWarning && (
          <div className="animate-fade-in border-t border-danger/20 bg-danger-soft px-4 py-2 text-center text-sm text-danger-ink">
            Violation recorded ({integrity.violations}{integrity.maxViolations ? ` of ${integrity.maxViolations}` : ''}).
            {remainingViolations === 1 && ' One more and your exam is submitted automatically.'}
            {remainingViolations > 1 && ` ${remainingViolations} more and your exam is submitted automatically.`}
          </div>
        )}
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:py-10">
        <aside className="order-last lg:order-first">
          <div className="lg:sticky lg:top-24">
            <p className="mb-3 text-xs text-muted">{answeredCount} of {questions.length} answered</p>
            <QuestionNav questions={questions} answers={answers} flagged={flagged} current={current} onJump={setCurrent} />
          </div>
        </aside>

        <main className="min-w-0">
          {error && <Alert tone="danger" className="mb-4" onClose={() => setError('')}>{error}</Alert>}
          {question && (
            <Card className="p-6 sm:p-8">
              <div className="mb-5 flex items-center justify-between gap-3 text-sm text-muted">
                <span className="tabular">Question {current + 1} of {questions.length}</span>
                <span>{question.max_score} point{question.max_score === 1 ? '' : 's'}</span>
              </div>
              <h2 className="mb-7 text-xl font-medium leading-relaxed">
                {question.title}
              </h2>
              <QuestionBody
                question={question}
                value={answers[question.id]}
                onChange={(value, opts) => answer(question.id, value, opts)}
                onImage={(file) => uploadImage(question.id, file)}
                onPickFile={integrity.allowFilePicker}
              />
            </Card>
          )}

          <div className="mt-5 flex items-center justify-between gap-2">
            <Button variant="secondary" icon={LuArrowLeft} disabled={current === 0} onClick={() => setCurrent(current - 1)}>Previous</Button>
            <Button
              variant="ghost"
              icon={LuFlag}
              onClick={() => toggleFlag(question.id)}
              className={cx(flagged.has(question?.id) && 'text-warn hover:text-warn')}
            >
              <span className="hidden sm:inline">{flagged.has(question?.id) ? 'Marked for review' : 'Mark for review'}</span>
            </Button>
            {isLast ? (
              <Button onClick={() => setConfirmSubmit(true)}>Review and submit</Button>
            ) : (
              <Button iconRight={LuArrowRight} onClick={() => setCurrent(current + 1)}>Next</Button>
            )}
          </div>
        </main>
      </div>

      <Modal
        open={confirmSubmit}
        onClose={() => setConfirmSubmit(false)}
        title="Submit your exam?"
        description="You can't change your answers after submitting."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmSubmit(false)}>Keep working</Button>
            <Button onClick={submit} loading={submitting}>Submit exam</Button>
          </>
        }
      >
        <div className="space-y-2 text-sm">
          <p className="flex justify-between"><span className="text-muted">Answered</span><span className="tabular font-medium">{answeredCount} of {questions.length}</span></p>
          {flagged.size > 0 && <p className="flex justify-between"><span className="text-muted">Marked for review</span><span className="tabular font-medium">{flagged.size}</span></p>}
          <p className="flex justify-between"><span className="text-muted">Time left</span><span className="tabular font-mono">{formatClock(secondsLeft ?? 0)}</span></p>
          {answeredCount < questions.length && (
            <Alert tone="warn" className="mt-3">{questions.length - answeredCount} question{questions.length - answeredCount === 1 ? ' is' : 's are'} unanswered.</Alert>
          )}
        </div>
      </Modal>
    </div>
  );
}

export default ExamPage;
