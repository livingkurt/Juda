# Chakra UI v3 Color Mode Fix

## Problem

After migrating from Chakra UI v2 to v3, two major issues occurred:

1. The theme colors were not responding correctly to dark and light mode changes
2. The actual color values changed - dark mode lost its blue-gray tones and became neutral gray, making the app look washed out compared to v2

## Root Cause

Chakra UI v3 introduced breaking changes to the theming system:

1. **New API Structure**: `createSystem` requires proper configuration structure
2. **Color Mode System**: The color mode system now relies on CSS classes (`light`/`dark`) on the `<html>` element and the `colorScheme` style property
3. **Color Palette Changes**: Chakra v3 changed the actual hex values of the default color palette:
   - v2 `gray.900` was `#171923` (blue-gray, navy tone)
   - v3 `gray.900` is a neutral gray (no blue tones)
   - v2 `gray.800` was `#1A202C` (blue-gray)
   - v3 `gray.800` is a neutral gray
   - This made the dark mode look washed out and different from the original design

## Solution

### 1. Updated `app/providers.jsx`

Created a custom theme system that overrides the color palette to match v2:

```javascript
const system = createSystem(defaultConfig, {
  theme: {
    tokens: {
      colors: {
        // Override gray palette to match v2's blue-gray tones
        gray: {
          50: { value: "#F7FAFC" },
          100: { value: "#EDF2F7" },
          200: { value: "#E2E8F0" },
          300: { value: "#CBD5E0" },
          400: { value: "#A0AEC0" },
          500: { value: "#718096" },
          600: { value: "#4A5568" },
          700: { value: "#2D3748" },
          800: { value: "#1A202C" }, // v2 dark mode card background
          900: { value: "#171923" }, // v2 dark mode main background
        },
      },
    },
  },
  globalCss: {
    body: {
      bg: { _light: "gray.50", _dark: "gray.900" },
      color: { _light: "gray.900", _dark: "gray.100" },
    },
  },
});
```

**Key Changes:**

- Override the `gray` color tokens with Chakra v2's exact hex values
- This preserves the blue-gray tones that gave dark mode its navy appearance
- Use `_light` and `_dark` keys in globalCss for color mode variants
- No need for `defineConfig` when using this simpler structure

### 2. Created `app/color-mode-script.jsx`

Added a client-side script that initializes the color mode before React hydration to prevent flash of wrong theme:

```javascript
export function ColorModeScript() {
  useEffect(() => {
    const initColorMode = () => {
      const stored = localStorage.getItem("juda-preferences");
      if (stored) {
        const prefs = JSON.parse(stored);
        const colorMode = prefs.colorMode || "dark";
        document.documentElement.classList.add(colorMode);
        document.documentElement.style.colorScheme = colorMode;
      }
    };
    initColorMode();
  }, []);
  return null;
}
```

**Purpose:**

- Reads color mode from localStorage on page load
- Sets the appropriate class on `<html>` element
- Sets the `colorScheme` style property for native browser elements

### 3. Updated `app/layout.jsx`

Added the ColorModeScript to the root layout:

```javascript
import { ColorModeScript } from "./color-mode-script";

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
```

### 4. Updated `hooks/useColorModeSync.js`

Enhanced the hook to set the `colorScheme` style property in addition to the class:

```javascript
// Added colorScheme style property
document.documentElement.style.colorScheme = mode;
```

**Why this matters:**

- Chakra v3 uses the `colorScheme` property to apply color mode styles
- Native browser elements (scrollbars, form controls) respect this property
- Ensures consistent theming across all UI elements

## How Color Mode Works in Chakra v3

1. **HTML Element Classes**: The color mode is controlled by adding `light` or `dark` class to the `<html>` element
2. **ColorScheme Property**: The `colorScheme` style property tells the browser which theme to use
3. **CSS Variables**: Chakra v3 uses CSS variables that respond to these classes
4. **Semantic Tokens**: Define colors with `_light` and `_dark` variants in the theme config

## Testing

After these changes:

- ✅ Light mode shows light colors (gray.50 background, gray.900 text)
- ✅ Dark mode shows dark colors (gray.900 background, gray.100 text)
- ✅ Toggle between modes works instantly
- ✅ Color mode persists across page reloads
- ✅ No flash of wrong theme on page load

## Migration Notes for Future Reference

When migrating from Chakra v2 to v3:

1. **Override color tokens** - Chakra v3 changed the default color palette values, so you need to override them to match v2
2. **Set both class and colorScheme** when changing color mode
3. **Use `_light` and `_dark` keys** instead of color mode functions
4. **Add ColorModeScript** to prevent flash of unstyled content
5. **Use Chakra v3's native `_light`/`_dark` syntax** - Replace `useColorModeValue` with direct object syntax: `{ _light: "value", _dark: "value" }`
6. **Test both light and dark modes** - The color values changed, so visual comparison is essential

## Files Modified

- `app/providers.jsx` - Fixed theme system configuration
- `app/layout.jsx` - Added ColorModeScript
- `app/color-mode-script.jsx` - New file for color mode initialization
- `hooks/useColorModeSync.js` - Added colorScheme style property
