'use client';

import { useState } from 'react';

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

    try {
      const res = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToUse, password: passwordToUse }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Invalid credentials');
      }

      const role = data.user?.role || (emailToUse.includes('admin') ? 'ADMIN' : 'MEMBER');
      setSuccess(`Authenticated as ${role}! Redirecting...`);

      if (data.accessToken) {
        localStorage.setItem('access_token', data.accessToken);
        document.cookie = `access_token=${data.accessToken}; path=/; max-age=86400`;
      }

      setTimeout(() => {
        if (role === 'ADMIN') {
          window.location.href = '/admin';
        } else {
          window.location.href = '/';
        }
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin(email, password);
  };

  const fillAdminDemo = () => {
    setEmail('admin@qaautomater.local');
    setPassword('AdminPassword123!');
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
            Connect your repository, statically analyze frontend components, and map plain-text user stories to production-ready Playwright specs.
          </p>

          <div className="space-y-3 pt-4">
            <div className="feature-pill">
              <span className="text-xl">🎯</span>
              <div>
                <p className="text-sm font-semibold text-white">Source-Native Locators</p>
                <p className="text-xs text-slate-400">Ranks data-testid, ARIA roles, and JSX source lines</p>
              </div>
            </div>

            <div className="feature-pill">
              <span className="text-xl">✨</span>
              <div>
                <p className="text-sm font-semibold text-white">Deterministic Playwright Codegen</p>
                <p className="text-xs text-slate-400">Clean Page Object Model output exportable via ZIP or GitHub PR</p>
              </div>
            </div>

            <div className="feature-pill">
              <span className="text-xl">🛡️</span>
              <div>
                <p className="text-sm font-semibold text-white">Enterprise Role Control & Security</p>
                <p className="text-xs text-slate-400">In-house authentication engine with Admin Panel oversight</p>
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
          <p className="text-sm text-slate-400 mt-2">Enter your account credentials to access your workspace</p>
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
            <div className="flex justify-between items-center mb-1">
              <label className="form-label mb-0">Password</label>
              <a href="#" className="text-xs text-indigo-400 hover:underline">Forgot password?</a>
            </div>
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
          Don't have an account?{' '}
          <a href="/register" className="link font-semibold">
            Create an account
          </a>
        </div>
      </div>
    </div>
  );
}
