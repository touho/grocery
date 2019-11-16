import React from 'react'
import { listItemBackgroundStyle } from './ResultsListItem'
import { Trash } from './icons/Trash'
import classNames from 'classnames'
export function ProductsListItem({
  product,
  transcript,
  onItemSelected,
  onItemHovered,
  onItemFocused,
  onItemDecrease,
  onItemIncrease,
  onItemRemove,
  showFunctions = false,
  isSelected = false,
  isSelectedProduct = false,
  isHoveredProduct = false,
  isActiveUtterance = false
}) {
  const {
    amount = '',
    displayText = '',
    unitName = '',
    imageUrl,
    productID
  } = product
  const itemClassName = classNames(
    'list-item',
    {
      'list-item--selected': isSelectedProduct
    },
    {
      'list-item--hovered': isHoveredProduct && !isSelectedProduct
    }
  )

  const utteranceClassName = classNames(
    'list-item__info--utterance',
    {
      'list-item__info--utterance--active': isActiveUtterance
    }
  )
  return (
    product && (
      <li className={itemClassName} key={productID}>
        <div
          className="list-item-main"
          onMouseOver={event => {
            if (
              onItemHovered &&
              event.target.className !== 'list-item-open-functions'
            ) {
              onItemHovered(product)
            }
          }}
          onClick={event => {
            console.log(event.target.className)
            if (
              event.target.className !== '' &&
              event.target.className.indexOf('list-item__quantity') <
                0
            ) {
              onItemSelected(product)
            }
          }}
        >
          <div className="list-item-img">
            <div
              className="list-item-img__bg"
              alt="product"
              style={listItemBackgroundStyle(imageUrl)}
            />
          </div>
          <div className="list-item__info">
            {transcript && (
              <div className={utteranceClassName}>{transcript}</div>
            )}
            <div className={'list-item__info--title'}>
              {displayText}
            </div>
          </div>
          <div className="list-item__quantity">
            {showFunctions && (
              <button
                className="list-item__quantity"
                onClick={event => {
                  if (
                    event.target.className.indexOf(
                      'list-item__quantity' === 0
                    )
                  ) {
                    onItemFocused(event)
                  }
                }}
              >
                <div className="list-item__quantity--title">
                  {amount}
                </div>
                <div className="list-item__quantity--secondary">
                  {unitName}
                </div>
              </button>
            )}
          </div>
        </div>
        <div
          className={`list-item__functions ${
            isSelected ? 'list-item__functions__selected' : ''
          }`}
        >
          <button onClick={onItemRemove}>
            <Trash />
          </button>
          <button onClick={onItemDecrease}>-</button>
          <button onClick={onItemIncrease}>+</button>
        </div>
      </li>
    )
  )
}
