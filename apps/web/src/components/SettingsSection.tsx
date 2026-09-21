'use client';

import React, { useState, useEffect } from 'react';
import { Sliders, Globe, Eye, EyeOff, Bot, Code2, Save, LogOut } from 'lucide-react';

interface SettingsData {
  workspaceName: string;
  targetBaseUrl: string;
  defaultBrowser: 'chromium' | 'firefox' | 'webkit';
  headlessMode: boolean;
  aiModel: 'gemini-1.5-flash' | 'gemini-1.5-pro';
  customTestIdAttribute: string;
  exportFormat: 'typescript' | 'javascript';
}

export function SettingsSection() {
  const [settings, setSettings] = useState<SettingsData>({
    workspaceName: 'Default Workspace',
    targetBaseUrl: 'http://localhost:3000',
    defaultBrowser: 'chromium',
    headlessMode: true,
    aiModel: 'gemini-1.5-flash',
    customTestIdAttribute: 'data-testid',
    exportFormat: 'typescript',
  });

  const [connectedAccount, setConnectedAccount] = useState<string>('@qa-admin');
  const [isGitHubConnected, setIsGitHubConnected] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const getAuthHeaders = () => {
    let token = typeof window !== 'undefined' ? localStorage.getItem('access_token') || '' : '';
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

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/v1/organizations/org_default/settings', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch {
      // Keep default state if API warming up
    } finally {
      setLoading(false);
    }
  };

  const fetchGitHubStatus = async () => {
    try {
      const res = await fetch('http://localhost:3000/integrations/github/status', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setIsGitHubConnected(!!data.connected);
        if (data.accountName) {
          setConnectedAccount(data.accountName);
        } else {
          setIsGitHubConnected(false);
        }
      }
    } catch {
      // Keep initial dummy fallback
    }
  };

  const handleDisconnectGitHub = async () => {
    try {
      const res = await fetch('http://localhost:3000/integrations/github/disconnect', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setIsGitHubConnected(false);
        setConnectedAccount('Not Connected');
        setSuccessMsg('GitHub integration disconnected successfully.');
      }
    } catch {
      setErrorMsg('Failed to disconnect GitHub account.');
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchGitHubStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await fetch('http://localhost:3000/v1/organizations/org_default/settings', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        setErrorMsg('Failed to save settings.');
        return;
      }

      setSuccessMsg('Workspace settings saved successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch {
      setErrorMsg('Error connecting to backend server.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        maxWidth: '1000px',
        margin: '0 auto',
      }}
    >
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              margin: 0,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <Sliders style={{ width: '24px', height: '24px', color: '#818CF8' }} />
            Workspace & Product Settings
          </h1>
          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.875rem',
              marginTop: '4px',
              margin: 0,
            }}
          >
            {loading
              ? 'Fetching active workspace settings...'
              : 'Configure target environments, GitHub AI models, locator conventions, and Playwright execution.'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 24px',
            borderRadius: '10px',
            border: 'none',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#ffffff',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)',
            transition: 'all 0.2s',
          }}
        >
          <Save style={{ width: '16px', height: '16px' }} />
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>

      {/* Toast Alerts */}
      {errorMsg && <div className="alert-error">{errorMsg}</div>}
      {successMsg && <div className="alert-success">{successMsg}</div>}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* CARD 1: GENERAL & TARGET ENVIRONMENT */}
        <div
          className="glass-panel"
          style={{ padding: '24px', background: 'rgba(15, 23, 42, 0.85)' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '20px',
              borderBottom: '1px solid var(--border-card)',
              paddingBottom: '14px',
            }}
          >
            <Globe style={{ width: '20px', height: '20px', color: '#38bdf8' }} />
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                1. General & Target Environment
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                Target URLs and Playwright runner execution options
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
            }}
          >
            <div>
              <label className="form-label">Workspace Display Name</label>
              <input
                type="text"
                required
                value={settings.workspaceName}
                onChange={(e) => setSettings({ ...settings, workspaceName: e.target.value })}
                className="form-input"
                placeholder="e.g. My QA Team"
              />
            </div>

            <div>
              <label className="form-label">Target Base URL (App Under Test)</label>
              <input
                type="url"
                required
                value={settings.targetBaseUrl}
                onChange={(e) => setSettings({ ...settings, targetBaseUrl: e.target.value })}
                className="form-input"
                placeholder="http://localhost:3000 or https://staging.com"
              />
              <span
                style={{
                  fontSize: '0.725rem',
                  color: 'var(--text-sub)',
                  marginTop: '4px',
                  display: 'block',
                }}
              >
                Playwright scripts use this as the base URL for page.goto() navigation.
              </span>
            </div>

            <div>
              <label className="form-label">Default Playwright Browser</label>
              <select
                value={settings.defaultBrowser}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    defaultBrowser: e.target.value as SettingsData['defaultBrowser'],
                  })
                }
                style={{
                  width: '100%',
                  padding: '0.85rem 1.15rem',
                  borderRadius: '0.625rem',
                  backgroundColor: '#020617',
                  border: '1px solid var(--border-card)',
                  color: '#f8fafc',
                  fontSize: '0.925rem',
                }}
              >
                <option value="chromium">Chromium (Google Chrome / Edge) [Recommended]</option>
                <option value="firefox">Firefox (Mozilla Firefox)</option>
                <option value="webkit">WebKit (Apple Safari Engine)</option>
              </select>
            </div>

            <div>
              <label className="form-label">Browser Headless Execution Mode</label>
              <div
                onClick={() => setSettings({ ...settings, headlessMode: !settings.headlessMode })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.85rem 1.15rem',
                  borderRadius: '0.625rem',
                  background: '#020617',
                  border: '1px solid var(--border-card)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {settings.headlessMode ? (
                    <EyeOff style={{ width: '18px', height: '18px', color: '#c084fc' }} />
                  ) : (
                    <Eye style={{ width: '18px', height: '18px', color: '#34d399' }} />
                  )}
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ffffff' }}>
                    {settings.headlessMode
                      ? 'Headless Mode (Background)'
                      : 'Visual Window Mode (Headful)'}
                  </span>
                </div>

                <input
                  type="checkbox"
                  checked={settings.headlessMode}
                  onChange={() => {}}
                  style={{ width: '18px', height: '18px', accentColor: '#8b5cf6' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: GITHUB & AI MODEL SETTINGS */}
        <div
          className="glass-panel"
          style={{ padding: '24px', background: 'rgba(15, 23, 42, 0.85)' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '20px',
              borderBottom: '1px solid var(--border-card)',
              paddingBottom: '14px',
            }}
          >
            <Bot style={{ width: '20px', height: '20px', color: '#c084fc' }} />
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                2. GitHub & AI Model Settings
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                GitHub token permissions and Gemini AI model reasoning engine
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
            }}
          >
            {/* GitHub Account Identity */}
            <div
              style={{
                background: 'rgba(2, 6, 23, 0.5)',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid var(--border-card)',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                GitHub Connected Account
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>🐙</span>
                  <div>
                    <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.9rem' }}>
                      {isGitHubConnected ? connectedAccount : 'Not Connected'}
                    </div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: isGitHubConnected ? '#34d399' : '#f43f5e',
                      }}
                    >
                      {isGitHubConnected ? '● Active App Installation' : '● Disconnected'}
                    </div>
                  </div>
                </div>

                {isGitHubConnected && (
                  <button
                    type="button"
                    onClick={handleDisconnectGitHub}
                    style={{
                      background: 'rgba(244, 63, 94, 0.15)',
                      border: '1px solid rgba(244, 63, 94, 0.3)',
                      color: '#fca5a5',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <LogOut style={{ width: '12px', height: '12px' }} />
                    Disconnect
                  </button>
                )}
              </div>
            </div>

            {/* AI Model Selection */}
            <div>
              <label className="form-label">AI Test Generation Model</label>
              <select
                value={settings.aiModel}
                onChange={(e) =>
                  setSettings({ ...settings, aiModel: e.target.value as SettingsData['aiModel'] })
                }
                style={{
                  width: '100%',
                  padding: '0.85rem 1.15rem',
                  borderRadius: '0.625rem',
                  backgroundColor: '#020617',
                  border: '1px solid var(--border-card)',
                  color: '#f8fafc',
                  fontSize: '0.925rem',
                }}
              >
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Super Fast Scanning)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Code Reasoning)</option>
              </select>
              <span
                style={{
                  fontSize: '0.725rem',
                  color: 'var(--text-sub)',
                  marginTop: '4px',
                  display: 'block',
                }}
              >
                Gemini Flash offers instant locator mapping; Gemini Pro writes complex multi-step
                Playwright scripts.
              </span>
            </div>
          </div>
        </div>

        {/* CARD 3: PLAYWRIGHT TEST PREFERENCES */}
        <div
          className="glass-panel"
          style={{ padding: '24px', background: 'rgba(15, 23, 42, 0.85)' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '20px',
              borderBottom: '1px solid var(--border-card)',
              paddingBottom: '14px',
            }}
          >
            <Code2 style={{ width: '20px', height: '20px', color: '#10b981' }} />
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                3. Playwright Code Preferences
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                Custom data-attribute locators and Playwright script export format
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
            }}
          >
            <div>
              <label className="form-label">Primary Locator Attribute Name</label>
              <input
                type="text"
                required
                value={settings.customTestIdAttribute}
                onChange={(e) =>
                  setSettings({ ...settings, customTestIdAttribute: e.target.value })
                }
                className="form-input"
                placeholder="e.g. data-testid, data-cy, data-qa"
              />
              <span
                style={{
                  fontSize: '0.725rem',
                  color: 'var(--text-sub)',
                  marginTop: '4px',
                  display: 'block',
                }}
              >
                Locators scan will prioritize this attribute (e.g.
                page.getByTestId(&quot;submit-btn&quot;)).
              </span>
            </div>

            <div>
              <label className="form-label">Code Export Language Format</label>
              <select
                value={settings.exportFormat}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    exportFormat: e.target.value as SettingsData['exportFormat'],
                  })
                }
                style={{
                  width: '100%',
                  padding: '0.85rem 1.15rem',
                  borderRadius: '0.625rem',
                  backgroundColor: '#020617',
                  border: '1px solid var(--border-card)',
                  color: '#f8fafc',
                  fontSize: '0.925rem',
                }}
              >
                <option value="typescript">TypeScript (.spec.ts) [Recommended]</option>
                <option value="javascript">JavaScript (.spec.js)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bottom Save Action */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 32px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#ffffff',
              fontSize: '0.925rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)',
            }}
          >
            <Save style={{ width: '18px', height: '18px' }} />
            <span>{saving ? 'Saving...' : 'Save All Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
