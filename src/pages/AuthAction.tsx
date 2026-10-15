import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { applyActionCode, confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useSeo } from '../lib/seo';
import Button from '../components/ui/Button';
import { Alert, Field } from '../components/ui/Bits';

export default function AuthAction() {
  useSeo({ title: 'Account action', noindex: true });
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const mode = params.get('mode'); const code = params.get('oobCode') || '';
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [pw2, setPw2] = useState('');
  const [state, setState] = useState<'loading' | 'form' | 'done' | 'error'>('loading'); const [msg, setMsg] = useState('');
  useEffect(() => {
    if (!code) { setMsg('This link is missing its code.'); setState('error'); return; }
    if (mode === 'resetPassword') verifyPasswordResetCode(auth, code).then((e) => { setEmail(e); setState('form'); }).catch(() => { setMsg('This reset link has expired or was already used.'); setState('error'); });
    else if (mode === 'verifyEmail') applyActionCode(auth, code).then(() => { setMsg('Email verified.'); setState('done'); }).catch(() => { setMsg('This verification link has expired or was already used.'); setState('error'); });
    else { setMsg('Unknown action.'); setState('error'); }
  }, [mode, code]);
  const submit = async (e: FormEvent) => { e.preventDefault(); if (pw.length < 8) return setMsg('Use at least 8 characters.'); if (pw !== pw2) return setMsg('Passwords do not match.'); try { await confirmPasswordReset(auth, code, pw); setMsg('Password updated. You can sign in now.'); setState('done'); } catch { setMsg('Could not reset the password. The link may have expired.'); } };
  return (
    <div className="wrap flex justify-center py-12"><div className="w-full max-w-md space-y-5 text-center">
      <h1 className="text-3xl">{mode === 'verifyEmail' ? 'Email verification' : 'Set a new password'}</h1>
      {state === 'loading' && <p className="text-muted">Checking link…</p>}
      {(state === 'done' || state === 'error') && <><Alert tone={state === 'done' ? 'good' : 'bad'}>{msg}</Alert><Button block onClick={() => navigate('/login')}>Go to sign in</Button></>}
      {state === 'form' && <form onSubmit={submit} className="card space-y-4 p-6 text-left"><p className="text-sm text-muted">for {email}</p>{msg && <Alert>{msg}</Alert>}<Field label="New password"><input id="aa-pw" type="password" className="input" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></Field><Field label="Confirm"><input id="aa-pw2" type="password" className="input" required value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" /></Field><Button type="submit" block>Reset password</Button></form>}
    </div></div>
  );
}
