// Set by the I18nProvider so plain helpers (errors, dates) follow the chosen language
let translate = (text) => text;
let locale;
export function setI18n({ t, locale: nextLocale }) {
  translate = t;
  locale = nextLocale;
}

// The API's error message, or a fallback when there isn't a readable one
export const errorMessage = (err, fallback = 'Something went wrong. Please try again.') => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return translate(detail);
  if (Array.isArray(detail)) return detail.map((d) => translate(d.msg?.replace(/^Value error, /, '') || '')).join(', ');
  if (!err?.response && err?.message === 'Network Error') return translate("Can't reach the server. Check your connection.");
  return translate(fallback);
};

export const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString(locale, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '—';

export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const formatShortDate = (value) =>
  value ? new Date(value).toLocaleDateString(locale, { day: 'numeric', month: 'short' }) : '—';

export const formatTime = (value) =>
  value ? new Date(value).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' }) : '—';

export const formatNumber = (value, options) => new Intl.NumberFormat(locale, options).format(value);

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
  if (s < 60) return translate('{{s}} s').replace('{{s}}', s);
  const m = Math.floor(s / 60);
  return s % 60
    ? translate('{{m}} min {{s}} s').replace('{{m}}', m).replace('{{s}}', s % 60)
    : translate('{{m}} min').replace('{{m}}', m);
};

export const percent = (score, total) => (total ? Math.round((score / total) * 100) : 0);

// English labels are translation keys: render them with t(ROLE_LABELS[role])
export const ROLE_LABELS = { owner: 'Owner', admin: 'Admin', examiner: 'Examiner', candidate: 'Student' };

export const QUESTION_TYPE_LABELS = {
  single_choice: 'Single choice',
  multi_choice: 'Multiple choice',
  text: 'Written',
  image_upload: 'Image upload',
};
