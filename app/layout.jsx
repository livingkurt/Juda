import { Providers } from "./providers";

export const metadata = {
  title: "Juda",
  description: "The true personal assistant",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
