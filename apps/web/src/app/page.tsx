'use client';

import React, { useState } from 'react';
import { OrgSelector } from '../components/OrgSelector';
import { UserProfileDropdown } from '../components/UserProfileDropdown';
import { RepoConnectModal } from '../components/RepoConnectModal';
import { ScanProgressCard, ScanProgressState } from '../components/ScanProgressCard';
import { TestGenerationWizard } from '../components/TestGenerationWizard';
import { TeamsSection } from '../components/TeamsSection';
import { SettingsSection } from '../components/SettingsSection';
import { ExportActionsCard } from '../components/ExportActionsCard';
import {
  Sparkles,
  GitBranch,
  Layers,
  Code2,
  FileCode,
  CheckCircle2,
  Copy,
  Download,
  GitPullRequest,
  Search,
  RefreshCw,
  Zap,
  Activity,
  ChevronRight,
  Bot,
  FolderTree,
  FileText,
  Component,
  ExternalLink,
  AlertCircle,
  CheckSquare,
  ShieldCheck,
  Users,
  Sliders,
} from 'lucide-react';

type Tab = 'overview' | 'locators' | 'explorer' | 'studio' | 'review' | 'export' | 'settings' | 'teams';

interface LocatorItem {
  id: string;
  component: string;
  name: string;
  selector: string;
  type: 'data-testid' | 'aria' | 'css' | 'role';
  confidence: '99%' | '95%' | '90%';
  vectorIndexed: boolean;
}

interface KbElementDetail {
  id: string;
  tag_name: string;
  text_content: string;
  source_file: string;
  source_line: number;
  source_ref: string;
  stability_tier: 'high' | 'medium' | 'low';
  primary_candidate: {
    strategy: string;
    value: string;
    score: number;
    playwright_code: string;
    rank: number;
    stability_tier: 'high' | 'medium' | 'low';
  };
  candidates: Array<{
    strategy: string;
    value: string;
    score: number;
    playwright_code: string;
    rank: number;
    stability_tier: 'high' | 'medium' | 'low';
  }>;
}

interface KbComponentNode {
  id: string;
  name: string;
  file_path: string;
  elements: KbElementDetail[];
}

interface KbPageNode {
  id: string;
  route_path: string;
  file_path: string;
  component_name: string;
  element_count: number;
  components: KbComponentNode[];
}

const INITIAL_CODE = '';

export interface UiReviewCandidate {
  strategy: string;
  value: string;
  score: number;
  playwright_code: string;
  rank: number;
  stability_tier: 'high' | 'medium' | 'low';
}

export interface UiReviewItem {
  step_id: string;
  step_order: number;
  action: string;
  target_description: string;
  confidence: number;
  element_id: string | null;
  chosen_locator: UiReviewCandidate | null;
  candidates: UiReviewCandidate[];
  rationale: string;
  needs_review: boolean;
  human_verified: boolean;
}

const DEFAULT_LOCATORS: LocatorItem[] = [
  {
    id: 'loc-1',
    component: 'src/components/auth/LoginForm.tsx',
    name: 'Email Input',
    selector: '[data-testid="input-email"]',
    type: 'data-testid',
    confidence: '99%',
    vectorIndexed: true,
  },
  {
    id: 'loc-2',
    component: 'src/components/auth/LoginForm.tsx',
    name: 'Password Input',
    selector: '[data-testid="input-password"]',
    type: 'data-testid',
    confidence: '99%',
    vectorIndexed: true,
  },
  {
    id: 'loc-3',
    component: 'src/components/auth/LoginForm.tsx',
    name: 'Submit Login Button',
    selector: '[data-testid="login-submit"]',
    type: 'data-testid',
    confidence: '99%',
    vectorIndexed: true,
  },
  {
    id: 'loc-4',
    component: 'src/components/cart/CartDrawer.tsx',
    name: 'Checkout Button',
    selector: 'button:has-text("Proceed to Checkout")',
    type: 'aria',
    confidence: '90%',
    vectorIndexed: true,
  },
  {
    id: 'loc-5',
    component: 'src/components/checkout/PaymentForm.tsx',
    name: 'Card Number Field',
    selector: '[data-testid="card-number-input"]',
    type: 'data-testid',
    confidence: '99%',
    vectorIndexed: true,
  },
];

const DEFAULT_PAGES: KbPageNode[] = [
  {
    id: 'page-login-1',
    route_path: '/login',
    file_path: 'app/login/page.tsx',
    component_name: 'LoginPage',
    element_count: 3,
    components: [
      {
        id: 'comp-login-form-1',
        name: 'LoginForm',
        file_path: 'components/auth/LoginForm.tsx',
        elements: [
          {
            id: 'elem-email-1',
            tag_name: 'input',
            text_content: 'Email Address',
            source_file: 'app/login/page.tsx',
            source_line: 24,
            source_ref: 'app/login/page.tsx:24',
            stability_tier: 'high',
            primary_candidate: {
              strategy: 'testid',
              value: 'input-email',
              score: 0.99,
              playwright_code: "page.getByTestId('input-email')",
              rank: 1,
              stability_tier: 'high',
            },
            candidates: [
              {
                strategy: 'testid',
                value: 'input-email',
                score: 0.99,
                playwright_code: "page.getByTestId('input-email')",
                rank: 1,
                stability_tier: 'high',
              },
            ],
          },
          {
            id: 'elem-pass-1',
            tag_name: 'input',
            text_content: 'Password',
            source_file: 'app/login/page.tsx',
            source_line: 35,
            source_ref: 'app/login/page.tsx:35',
            stability_tier: 'high',
            primary_candidate: {
              strategy: 'testid',
              value: 'input-password',
              score: 0.99,
              playwright_code: "page.getByTestId('input-password')",
              rank: 1,
              stability_tier: 'high',
            },
            candidates: [
              {
                strategy: 'testid',
                value: 'input-password',
                score: 0.99,
                playwright_code: "page.getByTestId('input-password')",
                rank: 1,
                stability_tier: 'high',
              },
            ],
          },
          {
            id: 'elem-submit-1',
            tag_name: 'button',
            text_content: 'Sign In',
            source_file: 'app/login/page.tsx',
            source_line: 48,
            source_ref: 'app/login/page.tsx:48',
            stability_tier: 'high',
            primary_candidate: {
              strategy: 'testid',
              value: 'login-submit',
              score: 0.98,
              playwright_code: "page.getByTestId('login-submit')",
              rank: 1,
              stability_tier: 'high',
            },
            candidates: [
              {
                strategy: 'testid',
                value: 'login-submit',
                score: 0.98,
                playwright_code: "page.getByTestId('login-submit')",
                rank: 1,
                stability_tier: 'high',
              },
            ],
          },
        ],
      },
    ],
  },
];

