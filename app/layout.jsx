import { Providers } from "./providers";

// eslint-disable-next-line react-refresh/only-export-components
export const metadata = {
  title: "Juda",
  description: "The true personal assistant",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const colorMode = localStorage.getItem('chakra-ui-color-mode') || 'dark';
                  document.documentElement.setAttribute('data-theme', colorMode);
                  document.documentElement.style.colorScheme = colorMode;
                  if (colorMode === 'dark') {
                    document.documentElement.style.backgroundColor = '#1a202c';
                    document.body.style.backgroundColor = '#1a202c';
                  } else {
                    document.documentElement.style.backgroundColor = '#f7fafc';
                    document.body.style.backgroundColor = '#f7fafc';
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
