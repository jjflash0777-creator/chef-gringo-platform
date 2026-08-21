"use client";

import { useState } from "react";

/**
 * Semantically real checkbox for GET forms. React 19 treats a `value` without
 * `onChange` as read-only, which made filter checkboxes appear inert. This
 * keeps native form submission (name/value/checked) while remaining operable.
 */
export function FormCheckbox({
  name,
  value,
  defaultChecked = false,
  labelledBy,
}: {
  name: string;
  value: string;
  defaultChecked?: boolean;
  labelledBy?: string;
}) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <input
      type="checkbox"
      name={name}
      value={value}
      checked={checked}
      onChange={(event) => setChecked(event.target.checked)}
      aria-checked={checked}
      aria-labelledby={labelledBy}
    />
  );
}
