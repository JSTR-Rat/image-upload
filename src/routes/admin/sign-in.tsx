import { useState } from 'react';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';

import { authClient } from '#/lib/auth-client';
import { Button } from '@headlessui/react';

export const Route = createFileRoute('/admin/sign-in')({
  component: AdminSignIn,
});

function AdminSignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await authClient.signIn.email({ email, password });
      if (res.error) {
        setError(res.error.message ?? 'Sign-in failed');
        return;
      }
      void navigate({ to: '/admin', replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
          Admin sign in
        </h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Email/password accounts only (not anonymous sessions).
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Email
            </span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-50"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Password
            </span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-50"
            />
          </label>

          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : null}

          <Button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-semibold text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
          >
            {pending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <Link
          to="/"
          className="mt-6 inline-block text-sm text-blue-600 hover:underline"
        >
          ← Back to gallery
        </Link>
      </div>
    </div>
  );
}
