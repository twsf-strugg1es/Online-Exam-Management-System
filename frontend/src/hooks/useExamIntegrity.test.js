import { act, renderHook } from '@testing-library/react';
import useExamIntegrity from './useExamIntegrity';

jest.mock('../api', () => ({ __esModule: true, default: { defaults: { baseURL: 'http://api.test' } } }));

const settings = { block_copy_paste: true, require_fullscreen: false, max_violations: 3 };

function sentEvents() {
  return global.fetch.mock.calls.flatMap(([, init]) => JSON.parse(init.body).events);
}

function fire(target, event) {
  act(() => { target.dispatchEvent(event); });
  return event;
}

beforeEach(() => {
  jest.useFakeTimers();
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ violations: 0, submitted: false }) }));
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: jest.fn(() => Promise.resolve()) }, configurable: true });
});

afterEach(() => {
  jest.useRealTimers();
});

const start = (overrides = {}) => renderHook(() => useExamIntegrity({ attemptId: 'a1', settings: { ...settings, ...overrides }, active: true }));

test('the clipboard is emptied when the exam starts', () => {
  start();
  expect(navigator.clipboard.writeText).toHaveBeenCalledWith('');
});

test('a paste is blocked and flagged', () => {
  start();
  const paste = fire(document, new Event('paste', { cancelable: true, bubbles: true }));
  expect(paste.defaultPrevented).toBe(true);
  act(() => { jest.advanceTimersByTime(1100); });
  expect(sentEvents()).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'copy_paste', details: { action: 'paste' } })]));
});

test('Shift+Insert is blocked like Ctrl+V', () => {
  start();
  const key = fire(document, new KeyboardEvent('keydown', { key: 'Insert', shiftKey: true, cancelable: true, bubbles: true }));
  expect(key.defaultPrevented).toBe(true);
});

test('pasting through the browser menu or by dropping text is blocked', () => {
  start();
  const input = document.createElement('textarea');
  document.body.appendChild(input);
  for (const inputType of ['insertFromPaste', 'insertFromDrop']) {
    const ev = new Event('beforeinput', { cancelable: true, bubbles: true });
    Object.defineProperty(ev, 'inputType', { value: inputType });
    expect(fire(input, ev).defaultPrevented).toBe(true);
  }
  expect(fire(input, new Event('drop', { cancelable: true, bubbles: true })).defaultPrevented).toBe(true);
  input.remove();
});

test('ordinary typing is not blocked', () => {
  start();
  const ev = new Event('beforeinput', { cancelable: true, bubbles: true });
  Object.defineProperty(ev, 'inputType', { value: 'insertText' });
  expect(fire(document, ev).defaultPrevented).toBe(false);
});

test('a middle-click paste is blocked', () => {
  start();
  const click = fire(document, new MouseEvent('mousedown', { button: 1, cancelable: true, bubbles: true }));
  expect(click.defaultPrevented).toBe(true);
  const left = fire(document, new MouseEvent('mousedown', { button: 0, cancelable: true, bubbles: true }));
  expect(left.defaultPrevented).toBe(false);
});

test('nothing clipboard-related is blocked when the exam allows copy and paste', () => {
  start({ block_copy_paste: false });
  expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  expect(fire(document, new Event('paste', { cancelable: true, bubbles: true })).defaultPrevented).toBe(false);
});

test('a clipboard that refuses access never breaks the exam', () => {
  navigator.clipboard.writeText.mockImplementation(() => Promise.reject(new Error('denied')));
  expect(() => start()).not.toThrow();
});
