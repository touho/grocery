import React from "react";
import AppContext from "../context/AppContext";
import { ResultsListItem } from "./ResultsListItem";
import { ProductsListItem } from "./ProductsListItem";
export default function ResultsList() {
  return (
    <main>
      <AppContext.Consumer>
        {({
          finalItems,
          currentInterimItem,
          focusedItem,
          toggleItemSubView,
          subViewOpen,
          subViewItem,
          subViewItemSelected,
          onItemRemove,
          onItemDecrease,
          onItemIncrease,
          onItemFocused
        }) => {
          const listClass = `results  ${
            subViewOpen ? "results--transitionoffset" : ""
          }`;
          const subViewClass = `subview  ${
            !subViewOpen ? "subview--transitionoffset" : ""
          }`;
          return (
            <>
              <div className={listClass}>
                <div className={"results--list"}>
                  {[currentInterimItem, ...finalItems]
                    .filter(Boolean)
                    .map(listItem => (
                      <ResultsListItem
                        key={listItem.queryId}
                        isSelected={
                          focusedItem &&
                          listItem.queryId === focusedItem.queryId
                        }
                        item={listItem}
                        onItemFocused={() => onItemFocused(listItem)}
                        onItemRemove={() => onItemRemove(listItem)}
                        onItemDecrease={() => onItemDecrease(listItem)}
                        onItemIncrease={() => onItemIncrease(listItem)}
                        onItemSelected={() => toggleItemSubView(listItem)}
                      />
                    ))}
                </div>
              </div>
              <div className={subViewClass}>
                {subViewItem && (
                  <div>
                    {subViewItem.products.map(product => (
                      <ProductsListItem
                        isSelectedProduct={
                          subViewItem.selectedProduct.productid ===
                          product.productid
                        }
                        key={product.productid}
                        product={product}
                        onItemFocused={() => subViewItemSelected(product)}
                        onItemRemove={onItemRemove}
                        onItemDecrease={onItemDecrease}
                        onItemIncrease={onItemIncrease}
                        onItemSelected={() => subViewItemSelected(product)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          );
        }}
      </AppContext.Consumer>
    </main>
  );
}
