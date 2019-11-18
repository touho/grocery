import React from 'react'

const Onboarding = props => (
  <div
    className={`onboarding ${
      props.step === 1 ? 'onboarding--long' : ''
    }`}
  >
    {props.step === 1 && (
      <>
        <h1>Hi there!</h1>
        <div>You can speak to this app, here’s how:</div>
        <div>
          <em>Press and hold</em> the mic icon or hold the spacebar
        </div>
        <div>
          While holding, <em>speak your items as a list</em> to the
          mic:
        </div>
        <div className="italic">”apples, oranges, potato chips”</div>
        <div>
          The cart icon will add your items to your SuperValu trolley
        </div>
        <div>Enjoy shopping!</div>
      </>
    )}
    {props.step === 2 && <h1>Speak...</h1>}
  </div>
)

export default Onboarding
