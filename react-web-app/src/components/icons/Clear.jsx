import React from "react";
export const Clear = ({ onClear, disabled }) => (
  <button
    className="function-button function-button__small"
    disabled={disabled}
    onClick={() => {
      if (window.confirm("This will clear your list. Are you sure?")) {
        onClear();
      }
    }}
  >
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
      <path d="M10 8.586L2.929 1.515 1.515 2.929 8.586 10l-7.071 7.071 1.414 1.414L10 11.414l7.071 7.071 1.414-1.414L11.414 10l7.071-7.071-1.414-1.414L10 8.586z" />
    </svg>
  </button>
);
