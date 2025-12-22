# Chakra UI v3 Theme Restoration

## Overview

After upgrading from Chakra UI v2 to v3, the application lost its distinctive theme styling, including:
- Blue-gray tones in dark mode
- Proper badge colors (red, orange, purple, green, blue)
- Button color schemes
- Overall visual consistency

This document describes how we restored the Chakra v2 theme appearance in v3.

## Problem

Chakra UI v3 introduced several breaking changes:

1. **Color Palette Changes**: Default color values changed from blue-gray tones to neutral grays
2. **API Changes**: `colorScheme` prop renamed to `colorPalette`
3. **Theme System**: New `createSystem` API requires different configuration structure
4. **Recipe System**: Components now use "recipes" for variant styling instead of component themes

## Solution

### 1. Extended Theme Configuration in `app/providers.jsx`

We created a comprehensive theme system that overrides Chakra v3 defaults with v2 values:

#### Color Token Overrides

```javascript
tokens: {
  colors: {
    gray: {
      // Chakra v2 blue-gray values
      800: { value: "#1A202C" },
      900: { value: "#171923" },
      // ... all other shades
    },
    blue: {
      // Chakra v2 blue palette
      500: { value: "#3182CE" },
      // ... all shades
    },
    red: { /* v2 values */ },
    orange: { /* v2 values */ },
    purple: { /* v2 values */ },
    green: { /* v2 values */ },
  }
}
```

#### Semantic Tokens

Added semantic tokens for consistent theming across light/dark modes:

```javascript
semanticTokens: {
  colors: {
    "bg.canvas": {
      value: { _light: "{colors.gray.50}", _dark: "{colors.gray.900}" }
    },
    "bg.surface": {
      value: { _light: "{colors.white}", _dark: "{colors.gray.800}" }
    },
    "fg.default": {
      value: { _light: "{colors.gray.900}", _dark: "{colors.gray.100}" }
    },
    // ... more semantic tokens
  }
}
```

#### Component Recipes

Added custom recipes for Badge and Button components to restore v2 styling:

**Badge Recipe:**
```javascript
badge: {
  base: {
    fontWeight: "bold",
    fontSize: "xs",
    textTransform: "uppercase",
    letterSpacing: "wider",
  },
  variants: {
    colorPalette: {
      blue: {
        bg: { _light: "blue.100", _dark: "blue.800" },
        color: { _light: "blue.800", _dark: "blue.100" },
      },
      red: { /* similar structure */ },
      orange: { /* similar structure */ },
      purple: { /* similar structure */ },
      green: { /* similar structure */ },
    }
  }
}
```

**Button Recipe:**
```javascript
button: {
  base: {
    fontWeight: "semibold",
    borderRadius: "md",
    transition: "all 0.2s",
  },
  variants: {
    variant: {
      solid: {
        bg: { _light: "blue.500", _dark: "blue.600" },
        color: "white",
        _hover: {
          bg: { _light: "blue.600", _dark: "blue.700" },
        },
      },
      outline: {
        bg: "transparent",
        borderWidth: "1px",
        _hover: {
          bg: { _light: "gray.100", _dark: "gray.700" },
        },
      },
      ghost: {
        bg: "transparent",
        _hover: {
          bg: { _light: "gray.100", _dark: "gray.700" },
        },
      },
    }
  }
}
```

**IconButton Recipe:**
```javascript
iconButton: {
  base: {
    borderRadius: "md",
    transition: "all 0.2s",
  },
  variants: {
    variant: {
      solid: { /* same as button */ },
      outline: {
        bg: "transparent",
        borderWidth: "1px",
        _hover: {
          bg: { _light: "gray.100", _dark: "gray.700" },
        },
      },
      ghost: {
        bg: "transparent",
        _hover: {
          bg: { _light: "gray.100", _dark: "gray.700" },
        },
      },
    }
  },
  defaultVariants: {
    variant: "ghost", // IconButtons default to ghost
  }
}
```

### 2. Updated All Component Files

Changed all instances of `colorScheme` to `colorPalette` throughout the codebase:

