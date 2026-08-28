'use client';

import React from 'react';
import { OrgSelector } from './OrgSelector';

export type NavTab = 'repositories' | 'generate' | 'settings';

interface NavHeaderProps {
  activeTab?: NavTab;
  onTabChange?: (tab: NavTab) => void;
  onOrgChange?: (orgId: string) => void;
}

export const NavHeader: React.FC<NavHeaderProps> = ({
  activeTab = 'repositories',
  onTabChange,
  onOrgChange,
}) => {
  const handleNavClick = (tab: NavTab, e: React.MouseEvent) => {
    e.preventDefault();
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  return (
    <header className="nav-header" data-testid="nav-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        {/* Brand Logo & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            className="glow-primary"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '16px',
              color: '#ffffff',
            }}
          >
            QA
          </div>
          <span
            className="gradient-text"
            style={{ fontSize: '1.125rem', fontWeight: 800, letterSpacing: '-0.02em' }}
          >
            QA Automater
          </span>
        </div>

        {/* Story E13.1 AC1: Organization Selector */}
        <OrgSelector onOrgChange={onOrgChange} />
      </div>

      {/* Story E13.1 AC1: Navigation Links (Repositories, Generate, Settings) */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} data-testid="nav-links">
        <a
          href="#repositories"
          className={`nav-link ${activeTab === 'repositories' ? 'active' : ''}`}
          onClick={(e) => handleNavClick('repositories', e)}
          data-testid="nav-repositories"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span>Repositories</span>
        </a>

        <a
          href="#generate"
          className={`nav-link ${activeTab === 'generate' ? 'active' : ''}`}
          onClick={(e) => handleNavClick('generate', e)}
          data-testid="nav-generate"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <span>Generate</span>
          <span className="nav-badge">AI</span>
        </a>

        <a
          href="#settings"
          className={`nav-link ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={(e) => handleNavClick('settings', e)}
          data-testid="nav-settings"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span>Settings</span>
        </a>
      </nav>

      {/* User Controls & Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.75rem',
            color: '#34d399',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#10b981',
              display: 'inline-block',
            }}
          />
          <span>System Healthy</span>
        </div>
      </div>
    </header>
  );
};
