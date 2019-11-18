import React from 'react'

export default function Onboarding() {
  return (
    <div className="onboarding">
      <h1>Hi there!</h1>
      <div>You can speak to this app, here’s how:</div>
      <div>
        <em>Press and hold</em> the mic icon or hold the spacebar
      </div>
      <div>
        While holding, <em>speak your items as a list</em> to the mic:
      </div>
      <div className="italic">”apples, oranges, potato chips”</div>
      <div>
        The cart icon will add your items to your ShopValu trolley
      </div>
      <div>Enjoy shopping!</div>
    </div>
  )
}
