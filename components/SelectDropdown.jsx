"use client";

import { Select, Portal } from "@chakra-ui/react";

/**
 * SelectDropdown - A reusable select dropdown component that properly overlays
 *
 * This component wraps Chakra UI's Select with the correct structure to ensure
 * dropdowns overlay content instead of pushing it down.
 *
 * @param {Object} props
 * @param {Object} props.collection - Chakra UI collection created with createListCollection
 * @param {Array} props.value - Current selected value(s) as array
 * @param {Function} props.onValueChange - Callback when value changes: ({ value }) => void
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.size - Size variant (sm, md, lg)
 * @param {string|Object} props.w - Width
 * @param {string|Object} props.width - Width (alternative)
 * @param {boolean} props.showIndicator - Show checkmark indicator on selected items (default: false)
 * @param {boolean} props.inModal - Set to true when used inside a modal/dialog (default: false)
 * @param {Object} props.triggerProps - Additional props for Select.Trigger
 * @param {Object} props.contentProps - Additional props for Select.Content
 * @param {Function} props.renderItem - Custom render function for items: (item) => ReactNode
 * @param {Object} ...rest - Other props passed to Select.Root
 */
export const SelectDropdown = ({
  collection,
  value,
  onValueChange,
  placeholder = "Select...",
  size,
  w,
  width,
  showIndicator = false,
  inModal = false,
  triggerProps = {},
  contentProps = {},
  renderItem,
  ...rest
}) => {
  const positionerContent = (
    <Select.Positioner zIndex={inModal ? 2000 : undefined}>
      <Select.Content {...contentProps}>
        {collection.items.map(item => (
          <Select.Item key={item.value} item={item}>
            {renderItem ? renderItem(item) : item.label}
            {showIndicator && <Select.ItemIndicator />}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Positioner>
  );

  return (
    <Select.Root
      collection={collection}
      value={value}
      onValueChange={onValueChange}
      size={size}
      w={w}
      width={width}
      {...rest}
    >
      <Select.HiddenSelect />
      <Select.Control>
        <Select.Trigger {...triggerProps}>
          <Select.ValueText placeholder={placeholder} />
        </Select.Trigger>
        {showIndicator && (
          <Select.IndicatorGroup>
            <Select.Indicator />
          </Select.IndicatorGroup>
        )}
      </Select.Control>
      {inModal ? (
        // When in modal, don't use Portal - render in place
        positionerContent
      ) : (
        // When not in modal, use Portal to render at root level
        <Portal>{positionerContent}</Portal>
      )}
    </Select.Root>
  );
};
