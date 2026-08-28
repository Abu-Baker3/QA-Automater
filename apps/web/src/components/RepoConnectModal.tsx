'use client';

import React, { useState } from 'react';

interface RepoConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectAndScan: (repoUrl: string, branchName: string) => void;
}

export const RepoConnectModal: React.FC<RepoConnectModalProps> = ({
  isOpen,
  onClose,
  onConnectAndScan,
}) => {
  const [repoUrlInput, setRepoUrlInput] = useState<string>(
    'https://github.com/acme-inc/payments-service.git',
  );
  const [branchInput, setBranchInput] = useState<string>('main');
  const [isGitHubConnected, setIsGitHubConnected] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (repoUrlInput.trim()) {
      onConnectAndScan(repoUrlInput.trim(), branchInput.trim() || 'main');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      data-testid="repo-connect-modal-backdrop"
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '520px',
          padding: '1.75rem',
          background: 'rgba(15, 23, 42, 0.95)',
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
        }}
        data-testid="repo-connect-modal"
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
              Connect Repository & Scan
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Connect a GitHub repository to automatically trigger initial locator scan.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '1.5rem',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>

        {/* GitHub Connection Status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            background: 'rgba(30, 41, 59, 0.6)',
            border: '1px solid var(--border-card)',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.1rem' }}>🐙</span>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>GitHub Integration</div>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: isGitHubConnected ? '#34d399' : 'var(--text-muted)',
                }}
              >
                {isGitHubConnected ? '● Connected as @qa-admin' : 'Not connected'}
              </div>
            </div>
          </div>
          {!isGitHubConnected && (
            <button
              type="button"
              onClick={() => setIsGitHubConnected(true)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                border: 'none',
                background: '#6366f1',
                color: '#fff',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Connect GitHub
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 600,
                marginBottom: '6px',
              }}
            >
              Repository URL or Name
            </label>
            <input
              type="text"
              value={repoUrlInput}
              onChange={(e) => setRepoUrlInput(e.target.value)}
              placeholder="e.g. acme-inc/web-app or https://github.com/..."
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                borderRadius: '8px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid var(--border-card)',
                color: '#fff',
                fontSize: '0.875rem',
                outline: 'none',
              }}
              data-testid="repo-url-input"
              required
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 600,
                marginBottom: '6px',
              }}
            >
              Default Branch
            </label>
            <input
              type="text"
              value={branchInput}
              onChange={(e) => setBranchInput(e.target.value)}
              placeholder="main"
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                borderRadius: '8px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid var(--border-card)',
                color: '#fff',
                fontSize: '0.875rem',
                outline: 'none',
              }}
              data-testid="repo-branch-input"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-card)',
                background: 'transparent',
                color: 'var(--text-muted)',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
              }}
              data-testid="connect-and-scan-submit"
            >
              Connect & Start Scan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
