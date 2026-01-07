import { Providers } from "./providers";
import "./globals.css";

// eslint-disable-next-line react-refresh/only-export-components
export const metadata = {
  title: "Juda - Task Manager",
  description: "Daily task management system",
  manifest: "/manifest.json",
  themeColor: "#171923",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
