import { formatExamTime, fromZonedInput, isSameDay, setTimeZone, timeZoneLabel, toZonedInput, viewerTimeZone } from './utils';

afterEach(() => setTimeZone(undefined));

test('exam form times are read and written in the organization timezone', () => {
  setTimeZone('Asia/Dhaka'); // UTC+6, no daylight saving
  expect(fromZonedInput('2026-10-26T14:00').toISOString()).toBe('2026-10-26T08:00:00.000Z');
  expect(toZonedInput('2026-10-26T08:00:00Z')).toBe('2026-10-26T14:00');
});

test('daylight-saving changes are respected', () => {
  setTimeZone('America/New_York');
  expect(fromZonedInput('2026-07-01T09:00').toISOString()).toBe('2026-07-01T13:00:00.000Z'); // EDT, UTC-4
  expect(fromZonedInput('2026-12-01T09:00').toISOString()).toBe('2026-12-01T14:00:00.000Z'); // EST, UTC-5
});

test('an empty or broken input is an invalid date, not a crash', () => {
  expect(Number.isNaN(fromZonedInput('').getTime())).toBe(true);
  expect(Number.isNaN(fromZonedInput('tomorrow').getTime())).toBe(true);
});

test('the timezone label shows only when the organization clock differs from the viewer', () => {
  setTimeZone(viewerTimeZone());
  expect(timeZoneLabel('2026-10-26T08:00:00Z')).toBeNull();

  // +14:00 is nobody's test machine
  setTimeZone('Pacific/Kiritimati');
  expect(timeZoneLabel('2026-10-26T08:00:00Z')).toMatch(/GMT\+14|\+14/);
  expect(formatExamTime('2026-10-26T08:00:00Z')).toMatch(/GMT\+14|\+14/);
});

test('an unknown timezone falls back to the viewer clock', () => {
  setTimeZone('Mars/Olympus');
  expect(timeZoneLabel()).toBeNull();
});

test('same day is judged on the organization calendar', () => {
  setTimeZone('Asia/Dhaka');
  // 18:00 UTC is already midnight in Dhaka
  expect(isSameDay('2026-10-26T10:00:00Z', '2026-10-26T17:30:00Z')).toBe(true);
  expect(isSameDay('2026-10-26T17:59:00Z', '2026-10-26T18:01:00Z')).toBe(false);
});
