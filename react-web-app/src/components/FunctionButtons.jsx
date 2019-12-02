import React from 'react'
import AppContext from '../context/AppContext'
import { Mic } from './icons/Mic'
import { AddToCart } from './icons/AddToCart'
import { Clear } from './icons/Clear'
import { Back } from './icons/Back'
import { TapNotification } from './TapNotification'
export default function FunctionButtons() {
  return (
    <AppContext.Consumer>
      {({
        startSpeaking,
        stopSpeaking,
        clearList,
        finalItems,
        sluState,
        addToCart,
        subViewOpen,
        toggleItemSubView,
        isTapping
      }) => (
        <>
          <TapNotification isTapping={isTapping} />
          <footer>
            {subViewOpen ? (
              <Back
                disabled={!(finalItems && finalItems.length)}
                onBack={() => toggleItemSubView(null)}
              />
            ) : (
              <Clear disabled={!(finalItems && finalItems.length)} onClear={clearList} />
            )}
            <Mic
              onUp={event => stopSpeaking(event)}
              onDown={event => startSpeaking(event)}
              sluState={sluState}
            />
            <AddToCart disabled={!(finalItems && finalItems.length)} onAdd={addToCart} />
          </footer>
        </>
      )}
    </AppContext.Consumer>
  )
}
