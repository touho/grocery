import React from 'react'
import AppContext from './context/AppContext'
import { Mic } from './components/icons/Mic'
import { AddToCart } from './components/icons/AddToCart'
import { Clear } from './components/icons/Clear'
import { Back } from './components/icons/Back'
export default function FunctionButtons() {
  return (
    <AppContext.Consumer>
      {({
        startRecording,
        stopRecording,
        clearList,
        finalItems,
        sluState,
        addToCart,
        subViewOpen,
        toggleItemSubView
      }) => (
        <footer>
          <div>
            {subViewOpen ? (
              <Back
                disabled={!(finalItems && finalItems.length)}
                onBack={() => toggleItemSubView(null)}
              />
            ) : (
              <Clear
                disabled={!(finalItems && finalItems.length)}
                onClear={clearList}
              />
            )}
          </div>
          <div>
            <Mic
              onUp={event => stopRecording(event)}
              onDown={event => startRecording(event)}
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
