import React from 'react'
import AppContext from '../context/AppContext'
import ResultsListItem from './ResultsListItem'
import { ProductsListItem } from './ProductsListItem'
import { SLU_STATE } from '../sg'
import Onboarding from './Onboarding'
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
            const showOnboarding =
              !currentInterimItems.length && !finalItems.length
            const listClass = `results ${
              subViewOpen ? 'results--transitionoffset' : ''
            } ${showOnboarding ? 'hidden' : ''}`
            const subViewClass = `subview ${
              !subViewOpen ? 'subview--transitionoffset' : ''
            }`
            const infoProduct =
              hoveredProduct ||
              (subViewItem && subViewItem.selectedProduct)
            if (sluState === 'Recording') {
              this.rootDiv.current.scrollTop = 0
            }
            return (
              <>
                {showOnboarding && (
                  <Onboarding
                    step={sluState !== 'Recording' ? 1 : 2}
                  />
                )}
                <div className={listClass} ref={this.rootDiv}>
                  <ul className={'results--list'}>
                    {[...currentInterimItems, ...finalItems]
                      .filter(Boolean)
                      .map((listItem, index) => (
                        <ResultsListItem
                          key={listItem.queryId}
                          isSelected={
                            focusedItem &&
                            listItem.queryId === focusedItem.queryId
                          }
                          isHovered={
                            hoveredProduct &&
                            listItem.selectedProduct &&
                            listItem.selectedProduct.ean ===
                              hoveredProduct.ean
                          }
                          item={listItem}
                          onItemFocused={() =>
                            onItemFocused(listItem)
                          }
                          onItemRemove={() => onItemRemove(listItem)}
                          onItemDecrease={() =>
                            onItemDecrease(listItem)
                          }
                          onItemIncrease={() =>
                            onItemIncrease(listItem)
                          }
                          onItemSelected={() =>
                            toggleItemSubView(listItem)
                          }
                          onItemHovered={() =>
                            onItemHovered(listItem.selectedProduct)
                          }
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
                      <div className="subview__product-info">
                        <img src={infoProduct.imageUrl} alt="" />
                        <div className="subview__product-info__text">
                          <h1>{infoProduct.displayText}</h1>
                          <p>
                            {infoProduct.amount}{' '}
                            {infoProduct.unitName}
                          </p>
                        </div>
                      </div>
                      <ul>
                        {subViewItem.products.map(product => (
                          <ProductsListItem
                            isSelectedProduct={
                              subViewItem.selectedProduct.ean ===
                              product.ean
                            }
                            isHoveredProduct={
                              hoveredProduct &&
                              hoveredProduct.ean === product.ean
                            }
                            key={product.ean}
                            product={product}
                            onItemFocused={() =>
                              subViewItemSelected(product)
                            }
                            onItemRemove={onItemRemove}
                            onItemDecrease={onItemDecrease}
                            onItemIncrease={onItemIncrease}
                            onItemSelected={() =>
                              subViewItemSelected(product)
                            }
                            onItemHovered={() =>
                              onItemHovered(product)
                            }
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
