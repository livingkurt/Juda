import { Providers } from "./providers";
import { ColorModeScript } from "./color-mode-script";

// eslint-disable-next-line react-refresh/only-export-components
export const metadata = {
  title: "Juda",
  description: "The true personal assistant",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ColorModeScript />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
