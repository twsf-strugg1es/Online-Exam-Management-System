import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LuFileQuestion, LuClipboardList, LuUsers, LuBuilding2, LuLayoutDashboard, LuAward, LuUserRound,
  LuChevronsUpDown, LuMoon, LuSun, LuLogOut, LuMenu, LuX,
} from 'react-icons/lu';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Logo, cx } from './ui';
import { ROLE_LABELS } from '../utils';

const STAFF_NAV = [
  { to: '/admin-exams', label: 'Exams', icon: LuClipboardList },
  { to: '/admin-questions', label: 'Question bank', icon: LuFileQuestion },
  { to: '/admin-students', label: 'Students', icon: LuUsers },
];
const MANAGER_NAV = [{ to: '/admin-organization', label: 'Organization', icon: LuBuilding2 }];
const ACCOUNT_NAV = [{ to: '/profile', label: 'Account', icon: LuUserRound }];
const STUDENT_NAV = [
  { to: '/student-account', label: 'Exams', icon: LuLayoutDashboard },
  { to: '/student-exams', label: 'Results', icon: LuAward },
];

function NavItem({ to, label, icon: Icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cx(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive ? 'bg-surface text-ink shadow-card ring-1 ring-line' : 'text-muted hover:bg-sunken hover:text-ink',
        )
      }
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      {label}
    </NavLink>
  );
}

function Sidebar({ onNavigate }) {
  const { user, currentMembership, isStaff, isManager, logout } = useAuth();
  const { themeName, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const items = [...(isStaff ? [...STAFF_NAV, ...(isManager ? MANAGER_NAV : [])] : STUDENT_NAV), ...ACCOUNT_NAV];
  const displayName = user?.full_name || user?.email;

  return (
    <div className="flex h-full flex-col gap-6 px-3 py-5">
      <div className="px-2">
        <Logo />
      </div>

      {/* Current organization; opens the organization picker */}
      <button
        type="button"
        onClick={() => { onNavigate?.(); navigate('/organizations'); }}
        className="group flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2.5 text-left shadow-card transition-colors hover:border-muted/40"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-sunken text-sm font-semibold text-ink">
          {(currentMembership?.organization_name || '?').slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink">{currentMembership?.organization_name}</span>
          <span className="block text-xs text-muted">{ROLE_LABELS[currentMembership?.role]}</span>
        </span>
        <LuChevronsUpDown className="h-4 w-4 shrink-0 text-muted group-hover:text-ink" />
      </button>

      <nav className="flex flex-1 flex-col gap-1" onClick={onNavigate}>
        {items.map((item) => <NavItem key={item.to} {...item} />)}
      </nav>

      <div className="border-t border-line pt-4">
        <div className="flex items-center gap-3 px-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand-ink">
            {(displayName || '?').slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-ink">{displayName}</span>
            {user?.full_name && <span className="block truncate text-xs text-muted">{user.email}</span>}
          </span>
        </div>
        <div className="mt-3 flex gap-1">
          <button
            type="button"
            onClick={toggleTheme}
            className="btn btn-ghost btn-sm flex-1"
            aria-label={themeName === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {themeName === 'dark' ? <LuSun className="h-4 w-4" /> : <LuMoon className="h-4 w-4" />}
            {themeName === 'dark' ? 'Light' : 'Dark'}
          </button>
          <button
            type="button"
            onClick={() => { logout(); navigate('/login'); }}
            className="btn btn-ghost btn-sm flex-1"
          >
            <LuLogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}

// Signed-in layout: sidebar on wide screens, a top bar with a slide-in menu on phones
export default function AppShell({ children, width = 'default' }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setMenuOpen(false), [location.pathname]);

  return (
    <div className="min-h-screen bg-paper">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-paper lg:block">
        <Sidebar />
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-paper/90 px-4 py-3 backdrop-blur lg:hidden">
        <Logo />
        <button type="button" className="btn btn-ghost btn-icon" onClick={() => setMenuOpen(true)} aria-label="Open menu">
          <LuMenu className="h-5 w-5" />
        </button>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-black/40" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] animate-rise-in border-r border-line bg-paper">
            <button
              type="button"
              className="btn btn-ghost btn-icon absolute right-3 top-4"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
            >
              <LuX className="h-5 w-5" />
            </button>
            <Sidebar onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      )}

      <main className="lg:pl-64">
        <div className={cx('mx-auto px-4 py-8 sm:px-8 lg:py-10', width === 'narrow' ? 'max-w-3xl' : 'max-w-6xl')}>
          {children}
        </div>
      </main>
    </div>
  );
}
