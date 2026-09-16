'use client';

import React, { useState, useEffect, useRef } from 'react';

export interface UserProfile {
  email: string;
  role: 'ADMIN' | 'MEMBER';
  orgId: string;
  name: string;
  planName: string;
  expiresInText: string;
}

export const UserProfileDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    email: 'admin@qaautomater.local',
    role: 'ADMIN',
    orgId: 'org_seed_admin',
    name: 'System Admin',
    planName: 'Enterprise Pro Plan',
    expiresInText: '24 Hours',
  });

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      let token = typeof window !== 'undefined' ? (localStorage.getItem('access_token') || '') : '';
      if (!token && typeof document !== 'undefined') {
        const match = document.cookie.match(/access_token=([^;]+)/);
        if (match && match[1]) token = match[1];
      }

      if (token) {
        const parts = token.split('.');
        if (parts.length === 3 && parts[1]) {
          const payload = JSON.parse(atob(parts[1]));
          const email = payload.email || 'user@qaautomater.local';
          const role = (payload.role || (email.includes('admin') ? 'ADMIN' : 'MEMBER')) as 'ADMIN' | 'MEMBER';
          const orgId = payload.orgId || 'org_seed_admin';

          let name = email.split('@')[0] || 'User';
          name = name.charAt(0).toUpperCase() + name.slice(1);
          if (name.toLowerCase() === 'admin') name = 'System Admin';

          setProfile({
            email,
            role,
            orgId,
            name,
            planName: role === 'ADMIN' ? 'Enterprise Pro Plan' : 'Standard Developer Plan',
            expiresInText: '24 Hours',
          });
        }
      }
    } catch (e) {
      console.error('Error parsing auth token in UserProfileDropdown:', e);
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      window.location.href = '/login';
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'QA';
    const parts = name.split(' ');
    if (parts.length >= 2 && parts[0]?.[0] && parts[1]?.[0]) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef} data-testid="user-profile-dropdown">
      {/* Trigger Avatar Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          background: 'rgba(30, 41, 59, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '9999px',
          padding: '0.25rem 0.75rem 0.25rem 0.35rem',
          color: '#ffffff',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          outline: 'none',
        }}
        data-testid="user-avatar-trigger"
      >
        <div
          style={{
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            background: profile.role === 'ADMIN'
              ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
              : 'linear-gradient(135deg, #3b82f6, #06b6d4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '0.75rem',
            color: '#ffffff',
            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.4)',
          }}
        >
          {getInitials(profile.name)}
        </div>

        <div style={{ textAlign: 'left', lineHeight: '1.2' }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#f8fafc' }}>
            {profile.name}
          </div>
          <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
            {profile.role === 'ADMIN' ? '👑 Admin' : '👤 Member'}
          </div>
        </div>

        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#94a3b8"
          strokeWidth="2"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            marginLeft: '2px',
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '280px',
            background: 'rgba(15, 23, 42, 0.98)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '14px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7)',
            padding: '1rem',
            zIndex: 300,
            animation: 'fadeIn 0.15s ease-out',
          }}
          data-testid="user-profile-popover"
        >
          {/* User Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              paddingBottom: '0.875rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: profile.role === 'ADMIN'
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                  : 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '1rem',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
              }}
            >
              {getInitials(profile.name)}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {profile.name}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {profile.email}
              </div>
            </div>
          </div>

          {/* Details & Badges Section */}
          <div style={{ padding: '0.75rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {/* Subscription Plan Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.4rem 0.6rem',
                borderRadius: '6px',
                background: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
              }}
            >
              <span style={{ fontSize: '0.75rem', color: '#a5b4fc', fontWeight: 500 }}>Plan</span>
              <span style={{ fontSize: '0.75rem', color: '#818cf8', fontWeight: 700 }}>
                {profile.planName}
              </span>
            </div>

            {/* Role Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.4rem 0.6rem',
                borderRadius: '6px',
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Account Role</span>
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: profile.role === 'ADMIN' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                  color: profile.role === 'ADMIN' ? '#fde047' : '#93c5fd',
                  fontWeight: 600,
                }}
              >
                {profile.role === 'ADMIN' ? '👑 System Admin' : '👤 Workspace Member'}
              </span>
            </div>

            {/* Session Expiration Details */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.4rem 0.6rem',
                borderRadius: '6px',
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Session Validity</span>
              <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>
                ⏱️ 24h JWT Session
              </span>
            </div>
          </div>

          {/* Action Divider */}
          <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '0.25rem 0 0.75rem 0' }} />

          {/* Logout Action Button */}
          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '0.55rem',
              borderRadius: '8px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#fca5a5',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
              e.currentTarget.style.color = '#fca5a5';
            }}
            data-testid="logout-button"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Sign Out & End Session</span>
          </button>
        </div>
      )}
    </div>
  );
};
