import { Providers } from "./providers";

// eslint-disable-next-line react-refresh/only-export-components
export const metadata = {
  title: "Juda",
  description: "The true personal assistant",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
