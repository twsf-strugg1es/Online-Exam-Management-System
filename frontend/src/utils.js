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

// Dates show in the organization's timezone (set from the current membership), so a student
// abroad sees the same exam window as the teacher who set it. Undefined = the viewer's own.
let timeZone;
const isValidTimeZone = (tz) => {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};
export function setTimeZone(tz) {
  timeZone = tz && isValidTimeZone(tz) ? tz : undefined;
}
export const getTimeZone = () => timeZone;
export const viewerTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

const zonedParts = (date, tz) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour') % 24, minute: get('minute') };
};

// How many minutes `tz` is ahead of UTC at `date`
const offsetMinutes = (date, tz) => {
  const p = zonedParts(date, tz);
  return Math.round((Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - Math.floor(date.getTime() / 60000) * 60000) / 60000);
};

// "GMT+6" next to exam times, only when the organization's clock differs from the viewer's
export const timeZoneLabel = (value = new Date()) => {
  if (!timeZone) return null;
  const date = new Date(value);
  if (offsetMinutes(date, timeZone) === offsetMinutes(date, undefined)) return null;
  const part = new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: 'short' }).formatToParts(date).find((p) => p.type === 'timeZoneName');
  return part?.value || timeZone;
};

// datetime-local values ("2026-10-26T14:00") read and written in the organization's timezone
const pad = (n) => String(n).padStart(2, '0');
export const toZonedInput = (value) => {
  const p = zonedParts(new Date(value), timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
};
export const fromZonedInput = (input) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(input || '');
  if (!match) return new Date(NaN);
  const [y, mo, d, h, mi] = match.slice(1).map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  const first = new Date(wall - offsetMinutes(new Date(wall), timeZone) * 60000);
  return new Date(wall - offsetMinutes(first, timeZone) * 60000); // a second pass settles daylight-saving edges
};
export const isSameDay = (a, b) => toZonedInput(a).slice(0, 10) === toZonedInput(b).slice(0, 10);

export const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString(locale, { timeZone, day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '—';

// An exam's opening or closing time, with the organization's timezone when it isn't the viewer's
export const formatExamTime = (value) => {
  if (!value) return '—';
  const label = timeZoneLabel(value);
  return label ? `${formatDateTime(value)} ${label}` : formatDateTime(value);
};

export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString(locale, { timeZone, day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const formatShortDate = (value) =>
  value ? new Date(value).toLocaleDateString(locale, { timeZone, day: 'numeric', month: 'short' }) : '—';

export const formatTime = (value) =>
  value ? new Date(value).toLocaleTimeString(locale, { timeZone, hour: 'numeric', minute: '2-digit' }) : '—';

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
