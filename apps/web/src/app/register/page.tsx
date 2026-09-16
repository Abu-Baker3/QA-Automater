'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('http://localhost:3000/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName, lastName }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      const role = data.user?.role || (email.includes('admin') ? 'ADMIN' : 'MEMBER');
      setSuccess(`Account registered as ${role}! Redirecting...`);

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
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="full-page-auth">
      {/* Left Column: Hero Showcase */}
      <div className="auth-hero-section">
        <div className="auth-hero-glow" />

        <div className="flex items-center space-x-3 z-10">
          <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-purple-600/40 text-xl">
            🚀
          </div>
          <span className="text-xl font-bold text-white tracking-tight">QA Automater</span>
          <span className="badge-live">
            <span className="pulse-dot" />
            Sign Up
          </span>
        </div>

        <div className="space-y-6 max-w-xl z-10 my-auto">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Join the Future of Code-Aware QA Engineering
          </h1>
          <p className="text-slate-300 text-base leading-relaxed">
            Create your account to start scanning React/Next.js codebases, generating Page Objects,
            and exporting Playwright suites automatically.
          </p>

          <div className="space-y-3 pt-4">
            <div className="feature-pill">
              <span className="text-xl">⚡</span>
              <div>
                <p className="text-sm font-semibold text-white">Instant Setup</p>
                <p className="text-xs text-slate-400">
                  Zero vendor lock-in — own 100% of your generated test code
                </p>
              </div>
            </div>

            <div className="feature-pill">
              <span className="text-xl">📊</span>
              <div>
                <p className="text-sm font-semibold text-white">Role & Tenant Governance</p>
                <p className="text-xs text-slate-400">
                  Multi-tenant workspace isolation with role permission management
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="z-10 text-xs text-slate-500">
          © 2026 QA Automater SaaS Platform. Multi-Tenant AI Engine.
        </div>
      </div>

      {/* Right Column: Sign Up Form */}
      <div className="auth-form-section">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white tracking-tight">Create an Account</h2>
          <p className="text-sm text-slate-400 mt-2">Get started with QA Automater in seconds</p>
        </div>

        {error && <div className="alert-error mb-6">{error}</div>}
        {success && <div className="alert-success mb-6">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jane"
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                className="form-input"
              />
            </div>
          </div>

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
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="form-input"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary mt-2">
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-400">
          Already have an account?{' '}
          <Link href="/login" className="link font-semibold">
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
}
