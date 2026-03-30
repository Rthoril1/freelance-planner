import type { Metadata } from 'next';
import { Inter, Manrope } from 'next/font/google';
import './globals.css';
import { AppLayout } from '@/components/layout/AppLayout';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

const manrope = Manrope({ 
  subsets: ['latin'],
  variable: '--font-manrope',
});

export const metadata: Metadata = {
  title: 'FreelanceSync | Weekly Planner',
  description: 'Manage multiple companies and projects with a single availability schedule.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body className={`${inter.variable} ${manrope.variable} font-sans bg-background text-foreground antialiased`}>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
