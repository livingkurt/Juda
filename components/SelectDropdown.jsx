"use client";

import { Select } from "@mantine/core";

/**
 * SelectDropdown - A reusable select dropdown component using Mantine Select
 *
 * @param {Object} props
 * @param {Array} props.data - Array of { value, label } objects
 * @param {string} props.value - Current selected value (string)
 * @param {Function} props.onChange - Callback when value changes: (value) => void
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.size - Size variant (xs, sm, md, lg, xl)
 * @param {string|Object} props.w - Width
 * @param {string|Object} props.width - Width (alternative)
 * @param {boolean} props.searchable - Enable search/filter (default: false)
 * @param {Object} ...rest - Other props passed to Mantine Select
 */
export const SelectDropdown = ({
  data = [],
  value,
  onChange,
  placeholder = "Select...",
  size,
  w,
  width,
  searchable = false,
  ...rest
}) => {
  return (
    <Select
      data={data}
      value={value !== null && value !== undefined ? String(value) : null}
      onChange={onChange}
      placeholder={placeholder}
      size={size}
      w={w || width}
      searchable={searchable}
      {...rest}
    />
  );
};
