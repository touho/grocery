import React from 'react'
import classNames from 'classnames'
import { SLU_STATE } from './../../sg'

// As we need to prevent browser default behavior on touch start/event events, we need to do some tricky stuff
// because of: https://github.com/facebook/react/issues/8968

// https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#Safely_detecting_option_support
let passiveSupported = false
try {
  const options = {
    get passive() {
      // This function will be called when the browser
      //   attempts to access the passive property.
      passiveSupported = true
      return passiveSupported
    }
  }

  window.addEventListener('test', options, options)
  window.removeEventListener('test', options, options)
} catch (err) {
  passiveSupported = false
}

export class Mic extends React.Component {
  constructor(props) {
    super(props)
    this.down = props.onDown
    this.up = props.onUp
    this.rootDiv = React.createRef()

    document.onkeydown = e => this.spaceBar(e, this.down)
    document.onkeyup = e => this.spaceBar(e, this.up)
  }

  spaceBar = (e, cb) => {
    e = e || window.event

    if (e.keyCode == '32' && !e.repeat) {
      cb(e)
    }
  }

  componentDidMount() {
    const addEventListener = (event, fn) =>
      this.rootDiv.current.addEventListener(
        event,
        fn,
        passiveSupported ? { passive: false } : false
      )
    addEventListener('touchstart', this.down)
    addEventListener('touchend', this.up)
    addEventListener('mousedown', this.down)
    addEventListener('mouseup', this.up)
  }

  componentWillUnmount() {
    this.rootDiv.current.removeEventListener('touchstart', this.down)
    this.rootDiv.current.removeEventListener('touchend', this.up)
    this.rootDiv.current.removeEventListener('mousedown', this.down)
    this.rootDiv.current.removeEventListener('mouseup', this.up)
  }

  render() {
    const className = classNames(
      'function-button',
      'function-button__small',
      'function-button__mic',
      {
        'function-button__active':
          this.props.sluState === SLU_STATE.ready ||
          this.props.sluState === SLU_STATE.recording
      },
      {
        'function-button__active-pressed':
          this.props.sluState === SLU_STATE.recording
      }
    )
    return (
      <div className={className} ref={this.rootDiv}>
        <object>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            tabIndex="0"
            viewBox="0 0 20 20"
          >
            <path d="M9 18v-1.06A8 8 0 0 1 2 9h2a6 6 0 1 0 12 0h2a8 8 0 0 1-7 7.94V18h3v2H6v-2h3zM6 4a4 4 0 1 1 8 0v5a4 4 0 1 1-8 0V4z" />
          </svg>
        </object>
      </div>
    )
  }
}
