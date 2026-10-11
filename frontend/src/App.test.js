import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

jest.mock('./api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), defaults: {} } }));

const renderAt = (path) => render(
  <MemoryRouter initialEntries={[path]}>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </MemoryRouter>,
);

beforeEach(() => localStorage.clear());

test('signed-out visitors are sent to the login page', async () => {
  renderAt('/admin-exams');
  expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument();
});

test('the signup page fills in the join code from the link', async () => {
  renderAt('/signup?code=k7m2qx9p');
  expect(await screen.findByLabelText(/join code/i)).toHaveValue('K7M2QX9P');
});