**Files Updated:**
- `components/TaskItem.jsx` - Badge components for overdue, recurring, and "no time" indicators
- `components/BacklogDrawer.jsx` - Badge and IconButton components
- `components/DateNavigation.jsx` - Badge components for past/future dates
- `components/TaskDialog.jsx` - Button components for day selection
- `components/TagSelector.jsx` - Button and IconButton components
- `components/TagFilter.jsx` - Button components
- `components/SectionDialog.jsx` - Button components for icon selection
- `components/LoginForm.jsx` - Button components
- `components/RegisterForm.jsx` - Button components
- `components/ForgotPasswordForm.jsx` - Button components
- `components/DashboardView.jsx` - Badge components in tables
- `app/page.jsx` - Badge and Button components throughout main app

**Example Change:**
```javascript
// Before (Chakra v2)
<Badge colorScheme="red">Overdue</Badge>
<Button colorScheme="blue">Save</Button>

// After (Chakra v3)
<Badge colorPalette="red">Overdue</Badge>
<Button colorPalette="blue">Save</Button>
```

## Visual Results

### Dark Mode
- ✅ Background: `#171923` (blue-gray navy tone)
- ✅ Cards: `#1A202C` (blue-gray card background)
- ✅ Text: `#EDF2F7` (light gray)
- ✅ Badges: Proper color contrast with background
- ✅ Buttons: Blue tones with proper hover states

### Light Mode
- ✅ Background: `#F7FAFC` (light gray)
- ✅ Cards: `#FFFFFF` (white)
- ✅ Text: `#1A202C` (dark gray)
- ✅ Badges: Proper color contrast
- ✅ Buttons: Blue tones with proper hover states

### Badge Colors
- 🔴 Red: Overdue tasks, delete actions
- 🟠 Orange: No time set, past dates
- 🟣 Purple: Recurring tasks
- 🔵 Blue: Task counts, future dates, primary actions
- 🟢 Green: Completion stats

### Button Variants
- **Solid**: Filled background with white text
- **Outline**: Border with transparent background
- **Ghost**: No border, transparent background with hover effect

## Key Differences from Chakra v2

1. **API Change**: `colorScheme` → `colorPalette`
2. **Configuration**: Must explicitly define color palettes in theme
3. **Recipes**: Component styling uses recipe system instead of component themes
4. **Semantic Tokens**: Better support for light/dark mode with semantic tokens

## Migration Checklist

When migrating other Chakra v2 apps to v3:

- [ ] Override color tokens with v2 hex values
- [ ] Add semantic tokens for consistent theming
- [ ] Create component recipes for Badge, Button, etc.
- [ ] Replace all `colorScheme` with `colorPalette`
- [ ] Test both light and dark modes
- [ ] Verify badge colors render correctly
- [ ] Verify button hover/active states work
- [ ] Check color contrast for accessibility

## Files Modified

### Theme Configuration
- `app/providers.jsx` - Complete theme system with tokens, semantic tokens, and recipes

### Component Updates (colorScheme → colorPalette)
- `components/TaskItem.jsx`
- `components/BacklogDrawer.jsx`
- `components/DateNavigation.jsx`
- `components/TaskDialog.jsx`
- `components/TagSelector.jsx`
- `components/TagFilter.jsx`
- `components/SectionDialog.jsx`
- `components/LoginForm.jsx`
- `components/RegisterForm.jsx`
- `components/ForgotPasswordForm.jsx`
- `components/DashboardView.jsx`
- `app/page.jsx`

## Testing

After these changes, verify:

1. ✅ Dark mode shows blue-gray tones (not neutral gray)
2. ✅ Light mode shows proper light gray background
3. ✅ All badges display with correct colors
4. ✅ Buttons have proper hover and active states
5. ✅ Color mode toggle works instantly
6. ✅ No console errors or warnings
7. ✅ All interactive elements maintain accessibility

## Future Considerations

1. **Custom Color Palettes**: Can add more color schemes by extending the `colorPalette` variants
2. **Component Recipes**: Can customize other components (Input, Select, etc.) using the same recipe pattern
3. **Semantic Tokens**: Can add more semantic tokens for specific use cases
4. **Theme Variants**: Can create multiple theme presets (e.g., "ocean", "forest", "sunset")

## References

- [Chakra UI v3 Migration Guide](https://www.chakra-ui.com/docs/get-started/migration)
- [Chakra UI v3 Theming](https://www.chakra-ui.com/docs/theming/overview)
- [Chakra UI v2 Default Theme](https://v2.chakra-ui.com/docs/styled-system/theme)

