import React from 'react';
import { Link } from 'react-router-dom';
import { LuMoon, LuSun, LuShuffle, LuMaximize, LuEyeOff } from 'react-icons/lu';
import { useTheme } from '../context/ThemeContext';
import { Logo } from './ui';

const POINTS = [
  { icon: LuShuffle, title: 'A different paper for every student', text: 'Questions and options are shuffled per student.' },
  { icon: LuMaximize, title: 'Fullscreen, watched', text: 'Leaving the exam tab or fullscreen is recorded and counted.' },
  { icon: LuEyeOff, title: 'No early answer keys', text: 'Correct answers appear only after the exam closes for everyone.' },
];

// A small, static preview of the examiner's integrity view
function IntegrityPreview() {
  const rows = [
    { name: 'Nusrat Jahan', score: '18/20', risk: 'Clean', tone: 'bg-white/15 text-white' },
    { name: 'Tanvir Ahmed', score: '17/20', risk: '2 violations', tone: 'bg-amber-300/25 text-amber-100' },
    { name: 'Sadia Islam', score: '9/20', risk: 'Auto-submitted', tone: 'bg-red-400/25 text-red-100' },
  ];
  return (
    <div className="rounded-xl border border-white/15 bg-white/[0.06] p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between text-xs text-white/70">
        <span className="font-medium text-white">Physics · HSC Batch A</span>
        <span>3 of 42 shown</span>
      </div>
      <div className="divide-y divide-white/10">
        {rows.map((row) => (
          <div key={row.name} className="flex items-center justify-between py-2 text-sm">
            <span className="text-white/90">{row.name}</span>
            <span className="flex items-center gap-3">
              <span className="font-mono text-xs text-white/70">{row.score}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${row.tone}`}>{row.risk}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AuthLayout({ title, subtitle, children, footer }) {
  const { themeName, toggleTheme } = useTheme();

  return (
    <div className="grid min-h-screen bg-paper lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
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

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm animate-rise-in">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p>}
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-8 space-y-2 text-center text-sm text-muted">{footer}</div>}
          </div>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-[#0B3D2E] lg:flex lg:flex-col lg:justify-center lg:gap-12 lg:p-14">
        {/* Faint ruled lines, like an exam answer sheet */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0 31px, #fff 31px 32px)' }}
        />
        <div className="relative max-w-md">
          <p className="text-sm font-medium text-emerald-200/80">Online exams for schools, coaching centers and hiring teams</p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-white">
            Fair exams, without an invigilator in the room.
          </h2>
        </div>

        <div className="relative max-w-md space-y-8">
          <ul className="space-y-5">
            {POINTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 text-emerald-200">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span>
                  <span className="block text-sm font-medium text-white">{title}</span>
                  <span className="mt-0.5 block text-sm text-white/65">{text}</span>
                </span>
              </li>
            ))}
          </ul>
          <IntegrityPreview />
        </div>
      </div>
    </div>
  );
}
