import React from "react";
import { listItemBackgroundStyle } from "./ResultsListItem";
import { Trash } from "./icons/Trash";
export function ProductsListItem({
  product,
  transcript,
  onItemSelected,
  onItemFocused,
  onItemDecrease,
  onItemIncrease,
  onItemRemove,
  showFunctions = false,
  isSelected = false,
  isSelectedProduct = false
}) {
  const {
    amount = "",
    displayText = "",
    measureName = "",
    imageUrl,
    productID
  } = product;
  return (
    product && (
      <li
        className={`list-item ${
          isSelectedProduct ? "list-item--selected" : ""
        }`}
        key={productID}
      >
        <div
          className="list-item-main"
          onClick={event => {
            if (
              event.target.className !== "" &&
              event.target.className !== "list-item-open-functions"
            ) {
              onItemSelected(product);
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
              <div className="list-item__info--utterance">{transcript}</div>
            )}
            <div className={"list-item__info--title"}>{displayText}</div>
          </div>
          <div className="list-item__quantity">
            {showFunctions && (
              <button
                className="list-item-open-functions"
                onClick={event => {
                  if (event.target.className === "list-item-open-functions") {
                    onItemFocused(event);
                  }
                }}
              >
                {amount} {measureName}
              </button>
            )}
          </div>
        </div>

        <div
          className={`list-item-functions ${
            isSelected ? "list-item-functions__selected" : ""
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
  );
}
