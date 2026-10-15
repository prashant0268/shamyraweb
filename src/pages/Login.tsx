import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../services/api';
import { useSeo } from '../lib/seo';
import Button from '../components/ui/Button';
import { Alert, Field } from '../components/ui/Bits';

export default function Login() {
  useSeo({ title: 'Sign in', noindex: true });
  const { login, loginWithGoogle, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/account';
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const [reset, setReset] = useState(false);

  const run = async (fn: () => Promise<unknown>, ok?: () => void) => { setError(''); setMessage(''); setBusy(true); try { await fn(); ok?.(); } catch (e) { const c = (e as { code?: string }).code || ''; setError(c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found') ? 'Email or password is incorrect.' : errorMessage(e)); } finally { setBusy(false); } };
  const submit = (e: FormEvent) => { e.preventDefault(); reset ? run(() => resetPassword(email), () => setMessage('Reset link sent. Check your inbox.')) : run(() => login(email, password), () => navigate(next)); };

  return (
    <div className="wrap flex justify-center py-12"><div className="w-full max-w-md space-y-6">
      <div className="text-center"><h1 className="text-3xl">{reset ? 'Reset your password' : 'Sign in'}</h1><p className="mt-1 text-sm text-muted">{reset ? "Enter your email and we'll send a reset link." : <>Or <Link to="/register" className="text-pine underline">create an account</Link></>}</p></div>
      <form onSubmit={submit} className="card space-y-4 p-6">
        {error && <Alert>{error}</Alert>}{message && <Alert tone="good">{message}</Alert>}
        <Field label="Email"><input id="login-email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></Field>
        {!reset && <Field label="Password"><input id="login-password" type="password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></Field>}
        <Button type="submit" block disabled={busy}>{busy ? 'One moment…' : reset ? 'Send reset link' : 'Sign in'}</Button>
        {!reset && <><div className="flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div><Button type="button" block variant="ghost" disabled={busy} onClick={() => run(() => loginWithGoogle(), () => navigate(next))}>Continue with Google</Button></>}
        <button type="button" onClick={() => { setReset(!reset); setError(''); setMessage(''); }} className="block w-full text-center text-sm text-pine underline">{reset ? 'Back to sign in' : 'Forgot your password?'}</button>
      </form>
    </div></div>
  );
}
