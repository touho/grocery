import React from 'react'
import AppContext from './context/AppContext'

export default function Header() {
  return (
    <AppContext.Consumer>
      {() => <header></header>}
    </AppContext.Consumer>
  )
}
