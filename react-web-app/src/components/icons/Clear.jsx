import React from 'react'
import classNames from 'classnames'

export const Clear = ({ onClear, disabled }) => {
  const className = classNames(
    'function-button',
    'function-button__small',
    'function-button__mic',
    {
      'function-button__active': !disabled
    }
  )
  return (
    <div
      className={className}
      disabled={disabled}
      onClick={() => {
        if (window.confirm('This will clear your list. Are you sure?')) {
          onClear()
        }
      }}
    >
      <object>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 20">
          <path
            fill="none"
            fill-rule="nonzero"
            stroke-width="1.1"
            className="stroke"
            d="M15.523 4.45c-.073-.002-.073-.012-.073-.075V2.917c0-.424-.19-.7-.307-.7H10.75l-.128-.371-.336-.975C10.21.648 10.1.55 10.039.55H5.957c-.062 0-.169.097-.244.322l-.464 1.345H.857c-.117 0-.307.276-.307.7v1.458c0 .074 0 .075-.121.075H15.54zm-1.08 2.1H1.557l.74 11.775c.04.631.567 1.125 1.204 1.125h8.998c.637 0 1.164-.494 1.205-1.125l.739-11.775z"
          />
        </svg>
      </object>
    </div>
  )
}
