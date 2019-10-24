import React, { Component } from 'react'
import { AppContextProvider } from './context/AppContext'
import './App.scss'
import Header from './Header'
import FunctionButtons from './FunctionButtons'
import ResultsList from './components/ResultsList'
import * as SLUFunctions from './sg'
class App extends Component {
  render() {
    return (
      <AppContextProvider sluContext={SLUFunctions.slu()}>
        <div className="app">
          <Header />
          <ResultsList />
          <FunctionButtons />
        </div>
      </AppContextProvider>
    )
  }
}

export default App
