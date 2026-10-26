import { makeTranslator } from './index';

test('English text is its own key, with interpolation', () => {
  const { t } = makeTranslator('en');
  expect(t('Sign in')).toBe('Sign in');
  expect(t('Hello, {{name}}', { name: 'Arif' })).toBe('Hello, Arif');
});

test('plurals use the English forms from the code', () => {
  const { tn } = makeTranslator('en');
  expect(tn(1, '{{count}} question', '{{count}} questions')).toBe('1 question');
  expect(tn(4, '{{count}} question', '{{count}} questions')).toBe('4 questions');
});

test('a language without an entry falls back to English instead of showing nothing', () => {
  const { t } = makeTranslator('bn');
  expect(t('Sign in')).toBe('Sign in');
});

test('the pseudo-language marks every translated string and keeps placeholders working', () => {
  const { t, tn } = makeTranslator('en-XA');
  expect(t('Sign in')).toBe('[Ŝîĝñ îñ]');
  expect(t('Hello, {{name}}', { name: 'Arif' })).toBe('[Héļļö, Arif]');
  expect(tn(2, '{{count}} question', '{{count}} questions')).toBe('[2 qûéšţîöñš]');
});

test('the right-to-left pseudo-language uses the same marked text', () => {
  const { t } = makeTranslator('en-XB');
  expect(t('Sign in')).toBe('[Ŝîĝñ îñ]');
});
