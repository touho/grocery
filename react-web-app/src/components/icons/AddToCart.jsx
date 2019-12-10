import React from 'react'
import classNames from 'classnames'

export const AddToCart = ({ onAdd, disabled }) => {
  const className = classNames('function-button', 'function-button__small', {
    'function-button__active': !disabled
  })
  return (
    <div
      disabled={disabled}
      onClick={() => {
        if (window.confirm('Add these items to your trolley?')) {
          onAdd()
        }
      }}
      className={className}
    >
      <object>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 24">
          <g fill-rule="evenodd">
            <path d="M14.703 20.2a1.54 1.54 0 1 0 0 3.082 1.54 1.54 0 0 0 0-3.082zm-10.1-9.729l11.458-.138-2.814 4.72h-6.48l-2.164-4.582zm8.943 5.637a.528.528 0 0 0 .453-.257l3.45-5.786a.529.529 0 0 0 .004-.533c-.095-.165-.289-.284-.462-.264l-12.884.155-.858-1.817a.529.529 0 0 0-.478-.302H.527a.527.527 0 1 0 0 1.055h1.91l.858 1.813.005.014 2.504 5.295c-.992 1.07-1.414 2.022-1.243 2.831.153.716.734 1.114 1.054 1.236.06.024.125.036.189.036h10.36a.527.527 0 1 0 0-1.055H5.928a.692.692 0 0 1-.336-.445c-.053-.273.032-.889 1.07-1.976h6.885zM6.513 20.2a1.54 1.54 0 1 0 0 3.08 1.54 1.54 0 0 0 0-3.08z" />
            <path d="M11.406 0c.2 0 .361.162.361.36v3.93h1.552a.36.36 0 0 1 .256.616l-3.348 3.336a.36.36 0 0 1-.512 0L6.367 4.906a.361.361 0 0 1 .256-.615h1.551V.36c0-.2.163-.361.362-.361h2.87z" />
          </g>
        </svg>
      </object>
    </div>
  )
}
