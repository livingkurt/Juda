import { Providers } from "./providers";
import { ColorModeScript } from "./color-mode-script";
import { MobileZoomFix } from "@/components/MobileZoomFix";

// eslint-disable-next-line react-refresh/only-export-components
export const metadata = {
  title: "Juda",
  description: "The true personal assistant",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Juda",
  },
};

// eslint-disable-next-line react-refresh/only-export-components
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#3182CE" },
    { media: "(prefers-color-scheme: dark)", color: "#3182CE" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ColorModeScript />
        <MobileZoomFix />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
