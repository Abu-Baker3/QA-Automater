'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function GitHubCallbackPage() {
  const searchParams = useSearchParams();
  const [statusMessage, setStatusMessage] = useState<string>('Processing GitHub Authorization...');
  const [isError, setIsError] = useState<boolean>(false);

  useEffect(() => {
    const code = searchParams.get('code');
    const installationId = searchParams.get('installation_id') || searchParams.get('setup_action');

    if (!code && !installationId) {
      // Mock authorization for dev testing if no query params present
      const mockCode = `code_oauth_${Date.now()}`;
      const mockInstId = `inst_${Date.now()}`;
      completeOAuth(mockCode, mockInstId);
      return;
    }

    completeOAuth(code || '', installationId || '');
  }, [searchParams]);

  const completeOAuth = async (code: string, installationId: string) => {
    try {
      let token = typeof window !== 'undefined' ? (localStorage.getItem('access_token') || '') : '';
      if (!token && typeof document !== 'undefined') {
        const match = document.cookie.match(/access_token=([^;]+)/);
        if (match && match[1]) token = match[1];
      }

      if (!token) {
        setIsError(true);
        setStatusMessage('Authentication required: Please log in at /login before connecting GitHub.');
        return;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      const res = await fetch('http://localhost:3000/integrations/github/callback', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ code, installationId }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setIsError(true);
        if (res.status === 401) {
          setStatusMessage('Session expired or unauthorized. Please log in at /login.');
        } else {
          setStatusMessage(errorData.message || `Callback failed with status ${res.status}`);
        }
        return;
      }

      const data = await res.json();
      setStatusMessage('GitHub connected successfully! Closing window...');

      // Post message to parent window if opened via popup
      if (window.opener) {
        window.opener.postMessage(
          { type: 'GITHUB_OAUTH_SUCCESS', payload: data },
          '*'
        );
        setTimeout(() => window.close(), 1200);
      } else {
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      }
    } catch (err: any) {
      console.error('OAuth Callback Error:', err);
      setIsError(true);
      setStatusMessage(err?.message || 'Failed to complete GitHub authorization');
    }
  };

  return (
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
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.9)',
          padding: '2.5rem',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          textAlign: 'center',
          maxWidth: '420px',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
          {isError ? '⚠️' : '🐙'}
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          {isError ? 'Authorization Error' : 'Connecting to GitHub'}
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: isError ? '1.25rem' : 0 }}>{statusMessage}</p>
        {isError && (
          <a
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
          </a>
        )}
      </div>
    </div>
  );
}
