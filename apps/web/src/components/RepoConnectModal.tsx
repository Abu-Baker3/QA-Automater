'use client';

import React, { useState, useEffect } from 'react';

interface RepoConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectAndScan: (repoUrl: string, branchName: string) => void;
}

interface GitHubRepoItem {
  id: string;
  name: string;
  full_name: string;
  default_branch: string;
  private: boolean;
  html_url: string;
}

export const RepoConnectModal: React.FC<RepoConnectModalProps> = ({
  isOpen,
  onClose,
  onConnectAndScan,
}) => {
  const [repoUrlInput, setRepoUrlInput] = useState<string>('');
  const [branchInput, setBranchInput] = useState<string>('main');
  const [isGitHubConnected, setIsGitHubConnected] = useState<boolean>(false);
  const [accountName, setAccountName] = useState<string>('@qa-admin');
  const [accessibleRepos, setAccessibleRepos] = useState<GitHubRepoItem[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isLoadingRepos, setIsLoadingRepos] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const getAuthHeaders = () => {
    let token = typeof window !== 'undefined' ? (localStorage.getItem('access_token') || '') : '';
    if (!token && typeof document !== 'undefined') {
      const match = document.cookie.match(/access_token=([^;]+)/);
      if (match && match[1]) token = match[1];
    }
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch('http://localhost:3000/integrations/github/status', {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setIsGitHubConnected(data.connected);
        if (data.accountName) setAccountName(data.accountName);
        if (data.connected) {
          fetchAccessibleRepos();
        }
      }
    } catch (err) {
      console.error('Failed to fetch GitHub status:', err);
    }
  };

  const fetchAccessibleRepos = async () => {
    setIsLoadingRepos(true);
    try {
      const res = await fetch('http://localhost:3000/integrations/github/repositories', {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setAccessibleRepos(data.repositories || []);
      }
    } catch (err) {
      console.error('Failed to fetch repositories:', err);
    } finally {
      setIsLoadingRepos(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GITHUB_OAUTH_SUCCESS') {
        setIsGitHubConnected(true);
        if (event.data?.payload?.installationId) {
          setAccountName(`@github-org-${event.data.payload.installationId.slice(0, 8)}`);
        }
        fetchAccessibleRepos();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (!isOpen) return null;

  const handleConnectGitHub = async () => {
    try {
      const res = await fetch('http://localhost:3000/integrations/github/connect', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      let authUrl = '/integrations/github/callback';
      if (res.ok) {
        const data = await res.json();
        if (data.authorization_url && !data.authorization_url.includes('qa-automater-app')) {
          authUrl = data.authorization_url;
        }
      }
      
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      window.open(
        authUrl,
        'GitHub Authorization',
        `width=${width},height=${height},top=${top},left=${left}`
      );
    } catch (err) {
      console.error('Failed to initiate GitHub connect:', err);
      // Fallback popup for local dev
      window.open('/integrations/github/callback', 'GitHub Authorization', 'width=600,height=700');
    }
  };

  const handleSelectRepo = (repo: GitHubRepoItem) => {
    setRepoUrlInput(repo.full_name);
    setBranchInput(repo.default_branch || 'main');
    setIsDropdownOpen(false);
    setValidationError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrlInput.trim()) {
      setValidationError('Please select or enter a repository name.');
      return;
    }
    
    onConnectAndScan(repoUrlInput.trim(), branchInput.trim() || 'main');
  };

  const filteredRepos = accessibleRepos.filter(
    (repo) =>
      repo.name.toLowerCase().includes(repoUrlInput.toLowerCase()) ||
      repo.full_name.toLowerCase().includes(repoUrlInput.toLowerCase())
  );

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
          maxWidth: '540px',
          padding: '1.75rem',
          background: 'rgba(15, 23, 42, 0.95)',
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
          position: 'relative',
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

        {/* GitHub Connection Status Badge */}
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {isGitHubConnected ? (
                  <>
                    <span style={{ color: '#34d399' }}>●</span> Connected as {accountName}
                  </>
                ) : (
                  'Not connected'
                )}
              </div>
            </div>
          </div>
          {!isGitHubConnected ? (
            <button
              type="button"
              onClick={handleConnectGitHub}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(99, 102, 241, 0.3)',
              }}
            >
              Connect GitHub
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConnectGitHub}
              style={{
                padding: '0.3rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#94a3b8',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              Re-connect
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem', position: 'relative' }}>
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
              onChange={(e) => {
                setRepoUrlInput(e.target.value);
                setIsDropdownOpen(true);
                setValidationError(null);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder={
                isGitHubConnected
                  ? 'Select or search accessible repository...'
                  : 'Connect GitHub above or enter repo e.g. acme/web-app'
              }
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                borderRadius: '8px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: validationError ? '1px solid #ef4444' : '1px solid var(--border-card)',
                color: '#fff',
                fontSize: '0.875rem',
                outline: 'none',
              }}
              data-testid="repo-url-input"
              required
            />

            {/* Dropdown Repository List */}
            {isDropdownOpen && isGitHubConnected && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '4px',
                  background: '#0f172a',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  zIndex: 200,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
                }}
              >
                {isLoadingRepos ? (
                  <div style={{ padding: '0.75rem', fontSize: '0.8125rem', color: '#94a3b8' }}>
                    Loading repositories...
                  </div>
                ) : filteredRepos.length > 0 ? (
                  filteredRepos.map((repo) => (
                    <div
                      key={repo.id}
                      onClick={() => handleSelectRepo(repo)}
                      style={{
                        padding: '0.625rem 0.875rem',
                        cursor: 'pointer',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f8fafc' }}>
                          {repo.full_name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          Branch: {repo.default_branch}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: repo.private ? 'rgba(239, 68, 68, 0.2)' : 'rgba(52, 211, 153, 0.2)',
                          color: repo.private ? '#fca5a5' : '#6ee7b7',
                        }}
                      >
                        {repo.private ? '🔒 Private' : '🌐 Public'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '0.75rem', fontSize: '0.8125rem', color: '#94a3b8' }}>
                    No matching repositories found.
                  </div>
                )}
              </div>
            )}
          </div>

          {validationError && (
            <div style={{ color: '#ef4444', fontSize: '0.75rem', marginBottom: '1rem' }}>
              {validationError}
            </div>
          )}

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
