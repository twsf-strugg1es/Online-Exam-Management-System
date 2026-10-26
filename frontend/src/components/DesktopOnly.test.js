import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DesktopOnly from './DesktopOnly';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';

jest.mock('../api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), defaults: {} } }));

function setWidth(wide) {
  window.matchMedia = jest.fn().mockImplementation((query) => ({
    matches: wide, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn(),
  }));
}

const renderAt = (path) => render(
  <MemoryRouter initialEntries={[path]}>
    <ThemeProvider>
      <AuthProvider>
        <DesktopOnly><p>page content</p></DesktopOnly>
      </AuthProvider>
    </ThemeProvider>
  </MemoryRouter>,
);

afterEach(() => { delete window.matchMedia; });

test('on a computer nothing is covered', () => {
  setWidth(true);
  renderAt('/admin-exams');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('on a phone, login and signup still work', () => {
  setWidth(false);
  for (const path of ['/login', '/signup', '/signup/organization']) {
    const { unmount } = renderAt(path);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    unmount();
  }
});

test('on a phone, the app asks for a computer', () => {
  setWidth(false);
  renderAt('/admin-exams');
  expect(screen.getByRole('dialog', { name: 'TestKori works on a computer' })).toBeInTheDocument();
});

test('a running exam stays mounted under the notice so its timer keeps going', () => {
  setWidth(false);
  renderAt('/exam/123');
  expect(screen.getByRole('dialog', { name: 'Make this window wider to keep going' })).toBeInTheDocument();
  expect(screen.getByText('page content')).toBeInTheDocument();
});
