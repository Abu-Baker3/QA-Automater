import type { Metadata } from 'next';
import { cn } from '@qa-automater/ui';

export const metadata: Metadata = {
  title: 'QA Automater',
  description: 'AI-powered automated test generation platform',
};

export default function HomePage() {
  return (
    <main className={cn('min-h-screen', 'flex', 'items-center', 'justify-center', 'p-8')}>
      <div style={{ textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>QA Automater</h1>
        <p style={{ color: '#666' }}>AI-powered Playwright test generation from source code</p>
      </div>
    </main>
  );
}
