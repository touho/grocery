import React from 'react'
import AppContext from './context/AppContext'
import { RecordingWave } from './components/icons/RecordingWave'
import Logo from './SuperValu_Logo.jpg'
export default function Header() {
  return (
    <AppContext.Consumer>
      {({ sluState }) => (
        <header className="header">
          <div>
            <img
              src={Logo}
              alt=""
              className={`header__logo ${
                sluState !== 'Recording' ? 'header__logo--active' : ''
              }`}
            />
            <RecordingWave
              className={`header__logo ${
                sluState === 'Recording' ? 'header__logo--active' : ''
              }`}
            />
          </div>
          <div></div>
        </header>
      )}
    </AppContext.Consumer>
  )
}