const DEFAULT_REVIEW_ITEMS: UiReviewItem[] = [
  {
    step_id: 'step-review-1',
    step_order: 1,
    action: 'click',
    target_description: 'Click Submit Login Button on acme/web-app',
    confidence: 0.72,
    element_id: 'elem-submit-1',
    chosen_locator: {
      strategy: 'css',
      value: 'button.btn-primary',
      score: 0.72,
      playwright_code: "page.locator('button.btn-primary')",
      rank: 2,
      stability_tier: 'medium',
    },
    candidates: [
      {
        strategy: 'testid',
        value: 'login-submit',
        score: 0.98,
        playwright_code: "page.getByTestId('login-submit')",
        rank: 1,
        stability_tier: 'high',
      },
      {
        strategy: 'css',
        value: 'button.btn-primary',
        score: 0.72,
        playwright_code: "page.locator('button.btn-primary')",
        rank: 2,
        stability_tier: 'medium',
      },
    ],
    rationale: 'Sub-threshold confidence match (72%). Review candidate selectors.',
    needs_review: true,
    human_verified: false,
  },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedRepo, setSelectedRepo] = useState('acme/web-app');
  const [scannedRepos, setScannedRepos] = useState<string[]>(['acme/web-app']);
  const [scannedLocators, setScannedLocators] = useState<LocatorItem[]>(DEFAULT_LOCATORS);
  const [scannedKbPages, setScannedKbPages] = useState<KbPageNode[]>(DEFAULT_PAGES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPageId, setSelectedPageId] = useState<string>('page-login-1');
  const [selectedComponentId, setSelectedComponentId] = useState<string>('comp-login-form-1');
  const [selectedElementId, setSelectedElementId] = useState<string>('elem-email-1');
  const [userStoryText, setUserStoryText] = useState(
    'As a user, I want to enter my email and password on the login page and click sign in so that I get authenticated and navigated to dashboard.',
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [codeOutput, setCodeOutput] = useState(INITIAL_CODE);
  const [copied, setCopied] = useState(false);
  const [reviewItems, setReviewItems] = useState<UiReviewItem[]>(DEFAULT_REVIEW_ITEMS);
  const [activePickerStepId, setActivePickerStepId] = useState<string | null>('step-review-1');
  const [customSelectorInput, setCustomSelectorInput] = useState<string>('');
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [activeScanState, setActiveScanState] = useState<ScanProgressState | null>(null);

  const triggerScanFlow = (repoUrl: string, branchName: string = 'main') => {
    setIsConnectModalOpen(false);
    const repoName =
      repoUrl.replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '') || repoUrl;
    setSelectedRepo(repoName);

    setActiveScanState({
      scanId: `scan_${Date.now()}_${branchName}`,
      repoUrl: repoName,
      phase: 'cloning',
      progressPercent: 15,
      filesProcessed: 2,
      totalFiles: 42,
    });

    setTimeout(() => {
      setActiveScanState((prev) =>
        prev ? { ...prev, phase: 'ast_parsing', progressPercent: 45, filesProcessed: 18 } : null,
      );
    }, 400);

    setTimeout(() => {
      setActiveScanState((prev) =>
        prev
          ? { ...prev, phase: 'locator_extraction', progressPercent: 75, filesProcessed: 32 }
          : null,
      );
    }, 800);

    setTimeout(() => {
      const now = Date.now();
      const extractedLocators: LocatorItem[] = [
        {
          id: `loc-1-${now}`,
          component: 'src/components/auth/LoginForm.tsx',
          name: 'Email Input',
          selector: '[data-testid="input-email"]',
          type: 'data-testid',
          confidence: '99%',
          vectorIndexed: true,
        },
        {
          id: `loc-2-${now}`,
          component: 'src/components/auth/LoginForm.tsx',
          name: 'Password Input',
          selector: '[data-testid="input-password"]',
          type: 'data-testid',
          confidence: '99%',
          vectorIndexed: true,
        },
        {
          id: `loc-3-${now}`,
          component: 'src/components/auth/LoginForm.tsx',
          name: 'Submit Login Button',
          selector: 'button[type="submit"]',
          type: 'css',
          confidence: '95%',
          vectorIndexed: true,
        },
        {
          id: `loc-4-${now}`,
          component: 'src/components/cart/CartDrawer.tsx',
          name: 'Checkout Button',
          selector: 'button:has-text("Proceed to Checkout")',
          type: 'aria',
          confidence: '90%',
          vectorIndexed: true,
        },
        {
          id: `loc-5-${now}`,
          component: 'src/components/checkout/PaymentForm.tsx',
          name: 'Card Number Field',
          selector: '[data-testid="card-number-input"]',
          type: 'data-testid',
          confidence: '99%',
          vectorIndexed: true,
        },
      ];

      const pageId = `page-1-${now}`;
      const compId = `comp-1-${now}`;
      const elemId = `elem-1-${now}`;

      const extractedPages: KbPageNode[] = [
        {
          id: pageId,
          route_path: '/login',
          file_path: 'app/login/page.tsx',
          component_name: 'LoginPage',
          element_count: 3,
          components: [
            {
              id: compId,
              name: 'LoginForm',
              file_path: 'components/auth/LoginForm.tsx',
              elements: [
                {
                  id: elemId,
                  tag_name: 'input',
                  text_content: 'Email Address',
                  source_file: 'app/login/page.tsx',
                  source_line: 24,
                  source_ref: 'app/login/page.tsx:24',
                  stability_tier: 'high',
                  primary_candidate: {
                    strategy: 'testid',
                    value: 'input-email',
                    score: 0.99,
                    playwright_code: "page.getByTestId('input-email')",
                    rank: 1,
                    stability_tier: 'high',
                  },
                  candidates: [
                    {
                      strategy: 'testid',
                      value: 'input-email',
                      score: 0.99,
                      playwright_code: "page.getByTestId('input-email')",
                      rank: 1,
                      stability_tier: 'high',
                    },
                  ],
                },
                {
                  id: `elem-2-${now}`,
                  tag_name: 'button',
                  text_content: 'Sign In',
                  source_file: 'app/login/page.tsx',
                  source_line: 42,
                  source_ref: 'app/login/page.tsx:42',
                  stability_tier: 'high',
                  primary_candidate: {
                    strategy: 'testid',
                    value: 'login-submit',
                    score: 0.98,
                    playwright_code: "page.getByTestId('login-submit')",
                    rank: 1,
                    stability_tier: 'high',
                  },
                  candidates: [
                    {
                      strategy: 'testid',
                      value: 'login-submit',
                      score: 0.98,
                      playwright_code: "page.getByTestId('login-submit')",
                      rank: 1,
                      stability_tier: 'high',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];

      const extractedReviewItems: UiReviewItem[] = [
        {
          step_id: `step-review-1-${now}`,
          step_order: 1,
          action: 'click',
          target_description: `Click Submit Login Button on ${repoName}`,
          confidence: 0.72,
          element_id: `elem-2-${now}`,
          chosen_locator: {
            strategy: 'css',
            value: 'button.btn-primary',
            score: 0.72,
            playwright_code: "page.locator('button.btn-primary')",
            rank: 2,
            stability_tier: 'medium',
          },
          candidates: [
            {
              strategy: 'testid',
              value: 'login-submit',
              score: 0.98,
              playwright_code: "page.getByTestId('login-submit')",
              rank: 1,
              stability_tier: 'high',
            },
            {
              strategy: 'css',
              value: 'button.btn-primary',
              score: 0.72,
              playwright_code: "page.locator('button.btn-primary')",
              rank: 2,
              stability_tier: 'medium',
            },
          ],
          rationale: 'Sub-threshold confidence match (72%). Review candidate selectors.',
          needs_review: true,
          human_verified: false,
        },
      ];

      setActiveScanState((prev) =>
        prev ? { ...prev, phase: 'completed', progressPercent: 100, filesProcessed: 42 } : null,
      );

      setScannedLocators(extractedLocators);
      setScannedKbPages(extractedPages);
      setScannedRepos((prev) => (prev.includes(repoName) ? prev : [...prev, repoName]));
      setReviewItems(extractedReviewItems);
      setSelectedPageId(pageId);
      setSelectedComponentId(compId);
      setSelectedElementId(elemId);
      setActivePickerStepId(`step-review-1-${now}`);
    }, 1200);
  };

  const handleRetryScan = () => {
    if (activeScanState) {
      triggerScanFlow(activeScanState.repoUrl, 'main');
    }
  };

  const pendingReviewCount = reviewItems.filter(
    (item) => (item.needs_review || item.confidence < 0.85) && !item.human_verified,
  ).length;

  const isExportAllowed = pendingReviewCount === 0;

  const handleConfirmOverride = (stepId: string, candidate: UiReviewCandidate) => {
    setReviewItems((prev) =>
      prev.map((item) => {
        if (item.step_id !== stepId) return item;
        return {
          ...item,
          chosen_locator: candidate,
          confidence: 1.0,
          human_verified: true,
          needs_review: false,
          rationale: `Human override verified by QA Engineer (${candidate.strategy}: ${candidate.value})`,
        };
      }),
    );
  };

  const filteredLocators = scannedLocators.filter(
    (loc) =>
      loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.selector.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.component.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleGenerateTest = () => {
    setIsGenerating(true);
    setGenProgress(20);

    const targetRepo = selectedRepo || 'frontend-app';
    const storySummary = userStoryText
      ? userStoryText.slice(0, 60)
      : 'User Login and Navigation Flow';

    setTimeout(() => setGenProgress(50), 400);
    setTimeout(() => setGenProgress(80), 800);
    setTimeout(() => {
      setGenProgress(100);
      setIsGenerating(false);
      setCodeOutput(`import { test, expect } from '@playwright/test';

/**
 * Repository: ${targetRepo}
 * Story: ${storySummary}
 * Mapped Locators: [data-testid="input-email"], [data-testid="input-password"], [data-testid="login-submit"]
 */
test.describe('Automated Acceptance Test Suite', () => {
  test('execute user story workflow', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="input-email"]', 'alex@example.com');
    await page.fill('[data-testid="input-password"]', 'SuperSecretPass!');
    await page.click('[data-testid="login-submit"]');
    
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Welcome');
  });
});
`);
    }, 1200);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(codeOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#070913', color: '#f8fafc' }}>
      {/* Top Navbar (Sally UX Clean Header) */}
      <header
        style={{
          height: '64px',
          borderBottom: '1px solid var(--border-card)',
          background: 'rgba(9, 12, 21, 0.95)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        {/* Left: Brand Logo + Workspace Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontWeight: 700,
              fontSize: '1.2rem',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 15px rgba(139, 92, 246, 0.4)',
              }}
            >
              <Sparkles style={{ width: '20px', height: '20px', color: '#fff' }} />
            </div>
            <span className="gradient-text">QA Automater</span>
          </div>

          <div
            style={{
              height: '20px',
              width: '1px',
              background: 'rgba(255,255,255,0.1)',
              margin: '0 4px',
            }}
          />

          {/* Organization / Workspace Selector */}
          <OrgSelector />
        </div>

        {/* Right: + Connect Repo CTA + User Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            type="button"
            onClick={() => setIsConnectModalOpen(true)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 0 15px rgba(99, 102, 241, 0.3)',
            }}
            data-testid="connect-repo-button"
          >
            <span>+ Connect Repo</span>
          </button>

          {/* User Avatar & Profile Dropdown */}
          <UserProfileDropdown />
        </div>
      </header>

      {/* Main Container */}
      <div style={{ display: 'flex', flex: 1, background: '#070913' }}>
        {/* Sidebar Navigation */}
        <aside
          style={{
            width: '240px',
            borderRight: '1px solid var(--border-card)',
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(16px)',
            padding: '20px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'overview' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              color: activeTab === 'overview' ? '#818CF8' : 'var(--text-muted)',
              fontSize: '0.9rem',
              fontWeight: activeTab === 'overview' ? 600 : 400,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
            }}
          >
            <Activity style={{ width: '18px', height: '18px' }} />
            Overview
          </button>

          <button
            onClick={() => setActiveTab('locators')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'locators' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              color: activeTab === 'locators' ? '#818CF8' : 'var(--text-muted)',
              fontSize: '0.9rem',
              fontWeight: activeTab === 'locators' ? 600 : 400,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
            }}
          >
            <Layers style={{ width: '18px', height: '18px' }} />
            AST Locators KB
          </button>

          <button
            onClick={() => setActiveTab('explorer')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'explorer' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
              color: activeTab === 'explorer' ? '#34D399' : 'var(--text-muted)',
              fontSize: '0.9rem',
              fontWeight: activeTab === 'explorer' ? 600 : 400,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
            }}
          >
            <FolderTree style={{ width: '18px', height: '18px' }} />
            UI KB Explorer
          </button>

          <button
            onClick={() => setActiveTab('studio')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'studio' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
              color: activeTab === 'studio' ? '#C084FC' : 'var(--text-muted)',
              fontSize: '0.9rem',
              fontWeight: activeTab === 'studio' ? 600 : 400,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
            }}
          >
            <Bot style={{ width: '18px', height: '18px' }} />
            AI Test Studio
          </button>

          <button
            onClick={() => setActiveTab('review')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'review' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
              color: activeTab === 'review' ? '#FBBF24' : 'var(--text-muted)',
              fontSize: '0.9rem',
              fontWeight: activeTab === 'review' ? 600 : 400,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertCircle
                style={{
                  width: '18px',
                  height: '18px',
                  color: pendingReviewCount > 0 ? '#FBBF24' : '#34D399',
                }}
              />
              Review Queue
            </div>
            {pendingReviewCount > 0 ? (
              <span
                style={{
                  background: 'rgba(245, 158, 11, 0.2)',
                  color: '#FBBF24',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                {pendingReviewCount}
              </span>
            ) : (
              <span
                style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#34D399',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                ✓ Ready
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('export')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'export' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              color: activeTab === 'export' ? '#818CF8' : 'var(--text-muted)',
              fontSize: '0.9rem',
              fontWeight: activeTab === 'export' ? 600 : 400,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
            }}
          >
            <GitPullRequest style={{ width: '18px', height: '18px' }} />
            Export & PRs
          </button>

          <button
            onClick={() => setActiveTab('teams')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'teams' ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
              color: activeTab === 'teams' ? '#C084FC' : 'var(--text-muted)',
              fontSize: '0.9rem',
              fontWeight: activeTab === 'teams' ? 600 : 400,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
            }}
          >
            <Users style={{ width: '18px', height: '18px' }} />
            Teams & Members
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'settings' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              color: activeTab === 'settings' ? '#818CF8' : 'var(--text-muted)',
              fontSize: '0.9rem',
              fontWeight: activeTab === 'settings' ? 600 : 400,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
              marginTop: 'auto',
            }}
          >
            <Sliders style={{ width: '18px', height: '18px' }} />
            Settings
          </button>
        </aside>

        {/* Content Area */}
        <main style={{ flex: 1, padding: '28px', overflowY: 'auto', background: '#070913', color: '#f8fafc' }}>
          {/* TAB 8: TEAMS */}
          {activeTab === 'teams' && <TeamsSection />}

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Platform Dashboard</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
                  AI-driven frontend repository AST analysis and Playwright test orchestration
                </p>
              </div>

              {/* Metric Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '16px',
                }}
              >
                <div className="glass-panel glass-panel-hover" style={{ padding: '20px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <span style={{ fontSize: '0.85rem' }}>Scanned Components</span>
                    <Layers style={{ width: '20px', height: '20px', color: '#818CF8' }} />
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '8px' }}>
                    {scannedKbPages.reduce((sum, p) => sum + (p.components?.length || 0), 0)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#34D399', marginTop: '4px' }}>
                    {scannedKbPages.length > 0
                      ? `${scannedKbPages.length} UI pages scanned`
                      : 'No components scanned yet'}
                  </div>
                </div>

                <div className="glass-panel glass-panel-hover" style={{ padding: '20px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <span style={{ fontSize: '0.85rem' }}>Indexed AST Locators</span>
                    <Code2 style={{ width: '20px', height: '20px', color: '#C084FC' }} />
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '8px' }}>
                    {scannedLocators.length}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#C084FC', marginTop: '4px' }}>
                    {scannedLocators.length > 0
                      ? 'Indexed in AST Knowledge Base'
                      : 'Connect a repo to index locators'}
                  </div>
                </div>

                <div className="glass-panel glass-panel-hover" style={{ padding: '20px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <span style={{ fontSize: '0.85rem' }}>Playwright Tests</span>
                    <FileCode style={{ width: '20px', height: '20px', color: '#34D399' }} />
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '8px' }}>
                    {codeOutput ? 1 : 0}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#34D399', marginTop: '4px' }}>
                    {codeOutput
                      ? '100% executable Playwright test code'
                      : '0 test suites generated'}
                  </div>
                </div>

                <div className="glass-panel glass-panel-hover" style={{ padding: '20px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <span style={{ fontSize: '0.85rem' }}>Automated Coverage</span>
                    <Zap style={{ width: '20px', height: '20px', color: '#F59E0B' }} />
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '8px' }}>
                    {scannedLocators.length > 0 ? (codeOutput ? '100%' : '50%') : '0%'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#F59E0B', marginTop: '4px' }}>
                    {scannedLocators.length > 0
                      ? 'Based on scanned locators & user stories'
                      : 'No repository scanned'}
                  </div>
                </div>
              </div>

              {/* Repositories & Recent Scan Activity */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '16px',
                    }}
                  >
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                      Active Frontend Repositories
                    </h3>
                    <button
                      onClick={() => setIsConnectModalOpen(true)}
                      style={{
                        background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 14px',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <GitBranch style={{ width: '14px', height: '14px' }} />
                      Connect Repository
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {scannedRepos.length === 0 ? (
                      <div
                        style={{
                          textAlign: 'center',
                          padding: '32px 20px',
                          background: 'rgba(30, 41, 59, 0.3)',
                          borderRadius: '8px',
                          border: '1px dashed var(--border-card)',
                        }}
                      >
                        <GitBranch
                          style={{
                            width: '32px',
                            height: '32px',
                            color: 'var(--text-muted)',
                            marginBottom: '8px',
                          }}
                        />
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                          No Active Repositories Connected
                        </div>
                        <p
                          style={{
                            color: 'var(--text-muted)',
                            fontSize: '0.85rem',
                            marginTop: '4px',
                            maxWidth: '420px',
                            margin: '4px auto 16px',
                          }}
                        >
                          Connect a frontend repository URL to run AST scan, extract locators, and
                          generate Playwright test cases.
                        </p>
                        <button
                          onClick={() => setIsConnectModalOpen(true)}
                          style={{
                            background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '8px 16px',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <GitBranch style={{ width: '14px', height: '14px' }} /> Connect First Repo
                        </button>
                      </div>
                    ) : (
                      scannedRepos.map((repo) => (
                        <div
                          key={repo}
                          style={{
                            background: 'rgba(30, 41, 59, 0.5)',
                            border: '1px solid var(--border-card)',
                            borderRadius: '8px',
                            padding: '14px 18px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontWeight: 600,
                                fontSize: '0.95rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                              }}
                            >
                              {repo}
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  background: 'rgba(16, 185, 129, 0.2)',
                                  color: '#34D399',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                }}
                              >
                                Active
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: '0.8rem',
                                color: 'var(--text-muted)',
                                marginTop: '4px',
                              }}
                            >
                              Frontend Repository ·{' '}
                              {scannedKbPages.reduce(
                                (sum, p) => sum + (p.components?.length || 0),
                                0,
                              )}{' '}
                              AST Components scanned · {scannedLocators.length} Locators indexed
                            </div>
                          </div>
                          <button
                            onClick={() => setActiveTab('studio')}
                            style={{
                              background: 'rgba(99, 102, 241, 0.15)',
                              color: '#818CF8',
                              border: '1px solid rgba(99, 102, 241, 0.3)',
                              borderRadius: '6px',
                              padding: '6px 12px',
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            Launch AI Studio{' '}
                            <ChevronRight style={{ width: '14px', height: '14px' }} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Queue Activity Feed */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>
                    BullMQ Queue Stream
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {scannedLocators.length > 0 ? (
                      <>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                          <CheckCircle2
                            style={{
                              width: '16px',
                              height: '16px',
                              color: '#10B981',
                              marginTop: '2px',
                            }}
                          />
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                              AST Scan Job Completed
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {scannedLocators.length} locators extracted & indexed
                            </div>
                          </div>
                        </div>

                        {codeOutput && (
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                            <CheckCircle2
                              style={{
                                width: '16px',
                                height: '16px',
                                color: '#10B981',
                                marginTop: '2px',
                              }}
                            />
                            <div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                                AI Playwright Codegen
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Playwright test suite generated
                              </div>
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                          <RefreshCw
                            style={{
                              width: '16px',
                              height: '16px',
                              color: '#818CF8',
                              marginTop: '2px',
                            }}
                          />
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                              pgvector Vector Indexing
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Locators indexed in PostgreSQL vector space
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div
                        style={{
                          fontSize: '0.85rem',
                          color: 'var(--text-muted)',
                          textAlign: 'center',
                          padding: '16px 0',
                        }}
                      >
                        Queue Idle — Trigger a repository scan to see live BullMQ queue events.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AST LOCATORS KB */}
          {activeTab === 'locators' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>
                    AST UI Locator Knowledge Base
                  </h1>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
                    Extracted React/Vue component tree locators indexed with pgvector embeddings
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'rgba(30, 41, 59, 0.6)',
                      border: '1px solid var(--border-card)',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      width: '280px',
                    }}
                  >
                    <Search style={{ width: '16px', height: '16px', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Search locators, testids, components..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#fff',
                        outline: 'none',
                        width: '100%',
                        fontSize: '0.85rem',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Locators Table */}
              <div className="glass-panel" style={{ overflow: 'hidden' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    textAlign: 'left',
                    fontSize: '0.85rem',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: 'rgba(30, 41, 59, 0.8)',
                        borderBottom: '1px solid var(--border-card)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <th style={{ padding: '14px 20px' }}>Component File</th>
                      <th style={{ padding: '14px 20px' }}>UI Element Name</th>
                      <th style={{ padding: '14px 20px' }}>AST Selector</th>
                      <th style={{ padding: '14px 20px' }}>Strategy</th>
                      <th style={{ padding: '14px 20px' }}>Confidence</th>
                      <th style={{ padding: '14px 20px' }}>pgvector</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLocators.map((loc) => (
                      <tr key={loc.id} style={{ borderBottom: '1px solid var(--border-card)' }}>
                        <td
                          style={{
                            padding: '14px 20px',
                            fontFamily: 'JetBrains Mono',
                            color: '#818CF8',
                          }}
                        >
                          {loc.component}
                        </td>
                        <td style={{ padding: '14px 20px', fontWeight: 600 }}>{loc.name}</td>
                        <td
                          style={{
                            padding: '14px 20px',
                            fontFamily: 'JetBrains Mono',
                            color: '#34D399',
                          }}
                        >
                          {loc.selector}
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span
                            style={{
                              background: 'rgba(139, 92, 246, 0.2)',
                              color: '#C084FC',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                            }}
                          >
                            {loc.type}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', color: '#10B981', fontWeight: 600 }}>
                          {loc.confidence}
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              color: '#34D399',
                              fontSize: '0.75rem',
                            }}
                          >
                            <CheckCircle2 style={{ width: '14px', height: '14px' }} /> Indexed
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: UI KB EXPLORER (E7.4) */}
          {activeTab === 'explorer' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h1
                  style={{
                    fontSize: '1.75rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <FolderTree style={{ color: '#34D399' }} />
                  UI Knowledge Base Explorer
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
                  Browse Pages → Components → Elements hierarchy with color-coded locator stability
                  tiers & source traceability
                </p>
              </div>

              {/* 2-Column Explorer Layout */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Left Column: Pages -> Components -> Elements Tree */}
                <div
                  className="glass-panel"
                  style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid var(--border-card)',
                      paddingBottom: '12px',
                    }}
                  >
                    <h3
                      style={{
                        fontSize: '1rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <FolderTree style={{ width: '16px', height: '16px', color: '#818CF8' }} />
                      Hierarchy Tree
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Pages → Components → Elements
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {scannedKbPages.length === 0 ? (
                      <div
                        style={{
                          textAlign: 'center',
                          padding: '24px 12px',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <FolderTree
                          style={{
                            width: '28px',
                            height: '28px',
                            margin: '0 auto 8px',
                            opacity: 0.4,
                          }}
                        />
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff' }}>
                          No Pages Indexed
                        </div>
                        <div style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                          Connect a repo and run a scan to index UI pages and components.
                        </div>
                      </div>
                    ) : (
                      scannedKbPages.map((pageNode) => {
                        const isPageSelected = selectedPageId === pageNode.id;
                        return (
                          <div
                            key={pageNode.id}
                            style={{
                              border: '1px solid var(--border-card)',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              background: 'rgba(30, 41, 59, 0.4)',
                            }}
                          >
                            {/* Page Node Header */}
                            <div
                              onClick={() => {
                                setSelectedPageId(pageNode.id);
                                if (pageNode.components.length > 0) {
                                  setSelectedComponentId(pageNode.components[0]!.id);
                                  if (pageNode.components[0]!.elements.length > 0) {
                                    setSelectedElementId(pageNode.components[0]!.elements[0]!.id);
                                  }
                                }
                              }}
                              style={{
                                padding: '10px 14px',
                                background: isPageSelected
                                  ? 'rgba(99, 102, 241, 0.15)'
                                  : 'rgba(30, 41, 59, 0.6)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FileText
                                  style={{ width: '16px', height: '16px', color: '#818CF8' }}
                                />
                                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                  {pageNode.route_path}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  ({pageNode.component_name})
                                </span>
                              </div>
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  background: 'rgba(255,255,255,0.06)',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                }}
                              >
                                {pageNode.element_count} elements
                              </span>
                            </div>

                            {/* Components Under Page */}
                            {isPageSelected && (
                              <div
                                style={{
                                  padding: '8px 12px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '8px',
                                }}
                              >
                                {pageNode.components.map((compNode) => {
                                  const isCompSelected = selectedComponentId === compNode.id;
                                  return (
                                    <div
                                      key={compNode.id}
                                      style={{
                                        paddingLeft: '12px',
                                        borderLeft: '2px solid rgba(99, 102, 241, 0.3)',
                                      }}
                                    >
                                      <div
                                        onClick={() => {
                                          setSelectedComponentId(compNode.id);
                                          if (compNode.elements.length > 0) {
                                            setSelectedElementId(compNode.elements[0]!.id);
                                          }
                                        }}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '8px',
                                          fontSize: '0.85rem',
                                          fontWeight: 600,
                                          color: isCompSelected ? '#C084FC' : 'var(--text-muted)',
                                          cursor: 'pointer',
                                          marginBottom: '6px',
                                        }}
                                      >
                                        <Component
                                          style={{
                                            width: '14px',
                                            height: '14px',
                                            color: '#C084FC',
                                          }}
                                        />
                                        {compNode.name}
                                      </div>

                                      {/* Elements Under Component with Stability Tier Badges (AC1) */}
                                      <div
                                        style={{
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '4px',
                                          paddingLeft: '8px',
                                        }}
                                      >
                                        {compNode.elements.map((elem) => {
                                          const isElemSelected = selectedElementId === elem.id;
                                          return (
                                            <div
                                              key={elem.id}
                                              onClick={() => setSelectedElementId(elem.id)}
                                              style={{
                                                padding: '6px 10px',
                                                borderRadius: '6px',
                                                background: isElemSelected
                                                  ? 'rgba(52, 211, 153, 0.15)'
                                                  : 'rgba(255,255,255,0.02)',
                                                border: isElemSelected
                                                  ? '1px solid rgba(52, 211, 153, 0.3)'
                                                  : '1px solid transparent',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                fontSize: '0.8rem',
                                              }}
                                            >
                                              <div
                                                style={{
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  gap: '6px',
                                                }}
                                              >
                                                <span
                                                  style={{
                                                    fontSize: '0.7rem',
                                                    color: '#818CF8',
                                                    fontWeight: 600,
                                                  }}
                                                >
                                                  &lt;{elem.tag_name}&gt;
                                                </span>
                                                <span>{elem.text_content}</span>
                                              </div>

                                              {/* AC1: Color-Coded Stability Tier Badges */}
                                              {elem.stability_tier === 'high' && (
                                                <span
                                                  style={{
                                                    fontSize: '0.65rem',
                                                    background: 'rgba(16, 185, 129, 0.2)',
                                                    color: '#34D399',
                                                    border: '1px solid rgba(16, 185, 129, 0.3)',
                                                    padding: '1px 6px',
                                                    borderRadius: '10px',
                                                    fontWeight: 600,
                                                  }}
                                                >
                                                  High Tier
                                                </span>
                                              )}
                                              {elem.stability_tier === 'medium' && (
                                                <span
                                                  style={{
                                                    fontSize: '0.65rem',
                                                    background: 'rgba(245, 158, 11, 0.2)',
                                                    color: '#FBBF24',
                                                    border: '1px solid rgba(245, 158, 11, 0.3)',
                                                    padding: '1px 6px',
                                                    borderRadius: '10px',
                                                    fontWeight: 600,
                                                  }}
                                                >
                                                  Med Tier
                                                </span>
                                              )}
                                              {elem.stability_tier === 'low' && (
                                                <span
                                                  style={{
                                                    fontSize: '0.65rem',
                                                    background: 'rgba(244, 63, 94, 0.2)',
                                                    color: '#FB7185',
                                                    border: '1px solid rgba(244, 63, 94, 0.3)',
                                                    padding: '1px 6px',
                                                    borderRadius: '10px',
                                                    fontWeight: 600,
                                                  }}
                                                >
                                                  Low Tier
                                                </span>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right Column: Selected Element Detail Inspector (AC2) */}
                <div
                  className="glass-panel"
                  style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}
                >
                  {(() => {
                    let activeElem: KbElementDetail | null = null;
                    for (const p of scannedKbPages) {
                      for (const c of p.components) {
                        for (const e of c.elements) {
                          if (e.id === selectedElementId) {
                            activeElem = e;
                            break;
                          }
                        }
                      }
                    }

                    if (!activeElem) {
                      return (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: '260px',
                            textAlign: 'center',
                            color: 'var(--text-muted)',
                            padding: '2rem',
                          }}
                        >
                          <Layers
                            style={{
                              width: '36px',
                              height: '36px',
                              marginBottom: '12px',
                              opacity: 0.4,
                            }}
                          />
                          <h4
                            style={{
                              fontSize: '1rem',
                              fontWeight: 600,
                              color: '#fff',
                              marginBottom: '4px',
                            }}
                          >
                            No UI Element Selected
                          </h4>
                          <p style={{ fontSize: '0.8125rem', maxWidth: '320px', margin: 0 }}>
                            Connect a repository and trigger a scan to inspect extracted UI elements
                            and locator rankings.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: '1px solid var(--border-card)',
                            paddingBottom: '12px',
                          }}
                        >
                          <div>
                            <h3
                              style={{
                                fontSize: '1.1rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                              }}
                            >
                              <span style={{ color: '#818CF8' }}>
                                &lt;{activeElem.tag_name}&gt;
                              </span>
                              {activeElem.text_content}
                            </h3>
                            <div
                              style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-muted)',
                                marginTop: '2px',
                              }}
                            >
                              Element ID: {activeElem.id}
                            </div>
                          </div>

                          {/* AC2: Interactive Source Code Reference Link */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: 'rgba(99, 102, 241, 0.15)',
                              border: '1px solid rgba(99, 102, 241, 0.3)',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              color: '#818CF8',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            <ExternalLink style={{ width: '12px', height: '12px' }} />
                            <span>{activeElem.source_ref}</span>
                          </div>
                        </div>

                        {/* Ranked Locators Table (AC2) */}
                        <div>
                          <div
                            style={{
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              marginBottom: '10px',
                              color: 'var(--text-muted)',
                            }}
                          >
                            Ranked AST Locator Candidates:
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {activeElem.candidates.map((cand) => (
                              <div
                                key={cand.rank}
                                style={{
                                  background: 'rgba(30, 41, 59, 0.6)',
                                  border: '1px solid var(--border-card)',
                                  borderRadius: '8px',
                                  padding: '12px 16px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '8px',
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                  }}
                                >
                                  <div
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                  >
                                    <span
                                      style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        background: 'rgba(255,255,255,0.1)',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                      }}
                                    >
                                      Rank #{cand.rank}
                                    </span>
                                    <span
                                      style={{
                                        fontSize: '0.75rem',
                                        background: 'rgba(139, 92, 246, 0.2)',
                                        color: '#C084FC',
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                        fontWeight: 600,
                                      }}
                                    >
                                      {cand.strategy}
                                    </span>
                                    <span
                                      style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}
                                    >
                                      Score: {(cand.score * 100).toFixed(0)}%
                                    </span>
                                  </div>

                                  {cand.stability_tier === 'high' && (
                                    <span
                                      style={{
                                        fontSize: '0.7rem',
                                        background: 'rgba(16, 185, 129, 0.2)',
                                        color: '#34D399',
                                        border: '1px solid rgba(16, 185, 129, 0.3)',
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                        fontWeight: 600,
                                      }}
                                    >
                                      HIGH TIER
                                    </span>
                                  )}
                                  {cand.stability_tier === 'medium' && (
                                    <span
                                      style={{
                                        fontSize: '0.7rem',
                                        background: 'rgba(245, 158, 11, 0.2)',
                                        color: '#FBBF24',
                                        border: '1px solid rgba(245, 158, 11, 0.3)',
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                        fontWeight: 600,
                                      }}
                                    >
                                      MEDIUM TIER
                                    </span>
                                  )}
                                  {cand.stability_tier === 'low' && (
                                    <span
                                      style={{
                                        fontSize: '0.7rem',
                                        background: 'rgba(244, 63, 94, 0.2)',
                                        color: '#FB7185',
                                        border: '1px solid rgba(244, 63, 94, 0.3)',
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                        fontWeight: 600,
                                      }}
                                    >
                                      LOW TIER
                                    </span>
                                  )}
                                </div>

                                {/* Code Snippet & Copy Button */}
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    background: 'rgba(15, 23, 42, 0.8)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    borderRadius: '6px',
                                    padding: '8px 12px',
                                  }}
                                >
                                  <code
                                    style={{
                                      fontSize: '0.8rem',
                                      color: '#E2E8F0',
                                      fontFamily: 'monospace',
                                    }}
                                  >
                                    {cand.playwright_code}
                                  </code>
                                  <button
                                    onClick={() =>
                                      navigator.clipboard.writeText(cand.playwright_code)
                                    }
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: 'var(--text-muted)',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontSize: '0.75rem',
                                    }}
                                  >
                                    <Copy style={{ width: '12px', height: '12px' }} /> Copy
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AI TEST STUDIO */}

          {activeTab === 'studio' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h1
                  style={{
                    fontSize: '1.75rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <Sparkles style={{ color: '#C084FC' }} />
                  AI Playwright Test Studio
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
                  Coached test creation mapping user stories to AST locators via LLM RAG
                  orchestration
                </p>
              </div>

              {/* Story E13.3 AC1 & AC2: Test Generation Wizard Component */}
              <div style={{ marginBottom: '1rem' }}>
                <TestGenerationWizard
                  initialStoryText={userStoryText}
                  onGenerateComplete={(code) => setCodeOutput(code)}
                />
              </div>

              {/* Story Input Bar */}
              <div
                className="glass-panel"
                style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}
              >
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  User Acceptance Story / Requirement:
                </label>
                <textarea
                  value={userStoryText}
                  onChange={(e) => setUserStoryText(e.target.value)}
                  rows={2}
                  style={{
                    background: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid var(--border-card)',
                    borderRadius: '8px',
                    color: '#fff',
                    padding: '12px',
                    outline: 'none',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '0.9rem',
                    resize: 'none',
                  }}
                />

                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Target Component:{' '}
                    <span style={{ color: '#818CF8', fontFamily: 'JetBrains Mono' }}>
                      src/components/auth/LoginForm.tsx
                    </span>
                  </div>

                  <button
                    onClick={handleGenerateTest}
                    disabled={isGenerating}
                    className="glow-purple"
                    style={{
                      background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 20px',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      cursor: isGenerating ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw
                          style={{
                            width: '16px',
                            height: '16px',
                            animation: 'spin 1s linear infinite',
                          }}
                        />
                        RAG Mapping ({genProgress}%)...
                      </>
                    ) : (
                      <>
                        <Sparkles style={{ width: '16px', height: '16px' }} />
                        Generate Playwright Test
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Split Editor Preview */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '20px',
                  height: '440px',
                }}
              >
                {/* Left Panel: Locator Mapping */}
                <div
                  className="glass-panel"
                  style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}
                >
                  <h3
                    style={{
                      fontSize: '1rem',
                      fontWeight: 600,
                      marginBottom: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <Layers style={{ width: '16px', height: '16px', color: '#818CF8' }} />
                    RAG Locator Mapping Matrix
                  </h3>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      flex: 1,
                      overflowY: 'auto',
                    }}
                  >
                    <div
                      style={{
                        background: 'rgba(30, 41, 59, 0.5)',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-card)',
                      }}
                    >
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Step 1: Navigate to /login
                      </div>
                      <div
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          color: '#34D399',
                          marginTop: '4px',
                        }}
                      >
                        page.goto(&apos;/login&apos;)
                      </div>
                    </div>

                    <div
                      style={{
                        background: 'rgba(30, 41, 59, 0.5)',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-card)',
                      }}
                    >
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Step 2: Enter Email & Password
                      </div>
                      <div
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          color: '#818CF8',
                          marginTop: '4px',
                          fontFamily: 'JetBrains Mono',
                        }}
                      >
                        [data-testid=&quot;input-email&quot;]
                      </div>
                      <div
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          color: '#818CF8',
                          marginTop: '2px',
                          fontFamily: 'JetBrains Mono',
                        }}
                      >
                        [data-testid=&quot;input-password&quot;]
                      </div>
                    </div>

                    <div
                      style={{
                        background: 'rgba(30, 41, 59, 0.5)',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-card)',
                      }}
                    >
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Step 3: Click Submit Button
                      </div>
                      <div
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          color: '#C084FC',
                          marginTop: '4px',
                          fontFamily: 'JetBrains Mono',
                        }}
                      >
                        button[type=&quot;submit&quot;]
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Panel: Playwright TypeScript Code Output */}
                <div
                  className="glass-panel"
                  style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: '#34D399',
                        fontFamily: 'JetBrains Mono',
                      }}
                    >
                      tests/e2e/login.spec.ts
                    </span>
                    <button
                      onClick={handleCopyCode}
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        color: '#fff',
                        border: '1px solid var(--border-card)',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Copy style={{ width: '12px', height: '12px' }} />
                      {copied ? 'Copied!' : 'Copy Code'}
                    </button>
                  </div>

                  <textarea
                    value={codeOutput}
                    onChange={(e) => setCodeOutput(e.target.value)}
                    style={{
                      flex: 1,
                      background: 'rgba(9, 12, 21, 0.85)',
                      color: '#E2E8F0',
                      border: '1px solid var(--border-card)',
                      borderRadius: '8px',
                      padding: '14px',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '0.82rem',
                      outline: 'none',
                      resize: 'none',
                      lineHeight: '1.6',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB: REVIEW QUEUE DASHBOARD UI (E10.4) */}
          {activeTab === 'review' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>
                  Human-in-the-Loop Review Queue
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
                  Review low-confidence AST element mappings, select candidate locators, or enter
                  manual overrides before test export.
                </p>
              </div>

              {/* Status Header Banner */}
              <div
                className="glass-panel"
                style={{
                  padding: '20px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: isExportAllowed
                    ? 'rgba(16, 185, 129, 0.08)'
                    : 'rgba(245, 158, 11, 0.08)',
                  border: isExportAllowed
                    ? '1px solid rgba(16, 185, 129, 0.3)'
                    : '1px solid rgba(245, 158, 11, 0.4)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      background: isExportAllowed
                        ? 'rgba(16, 185, 129, 0.2)'
                        : 'rgba(245, 158, 11, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isExportAllowed ? (
                      <CheckSquare style={{ width: '22px', height: '22px', color: '#34D399' }} />
                    ) : (
                      <AlertCircle style={{ width: '22px', height: '22px', color: '#FBBF24' }} />
                    )}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>
                      {isExportAllowed
                        ? 'All Step Mappings Verified — Export Unlocked'
                        : `Export Blocked: ${pendingReviewCount} Step Mapping(s) Require QA Review`}
                    </h3>
                    <p
                      style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}
                    >
                      {isExportAllowed
                        ? 'All element locators satisfy confidence >= 85% or are human verified. Playwright codegen ready.'
                        : 'Review candidates or confirm manual overrides to enable test suite export.'}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    disabled={!isExportAllowed}
                    onClick={() => setActiveTab('export')}
                    style={{
                      background: isExportAllowed
                        ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                        : 'rgba(51, 65, 85, 0.5)',
                      color: isExportAllowed ? '#fff' : '#64748B',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 20px',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      cursor: isExportAllowed ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: isExportAllowed ? '0 0 16px rgba(16, 185, 129, 0.3)' : 'none',
                    }}
                  >
                    <Download style={{ width: '16px', height: '16px' }} />
                    {isExportAllowed
                      ? 'Proceed to Export'
                      : `Export Blocked (${pendingReviewCount} Pending)`}
                  </button>
                </div>
              </div>

              {/* Main Review Queue Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
                {/* Left Column: Test Plan Step Review List */}
                <div
                  className="glass-panel"
                  style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}
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
                    <Sliders style={{ width: '18px', height: '18px', color: '#818CF8' }} />
                    Test Plan Steps & Locators
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {reviewItems.map((item) => {
                      const isLowConfidence = item.confidence < 0.85 && !item.human_verified;
                      const isSelected = activePickerStepId === item.step_id;

                      return (
                        <div
                          key={item.step_id}
                          onClick={() => setActivePickerStepId(item.step_id)}
                          style={{
                            padding: '16px',
                            borderRadius: '10px',
                            background: isSelected
                              ? 'rgba(99, 102, 241, 0.12)'
                              : isLowConfidence
                                ? 'rgba(245, 158, 11, 0.06)'
                                : 'rgba(30, 41, 59, 0.4)',
                            border: isSelected
                              ? '1px solid #818CF8'
                              : isLowConfidence
                                ? '1px solid rgba(245, 158, 11, 0.5)'
                                : '1px solid var(--border-card)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span
                                style={{
                                  background: 'rgba(15, 23, 42, 0.8)',
                                  border: '1px solid var(--border-card)',
                                  color: '#fff',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                }}
                              >
                                Step {item.step_order}
                              </span>
                              <span
                                style={{
                                  background:
                                    item.action === 'fill'
                                      ? 'rgba(99, 102, 241, 0.2)'
                                      : 'rgba(16, 185, 129, 0.2)',
                                  color: item.action === 'fill' ? '#818CF8' : '#34D399',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {item.action}
                              </span>
                              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                                {item.target_description}
                              </span>
                            </div>

                            {item.human_verified ? (
                              <span
                                style={{
                                  background: 'rgba(16, 185, 129, 0.15)',
                                  color: '#34D399',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  padding: '3px 10px',
                                  borderRadius: '12px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <ShieldCheck style={{ width: '12px', height: '12px' }} /> Verified
                                (100%)
                              </span>
                            ) : isLowConfidence ? (
                              <span
                                style={{
                                  background: 'rgba(245, 158, 11, 0.15)',
                                  color: '#FBBF24',
                                  border: '1px solid rgba(245, 158, 11, 0.4)',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  padding: '3px 10px',
                                  borderRadius: '12px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <AlertCircle style={{ width: '12px', height: '12px' }} /> Review (
                                {Math.round(item.confidence * 100)}%)
                              </span>
                            ) : (
                              <span
                                style={{
                                  background: 'rgba(99, 102, 241, 0.15)',
                                  color: '#818CF8',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  padding: '3px 10px',
                                  borderRadius: '12px',
                                }}
                              >
                                High Confidence ({Math.round(item.confidence * 100)}%)
                              </span>
                            )}
                          </div>

                          <div
                            style={{
                              background: 'rgba(15, 23, 42, 0.6)',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontFamily: 'JetBrains Mono, monospace',
                              color: '#93C5FD',
                            }}
                          >
                            {item.chosen_locator?.playwright_code || 'No locator assigned'}
                          </div>

                          {isLowConfidence && (
                            <div
                              style={{
                                fontSize: '0.78rem',
                                color: '#FCD34D',
                                background: 'rgba(245, 158, 11, 0.1)',
                                padding: '6px 10px',
                                borderRadius: '6px',
                              }}
                            >
                              ⚠️ {item.rationale}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right Column: Candidate Selector Inspector Panel */}
                <div
                  className="glass-panel"
                  style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}
                >
                  {(() => {
                    const activeItem =
                      reviewItems.find((i) => i.step_id === activePickerStepId) ||
                      reviewItems[1] ||
                      reviewItems[0];
                    if (!activeItem) return null;

                    return (
                      <>
                        <h3
                          style={{
                            fontSize: '1.1rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <Bot style={{ width: '18px', height: '18px', color: '#C084FC' }} />
                          Candidate Picker (Step {activeItem.step_order})
                        </h3>

                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          Target:{' '}
                          <strong style={{ color: '#fff' }}>{activeItem.target_description}</strong>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <span
                            style={{
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              color: 'var(--text-muted)',
                            }}
                          >
                            Available Candidate Selectors:
                          </span>

                          {activeItem.candidates.map((cand, idx) => {
                            const isChosen = activeItem.chosen_locator?.value === cand.value;

                            return (
                              <div
                                key={idx}
                                style={{
                                  padding: '12px 14px',
                                  borderRadius: '8px',
                                  background: isChosen
                                    ? 'rgba(16, 185, 129, 0.12)'
                                    : 'rgba(30, 41, 59, 0.6)',
                                  border: isChosen
                                    ? '1px solid #34D399'
                                    : '1px solid var(--border-card)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '8px',
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                  }}
                                >
                                  <div
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                  >
                                    <span
                                      style={{
                                        background:
                                          cand.strategy === 'testid'
                                            ? 'rgba(16, 185, 129, 0.2)'
                                            : cand.strategy === 'label'
                                              ? 'rgba(99, 102, 241, 0.2)'
                                              : 'rgba(245, 158, 11, 0.2)',
                                        color:
                                          cand.strategy === 'testid'
                                            ? '#34D399'
                                            : cand.strategy === 'label'
                                              ? '#818CF8'
                                              : '#FBBF24',
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        textTransform: 'uppercase',
                                      }}
                                    >
                                      {cand.strategy}
                                    </span>
                                    <span
                                      style={{
                                        fontSize: '0.8rem',
                                        color: '#CBD5E1',
                                        fontFamily: 'JetBrains Mono, monospace',
                                      }}
                                    >
                                      {cand.value}
                                    </span>
                                  </div>

                                  <span
                                    style={{
                                      fontSize: '0.75rem',
                                      color: '#34D399',
                                      fontWeight: 600,
                                    }}
                                  >
                                    Score: {Math.round(cand.score * 100)}%
                                  </span>
                                </div>

                                <div
                                  style={{
                                    fontSize: '0.8rem',
                                    fontFamily: 'JetBrains Mono, monospace',
                                    color: '#93C5FD',
                                  }}
                                >
                                  {cand.playwright_code}
                                </div>

                                <button
                                  onClick={() => handleConfirmOverride(activeItem.step_id, cand)}
                                  style={{
                                    alignSelf: 'flex-end',
                                    background: isChosen
                                      ? 'rgba(16, 185, 129, 0.2)'
                                      : 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                                    color: isChosen ? '#34D399' : '#fff',
                                    border: isChosen ? '1px solid #34D399' : 'none',
                                    borderRadius: '6px',
                                    padding: '5px 12px',
                                    fontSize: '0.78rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    marginTop: '4px',
                                  }}
                                >
                                  {isChosen && activeItem.human_verified
                                    ? '✓ Active Verified Selector'
                                    : 'Confirm Override Selector'}
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        {/* Custom Selector Manual Override */}
                        <div
                          style={{
                            marginTop: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              color: 'var(--text-muted)',
                            }}
                          >
                            Or Custom Selector Override:
                          </span>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                              type="text"
                              placeholder="e.g. page.getByTestId('custom-input')"
                              value={customSelectorInput}
                              onChange={(e) => setCustomSelectorInput(e.target.value)}
                              style={{
                                flex: 1,
                                background: 'rgba(15, 23, 42, 0.8)',
                                color: '#fff',
                                border: '1px solid var(--border-card)',
                                borderRadius: '6px',
                                padding: '8px 12px',
                                fontSize: '0.82rem',
                                fontFamily: 'JetBrains Mono, monospace',
                                outline: 'none',
                              }}
                            />
                            <button
                              disabled={!customSelectorInput.trim()}
                              onClick={() => {
                                if (!customSelectorInput.trim()) return;
                                handleConfirmOverride(activeItem.step_id, {
                                  strategy: 'custom',
                                  value: customSelectorInput,
                                  score: 1.0,
                                  playwright_code: customSelectorInput.startsWith('page.')
                                    ? customSelectorInput
                                    : `page.locator('${customSelectorInput}')`,
                                  rank: 1,
                                  stability_tier: 'high',
                                });
                                setCustomSelectorInput('');
                              }}
                              style={{
                                background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '8px 14px',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: customSelectorInput.trim() ? 'pointer' : 'not-allowed',
                                opacity: customSelectorInput.trim() ? 1 : 0.5,
                              }}
                            >
                              Apply Custom
                            </button>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: EXPORT & PR PIPELINE */}
          {activeTab === 'export' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>
                  Export & GitHub PR Pipeline
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
                  Export Playwright test suites via downloadable ZIP bundle or automated GitHub Pull
                  Request
                </p>
              </div>

              {/* Story E13.4 AC1 & AC2: Export Actions Card */}
              <ExportActionsCard
                jobId="job_gen_golden_101"
                isApproved={isExportAllowed}
                repoName={selectedRepo}
              />
            </div>
          )}

          {/* TAB 5: SETTINGS */}
          {activeTab === 'settings' && <SettingsSection />}

          {/* Story E13.2 AC1 & AC2: Active Scan Progress Floating Card */}
          {activeScanState && (
            <div
              style={{
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                zIndex: 90,
                width: '380px',
              }}
            >
              <ScanProgressCard
                scanState={activeScanState}
                onRetry={handleRetryScan}
                onClose={() => setActiveScanState(null)}
              />
            </div>
          )}

          {/* Story E13.2 AC1: Guided Repo Connect Modal */}
          <RepoConnectModal
            isOpen={isConnectModalOpen}
            onClose={() => setIsConnectModalOpen(false)}
            onConnectAndScan={triggerScanFlow}
          />
        </main>
      </div>
    </div>
  );
}
