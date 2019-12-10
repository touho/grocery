import React from 'react'
import { listItemBackgroundStyle } from './ResultsListItem'
import { Trash } from './icons/Trash'
import classNames from 'classnames'
export default function ProductsListItem({
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
  const { amount = '', displayText = '', unitName = '', images, productID } = product
  const mediumImages = images && images.filter(image => image.type === 'medium')
  const imageUrl = mediumImages ? mediumImages[0].url : product.imageUrl
  const itemClassName = classNames(
    'list-item',
    {
      'list-item--selected': isSelectedProduct
    },
    {
      'list-item--hovered': isHoveredProduct && !isSelectedProduct
    }
  )

  const utteranceClassName = classNames('list-item__info--utterance', {
    'list-item__info--utterance--active': isActiveUtterance
  })
  return (
    product && (
      <li className={itemClassName} key={productID}>
        <div
          className="list-item-main"
          onMouseOver={event => {
            if (onItemHovered && event.target.className !== 'list-item-open-functions') {
              onItemHovered(product)
            }
          }}
          onClick={event => {
            if (
              event.target.className !== '' &&
              event.target.className.indexOf('list-item__quantity') < 0
            ) {
              onItemSelected(product)
            }
          }}
        >
          <ProductItemImage
            listItemBackgroundStyle={listItemBackgroundStyle}
            imageUrl={imageUrl}
          />
          <div className="list-item__info">
            {transcript && <div className={utteranceClassName}>{transcript}</div>}
            <div className={'list-item__info--title'}>{displayText}</div>
          </div>
          <ProductItemQuantity
            showFunctions={showFunctions}
            onItemFocused={onItemFocused}
            amount={amount}
            unitName={unitName}
          />
        </div>
        <ProductItemFunctions
          isSelected={isSelected}
          onItemRemove={onItemRemove}
          onItemDecrease={onItemDecrease}
          onItemIncrease={onItemIncrease}
        />
      </li>
    )
  )
}

const ProductItemImage = ({ listItemBackgroundStyle, imageUrl }) => (
  <div className="list-item-img">
    <div
      className="list-item-img__bg"
      alt="product"
      style={listItemBackgroundStyle(imageUrl)}
    />
  </div>
)

const ProductItemFunctions = ({
  isSelected,
  onItemRemove,
  onItemDecrease,
  onItemIncrease
}) => (
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
)

const ProductItemQuantity = ({ showFunctions, onItemFocused, amount, unitName }) => (
  <div className="list-item__quantity">
    {showFunctions && (
      <button
        className="list-item__quantity"
        onClick={event => {
          if (event.target.className.indexOf('list-item__quantity' === 0)) {
            onItemFocused(event)
          }
        }}
      >
        <div className="list-item__quantity--title">{amount}</div>
        <div className="list-item__quantity--secondary">{unitName}</div>
      </button>
    )}
  </div>
)
