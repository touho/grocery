import React from 'react'
import classNames from 'classnames'

export const Back = ({ onBack, disabled }) => {
  const className = classNames(
    'function-button',
    'function-button__small',
    {
      'function-button__active': !disabled
    }
  )
  return (
    <button
      className={className}
      disabled={disabled}
      onClick={onBack}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
        <polygon
          points="3.828 9 9.899 2.929 8.485 1.515 0 10 .707 10.707 8.485 18.485 9.899 17.071 3.828 11 20 11 20 9 3.828 9"
          aria-hidden="true"
          tabIndex="0"
        />
      </svg>
    </button>
  )
}
