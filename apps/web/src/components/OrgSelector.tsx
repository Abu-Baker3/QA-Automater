'use client';

import React, { useState } from 'react';

export interface OrganizationOption {
  id: string;
  name: string;
  slug: string;
  avatarUrl?: string;
  role: 'ADMIN' | 'MEMBER';
}

interface OrgSelectorProps {
  currentOrgId?: string;
  onOrgChange?: (orgId: string) => void;
}

const DEFAULT_ORGS: OrganizationOption[] = [
  { id: 'org_acme_qa', name: 'Acme Corp QA', slug: 'acme-qa', role: 'ADMIN' },
  { id: 'org_fintech_labs', name: 'Fintech Labs', slug: 'fintech-labs', role: 'MEMBER' },
  { id: 'org_global_dev', name: 'Global Dev Engineering', slug: 'global-dev', role: 'ADMIN' },
];

export const OrgSelector: React.FC<OrgSelectorProps> = ({ currentOrgId, onOrgChange }) => {
  const [selectedOrgId, setSelectedOrgId] = useState<string>(
    currentOrgId || DEFAULT_ORGS[0]?.id || 'org_acme_qa',
  );
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const activeOrg = DEFAULT_ORGS.find((o) => o.id === selectedOrgId) || DEFAULT_ORGS[0];

  const handleSelect = (orgId: string) => {
    setSelectedOrgId(orgId);
    setIsOpen(false);
    if (onOrgChange) {
      onOrgChange(orgId);
    }
  };

  return (
    <div
      style={{ position: 'relative', display: 'inline-block' }}
      data-testid="org-selector-container"
    >
      <button
        type="button"
        className="org-selector-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        data-testid="org-selector-trigger"
      >
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '12px',
          }}
        >
          {activeOrg?.name.charAt(0)}
        </div>
        <span style={{ fontWeight: 600 }}>{activeOrg?.name}</span>
        <span
          style={{
            fontSize: '10px',
            padding: '2px 6px',
            borderRadius: '4px',
            background:
              activeOrg?.role === 'ADMIN' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(148, 163, 184, 0.2)',
            color: activeOrg?.role === 'ADMIN' ? '#34d399' : '#94a3b8',
          }}
        >
          {activeOrg?.role}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="glass-panel"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            minWidth: '240px',
            zIndex: 100,
            padding: '8px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
          }}
          data-testid="org-selector-dropdown"
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              padding: '4px 8px',
              textTransform: 'uppercase',
            }}
          >
            Workspaces & Organizations
          </div>
          {DEFAULT_ORGS.map((org) => (
            <button
              key={org.id}
              type="button"
              onClick={() => handleSelect(org.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                borderRadius: '6px',
                border: 'none',
                background: org.id === selectedOrgId ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                color: org.id === selectedOrgId ? '#ffffff' : 'var(--text-main)',
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
              data-testid={`org-option-${org.slug}`}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 600 }}>{org.name}</span>
              </div>
              {org.id === selectedOrgId && (
                <span style={{ color: '#34d399', fontWeight: 700 }}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
