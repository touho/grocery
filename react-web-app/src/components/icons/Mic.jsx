import React from "react";
import classNames from "classnames";
import { SLU_STATE } from "./../../sg";

export const Mic = ({ onMouseUp, onMouseDown, sluState }) => {
  const className = classNames(
    "function-button",
    {
      "function-button__active":
        sluState === SLU_STATE.ready || sluState === SLU_STATE.recording
    },
    {
      "function-button__active-pressed": sluState === SLU_STATE.recording
    }
  );
  return (
    <button
      className={className}
      onMouseUp={onMouseUp}
      onMouseDown={onMouseDown}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
        <path d="M9 18v-1.06A8 8 0 0 1 2 9h2a6 6 0 1 0 12 0h2a8 8 0 0 1-7 7.94V18h3v2H6v-2h3zM6 4a4 4 0 1 1 8 0v5a4 4 0 1 1-8 0V4z" />
      </svg>
    </button>
  );
};
