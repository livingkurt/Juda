"use client";

import { useEffect } from "react";

export function MobileZoomFix() {
  useEffect(() => {
    // Inject style tag to prevent mobile auto-zoom on form inputs
    const styleId = "mobile-zoom-fix";
    if (document.getElementById(styleId)) {
      return; // Already injected
    }

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @media (max-width: 768px) {
        /* Prevent iOS Safari auto-zoom by using 16px font-size on inputs */
        /* No transform scaling - just use 16px directly */

        /* Chakra UI Input field */
        [data-part='field'] {
          font-size: 16px !important;
        }

        /* Chakra UI Select trigger (excluding tabs) */
        [data-part='trigger']:not([data-scope='tabs']) {
          font-size: 16px !important;
        }

        /* Native HTML form elements */
        input[type='text'],
        input[type='email'],
        input[type='password'],
        input[type='number'],
        input[type='tel'],
        input[type='url'],
        input[type='search'],
        input[type='date'],
        input[type='time'],
        input[type='datetime-local'],
        input:not([type]),
        textarea,
        select {
          font-size: 16px !important;
        }

        /* ProseMirror contenteditable (for notes editor) */
        .ProseMirror[contenteditable='true'] {
          font-size: 16px !important;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      // Cleanup on unmount
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  return null;
}
