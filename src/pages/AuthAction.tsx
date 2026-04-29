import { useState, useEffect, FormEvent } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { verifyPasswordResetCode, confirmPasswordReset, applyActionCode } from 'firebase/auth';
import { auth } from '../config/firebase';
import Button from '../components/ui/Button';

const AuthAction = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!oobCode) {
      setError('Invalid or missing action code.');
      setLoading(false);
      return;
    }

    if (mode === 'resetPassword') {
      verifyPasswordResetCode(auth, oobCode)
        .then((userEmail) => {
          setEmail(userEmail);
          setLoading(false);
        })
        .catch(() => {
          setError('This password reset link has expired or already been used.');
          setLoading(false);
        });
    } else if (mode === 'verifyEmail') {
      applyActionCode(auth, oobCode)
        .then(() => {
          setMessage('Email verified successfully!');
          setLoading(false);
        })
        .catch(() => {
          setError('This verification link has expired or already been used.');
          setLoading(false);
        });
    } else {
      setError('Unknown action.');
      setLoading(false);
    }
  }, [mode, oobCode]);

  const handleResetPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      await confirmPasswordReset(auth, oobCode!, newPassword);
      setMessage('Password has been reset successfully!');
    } catch (err: any) {
      if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please choose a stronger password.');
      } else {
        setError('Failed to reset password. The link may have expired.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Verifying...</p>
      </div>
    );
  }

  // Success state - show message with link to login
  if (message) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full space-y-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900">{mode === 'verifyEmail' ? 'Email Verified' : 'Password Reset'}</h2>
          <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded">
            {message}
          </div>
          <Button onClick={() => navigate('/login')} variant="primary" className="w-full">
            Go to Sign In
          </Button>
        </div>
      </div>
    );
  }

  // Error state with no form to show
  if (error && mode !== 'resetPassword') {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full space-y-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900">Something went wrong</h2>
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
          <Button onClick={() => navigate('/login')} variant="primary" className="w-full">
            Go to Sign In
          </Button>
        </div>
      </div>
    );
  }

  // Reset password form
  if (mode === 'resetPassword' && email) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
              Set new password
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              for {email}
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <input
                  id="new-password"
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={submitting}
            >
              {submitting ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Fallback error
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <h2 className="text-3xl font-bold text-gray-900">Invalid Link</h2>
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          {error || 'This link is invalid or has expired.'}
        </div>
        <Button onClick={() => navigate('/login')} variant="primary" className="w-full">
          Go to Sign In
        </Button>
      </div>
    </div>
  );
};

export default AuthAction;
