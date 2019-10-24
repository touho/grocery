import React from 'react'
import AppContext from './context/AppContext'
import { Mic } from './components/icons/Mic'
import { AddToCart } from './components/icons/AddToCart'
import { Clear } from './components/icons/Clear'
export default function FunctionButtons() {
  return (
    <AppContext.Consumer>
      {({
        startRecording,
        stopRecording,
        clearList,
        finalItems,
        sluState,
        addToCart
      }) => (
        <footer>
          <div>
            <Clear
              disabled={!(finalItems && finalItems.length)}
              onClear={clearList}
            />
          </div>
          <div>
            <Mic
              onMouseUp={event => stopRecording(event)}
              onMouseDown={event => startRecording(event)}
              sluState={sluState}
            />
          </div>
          <div>
            <AddToCart
              disabled={!(finalItems && finalItems.length)}
              onAdd={addToCart}
            />
          </div>
        </footer>
      )}
    </AppContext.Consumer>
  )
}
