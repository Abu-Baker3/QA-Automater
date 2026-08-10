import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || 'pk_test_dGhhbmtmdWwtb29zdGVyLTMyLmNsZXJrLmFjY291bnRzLmRldiQ';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider publishableKey={publishableKey}>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}



