// The API's error message, or a fallback when there isn't a readable one
export const errorMessage = (err, fallback = 'Something went wrong. Please try again.') => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d) => d.msg?.replace(/^Value error, /, '')).join(', ');
  if (!err?.response && err?.message === 'Network Error') return "Can't reach the server. Check your connection.";
  return fallback;
};

export const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '—';

export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const formatTime = (value) =>
  value ? new Date(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '—';

// 3725 -> "1:02:05", 125 -> "2:05"
export const formatClock = (totalSeconds) => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
};

// 95 -> "1 min 35 s", 3600 -> "60 min"
export const formatDuration = (totalSeconds) => {
  const s = Math.max(0, Math.round(totalSeconds));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  return s % 60 ? `${m} min ${s % 60} s` : `${m} min`;
};

export const percent = (score, total) => (total ? Math.round((score / total) * 100) : 0);

export const ROLE_LABELS = { owner: 'Owner', admin: 'Admin', examiner: 'Examiner', candidate: 'Student' };

export const QUESTION_TYPE_LABELS = {
  single_choice: 'Single choice',
  multi_choice: 'Multiple choice',
  text: 'Written',
  image_upload: 'Image upload',
};
