import React from 'react'
import { ProductsListItem } from './ProductsListItem'
export const listItemBackgroundStyle = imageUrl => {
  return {
    backgroundImage: `url(${imageUrl})`
  }
}
const ResultsListItem = ({
  item,
  isSelected,
  isHovered,
  onItemSelected,
  onItemRemove,
  onItemDecrease,
  onItemIncrease,
  onItemFocused,
  onItemHovered,
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
        onItemHovered={onItemHovered}
        onItemFocused={() => onItemFocused()}
        isSelected={isSelected}
        isHoveredProduct={isHovered}
        showFunctions={true}
        isActiveUtterance={isActiveUtterance}
      />
    )
  )
}

export default ResultsListItem
