import { Providers } from "./providers";

export const metadata = {
  title: "Task Manager",
  description: "Daily task management system",
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
