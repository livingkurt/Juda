import { Providers } from "./providers";
import { ColorModeScript } from "./color-mode-script";
import { MobileZoomFix } from "@/components/MobileZoomFix";

// eslint-disable-next-line react-refresh/only-export-components
export const metadata = {
  title: "Juda",
  description: "The true personal assistant",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
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
