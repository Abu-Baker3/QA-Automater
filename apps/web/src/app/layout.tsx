import './globals.css';

export const metadata = {
  title: 'QA Automater — AI Test Generation Platform',
  description:
    'AI-Powered Playwright and Cypress test generation platform from frontend source code and user stories.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className="dark"
      style={{ backgroundColor: '#070913', color: '#f8fafc', colorScheme: 'dark' }}
    >
      <body
        style={{
          backgroundColor: '#070913',
          backgroundImage:
            'radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.18) 0%, rgba(7, 9, 19, 1) 75%)',
          backgroundAttachment: 'fixed',
          color: '#f8fafc',
          minHeight: '100vh',
          margin: 0,
          padding: 0,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        {children}
      </body>
    </html>
  );
}
