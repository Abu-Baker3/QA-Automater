'use client';

import React, { useState } from 'react';

export interface ExportActionsCardProps {
  jobId?: string;
  isApproved?: boolean;
  repoName?: string;
  onDownloadZip?: (jobId: string) => Promise<string> | string;
  onCreatePullRequest?: (options: {
    jobId: string;
    targetBranch: string;
    targetPath: string;
    title: string;
  }) => Promise<{ prUrl: string; prNumber: number }> | { prUrl: string; prNumber: number };
}

export const ExportActionsCard: React.FC<ExportActionsCardProps> = ({
  jobId = 'job_gen_golden_101',
  isApproved = true,
  repoName = 'acme-inc/frontend-app',
  onDownloadZip,
  onCreatePullRequest,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCreatingPr, setIsCreatingPr] = useState(false);
  const [targetBranch, setTargetBranch] = useState('main');
  const [targetPath, setTargetPath] = useState('tests/e2e');
  const [prTitle, setPrTitle] = useState(
    'test(e2e): add automated Playwright suite for login flow',
  );
  const [createdPrResult, setCreatedPrResult] = useState<{
    prUrl: string;
    prNumber: number;
  } | null>(null);
  const [downloadSuccessMsg, setDownloadSuccessMsg] = useState<string | null>(null);

  const handleDownloadZip = async () => {
    if (!isApproved) return;
    setIsDownloading(true);
    setDownloadSuccessMsg(null);

    try {
      let presignedUrl = `https://qa-automater-artifacts.s3.amazonaws.com/exports/${jobId}/playwright-suite.zip?X-Amz-Signature=test`;
      if (onDownloadZip) {
        presignedUrl = await onDownloadZip(jobId);
      }

      // Story E13.4 AC1: Browser downloads via presigned URL
      const link = document.createElement('a');
      link.href = presignedUrl;
      link.setAttribute('download', `playwright-suite-${jobId}.zip`);
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadSuccessMsg('Download initiated successfully via presigned URL.');
    } catch {
      setDownloadSuccessMsg('Failed to initiate ZIP download.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCreatePr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isApproved) return;
    setIsCreatingPr(true);

    try {
      let result = {
        prUrl: `https://github.com/${repoName}/pull/42`,
        prNumber: 42,
      };

      if (onCreatePullRequest) {
        result = await onCreatePullRequest({
          jobId,
          targetBranch,
          targetPath,
          title: prTitle,
        });
      } else {
        // Mock async network latency
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      setCreatedPrResult(result);
    } finally {
      setIsCreatingPr(false);
    }
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '20px',
      }}
      data-testid="export-actions-container"
    >
      {/* 1. ZIP Download Card (Story E13.4 AC1) */}
      <div
        className="glass-panel"
        style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '16px',
        }}
        data-testid="zip-export-card"
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
            }}
          >
            <h3
              style={{
                fontSize: '1.1rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{ color: '#818CF8' }}>📦</span> Download ZIP Test Artifact Package
            </h3>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '6px',
                background: isApproved ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                color: isApproved ? '#34d399' : '#fbbf24',
                fontWeight: 600,
              }}
            >
              {isApproved ? 'Job Approved' : 'Pending Review'}
            </span>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Bundles all generated Playwright TypeScript test files, Page Objects,{' '}
            <code>playwright.config.ts</code>, and GitHub Actions CI runner workflows into a
            ready-to-run ZIP archive via an Amazon S3 presigned URL.
          </p>

          {downloadSuccessMsg && (
            <div
              style={{
                marginTop: '12px',
                padding: '8px 12px',
                borderRadius: '6px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                fontSize: '0.8rem',
              }}
              data-testid="zip-download-status"
            >
              ✓ {downloadSuccessMsg}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleDownloadZip}
          disabled={isDownloading || !isApproved}
          style={{
            background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 18px',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: isDownloading || !isApproved ? 'not-allowed' : 'pointer',
            opacity: isDownloading || !isApproved ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
          }}
          data-testid="download-zip-button"
        >
          <span>
            {isDownloading ? 'Generating Presigned URL...' : 'Download Playwright Suite ZIP'}
          </span>
        </button>
      </div>

      {/* 2. GitHub Pull Request Export Card (Story E13.4 AC2) */}
      <div
        className="glass-panel"
        style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '16px',
        }}
        data-testid="github-pr-export-card"
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
            }}
          >
            <h3
              style={{
                fontSize: '1.1rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{ color: '#C084FC' }}>🐙</span> GitHub Pull Request Export
            </h3>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'rgba(99, 102, 241, 0.2)',
                color: '#818cf8',
                fontWeight: 600,
              }}
            >
              {repoName}
            </span>
          </div>

          <p
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              lineHeight: 1.5,
              marginBottom: '14px',
            }}
          >
            Creates a dedicated branch (<code>qa-automater/tests-{jobId}</code>) and submits an
            automated Pull Request directly to your repository.
          </p>

          <form onSubmit={handleCreatePr}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                marginBottom: '10px',
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    marginBottom: '4px',
                  }}
                >
                  Target Branch
                </label>
                <input
                  type="text"
                  value={targetBranch}
                  onChange={(e) => setTargetBranch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid var(--border-card)',
                    color: '#fff',
                    fontSize: '0.8rem',
                  }}
                  data-testid="pr-target-branch-input"
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    marginBottom: '4px',
                  }}
                >
                  Target Directory
                </label>
                <input
                  type="text"
                  value={targetPath}
                  onChange={(e) => setTargetPath(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid var(--border-card)',
                    color: '#fff',
                    fontSize: '0.8rem',
                  }}
                  data-testid="pr-target-path-input"
                />
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  marginBottom: '4px',
                }}
              >
                Pull Request Title
              </label>
              <input
                type="text"
                value={prTitle}
                onChange={(e) => setPrTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid var(--border-card)',
                  color: '#fff',
                  fontSize: '0.8rem',
                }}
                data-testid="pr-title-input"
              />
            </div>

            <button
              type="submit"
              disabled={isCreatingPr || !isApproved}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 18px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: isCreatingPr || !isApproved ? 'not-allowed' : 'pointer',
                opacity: isCreatingPr || !isApproved ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
              }}
              data-testid="create-github-pr-button"
            >
              <span>
                {isCreatingPr ? 'Opening Pull Request on GitHub...' : 'Create GitHub Pull Request'}
              </span>
            </button>
          </form>
        </div>

        {/* Story E13.4 AC2: GitHub PR Link Opening in New Tab */}
        {createdPrResult && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '10px',
            }}
            data-testid="created-pr-success-box"
          >
            <div>
              <div style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 600 }}>
                ✓ Pull Request #{createdPrResult.prNumber} Opened Successfully
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Branch: <code>qa-automater/tests-{jobId}</code>
              </div>
            </div>

            <a
              href={createdPrResult.prUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                borderRadius: '6px',
                background: '#10b981',
                color: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: 700,
                textDecoration: 'none',
              }}
              data-testid="view-github-pr-link"
            >
              <span>View PR #{createdPrResult.prNumber}</span>
              <span>↗</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
