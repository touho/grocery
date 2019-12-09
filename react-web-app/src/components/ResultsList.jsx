import React from 'react'
import AppContext from '../context/AppContext'
import ResultsListItem from './ResultsListItem'
import ProductsListItem from './ProductsListItem'
import { SLU_STATE } from '../sg'
import InfoContainer from './InfoContainer'
import ConversationHistory from './ConversationHistory'
import { ProductInfo } from './ProductInfo'

export default class ResultsList extends React.Component {
  render() {
    this.rootDiv = React.createRef()
    return (
      <main>
        <AppContext.Consumer>
          {({
            finalItems,
            currentInterimItems,
            focusedItem,
            toggleItemSubView,
            subViewOpen,
            subViewItem,
            subViewItemSelected,
            onItemRemove,
            onItemDecrease,
            onItemIncrease,
            onItemFocused,
            onItemHovered,
            hoveredProduct,
            sluState
          }) => {
            const noAudio = sluState === SLU_STATE.noAudioConsent
            const showOnboarding =
              !currentInterimItems.length && !finalItems.length && !noAudio
            const listClass = `results ${
              subViewOpen ? 'results--transitionoffset' : ''
            } ${showOnboarding || noAudio ? 'hidden' : ''}`
            const subViewClass = `subview ${
              !subViewOpen ? 'subview--transitionoffset' : ''
            }`
            const infoProduct =
              hoveredProduct || (subViewItem && subViewItem.selectedProduct)
            if (sluState === 'Recording') {
              this.rootDiv.current.scrollTop = 0
            }

            return (
              <>
                {noAudio && (
                  <InfoContainer>
                    <h1>This app requires mic audio</h1>
                    <p>
                      Refresh the page and give consent to the microphone to continue.
                    </p>
                  </InfoContainer>
                )}
                {showOnboarding &&
                  (sluState !== SLU_STATE.recording ? (
                    <ConversationHistory></ConversationHistory>
                  ) : (
                    <InfoContainer>
                      <h1>Speak...</h1>
                    </InfoContainer>
                  ))}
                <div className={listClass} ref={this.rootDiv}>
                  <ul className={'results--list'}>
                    {[...currentInterimItems, ...finalItems]
                      .filter(Boolean)
                      .map((listItem, index) => (
                        <ResultsListItem
                          key={listItem.queryId}
                          isSelected={
                            focusedItem && listItem.queryId === focusedItem.queryId
                          }
                          isHovered={
                            hoveredProduct &&
                            listItem.selectedProduct &&
                            listItem.selectedProduct.ean === hoveredProduct.ean
                          }
                          item={listItem}
                          onItemFocused={() => onItemFocused(listItem)}
                          onItemRemove={() => onItemRemove(listItem)}
                          onItemDecrease={() => onItemDecrease(listItem)}
                          onItemIncrease={() => onItemIncrease(listItem)}
                          onItemSelected={() => toggleItemSubView(listItem)}
                          onItemHovered={() => onItemHovered(listItem.selectedProduct)}
                          isActiveUtterance={
                            index === 0 &&
                            sluState === SLU_STATE.recording &&
                            listItem.type === 'interimItem'
                          }
                        />
                      ))}
                  </ul>
                </div>
                <div className={subViewClass}>
                  {subViewItem && (
                    <div className="subview__innercontainer">
                      <ProductInfo product={infoProduct} />
                      <ul>
                        {subViewItem.products.map(product => (
                          <ProductsListItem
                            isSelectedProduct={
                              subViewItem.selectedProduct.ean === product.ean
                            }
                            isHoveredProduct={
                              hoveredProduct && hoveredProduct.ean === product.ean
                            }
                            key={product.ean}
                            product={product}
                            onItemFocused={() => subViewItemSelected(product)}
                            onItemRemove={onItemRemove}
                            onItemDecrease={onItemDecrease}
                            onItemIncrease={onItemIncrease}
                            onItemSelected={() => subViewItemSelected(product)}
                            onItemHovered={() => onItemHovered(product)}
                          />
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </>
            )
          }}
        </AppContext.Consumer>
      </main>
    )
  }
}
