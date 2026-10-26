import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Logo } from './ui';

const QUERY = '(min-width: 1024px)';

// Pages that work on phones too; everything else needs a computer in version one
const PHONE_FRIENDLY = ['/login', '/signup', '/signup/organization', '/waitlist'];

function useWideEnough() {
  const [wide, setWide] = useState(() => (typeof window.matchMedia === 'function' ? window.matchMedia(QUERY).matches : true));
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const mq = window.matchMedia(QUERY);
    const update = () => setWide(mq.matches);
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);
  return wide;
}

// Covers the app below 1024 px instead of unmounting it, so a running exam keeps its timer and answers
export default function DesktopOnly({ children }) {
  const wide = useWideEnough();
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const inExam = pathname.startsWith('/exam/');
  const covered = !wide && !PHONE_FRIENDLY.includes(pathname);

  return (
    <>
      {children}
      {covered && (
        <div role="dialog" aria-modal="true" aria-labelledby="desktop-only-title" className="fixed inset-0 z-[60] overflow-y-auto bg-paper">
          <div className="flex min-h-full flex-col px-6 py-6">
            <Logo />
            <div className="my-auto max-w-sm py-12">
              <p className="eyebrow">{inExam ? 'Your exam is still running' : 'Use a computer'}</p>
              <h1 id="desktop-only-title" className="mt-3 text-[1.7rem] font-semibold leading-tight tracking-[-0.02em]">
                {inExam ? 'Make this window wider to keep going' : 'TestKori works on a computer'}
              </h1>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">
                {inExam
                  ? 'The timer has not stopped. Widen the window (at least 1024 pixels) or rotate your tablet and your exam comes back exactly as you left it.'
                  : 'Exams need a full desktop browser for their timer and protections. Open TestKori on a laptop or desktop and sign in there.'}
              </p>
              {user && !inExam && (
                <Button variant="secondary" className="mt-8" onClick={() => { logout(); navigate('/login'); }}>Sign out</Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
