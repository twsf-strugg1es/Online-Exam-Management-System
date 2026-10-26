import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LuArrowLeft, LuImage, LuCircleAlert } from 'react-icons/lu';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import useExamIntegrity, { clearClipboard, enterFullscreen, exitFullscreen, fullscreenSupported } from '../hooks/useExamIntegrity';
import { Alert, Badge, Button, Card, Logo, LogoMark, Modal, PageLoader, Textarea, cx } from '../components/ui';
import { errorMessage, formatClock, formatDateTime } from '../utils';

const TEXT_SAVE_DELAY = 700; // save written answers once the student pauses typing
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const isAnswered = (value) => value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0);

// --- Before the exam: what will be enforced; the timer starts only when they press Start ---

function RulesScreen({ exam, resuming, onStart, starting, error }) {
  const s = exam.integrity || {};
  const fullscreen = s.require_fullscreen && fullscreenSupported();
  const rules = [
    fullscreen && { text: 'The exam runs in fullscreen. Questions are hidden whenever you leave fullscreen.' },
    { text: 'Switching to another tab, window or app is recorded and counted as a violation.' },
    s.max_violations
      ? { text: `After ${s.max_violations} violation${s.max_violations === 1 ? '' : 's'} your exam is submitted automatically.`, strong: true }
      : { text: 'Violations are recorded and shown to your examiner.' },
    s.block_copy_paste && { text: 'Copy, paste and right-click are disabled. Your clipboard is emptied when you start and each time you come back.' },
    (s.shuffle_questions || s.shuffle_options) && { text: 'Questions and options are in a different order for every student.' },
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-paper">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Logo />
        <Link to="/student-account" className="btn btn-ghost btn-sm"><LuArrowLeft className="h-4 w-4" />Back</Link>
      </header>
      <main className="sheet sheet-margin mx-auto mb-16 mt-4 max-w-2xl px-6 pb-10 pt-9 sm:pl-14 sm:pr-12">
        <div className="flex items-baseline justify-between gap-4 border-b-2 border-ink pb-3.5">
          <h1 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.02em]">{exam.title}</h1>
          <span className="eyebrow shrink-0">{resuming ? 'Continue' : 'Instructions'}</span>
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-4 border-b border-line pb-4 font-mono text-sm">
          <div><dt className="eyebrow">Time</dt><dd className="tabular mt-1">{exam.duration_minutes} min</dd></div>
          <div><dt className="eyebrow">Questions</dt><dd className="tabular mt-1">{exam.question_count}</dd></div>
          <div><dt className="eyebrow">Closes</dt><dd className="tabular mt-1">{formatDateTime(exam.end_time)}</dd></div>
        </dl>

        {resuming && (
          <Alert tone="warn" className="mt-6" title="Your timer has been running">
            It started when you first opened the exam and doesn't pause. Violations recorded earlier still count.
          </Alert>
        )}

        <ol className="mt-6">
          {rules.map(({ text, strong }, i) => (
            <li key={text} className="flex gap-4 border-b border-line py-3 last:border-b-0">
              <span className="tabular w-6 shrink-0 font-mono text-sm text-faint">{String(i + 1).padStart(2, '0')}</span>
              <p className={cx('text-[15px] leading-relaxed', strong && 'font-medium text-danger')}>{text}</p>
            </li>
          ))}
        </ol>

        <p className="mt-6 text-sm leading-relaxed text-muted">
          {resuming ? 'Your saved answers are restored.' : 'Once you start, the timer runs even if you close the page.'} Answers save automatically as you go.
        </p>

        {error && <Alert tone="danger" className="mt-6">{error}</Alert>}

        <Button size="lg" className="mt-8 w-full" onClick={onStart} loading={starting}>
          {resuming ? 'Continue exam' : 'Start exam'}{fullscreen && ' in fullscreen'}
        </Button>
      </main>
    </div>
  );
}

// --- During the exam ---

function Timer({ seconds }) {
  const tone = seconds <= 60 ? 'text-danger' : seconds <= 300 ? 'text-warn' : 'text-ink';
  return (
    <span className={cx('tabular flex items-baseline gap-2 font-mono text-[1.35rem] font-semibold leading-none', tone)} aria-label={`${formatClock(seconds)} left`}>
      <span className="eyebrow">Left</span>
      {formatClock(seconds)}
    </span>
  );
}

