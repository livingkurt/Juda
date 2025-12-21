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
                  // Check localStorage first (for backwards compatibility and initial load)
                  let colorMode = localStorage.getItem('chakra-ui-color-mode');

                  // If no chakra color mode, check our preferences
                  if (!colorMode) {
                    const prefs = localStorage.getItem('juda-view-preferences');
                    if (prefs) {
                      try {
                        const parsed = JSON.parse(prefs);
                        colorMode = parsed.colorMode;
                      } catch (e) {}
                    }
                  }

                  // Default to dark if nothing found
                  colorMode = colorMode || 'dark';

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
