'use client';

import React from 'react';

export type ScanPhase =
  'cloning' | 'ast_parsing' | 'locator_extraction' | 'vector_indexing' | 'completed' | 'failed';

export interface ScanProgressState {
  scanId: string;
  repoUrl: string;
  phase: ScanPhase;
  progressPercent: number;
  filesProcessed: number;
  totalFiles: number;
  errorMessage?: string;
}

interface ScanProgressCardProps {
  scanState: ScanProgressState;
  onRetry?: () => void;
  onClose?: () => void;
}

export const ScanProgressCard: React.FC<ScanProgressCardProps> = ({
  scanState,
  onRetry,
  onClose,
}) => {
  const isFailed = scanState.phase === 'failed' || Boolean(scanState.errorMessage);
  const isCompleted = scanState.phase === 'completed' && scanState.progressPercent >= 100;

  const getPhaseLabel = (phase: ScanPhase) => {
    switch (phase) {
      case 'cloning':
        return 'Cloning Git Repository...';
      case 'ast_parsing':
        return 'Parsing React & Next.js AST...';
      case 'locator_extraction':
        return 'Extracting Resilient Locators...';
      case 'vector_indexing':
        return 'Indexing Vector DB (pgvector)...';
      case 'completed':
        return 'Scan Completed Successfully!';
      case 'failed':
        return 'Scan Failed';
      default:
        return 'Processing Scan...';
    }
  };

  return (
    <div
      className="glass-panel"
      style={{
        padding: '1.25rem',
        borderRadius: '12px',
        background: 'rgba(15, 23, 42, 0.9)',
        border: isFailed ? '1px solid rgba(244, 63, 94, 0.5)' : '1px solid var(--border-card)',
        boxShadow: isFailed
          ? '0 0 20px rgba(244, 63, 94, 0.15)'
          : '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
      }}
      data-testid="scan-progress-card"
    >
      {/* Header Info */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: isFailed
                ? 'rgba(244, 63, 94, 0.2)'
                : isCompleted
                  ? 'rgba(16, 185, 129, 0.2)'
                  : 'rgba(99, 102, 241, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isFailed ? '#f43f5e' : isCompleted ? '#34d399' : '#818cf8',
              fontWeight: 700,
            }}
          >
            {isFailed ? '!' : isCompleted ? '✓' : '⚙'}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{scanState.repoUrl}</div>
            <div style={{ fontSize: '0.75rem', color: isFailed ? '#f43f5e' : 'var(--text-muted)' }}>
              {getPhaseLabel(scanState.phase)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              fontSize: '0.875rem',
              fontWeight: 700,
              color: isFailed ? '#f43f5e' : '#818cf8',
            }}
          >
            {scanState.progressPercent}%
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '1.2rem',
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Story E13.2 AC1: Progress Bar */}
      <div
        style={{
          width: '100%',
          height: '8px',
          borderRadius: '4px',
          background: 'rgba(30, 41, 59, 0.8)',
          overflow: 'hidden',
          marginBottom: '0.75rem',
        }}
        data-testid="scan-progress-bar-container"
      >
        <div
          style={{
            height: '100%',
            width: `${scanState.progressPercent}%`,
            background: isFailed
              ? 'linear-gradient(90deg, #f43f5e, #e11d48)'
              : isCompleted
                ? 'linear-gradient(90deg, #10b981, #34d399)'
                : 'linear-gradient(90deg, #6366f1, #8b5cf6, #38bdf8)',
            transition: 'width 0.3s ease-in-out',
          }}
          data-testid="scan-progress-bar-fill"
        />
      </div>

      {/* Footer Details or Failure Retry UI */}
      {isFailed ? (
        /* Story E13.2 AC2: Human-readable error message with retry button */
        <div
          style={{
            background: 'rgba(244, 63, 94, 0.1)',
            padding: '0.75rem',
            borderRadius: '8px',
            marginTop: '0.5rem',
          }}
        >
          <div
            style={{ fontSize: '0.8125rem', color: '#fecdd3', marginBottom: '0.625rem' }}
            data-testid="scan-error-message"
          >
            ⚠️ <strong>Scan Error:</strong>{' '}
            {scanState.errorMessage || 'Failed to clone repository or parse source files.'}
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              style={{
                padding: '0.4rem 0.875rem',
                borderRadius: '6px',
                border: 'none',
                background: '#f43f5e',
                color: '#ffffff',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
              data-testid="retry-scan-button"
            >
              🔄 Retry Scan
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
          }}
        >
          <span>
            Files: {scanState.filesProcessed} / {scanState.totalFiles}
          </span>
          <span>Phase: {scanState.phase}</span>
        </div>
      )}
    </div>
  );
};
