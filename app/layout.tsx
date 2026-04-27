import './globals.css';

export const metadata = {
  title: 'Ninos Kebab Demo',
  description: 'Demo för Ninos Kebab egen beställningsapp',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body>{children}</body>
    </html>
  );
}
