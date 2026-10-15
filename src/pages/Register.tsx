import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../services/api';
import { useSeo } from '../lib/seo';
import Button from '../components/ui/Button';
import { Alert, Field } from '../components/ui/Bits';

export default function Register() {
  useSeo({ title: 'Create account', noindex: true });
  const { signup, loginWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    if (f.password !== f.confirm) return setError('Passwords do not match.');
    if (f.password.length < 8) return setError('Use at least 8 characters.');
    setBusy(true);
    try { await signup(f.email, f.password, f.name); navigate('/account'); } catch (e) { setError((e as { code?: string }).code?.includes('email-already-in-use') ? 'That email already has an account. Try signing in.' : errorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <div className="wrap flex justify-center py-12"><div className="w-full max-w-md space-y-6">
      <div className="text-center"><h1 className="text-3xl">Create your account</h1><p className="mt-1 text-sm text-muted">Already have one? <Link to="/login" className="text-pine underline">Sign in</Link></p>{user?.isAnonymous && <p className="mt-2 text-xs text-muted">Your guest order will be attached to this account.</p>}</div>
      <form onSubmit={submit} className="card space-y-4 p-6">
        {error && <Alert>{error}</Alert>}
        <Field label="Name"><input id="reg-name" className="input" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" /></Field>
        <Field label="Email"><input id="reg-email" type="email" className="input" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" /></Field>
        <Field label="Password"><input id="reg-password" type="password" className="input" required minLength={8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="new-password" /></Field>
        <Field label="Confirm password"><input id="reg-confirm" type="password" className="input" required value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} autoComplete="new-password" /></Field>
        <Button type="submit" block disabled={busy}>{busy ? 'Creating…' : 'Create account'}</Button>
        <div className="flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
        <Button type="button" block variant="ghost" onClick={async () => { try { await loginWithGoogle(); navigate('/account'); } catch (e) { setError(errorMessage(e)); } }}>Continue with Google</Button>
        <p className="text-center text-xs text-muted">By creating an account you agree to our <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>.</p>
      </form>
    </div></div>
  );
}
