'use client';

import React, { useState } from 'react';
import { NavHeader, NavTab } from './NavHeader';

interface DashboardShellProps {
  children: (props: { activeTab: NavTab; selectedOrgId: string }) => React.ReactNode;
  initialTab?: NavTab;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({
  children,
  initialTab = 'repositories',
}) => {
  const [activeTab, setActiveTab] = useState<NavTab>(initialTab);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('org_acme_qa');

  return (
    <div
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
      data-testid="dashboard-shell"
    >
      {/* Story E13.1 AC1: Nav Header with Org Selector and Navigation Links */}
      <NavHeader
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        onOrgChange={(orgId) => setSelectedOrgId(orgId)}
      />

      {/* Main Content Area */}
      <main
        style={{ flex: 1, padding: '1.5rem', maxWidth: '1440px', width: '100%', margin: '0 auto' }}
      >
        {children({ activeTab, selectedOrgId })}
      </main>
    </div>
  );
};
