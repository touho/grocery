import React, { Component } from 'react'
import { SLU_STATE } from './../sg'

const applySelectedProduct = (segments, type) =>
  segments.map(sg => {
    return {
      ...sg,
      type,
      selectedProduct: sg.products.length ? sg.products[0] : {}
    }
  })

const defaultState = {
  stopSpeaking: () => {},
  startSpeaking: () => {},
  toggleItemSubView: item => {},
  clearList: () => {},
  addToCart: () => {},
  sluContext: {},
  finalItems: [],
  currentInterimItems: [],
  sluState: SLU_STATE.notConnected,
  subViewItem: undefined,
  subViewOpen: false,
  focusedItem: undefined,
  hoveredProduct: undefined,
  recordButtonIsPressed: false,
  isTapping: false
}

const AppContext = React.createContext(defaultState)
class AppContextProvider extends Component {
  state = defaultState
  componentDidMount() {
    const itemsInStorageJSON = localStorage.getItem('items')
    if (itemsInStorageJSON) {
      const itemsInStorage = JSON.parse(itemsInStorageJSON)
      this.setState({ finalItems: itemsInStorage })
    }

    let sluContext = this.props.sluContext
    sluContext.onstatechange = this.onStateChange
    sluContext.onstatus = this.onStatus
    sluContext.ontranscription = this.onTranscription

    //Auto-start to ask for mic consent
    this.setState(
      {
        sluContext
      },
      () => this.startRecording()
    )
  }

  onStateChange = sluState => {
    this.setState({
      sluState
    })
  }

  onTranscription = data => {
    const { type, segments } = data
    if (type === 'interimItem') {
      this.setState({
        currentInterimItems: applySelectedProduct(segments, type).reverse()
      })
    } else if (type === 'finalItem') {
      const modifiedSegments = applySelectedProduct(segments, type).reverse()
      console.log('on transcript modified segments', modifiedSegments)
      const finalItemsModified = [...modifiedSegments, ...this.state.finalItems]
      localStorage.setItem('items', JSON.stringify(finalItemsModified))
      this.setState({
        finalItems: finalItemsModified,
        currentInterimItems: []
      })
    }
  }

  onStatus = status => {
    const { sluStatus, recordButtonIsPressed } = this.state
    if (sluStatus === status) {
      return
    }
    this.setState({ sluStatus: status }, () => {
      if (status == 'Ready' && recordButtonIsPressed) {
        let autoStartHandle = setInterval(() => {
          this.startRecording()
          clearInterval(autoStartHandle)
        }, 1000)
      }
    })
  }

  startRecording = event => {
    if (this.state.sluState === SLU_STATE.noAudioConsent) {
      return
    }
    try {
      this.state.sluContext.start(event)
      this.setState({
        subViewOpen: false
      })
    } catch (err) {
      console.error(err)
    }
  }

  startSpeaking = event => {
    this.toggleRecordButtonState(true, () => {
      this.startRecording(event)
    })
  }

  stopSpeaking = event => {
    this.toggleRecordButtonState(false)
    this.stopRecording(event)
    const { recordButtonIsPressedStarted, recordButtonIsPressedStopped } = this.state
    if (recordButtonIsPressedStarted && recordButtonIsPressedStopped) {
      this.setState({
        isTapping: recordButtonIsPressedStopped - recordButtonIsPressedStarted < 1000
      })
    }
  }

  toggleRecordButtonState = (recordButtonIsPressed, callback) => {
    this.setState(
      {
        isTapping: false,
        recordButtonIsPressed,
        recordButtonIsPressedStarted: recordButtonIsPressed
          ? new Date()
          : this.state.recordButtonIsPressedStarted,
        recordButtonIsPressedStopped: !recordButtonIsPressed
          ? new Date()
          : this.state.recordButtonIsPressedStopped
      },
      callback
    )
  }

  toggleItemSubView = item => {
    this.setState({
      subViewItem: item,
      subViewOpen: !this.state.subViewOpen
    })
  }

  stopRecording = event => {
    console.log('stopRecording', event)
    this.setState({
      subViewOpen: false
    })
    this.state.sluContext.stop(event)
  }

  clearList = () => {
    this.setState({ finalItems: [], subViewOpen: false })
    localStorage.removeItem('items')
  }

  addToCart = () => {
    const selectedProductIds = this.state.finalItems
      .map(({ selectedProduct: { ean, amount } }) => `${ean}=${amount}`)
      .join('&')

    let pathParts = document.location.pathname.split('/')
    pathParts[pathParts.length - 1] = 'checkout'
    window.open(`${pathParts.join('/')}?${selectedProductIds}`, 'new')
  }

  onItemRemove = item => {
    const modifiedList = this.state.finalItems.filter(
      finalItem => finalItem.queryId !== item.queryId
    )
    this.setState({
      finalItems: modifiedList,
      subViewItem: undefined
    })
  }

  onItemIncrease = item => this.modifyListItemWithOperation(item, 'increase')

  onItemDecrease = item => this.modifyListItemWithOperation(item, 'decrease')

  onItemFocused = item => {
    this.setState({
      focusedItem:
        this.state.focusedItem && this.state.focusedItem.queryId === item.queryId
          ? null
          : item //toggles or switches bbetween items
    })
  }

  onItemHovered = product => {
    this.setState({
      hoveredProduct: product
    })
  }

  subViewItemSelected = product => {
    let { subViewItem, finalItems } = this.state
    subViewItem.selectedProduct = product

    let subViewItemIndexInFinalItems = finalItems.findIndex(
      finalItem => finalItem.queryId === subViewItem.queryId
    )
    finalItems[subViewItemIndexInFinalItems] = subViewItem

    this.setState({
      finalItems,
      subViewOpen: !this.state.subViewOpen
    })
    localStorage.setItem('items', JSON.stringify(finalItems))
  }

  modifyListItemWithOperation(item, operation) {
    let modifiedItem = { ...item }
    switch (operation) {
      case 'increase':
        modifiedItem.selectedProduct.amount++
        break
      case 'decrease':
        if (modifiedItem.selectedProduct.amount > 0) {
          modifiedItem.selectedProduct.amount--
        }
        break
      default:
        break
    }
    let { focusedItem, finalItems } = this.state
    let modifiedItemIndexInFinalItems = finalItems.findIndex(
      finalItem => finalItem.queryId === focusedItem.queryId
    )
    finalItems[modifiedItemIndexInFinalItems] = modifiedItem
    this.setState({ finalItems })
  }

  render() {
    return (
      <AppContext.Provider
        value={{
          ...this.state,
          startSpeaking: this.startSpeaking,
          stopSpeaking: this.stopSpeaking,
          clearList: this.clearList,
          addToCart: this.addToCart,
          toggleItemSubView: this.toggleItemSubView,
          subViewItemSelected: this.subViewItemSelected,
          onItemFocused: this.onItemFocused,
          onItemRemove: this.onItemRemove,
          onItemDecrease: this.onItemDecrease,
          onItemIncrease: this.onItemIncrease,
          onItemHovered: this.onItemHovered
        }}
      >
        {this.props.children}
      </AppContext.Provider>
    )
  }
}

export default AppContext
export { AppContextProvider }
