import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LuArrowLeft, LuCheck, LuX, LuShieldAlert, LuCircleCheck, LuImage } from 'react-icons/lu';
import api from '../api';
import AppShell from '../components/AppShell';
import { Alert, Badge, Button, Card, EmptyState, PageLoader, Textarea, cx } from '../components/ui';
import { QUESTION_TYPE_LABELS, errorMessage, formatDateTime } from '../utils';
import { useI18n } from '../i18n';

const COMMENT_LIMIT = 100;

function AnswerCard({ answer, index, onSaved }) {
  const { t, tn } = useI18n();
  const [verdict, setVerdict] = useState(answer.is_evaluated ? answer.score_awarded > 0 : null);
  const [comment, setComment] = useState(answer.comment || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dirty = verdict !== (answer.is_evaluated ? answer.score_awarded > 0 : null) || comment !== (answer.comment || '');

  const save = async () => {
    setError('');
    setSaving(true);
    try {
      await api.post(`/admin/evaluations/answers/${answer.answer_id}/submit`, { is_correct: verdict, comment });
      await onSaved();
    } catch (err) {
      setError(errorMessage(err, 'Could not save'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className={cx('overflow-hidden', answer.is_evaluated && !dirty && 'border-brand/30')}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <p className="text-xs text-muted">{t('Question {{n}}', { n: index + 1 })} · {t(QUESTION_TYPE_LABELS[answer.question_type] || '')} · {tn(answer.question_max_score, '{{count}} pt', '{{count}} pts')}</p>
          <h2 className="mt-1 font-medium">{answer.question_title}</h2>
        </div>
        {answer.is_evaluated && (
          <Badge tone={answer.score_awarded > 0 ? 'brand' : 'danger'}>
            {answer.score_awarded} / {answer.question_max_score}
          </Badge>
        )}
      </div>

      <div className="px-5 py-4">
        <p className="eyebrow mb-2">{t("Student's answer")}</p>
        {answer.question_type === 'image_upload' ? (
          answer.uploaded_file_preview ? (
            <a href={answer.uploaded_file_preview} target="_blank" rel="noreferrer" className="block">
              <img
                src={answer.uploaded_file_preview}
                alt={answer.uploaded_file_name || t('Uploaded answer')}
                className="max-h-96 rounded-lg border border-line bg-sunken object-contain"
              />
            </a>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted">
              <LuImage className="h-4 w-4" />
              {answer.uploaded_file_name || t('No image uploaded')}
            </p>
          )
        ) : answer.answer_text ? (
          <p className="whitespace-pre-wrap rounded-lg bg-sunken px-4 py-3 text-sm leading-relaxed">{answer.answer_text}</p>
        ) : (
          <p className="text-sm text-muted">{t('No answer given.')}</p>
        )}
      </div>

      <div className="space-y-3 border-t border-line bg-sunken/30 px-5 py-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setVerdict(true)}
            className={cx('btn btn-sm border', verdict === true ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface hover:bg-sunken')}
          >
            <LuCheck className="h-4 w-4" /> {t('Correct')} · {tn(answer.question_max_score, '{{count}} pt', '{{count}} pts')}
          </button>
          <button
            type="button"
            onClick={() => setVerdict(false)}
            className={cx('btn btn-sm border', verdict === false ? 'border-danger bg-danger text-white dark:text-paper' : 'border-line bg-surface hover:bg-sunken')}
          >
            <LuX className="h-4 w-4" /> {t('Incorrect')} · {tn(0, '{{count}} pt', '{{count}} pts')}
          </button>
        </div>
        <div>
          <Textarea
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, COMMENT_LIMIT))}
            placeholder={t('Feedback for the student (optional)')}
          />
          <p className="hint text-end">{comment.length}/{COMMENT_LIMIT}</p>
        </div>
        {error && <Alert tone="danger">{error}</Alert>}
        <div className="flex justify-end">
          <Button size="sm" onClick={save} loading={saving} disabled={verdict === null || !dirty}>
            {answer.is_evaluated ? t('Update grade') : t('Save grade')}
          </Button>
        </div>
      </div>
    </Card>
  );
}

// Grade the written and image answers of one attempt; multiple choice is graded automatically
function AdminEvaluateAnswersPage() {
  const { attemptId } = useParams();
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/admin/evaluations/attempts/${attemptId}`);
      setData(res.data);
    } catch (err) {
      setError(errorMessage(err, 'Failed to load the attempt'));
    }
  }, [attemptId]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <AppShell width="narrow"><Alert tone="danger">{error}</Alert></AppShell>;
  if (!data) return <AppShell width="narrow"><PageLoader /></AppShell>;

  const graded = data.answers.filter((a) => a.is_evaluated).length;
  const awarded = data.answers.reduce((sum, a) => sum + (a.is_evaluated ? a.score_awarded || 0 : 0), 0);
  const possible = data.answers.reduce((sum, a) => sum + (a.question_max_score || 0), 0);

  return (
    <AppShell width="narrow">
      <Link to={`/admin-exams/${data.exam.id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <LuArrowLeft className="h-4 w-4 rtl:-scale-x-100" /> {data.exam.title}
      </Link>

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-1.5">{t('Grading')}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{data.student.full_name || data.student.email}</h1>
          <p className="mt-1 text-sm text-muted">{t('Submitted {{date}}', { date: formatDateTime(data.submitted_at) })}</p>
        </div>
        <Link to={`/admin-integrity/${attemptId}`} className="btn btn-secondary btn-sm">
          <LuShieldAlert className="h-4 w-4" /> {t('Integrity report')}
        </Link>
      </div>

      {data.answers.length > 0 && (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="h-2 w-40 overflow-hidden rounded-full bg-sunken">
              <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(graded / data.answers.length) * 100}%` }} />
            </div>
            <span className="text-sm text-muted">{t('{{n}} of {{total}} graded', { n: graded, total: data.answers.length })}</span>
          </div>
          <span className="tabular text-sm">
            <span className="font-semibold">{awarded}</span><span className="text-muted"> / {t('{{n}} points awarded', { n: possible })}</span>
          </span>
        </Card>
      )}

      {data.answers.length === 0 ? (
        <Card>
          <EmptyState icon={LuCircleCheck} title={t('Nothing to grade')}>
            {t('This attempt has no written or image answers. Multiple-choice questions were graded automatically.')}
          </EmptyState>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.answers.map((answer, i) => <AnswerCard key={answer.answer_id} answer={answer} index={i} onSaved={load} />)}
        </div>
      )}
    </AppShell>
  );
}

export default AdminEvaluateAnswersPage;
