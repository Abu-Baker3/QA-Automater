'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function GitHubCallbackContent() {
  const searchParams = useSearchParams();
  const [statusMessage, setStatusMessage] = useState<string>('Processing GitHub Authorization...');
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDevMode, setIsDevMode] = useState<boolean>(false);
  const [usernameInput, setUsernameInput] = useState<string>('@qa-admin');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const code = searchParams.get('code');
    const installationId = searchParams.get('installation_id') || searchParams.get('setup_action');
    const mode = searchParams.get('mode');

    if (code || installationId) {
      completeOAuth(code || '', installationId || '');
    } else if (mode === 'dev_oauth' || !code) {
      setIsDevMode(true);
      setStatusMessage('Enter or confirm your GitHub account handle to authorize QA Automater.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const completeOAuth = async (code: string, installationId: string, usernameOverride?: string) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      let token = typeof window !== 'undefined' ? localStorage.getItem('access_token') || '' : '';
      if (!token && typeof document !== 'undefined') {
        const match = document.cookie.match(/access_token=([^;]+)/);
        if (match && match[1]) token = match[1];
      }

      if (!token) {
        setIsError(true);
        setStatusMessage(
          'Authentication required: Please log in at /login before connecting GitHub.',
        );
        setIsSubmitting(false);
        return;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      const res = await fetch('http://localhost:3000/integrations/github/callback', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          code,
          installationId,
          username: usernameOverride || usernameInput,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errText = errorData.message || `Callback failed with status ${res.status}`;
        if (res.status === 401) {
          setIsError(true);
          setStatusMessage('Session expired or unauthorized. Please log in at /login.');
        } else {
          setErrorMessage(errText);
        }
        setIsSubmitting(false);
        return;
      }

      const data = await res.json();
      setIsDevMode(false);
      setIsError(false);
      setErrorMessage(null);
      setStatusMessage(`Successfully authorized as ${data.username || usernameInput}! Closing window...`);

      // Post message to parent window if opened via popup
      if (window.opener) {
        window.opener.postMessage({ type: 'GITHUB_OAUTH_SUCCESS', payload: data }, '*');
        setTimeout(() => window.close(), 1200);
      } else {
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to complete GitHub authorization';
      console.error('OAuth Callback Error:', err);
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDevAuthorize = (e: React.FormEvent) => {
    e.preventDefault();
    const mockCode = `code_oauth_${Date.now()}`;
    const mockInstId = `inst_${Date.now()}`;
    completeOAuth(mockCode, mockInstId, usernameInput);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#070913',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(20px)',
          padding: '2.5rem',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          textAlign: 'center',
          maxWidth: '440px',
          width: '90%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{isError ? '⚠️' : '🐙'}</div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: '#ffffff' }}>
          {isDevMode
            ? 'GitHub OAuth Authorization'
            : isError
            ? 'Authorization Error'
            : 'Connecting to GitHub'}
        </h2>
        <p
          style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '1.25rem', margin: '0 0 1.25rem 0' }}
        >
          {statusMessage}
        </p>

        {isDevMode && !isError && (
          <form onSubmit={handleDevAuthorize} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
            <div
              style={{
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: '8px',
                padding: '0.65rem 0.85rem',
                fontSize: '0.75rem',
                color: '#a5b4fc',
                lineHeight: '1.4',
              }}
            >
              <strong>⚙️ Local Dev OAuth Simulator</strong>
              <div style={{ marginTop: '4px', color: '#94a3b8', fontSize: '0.7rem' }}>
                In Production, clicking Connect GitHub opens <code>github.com/login/oauth/authorize</code> where GitHub authenticates your password & 2FA directly. Third-party apps never collect GitHub passwords.
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                GitHub Username / Organization Handle
              </label>
              <input
                type="text"
                required
                value={usernameInput}
                onChange={(e) => {
                  setUsernameInput(e.target.value);
                  setErrorMessage(null);
                }}
                placeholder="e.g. @octocat or @qa-admin"
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem',
                  borderRadius: '8px',
                  background: '#020617',
                  border: errorMessage ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
            </div>

            {errorMessage && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#fca5a5',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  lineHeight: '1.4',
                }}
              >
                ⚠️ {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '0.85rem 1.25rem',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.9rem',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)',
              }}
            >
              {isSubmitting ? 'Verifying & Authorizing...' : 'Authorize QA Automater & Connect Account'}
            </button>
          </form>
        )}

        {isError && (
          <Link
            href="/login"
            style={{
              display: 'inline-block',
              padding: '0.5rem 1.25rem',
              borderRadius: '8px',
              background: '#6366f1',
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: '0 2px 10px rgba(99, 102, 241, 0.4)',
            }}
          >
            Sign In to QA Automater
          </Link>
        )}
      </div>
    </div>
  );
}

export default function GitHubCallbackPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            background: '#090d16',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
            Processing GitHub Authorization...
          </p>
        </div>
      }
    >
      <GitHubCallbackContent />
    </Suspense>
  );
}
