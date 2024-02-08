# Dawn 13.0.0 with Gift Wrapping

[Getting Repo](https://github.com/Shopify/dawn)

## Requirements
 - Shopify Store
 - Virtual Product called with a title and sku that can be put into the necessary theme files
 - Basic knowledge of Theme editing
 - Variant ID of the virtual product

## Steps
 - Create a virtual product that will hold the price of the gift wrapping
 - Go to cart.js file and find the updateGiftWrap method and replace "[ENTER VARIANT ID HERE]" with the virtual product variant ID.
 - Go to product-form.js and find the addGiftWrap method and replace '[ENTER VARIANT ID HERE]' with the virtual product variant ID as an integer.
 - Go to main-cart-items.liquid and replace "[ENTER GIFT WRAP SKU HERE]" in the giftWrapSku to the correct SKU for the virtual product.
 - Start development store using "shopify theme dev" and add the gift wrap block to the Product Information area
 - Test whether the code is pulling in the gift wrap product to the cart correctly.
 - Upload the theme to your store and provide gift wrapping to your customers.
 - If some products have free gift wrapping, select the free gift wrapping checkbox in the Gift Wrapping Block.

## Disclaimers
 - This code does not work with express checkout as express checkout bypasses the product-form.js functions and takes you directly to the cart.

## License

Copyright (c) 2021-present Shopify Inc. See [LICENSE](/LICENSE.md) for further details.
