import ClientThemeProvider from "../components/ThemeProvider";

export const metadata = {
  title: "Habit Tracker",
  description: "Your personal habit tracking assistant",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ClientThemeProvider>{children}</ClientThemeProvider>
      </body>
    </html>
  );
}
