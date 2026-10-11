import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LuAward, LuArrowRight } from 'react-icons/lu';
import api from '../api';
import AppShell from '../components/AppShell';
import { Alert, Card, EmptyState, PageHeader, PageLoader, Stat, cx } from '../components/ui';
import { errorMessage, formatDate } from '../utils';

const scoreTone = (pct) => (pct >= 80 ? 'text-brand' : pct >= 50 ? 'text-warn' : 'text-danger');

// The student's submitted exams in the current organization
function StudentExamsPage() {
  const [exams, setExams] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/student/completed-exams/')
      .then((res) => setExams([...res.data].sort((a, b) => new Date(b.end_time) - new Date(a.end_time))))
      .catch((err) => {
        setError(errorMessage(err, 'Failed to load results'));
        setExams([]);
      });
  }, []);

  const average = exams?.length ? Math.round(exams.reduce((sum, e) => sum + (e.percentage || 0), 0) / exams.length) : null;
  const best = exams?.length ? Math.max(...exams.map((e) => e.percentage || 0)) : null;

  return (
    <AppShell>
      <PageHeader title="Results" description="Scores include written answers once your examiner has graded them." />
      {error && <Alert tone="danger" className="mb-6">{error}</Alert>}

      {exams === null ? (
        <PageLoader />
      ) : exams.length === 0 ? (
        <Card>
          <EmptyState icon={LuAward} title="No results yet">Your scores appear here after you submit an exam.</EmptyState>
        </Card>
      ) : (
        <>
          <Card className="mb-6 grid grid-cols-3 gap-6 p-5">
            <Stat label="Exams taken" value={exams.length} />
            <Stat label="Average" value={`${average}%`} />
            <Stat label="Best" value={`${Math.round(best)}%`} tone="brand" />
          </Card>
          <Card className="divide-y divide-line overflow-hidden">
            {exams.map((exam) => (
              <Link
                key={exam.id}
                to={`/exam-results/${exam.id}`}
                className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-sunken/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{exam.exam_title}</p>
                  <p className="mt-0.5 text-xs text-muted">{formatDate(exam.end_time)}</p>
                </div>
                <div className="text-right">
                  <p className={cx('tabular text-lg font-semibold', scoreTone(exam.percentage))}>{Math.round(exam.percentage)}%</p>
                  <p className="tabular text-xs text-muted">{exam.score} / {exam.total_possible_score}</p>
                </div>
                <LuArrowRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </Card>
        </>
      )}
    </AppShell>
  );
}

export default StudentExamsPage;
