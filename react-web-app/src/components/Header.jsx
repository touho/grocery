import React, { Component } from 'react'
import { RecordingWave } from './icons/RecordingWave'
import Logo from '../assets/logo.jpg'
import { SLU_STATE } from '../sg'
import classNames from 'classnames'
export default class Header extends Component {
  constructor(props) {
    super(props)
    this.state = { sluState: SLU_STATE.notConnected, connecting: false }
  }
  componentDidUpdate(prevProps) {
    if (prevProps.sluState !== this.props.sluState) {
      this.setState({ connecting: true })
      if (this.props.sluState === SLU_STATE.recording) {
        setTimeout(() => {
          this.setState({ sluState: this.props.sluState, connecting: false })
        }, 700)
      } else {
        this.setState({ sluState: this.props.sluState, connecting: false })
      }
    }
  }

  render() {
    const { sluState, connecting } = this.state
    const waveClassName = classNames('header__logo', {
      'header__logo--passive': connecting,
      'header__logo--active':
        (connecting && sluState !== 'Recording') || sluState === 'Recording'
    })
    const logoClassName = classNames('header__logo', {
      'header__logo--active': !connecting && sluState !== 'Recording'
    })
    return (
      <header className="header">
        <div>
          <img src={Logo} alt="" className={logoClassName} />
          <RecordingWave className={waveClassName}>
            {connecting && (
              <span className="header__logo__connecting">Connecting...</span>
            )}
          </RecordingWave>
        </div>
        <div></div>
      </header>
    )
  }
}
