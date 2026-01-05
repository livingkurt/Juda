import { createContext, useContext } from "react";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";

/**
 * Context to pass spacing values from container to items
 */
const GridContext = createContext({
  rowSpacing: 0,
  columnSpacing: 0,
});

/**
 * GLGrid - A Grid component that replicates the original MUI v5 Grid behavior
 * This component uses flexbox-based layout with the classic container/item API
 *
 * @param {boolean} container - If true, renders as a flex container
 * @param {boolean} item - If true, renders as a flex item
 * @param {number|string} spacing - Spacing between items (in theme.spacing units)
 * @param {number|string} rowSpacing - Row spacing override
 * @param {number|string} columnSpacing - Column spacing override
 * @param {number|string|boolean} xs - Column width at xs breakpoint (0-12, true, or "auto")
 * @param {number|string|boolean} sm - Column width at sm breakpoint (0-12, true, or "auto")
 * @param {number|string|boolean} md - Column width at md breakpoint (0-12, true, or "auto")
 * @param {number|string|boolean} lg - Column width at lg breakpoint (0-12, true, or "auto")
 * @param {number|string|boolean} xl - Column width at xl breakpoint (0-12, true, or "auto")
 * @param {string} direction - Flex direction: "row" | "row-reverse" | "column" | "column-reverse"
 * @param {string} wrap - Flex wrap: "nowrap" | "wrap" | "wrap-reverse"
 * @param {string} justifyContent - Flex justify-content
 * @param {string} alignItems - Flex align-items
 * @param {string} alignContent - Flex align-content
 * @param {boolean} zeroMinWidth - If true, sets min-width: 0
 * @param {object} sx - Additional MUI sx prop styles
 */
const GLGrid = ({
  container = false,
  item = false,
  spacing = 0,
  rowSpacing: rowSpacingProp,
  columnSpacing: columnSpacingProp,
  xs,
  sm,
  md,
  lg,
  xl,
  direction = "row",
  wrap = "wrap",
  justifyContent,
  alignItems,
  alignContent,
  zeroMinWidth = false,
  sx = {},
  children,
  component = "div",
  ref,
  ...rest
}) => {
  const theme = useTheme();
  const parentContext = useContext(GridContext);

  // Convert spacing value to theme spacing
  const getSpacingValue = value => {
    if (value === undefined || value === null) return 0;
    if (typeof value === "number") return value;
    return parseFloat(value) || 0;
  };

  // Calculate column width based on grid value (out of 12)
  const getColumnWidth = value => {
    if (value === undefined || value === null || value === false) return undefined;
    if (value === true) return { flexGrow: 1, flexBasis: 0, maxWidth: "100%" };
    if (value === "auto") return { flexGrow: 0, flexBasis: "auto", maxWidth: "none", width: "auto" };
    if (value === 0) return { display: "none" };
    const width = `${(value / 12) * 100}%`;
    return { flexGrow: 0, flexBasis: width, maxWidth: width };
  };

  // Build responsive styles for item
  const buildResponsiveStyles = () => {
    const styles = {};

    // xs is the base (no media query needed)
    const xsStyles = getColumnWidth(xs);
    if (xsStyles) {
      Object.assign(styles, xsStyles);
    }

    // sm breakpoint
    if (sm !== undefined) {
      const smStyles = getColumnWidth(sm);
      if (smStyles) {
        styles[theme.breakpoints.up("sm")] = smStyles;
      }
    }

    // md breakpoint
    if (md !== undefined) {
      const mdStyles = getColumnWidth(md);
      if (mdStyles) {
        styles[theme.breakpoints.up("md")] = mdStyles;
      }
    }

    // lg breakpoint
    if (lg !== undefined) {
      const lgStyles = getColumnWidth(lg);
      if (lgStyles) {
        styles[theme.breakpoints.up("lg")] = lgStyles;
      }
    }

    // xl breakpoint
    if (xl !== undefined) {
      const xlStyles = getColumnWidth(xl);
      if (xlStyles) {
        styles[theme.breakpoints.up("xl")] = xlStyles;
      }
    }

    return styles;
  };

  // Calculate effective spacing values for container
  const effectiveRowSpacing = getSpacingValue(rowSpacingProp !== undefined ? rowSpacingProp : spacing);
  const effectiveColumnSpacing = getSpacingValue(columnSpacingProp !== undefined ? columnSpacingProp : spacing);

  // Build container styles
  const buildContainerStyles = () => {
    const halfRowSpacing = effectiveRowSpacing / 2;
    const halfColumnSpacing = effectiveColumnSpacing / 2;

    return {
      display: "flex",
      flexWrap: wrap,
      flexDirection: direction,
      boxSizing: "border-box",
      // Use negative margin to compensate for item padding
      margin: theme.spacing(-halfRowSpacing, -halfColumnSpacing),
      width: `calc(100% + ${theme.spacing(effectiveColumnSpacing)})`,
      ...(justifyContent && { justifyContent }),
      ...(alignItems && { alignItems }),
      ...(alignContent && { alignContent }),
    };
  };

  // Build item styles using context from parent or own spacing
  const buildItemStyles = () => {
    // Use parent context spacing if available, otherwise use own spacing props
    const rowSpacingToUse = item && !container ? parentContext.rowSpacing : effectiveRowSpacing;
    const columnSpacingToUse = item && !container ? parentContext.columnSpacing : effectiveColumnSpacing;

    const halfRowSpacing = rowSpacingToUse / 2;
    const halfColumnSpacing = columnSpacingToUse / 2;

    return {
      boxSizing: "border-box",
      padding: theme.spacing(halfRowSpacing, halfColumnSpacing),
      ...(zeroMinWidth && { minWidth: 0 }),
      ...buildResponsiveStyles(),
    };
  };

  // Combine all styles
  const combinedSx = {
    ...(container && buildContainerStyles()),
    ...(item && buildItemStyles()),
    ...sx,
  };

  // Create context value for children
  const contextValue = container
    ? {
        rowSpacing: effectiveRowSpacing,
        columnSpacing: effectiveColumnSpacing,
      }
    : parentContext;

  const content = (
    <Box ref={ref} component={component} sx={combinedSx} {...rest}>
      {children}
    </Box>
  );

  // Wrap with context provider if this is a container
  if (container) {
    return <GridContext.Provider value={contextValue}>{content}</GridContext.Provider>;
  }

  return content;
};

GLGrid.displayName = "GLGrid";

export default GLGrid;
