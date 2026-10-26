import React from 'react';
import { Link } from 'react-router-dom';
import { LuMoon, LuSun } from 'react-icons/lu';
import { useTheme } from '../context/ThemeContext';
import { Logo } from './ui';

// Sign-in and sign-up pages: one exam-paper sheet on the paper ground
export default function AuthLayout({ title, subtitle, children, footer, label = 'Students & staff' }) {
  const { themeName, toggleTheme } = useTheme();

  return (
    <div className="grid min-h-screen grid-rows-[auto_1fr_auto] bg-paper px-5 py-6 sm:px-12 sm:py-8">
      <div className="flex items-center justify-between">
        <Link to="/login" aria-label="TestKori home"><Logo /></Link>
        <button
          type="button"
          onClick={toggleTheme}
          className="btn btn-ghost btn-icon"
          aria-label={themeName === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {themeName === 'dark' ? <LuSun className="h-4 w-4" /> : <LuMoon className="h-4 w-4" />}
        </button>
      </div>

      <main className="sheet sheet-margin my-10 w-full max-w-[34rem] self-center justify-self-center px-6 pb-9 pt-10 sm:pl-14 sm:pr-12">
        <div className="flex items-baseline justify-between gap-4 border-b-2 border-ink pb-3.5">
          <h1 className="text-[1.9rem] font-semibold leading-none tracking-[-0.02em]">{title}</h1>
          {label && <span className="eyebrow text-right">{label}</span>}
        </div>
        {subtitle && <p className="mt-4 text-sm leading-relaxed text-muted">{subtitle}</p>}
        <div className="mt-7">{children}</div>
        {footer && <div className="mt-8 space-y-2 border-t border-line pt-4 text-sm text-muted">{footer}</div>}
      </main>

      <div className="flex justify-between font-mono text-xs text-faint">
        <span>TestKori</span>
        <span>Fair exams in any browser</span>
      </div>
    </div>
  );
}
