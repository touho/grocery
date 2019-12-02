import React, { Component } from 'react'
import AppContext, { AppContextProvider } from './context/AppContext'
import './App.scss'
import Header from './components/Header'
import FunctionButtons from './components/FunctionButtons'
import ResultsList from './components/ResultsList'
import * as SLUFunctions from './sg'
export default class App extends Component {
  render() {
    return (
      <AppContextProvider sluContext={SLUFunctions.slu()}>
        <div className="app">
          <AppContext.Consumer>
            {({ sluState }) => <Header sluState={sluState} />}
          </AppContext.Consumer>
          <ResultsList />
          <FunctionButtons />
        </div>
      </AppContextProvider>
    )
  }
}
