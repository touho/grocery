import React from "react";
export const AddToCart = ({ onAdd, disabled }) => (
  <button
    disabled={disabled}
    onClick={() => {
      if (
        window.confirm(
          "This will add your items to your cart and redirect. Are you sure?"
        )
      ) {
        onAdd();
      }
    }}
    className="function-button function-button__small"
  >
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
      <path d="M4 2h16l-3 9H4a1 1 0 1 0 0 2h13v2H4a3 3 0 0 1 0-6h.33L3 5 2 2H0V0h3a1 1 0 0 1 1 1v1zm1 18a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm10 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
    </svg>
  </button>
);
