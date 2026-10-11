import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LuPlus, LuClipboardList, LuCalendar, LuClock, LuUsers, LuShieldCheck, LuShuffle, LuMaximize, LuEllipsis, LuTrash2,
  LuEyeOff, LuSend, LuChartColumn,
} from 'react-icons/lu';
import api from '../api';
import AppShell from '../components/AppShell';
import { Alert, Badge, Button, Card, EmptyState, PageHeader, PageLoader, useConfirm } from '../components/ui';
import { errorMessage, formatDateTime } from '../utils';

// Draft until published; then scheduled, live or closed depending on the exam window
export function examStatus(exam, now = new Date()) {
  if (!exam.is_published) return { label: 'Draft', tone: 'neutral' };
  if (now < new Date(exam.start_time)) return { label: 'Scheduled', tone: 'info' };
  if (now <= new Date(exam.end_time)) return { label: 'Live', tone: 'brand', live: true };
  return { label: 'Closed', tone: 'neutral' };
}

export function StatusBadge({ exam }) {
  const status = examStatus(exam);
  return (
    <Badge tone={status.tone}>
      {status.live && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />}
      {status.label}
    </Badge>
  );
}

// Small icons showing which protections an exam uses
export function ProtectionIcons({ exam }) {
  const items = [
    exam.require_fullscreen && { icon: LuMaximize, label: 'Fullscreen required' },
    (exam.shuffle_questions || exam.shuffle_options) && { icon: LuShuffle, label: 'Shuffled per student' },
    exam.max_violations && { icon: LuShieldCheck, label: `Auto-submit after ${exam.max_violations} violations` },
  ].filter(Boolean);
  if (!items.length) return <span className="text-xs text-muted">No protections</span>;
  return (
    <span className="flex items-center gap-1.5 text-muted">
      {items.map(({ icon: Icon, label }) => (
        <span key={label} title={label} className="grid h-6 w-6 place-items-center rounded-md bg-sunken">
          <Icon className="h-3.5 w-3.5" />
          <span className="sr-only">{label}</span>
        </span>
      ))}
    </span>
  );
}

function ExamMenu({ exam, onPublishToggle, onDelete }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button variant="ghost" size="sm" icon={LuEllipsis} onClick={() => setOpen(!open)} aria-label="More actions" />
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-48 animate-fade-in overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-pop">
            <button
              type="button"
              onClick={() => { setOpen(false); onPublishToggle(exam); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-sunken"
            >
              {exam.is_published ? <LuEyeOff className="h-4 w-4 text-muted" /> : <LuSend className="h-4 w-4 text-muted" />}
              {exam.is_published ? 'Unpublish' : 'Publish'}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); onDelete(exam); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger hover:bg-danger-soft"
            >
              <LuTrash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function AdminExamsPage() {
  const navigate = useNavigate();
  const [exams, setExams] = useState(null);
  const [message, setMessage] = useState(null);
  const [confirmDialog, confirm] = useConfirm();

  const fetchExams = async () => {
    try {
      const res = await api.get('/admin/exams/');
      // Newest first
      setExams([...res.data].sort((a, b) => new Date(b.start_time) - new Date(a.start_time)));
    } catch (err) {
      setMessage({ tone: 'danger', text: errorMessage(err, 'Failed to load exams') });
      setExams([]);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const togglePublish = async (exam) => {
    if (!exam.is_published) {
      const ok = await confirm({
        title: `Publish “${exam.title}”?`,
        description: `Students ${exam.groups?.length ? `in ${exam.groups.map((g) => g.name).join(', ')}` : 'in your organization'} will see it and can start it from ${formatDateTime(exam.start_time)}.`,
        confirmLabel: 'Publish',
      });
      if (!ok) return;
    }
    try {
      await api.post(`/admin/exams/${exam.id}/${exam.is_published ? 'unpublish' : 'publish'}`);
      setMessage({ tone: 'success', text: exam.is_published ? 'Exam unpublished. Students can no longer see it.' : 'Exam published.' });
      fetchExams();
    } catch (err) {
      setMessage({ tone: 'danger', text: errorMessage(err) });
    }
  };

  const deleteExam = async (exam) => {
    const ok = await confirm({
      title: `Delete “${exam.title}”?`,
      description: 'All attempts, answers and grading for this exam are deleted too. This cannot be undone.',
      confirmLabel: 'Delete exam',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/admin/exams/${exam.id}`);
      setMessage({ tone: 'success', text: 'Exam deleted' });
      fetchExams();
    } catch (err) {
      setMessage({ tone: 'danger', text: errorMessage(err) });
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Exams"
        description="Schedule exams from your question bank, publish them to students, and review results and integrity reports."
        actions={<Button icon={LuPlus} onClick={() => navigate('/admin-exams/new')}>New exam</Button>}
      />

      {message && <Alert tone={message.tone} className="mb-6" onClose={() => setMessage(null)}>{message.text}</Alert>}

      {exams === null ? (
        <PageLoader />
      ) : exams.length === 0 ? (
        <Card>
          <EmptyState
            icon={LuClipboardList}
            title="No exams yet"
            action={<Button icon={LuPlus} onClick={() => navigate('/admin-exams/new')}>Create your first exam</Button>}
          >
            An exam picks questions from your question bank and runs in a time window you choose.
          </EmptyState>
        </Card>
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => (
            <Card key={exam.id} className="flex flex-col gap-4 p-5 transition-colors hover:border-muted/30 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/admin-exams/${exam.id}`} className="truncate text-[15px] font-semibold hover:text-brand">{exam.title}</Link>
                  <StatusBadge exam={exam} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted">
                  <span className="flex items-center gap-1.5"><LuCalendar className="h-3.5 w-3.5" />{formatDateTime(exam.start_time)} – {formatDateTime(exam.end_time)}</span>
                  <span className="flex items-center gap-1.5"><LuClock className="h-3.5 w-3.5" />{exam.duration_minutes} min</span>
                  <span className="flex items-center gap-1.5">
                    <LuUsers className="h-3.5 w-3.5" />
                    {exam.groups?.length ? exam.groups.map((g) => g.name).join(', ') : 'Everyone'}
                  </span>
                  <span>{exam.questions?.length || 0} question{exam.questions?.length === 1 ? '' : 's'}</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <ProtectionIcons exam={exam} />
                <div className="flex items-center gap-1">
                  {!exam.is_published ? (
                    <Button variant="secondary" size="sm" icon={LuSend} onClick={() => togglePublish(exam)}>Publish</Button>
                  ) : (
                    <Button variant="secondary" size="sm" icon={LuChartColumn} onClick={() => navigate(`/admin-exams/${exam.id}`)}>Results</Button>
                  )}
                  <ExamMenu exam={exam} onPublishToggle={togglePublish} onDelete={deleteExam} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      {confirmDialog}
    </AppShell>
  );
}

export default AdminExamsPage;
