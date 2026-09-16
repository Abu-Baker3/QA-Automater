import './globals.css';

export const metadata = {
  title: 'QA Automater — AI Test Generation Platform',
  description: 'AI-Powered Playwright and Cypress test generation platform from frontend source code and user stories.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
