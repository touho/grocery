import React from "react";
import { ProductsListItem } from "./ProductsListItem";
export const listItemBackgroundStyle = imageUrl => {
  return {
    backgroundImage: `url(${imageUrl})`,
    backgroundPosition: "center",
    backgroundSize: "110px",
    width: "75px",
    height: "75px"
  };
};
export function ResultsListItem({
  item,
  isSelected,
  onItemSelected,
  onItemRemove,
  onItemDecrease,
  onItemIncrease,
  onItemFocused
}) {
  const { transcript, selectedProduct } = item;

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
      />
    )
  );
}