function SaveStatus({ status }) {
  const states = { saving: ['Saving', 'text-faint'], saved: ['Saved', 'text-brand'], error: ['Not saved', 'text-danger'] };
  if (!states[status]) return null;
  const [label, tone] = states[status];
  return (
    <span className="flex items-center gap-2 font-mono text-xs text-faint" role="status">
      <span className={cx('status-dot', tone, status !== 'saving' && 'bg-current')} />
      {label}
    </span>
  );
}

function ViolationChip({ count, max }) {
  const hit = count > 0;
  return (
    <span
      className={cx('tabular rounded border px-2.5 py-1.5 font-mono text-xs font-medium tracking-[0.04em]', hit ? 'border-danger text-danger' : 'border-line-strong text-muted')}
      title="Times you left the exam"
    >
      LEFT EXAM <b className={hit ? 'text-danger' : 'text-ink'}>{count}</b>{max ? ` / ${max}` : ''}
    </span>
  );
}

function BlockedOverlay({ integrity, onReturn }) {
  const remaining = integrity.maxViolations ? integrity.maxViolations - integrity.violations : null;
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-paper p-6">
      <div className="max-w-md text-center">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-danger">Recorded</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">
          {integrity.isAway ? 'You left the exam' : 'Fullscreen is required'}
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          The questions are hidden until you come back{integrity.fullscreenLost ? ' to fullscreen' : ''}.
          {integrity.violations > 0 && ` ${integrity.violations} violation${integrity.violations === 1 ? ' has' : 's have'} been recorded.`}
        </p>
        {remaining !== null && remaining > 0 && (
          <p className="mt-3 text-sm font-medium text-danger">
            {remaining === 1 ? 'One more violation and your exam is submitted automatically.' : `${remaining} more and your exam is submitted automatically.`}
          </p>
        )}
        <Button size="lg" className="mt-7" onClick={onReturn}>Return to the exam</Button>
      </div>
    </div>
  );
}

// The question map: one answer bubble per question. Filled = answered, ring = current, red dot = flagged
function QuestionNav({ questions, answers, flagged, current, onJump }) {
  return (
    <div>
      <div className="grid grid-cols-5 gap-x-3 gap-y-2.5">
        {questions.map((q, i) => {
          const answered = isAnswered(answers[q.id]);
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => onJump(i)}
              className={cx(
                'bubble relative h-[34px] w-[34px] text-[11px]',
                answered ? 'bubble-filled' : 'bg-transparent hover:border-ink hover:text-ink',
                i === current && 'shadow-[0_0_0_2px_rgb(var(--surface)),0_0_0_4px_rgb(var(--ink))]',
              )}
              aria-label={`Question ${i + 1}${answered ? ', answered' : ''}${flagged.has(q.id) ? ', flagged for review' : ''}`}
              aria-current={i === current ? 'step' : undefined}
            >
              {String(i + 1).padStart(2, '0')}
              {flagged.has(q.id) && <span className="absolute -right-[3px] -top-[3px] h-[9px] w-[9px] rounded-full border-2 border-surface bg-danger" />}
            </button>
          );
        })}
      </div>
      <div className="mt-5 space-y-2 border-t border-line pt-4 text-[13px] text-muted">
        <p className="flex items-center gap-2.5"><span className="bubble bubble-filled h-4 w-4" />Answered</p>
        <p className="flex items-center gap-2.5"><span className="bubble h-4 w-4" />Not answered</p>
        <p className="flex items-center gap-2.5"><span className="relative"><span className="bubble h-4 w-4" /><span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-danger" /></span>Flagged</p>
      </div>
    </div>
  );
}

const LETTERS = 'ABCDEFGHIJ';

// An answer row: lettered bubble, the option, and its keyboard key
function ChoiceOption({ type, index, label, checked, onChange }) {
  return (
    <label
      className={cx(
        'flex cursor-pointer items-center gap-4 border-b border-line px-3 py-3.5 transition-colors',
        checked ? 'bg-brand-soft' : 'hover:bg-sunken/60',
      )}
    >
      <input type={type} className="peer sr-only" checked={checked} onChange={onChange} />
      <span className={cx('bubble peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-paper', checked && 'bubble-filled')} aria-hidden="true">
        {LETTERS[index]}
      </span>
      <span className="flex-1 text-base">{label}</span>
      {index < 9 && <span className="kbd hidden sm:inline-block" aria-hidden="true">{index + 1}</span>}
    </label>
  );
}

