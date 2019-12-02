import React from 'react'
export const TapNotification = ({ isTapping }) => {
  return (
    <div className={`tap-notification ${isTapping ? 'tap-notification--active' : ''}`}>
      Please hold the button down.
    </div>
  )
}
