'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = async (emailToUse: string, passwordToUse: string) => {
    setLoading(true);
    setError('');
    setSuccess('');

    const trimmedEmail = emailToUse.trim().toLowerCase();
    const isAdmin = trimmedEmail.includes('admin');
    const targetUrl = isAdmin ? '/admin' : '/';

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToUse, password: passwordToUse }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Invalid email or password');
      }

      const role = data.user?.role || (isAdmin ? 'ADMIN' : 'MEMBER');
      const finalTarget = role === 'ADMIN' ? '/admin' : '/';
      setSuccess(`Authenticated as ${role}! Redirecting...`);

      if (data.accessToken) {
        localStorage.setItem('access_token', data.accessToken);
        document.cookie = `access_token=${data.accessToken}; path=/; max-age=86400; SameSite=Lax`;
      }

      window.location.href = finalTarget;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      
      // If network error (backend offline in dev), log in seamlessly using dev tokens
      if (
        process.env.NODE_ENV !== 'production' &&
        (msg.includes('fetch') || msg.includes('Failed to fetch') || msg.includes('NetworkError'))
      ) {
        const role = isAdmin ? 'ADMIN' : 'MEMBER';
        const mockHeader = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const mockPayload = btoa(
          JSON.stringify({
            sub: isAdmin ? 'usr_admin' : 'usr_dev',
            email: emailToUse,
            role,
            orgId: 'org_dev_default',
          }),
        );
        const devToken = `${mockHeader}.${mockPayload}.mockSignature`;

        localStorage.setItem('access_token', devToken);
        document.cookie = `access_token=${devToken}; path=/; max-age=86400; SameSite=Lax`;

        setSuccess(`Authenticated as ${role}! Redirecting...`);
        window.location.href = targetUrl;
        return;
      }

      setError(msg);
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin(email, password);
  };

  return (
    <div className="full-page-auth">
      {/* Left Column: Hero Brand Showcase */}
      <div className="auth-hero-section">
        <div className="auth-hero-glow" />

        <div className="flex items-center space-x-3 z-10">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/40 text-xl">
            ⚡
          </div>
          <span className="text-xl font-bold text-white tracking-tight">QA Automater</span>
          <span className="badge-live">
            <span className="pulse-dot" />
            v2.0 Active
          </span>
        </div>

        <div className="space-y-6 max-w-xl z-10 my-auto">
          <h1 className="text-4xl font-bold text-white leading-tight">
            AI-Powered Test Generation for React & Next.js
          </h1>
          <p className="text-slate-300 text-base leading-relaxed">
            Connect your repository, statically analyze frontend components, and map plain-text user
            stories to production-ready Playwright specs.
          </p>

          <div className="space-y-3 pt-4">
            <div className="feature-pill">
              <span className="text-xl">🎯</span>
              <div>
                <p className="text-sm font-semibold text-white">Source-Native Locators</p>
                <p className="text-xs text-slate-400">
                  Ranks data-testid, ARIA roles, and JSX source lines
                </p>
              </div>
            </div>

            <div className="feature-pill">
              <span className="text-xl">✨</span>
              <div>
                <p className="text-sm font-semibold text-white">Deterministic Playwright Codegen</p>
                <p className="text-xs text-slate-400">
                  Clean Page Object Model output exportable via ZIP or GitHub PR
                </p>
              </div>
            </div>

            <div className="feature-pill">
              <span className="text-xl">🛡️</span>
              <div>
                <p className="text-sm font-semibold text-white">
                  Enterprise Role Control & Security
                </p>
                <p className="text-xs text-slate-400">
                  In-house authentication engine with Admin Panel oversight
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="z-10 text-xs text-slate-500">
          © 2026 QA Automater SaaS Platform. Built with NestJS, Next.js 15, and PostgreSQL.
        </div>
      </div>

      {/* Right Column: Sign In Form */}
      <div className="auth-form-section">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white tracking-tight">Sign In</h2>
          <p className="text-sm text-slate-400 mt-2">
            Enter your account credentials to access your workspace
          </p>
        </div>

        {error && <div className="alert-error mb-6">{error}</div>}
        {success && <div className="alert-success mb-6">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="form-label">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="form-input"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary mt-2">
            {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-400">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="link font-semibold">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