function QuestionBody({ question, value, onChange, onImage, onPickFile }) {
  if (question.type === 'single_choice') {
    return (
      <div className="border-t border-line" role="radiogroup" aria-label="Answer">
        {(question.options || []).map((option, i) => (
          <ChoiceOption key={option} type="radio" index={i} label={option} checked={value === option} onChange={() => onChange(option)} />
        ))}
      </div>
    );
  }
  if (question.type === 'multi_choice') {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div>
        <p className="mb-2 font-mono text-xs text-faint">Select all that apply</p>
        <div className="border-t border-line">
          {(question.options || []).map((option, i) => (
            <ChoiceOption
              key={option}
              type="checkbox"
              index={i}
              label={option}
              checked={selected.includes(option)}
              onChange={() => onChange(selected.includes(option) ? selected.filter((o) => o !== option) : [...selected, option])}
            />
          ))}
        </div>
      </div>
    );
  }
  if (question.type === 'text') {
    return (
      <div>
        <label htmlFor={`answer-${question.id}`} className="eyebrow mb-2 block">Your answer</label>
        <Textarea
          id={`answer-${question.id}`}
          rows={9}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value, { debounce: true })}
          placeholder="Type your answer here"
          className="text-base"
          spellCheck={false}
        />
      </div>
    );
  }
  if (question.type === 'image_upload') {
    return (
      <div>
        <label
          className="flex cursor-pointer flex-col items-center rounded border-[1.5px] border-dashed border-line-strong px-6 py-10 text-center transition-colors hover:border-ink hover:bg-surface"
          onClick={onPickFile}
        >
          <LuImage className="h-7 w-7 text-muted" />
          <span className="mt-3 text-sm font-medium">{value?.name ? 'Choose a different image' : 'Upload an image of your answer'}</span>
          <span className="mt-1 font-mono text-xs text-faint">JPG or PNG, up to 2 MB</span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && onImage(e.target.files[0])} />
        </label>
        {value?.preview && (
          <img src={value.preview} alt="Your uploaded answer" className="mt-4 max-h-80 rounded border border-line object-contain" />
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
    // Fullscreen and clipboard access must happen directly in the click, before any network call
    if (meta.integrity?.require_fullscreen) enterFullscreen();
    if (meta.integrity?.block_copy_paste) clearClipboard();
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

  // Keyboard: number keys choose an answer, arrow keys move, F flags. Typing in an answer box is left alone.
  useEffect(() => {
    if (phase !== 'running') return undefined;
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || integrity.blocked || confirmSubmit) return;
      if (e.target.closest?.('input[type="text"], textarea, [contenteditable="true"]')) return;
      const q = questions[current];
      if (!q) return;
      if (e.key === 'ArrowRight' && current < questions.length - 1) { e.preventDefault(); setCurrent(current + 1); return; }
      if (e.key === 'ArrowLeft' && current > 0) { e.preventDefault(); setCurrent(current - 1); return; }
      if (e.key.toLowerCase() === 'f') { e.preventDefault(); toggleFlag(q.id); return; }
      const n = Number(e.key);
      const option = Number.isInteger(n) && n >= 1 ? q.options?.[n - 1] : undefined;
      if (option === undefined) return;
      e.preventDefault();
      if (q.type === 'single_choice') answer(q.id, option);
      if (q.type === 'multi_choice') {
        const selected = Array.isArray(answers[q.id]) ? answers[q.id] : [];
        answer(q.id, selected.includes(option) ? selected.filter((o) => o !== option) : [...selected, option]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

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

  const typeLabel = { single_choice: 'Single answer', multi_choice: 'Multiple answers', text: 'Written answer', image_upload: 'Image answer' };

  return (
    <div className={cx('grid min-h-screen grid-rows-[auto_1fr_auto] bg-paper', session.integrity.block_copy_paste && 'select-none')}>
      {integrity.blocked && <BlockedOverlay integrity={integrity} onReturn={() => integrity.requireFullscreen && enterFullscreen()} />}

      <header className="sticky top-0 z-30 border-b border-line bg-surface">
        <div className="flex items-center gap-5 px-6 py-3">
          <LogoMark size={22} />
          <p className="min-w-0 flex-1 truncate text-sm font-medium">
            {session.exam.title}
            <span className="ml-3 font-mono text-xs font-normal text-faint">{questions.length} questions</span>
          </p>
          <SaveStatus status={saveStatus} />
          <ViolationChip count={integrity.violations} max={integrity.maxViolations} />
          <Timer seconds={secondsLeft ?? 0} />
        </div>
        {showWarning && (
          <div className="border-t border-danger/25 bg-danger-soft px-4 py-2 text-center text-sm text-danger-ink" role="alert">
            Violation recorded ({integrity.violations}{integrity.maxViolations ? ` of ${integrity.maxViolations}` : ''}).
            {remainingViolations === 1 && ' One more and your exam is submitted automatically.'}
            {remainingViolations > 1 && ` ${remainingViolations} more and your exam is submitted automatically.`}
          </div>
        )}
      </header>

      <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_300px]">
        <main className="min-w-0 px-8 pb-12 pt-12">
          <div className="mx-auto max-w-[42rem]">
            {error && <Alert tone="danger" className="mb-6" onClose={() => setError('')}>{error}</Alert>}
            {question && (
              <article>
                <div className="flex items-baseline gap-4 border-b border-line-strong pb-3.5">
                  <span className="tabular font-mono text-[2.5rem] font-semibold leading-[0.9] tracking-[-0.02em]">{String(current + 1).padStart(2, '0')}</span>
                  <span className="font-mono text-xs leading-relaxed text-faint">
                    <b className="font-medium text-muted">{typeLabel[question.type] || 'Question'}</b> · {question.max_score} mark{question.max_score === 1 ? '' : 's'}
                    <br />Question {current + 1} of {questions.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cx('ml-auto', flagged.has(question.id) && 'text-danger hover:text-danger')}
                    onClick={() => toggleFlag(question.id)}
                    aria-pressed={flagged.has(question.id)}
                  >
                    {flagged.has(question.id) ? 'Flagged for review' : 'Flag for review'}
                  </Button>
                </div>
                <h2 className="my-7 max-w-[62ch] text-[1.2rem] font-normal leading-relaxed [text-wrap:pretty]">{question.title}</h2>
                <QuestionBody
                  question={question}
                  value={answers[question.id]}
                  onChange={(value, opts) => answer(question.id, value, opts)}
                  onImage={(file) => uploadImage(question.id, file)}
                  onPickFile={integrity.allowFilePicker}
                />
                {(question.type === 'single_choice' || question.type === 'multi_choice') && (
                  <p className="mt-5 flex flex-wrap items-center gap-2 font-mono text-xs text-faint" aria-hidden="true">
                    <span className="kbd">1</span>–<span className="kbd">{Math.min(9, question.options?.length || 1)}</span> choose ·
                    <span className="kbd">←</span><span className="kbd">→</span> move · <span className="kbd">F</span> flag
                  </p>
                )}
              </article>
            )}
          </div>
        </main>

        <aside className="border-l border-line bg-surface px-7 py-8" aria-label="Questions">
          <div className="sticky top-24">
            <p className="tabular font-mono text-xs text-muted"><b className="block text-xl font-semibold text-ink">{answeredCount} of {questions.length}</b>answered</p>
            <div className="mt-5">
              <QuestionNav questions={questions} answers={answers} flagged={flagged} current={current} onJump={setCurrent} />
            </div>
          </div>
        </aside>
      </div>

      <footer className="sticky bottom-0 z-20 flex items-center gap-3 border-t border-line bg-surface px-6 py-3">
        <Button variant="secondary" disabled={current === 0} onClick={() => setCurrent(current - 1)}>Previous</Button>
        <Button variant="secondary" disabled={isLast} onClick={() => setCurrent(current + 1)}>Next</Button>
        <span className="flex-1" />
        <Button onClick={() => setConfirmSubmit(true)}>Submit exam</Button>
      </footer>

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
