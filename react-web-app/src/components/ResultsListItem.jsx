import React from 'react'
import ProductsListItem from './ProductsListItem'
export const listItemBackgroundStyle = imageUrl => {
  return {
    backgroundImage: `url(${imageUrl})`
  }
}
const ResultsListItem = ({
  item,
  isSelected,
  onItemSelected,
  onItemRemove,
  onItemDecrease,
  onItemIncrease,
  onItemFocused,
  isActiveUtterance
}) => {
  const { transcript, selectedProduct } = item

  return (
    selectedProduct && (
      <ProductsListItem
        product={selectedProduct}
        transcript={transcript}
        onItemRemove={onItemRemove}
        onItemDecrease={onItemDecrease}
        onItemIncrease={onItemIncrease}
        onItemSelected={onItemSelected}
        onItemFocused={() => onItemFocused()}
        isSelected={isSelected}
        showFunctions={true}
        isActiveUtterance={isActiveUtterance}
      />
    )
  )
}

export default ResultsListItem
