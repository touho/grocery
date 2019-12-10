import React from 'react'

const getProductImages = product => {
  let productImages = {}
  if (product) {
    productImages = {
      image: product.imageUrl
    }
    product.images &&
      product.images.forEach(productImage => {
        productImages[productImage.type] = productImage.url
      })
  }
  return productImages
}

export const ProductInfo = ({ product }) => {
  let productImageUrls = getProductImages(product)
  return (
    <div className="subview__product-info">
      <picture>
        <source media="(min-width: 400px)" srcset={productImageUrls.large} />
        <img src={productImageUrls.imageUrl} alt="" />
      </picture>
      <div className="subview__product-info__text">
        <h1>{product.displayText}</h1>
        <p>
          {product.amount} {product.unitName}
        </p>
      </div>
    </div>
  )
}
