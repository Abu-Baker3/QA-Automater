'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Crown,
  Mail,
  CheckCircle2,
  Zap,
  ArrowRight,
  Copy,
  Check,
} from 'lucide-react';

interface Member {
  id: string;
  userId: string;
  role: 'ADMIN' | 'MEMBER';
  createdAt: string;
}

interface Invite {
  id: string;
  email: string;
  role: 'ADMIN' | 'MEMBER';
  token: string;
  status: 'PENDING' | 'ACCEPTED';
  createdAt: string;
}

interface WorkspaceSummary {
  organizationId: string;
  name: string;
  subscriptionTier: 'FREE' | 'PREMIUM';
  usedSeats: number;
  maxSeats: number;
  members: Member[];
  pendingInvites: Invite[];
}

export function TeamsSection() {
  const [summary, setSummary] = useState<WorkspaceSummary>({
    organizationId: 'org_default',
    name: 'Default Workspace',
    subscriptionTier: 'FREE',
    usedSeats: 1,
    maxSeats: 1,
    members: [
      {
        id: 'mem_owner',
        userId: 'user_admin',
        role: 'ADMIN',
        createdAt: new Date().toISOString(),
      },
    ],
    pendingInvites: [],
  });

  const [loading, setLoading] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

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

  const fetchSummary = async () => {
    try {
      const res = await fetch('http://localhost:3000/v1/organizations/org_default/summary', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch {
      // Keep state if API warming up
    }
  };

  useEffect(() => {
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInviteClick = () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (summary.subscriptionTier === 'FREE') {
      setIsUpgradeModalOpen(true);
    } else {
      setIsInviteModalOpen(true);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:3000/v1/organizations/org_default/invites', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403) {
          setIsInviteModalOpen(false);
          setIsUpgradeModalOpen(true);
        } else {
          setErrorMsg(data.message || 'Failed to send invite');
        }
        return;
      }

      setSuccessMsg(`Invitation sent to ${inviteEmail}!`);
      setInviteEmail('');
      setIsInviteModalOpen(false);
      fetchSummary();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error connecting to server';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradePlan = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('http://localhost:3000/v1/organizations/org_default/subscription', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ tier: 'PREMIUM' }),
      });

      if (res.ok) {
        setSuccessMsg('Workspace successfully upgraded to Premium (5 Seats Unlocked)!');
        setIsUpgradeModalOpen(false);
        fetchSummary();
      } else {
        setErrorMsg('Failed to upgrade workspace plan.');
      }
    } catch {
      setErrorMsg('Failed to upgrade workspace plan.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (inviteToken: string, email: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';
    const link = `${origin}/invite/accept?token=${inviteToken}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(inviteToken);
    setSuccessMsg(`Copied invite link for ${email}!`);
    setTimeout(() => {
      setCopiedToken(null);
      setSuccessMsg('');
    }, 3000);
  };

  const isFree = summary.subscriptionTier === 'FREE';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header & Status Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '24px',
          position: 'relative',
          overflow: 'hidden',
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid var(--border-card)',
          borderRadius: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                {summary.name}
              </h1>
              {isFree ? (
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: '12px',
                    background: 'rgba(51, 65, 85, 0.6)',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border-card)',
                  }}
                >
                  Standard (Free)
                </span>
              ) : (
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '12px',
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#FBBF24',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Crown style={{ width: '14px', height: '14px', color: '#FBBF24' }} />
                  Premium (5 Seats)
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
              Manage workspace members, role permissions, and team collaboration.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isFree && (
              <button
                type="button"
                onClick={() => setIsUpgradeModalOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: '1px solid rgba(245, 158, 11, 0.5)',
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(139, 92, 246, 0.2))',
                  color: '#FBBF24',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 0 15px rgba(245, 158, 11, 0.2)',
                }}
              >
                <Zap style={{ width: '16px', height: '16px', color: '#FBBF24' }} />
                Upgrade to Premium
              </button>
            )}

            <button
              type="button"
              onClick={handleInviteClick}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)',
              }}
            >
              <UserPlus style={{ width: '16px', height: '16px' }} />
              Invite Team Member
            </button>
          </div>
        </div>

        {/* Seat Usage Bar */}
        <div
          style={{
            marginTop: '20px',
            paddingTop: '20px',
            borderTop: '1px solid var(--border-card)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
          }}
        >
          <div
            style={{
              background: 'rgba(2, 6, 23, 0.5)',
              border: '1px solid var(--border-card)',
              borderRadius: '12px',
              padding: '14px',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Seats Used
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>
              {summary.usedSeats} <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 400 }}>/ {summary.maxSeats}</span>
            </div>
            <div style={{ width: '100%', background: 'rgba(255, 255, 255, 0.1)', height: '6px', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  background: isFree ? '#8b5cf6' : 'linear-gradient(90deg, #8b5cf6, #fbbf24)',
                  width: `${Math.min(100, (summary.usedSeats / summary.maxSeats) * 100)}%`,
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>

          <div
            style={{
              background: 'rgba(2, 6, 23, 0.5)',
              border: '1px solid var(--border-card)',
              borderRadius: '12px',
              padding: '14px',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Active Members
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>
              {summary.members.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-sub)', marginTop: '4px' }}>
              Includes workspace owner
            </div>
          </div>

          <div
            style={{
              background: 'rgba(2, 6, 23, 0.5)',
              border: '1px solid var(--border-card)',
              borderRadius: '12px',
              padding: '14px',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Pending Invitations
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>
              {summary.pendingInvites.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-sub)', marginTop: '4px' }}>
              Expires in 7 days
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && <div className="alert-error">{errorMsg}</div>}
      {successMsg && <div className="alert-success">{successMsg}</div>}

      {/* Members List */}
      <div className="glass-panel" style={{ overflow: 'hidden', padding: 0 }}>
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users style={{ width: '18px', height: '18px', color: '#c084fc' }} />
            <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
              Team Members ({summary.members.length})
            </h2>
          </div>
        </div>

        <table className="perm-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Joined Date</th>
            </tr>
          </thead>
          <tbody>
            {summary.members.map((member) => (
              <tr key={member.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                      }}
                    >
                      {member.userId.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#ffffff' }}>User ({member.userId})</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{member.userId}</div>
                    </div>
                  </div>
                </td>
                <td>
                  {member.role === 'ADMIN' ? (
                    <span className="badge-admin">Workspace Owner</span>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Member</span>
                  )}
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  {new Date(member.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pending Invites List */}
      {summary.pendingInvites.length > 0 && (
        <div className="glass-panel" style={{ overflow: 'hidden', padding: 0 }}>
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-card)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail style={{ width: '18px', height: '18px', color: '#fbbf24' }} />
              <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                Pending Invitations ({summary.pendingInvites.length})
              </h2>
            </div>
          </div>

          <table className="perm-table">
            <thead>
              <tr>
                <th>Email Address</th>
                <th>Role</th>
                <th>Status / Actions</th>
              </tr>
            </thead>
            <tbody>
              {summary.pendingInvites.map((invite) => (
                <tr key={invite.id}>
                  <td style={{ fontWeight: 600, color: '#ffffff' }}>{invite.email}</td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{invite.role}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleCopyLink(invite.token, invite.email)}
                        style={{
                          background: 'rgba(139, 92, 246, 0.15)',
                          border: '1px solid rgba(139, 92, 246, 0.3)',
                          color: '#c084fc',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {copiedToken === invite.token ? (
                          <>
                            <Check style={{ width: '12px', height: '12px', color: '#34d399' }} />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy style={{ width: '12px', height: '12px' }} />
                            <span>Copy Invite Link</span>
                          </>
                        )}
                      </button>
                      <span
                        style={{
                          background: 'rgba(245, 158, 11, 0.15)',
                          color: '#fbbf24',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                        }}
                      >
                        Invitation Sent
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite Modal (Premium Plan) */}
      {isInviteModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '480px',
              padding: '24px',
              position: 'relative',
              background: '#090C15',
              border: '1px solid var(--border-card-hover)',
              borderRadius: '16px',
            }}
          >
            <button
              type="button"
              onClick={() => setIsInviteModalOpen(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '1.25rem',
                cursor: 'pointer',
              }}
            >
              ×
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(139, 92, 246, 0.2)',
                  border: '1px solid rgba(139, 92, 246, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#c084fc',
                }}
              >
                <UserPlus style={{ width: '20px', height: '20px' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                  Invite Team Member
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                  Add a colleague to your workspace
                </p>
              </div>
            </div>

            <form onSubmit={handleSendInvite} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="form-label">Work Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Workspace Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'MEMBER')}
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
                  <option value="MEMBER">Member (Execute scans, stories & exports)</option>
                  <option value="ADMIN">Admin (Manage members & settings)</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="btn-secondary"
                  style={{ width: 'auto' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                  style={{ width: 'auto' }}
                >
                  {loading ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upgrade Modal (Free Plan Paywall) */}
      {isUpgradeModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '520px',
              padding: '28px',
              position: 'relative',
              background: '#090C15',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: '20px',
              boxShadow: '0 0 30px rgba(245, 158, 11, 0.15)',
            }}
          >
            <button
              type="button"
              onClick={() => setIsUpgradeModalOpen(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '1.25rem',
                cursor: 'pointer',
              }}
            >
              ×
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(245, 158, 11, 0.2)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fbbf24',
                }}
              >
                <Crown style={{ width: '24px', height: '24px' }} />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Premium Feature
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                  Unlock Team Collaboration
                </h3>
              </div>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '20px' }}>
              Team members cannot be invited on the Standard (Free) plan. Upgrade your workspace to{' '}
              <strong style={{ color: '#fbbf24' }}>Premium</strong> to invite up to 4 additional team members (5 total seats) and collaborate on shared locators, repos, and test scripts.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(2, 6, 23, 0.6)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-card)', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', color: '#e2e8f0' }}>
                <CheckCircle2 style={{ width: '16px', height: '16px', color: '#fbbf24' }} />
                <span>Invite up to 4 Team Members (QA Leads, Developers, SQEs)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', color: '#e2e8f0' }}>
                <CheckCircle2 style={{ width: '16px', height: '16px', color: '#fbbf24' }} />
                <span>Shared Locators KB & Vector Codebase Index</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', color: '#e2e8f0' }}>
                <CheckCircle2 style={{ width: '16px', height: '16px', color: '#fbbf24' }} />
                <span>Collaborative Playwright Code Export & Audit Logs</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff' }}>$49</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>per month / 5 seats</div>
              </div>

              <button
                type="button"
                onClick={handleUpgradePlan}
                disabled={loading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                  color: '#020617',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 0 20px rgba(245, 158, 11, 0.4)',
                }}
              >
                <span>{loading ? 'Upgrading...' : 'Upgrade Workspace Now'}</span>
                <ArrowRight style={{ width: '16px', height: '16px' }} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
