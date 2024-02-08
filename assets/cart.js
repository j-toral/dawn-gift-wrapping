// Getting the amount of gift wrapping needed as well as the current amount of gift wrap in the cart from the template
let amountOfGiftWrapNeeded = document.currentScript.getAttribute('giftWrapAmountNeeded');
let giftWrapAmount = document.currentScript.getAttribute('giftWrapAmount');

class CartRemoveButton extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('click', (event) => {
      event.preventDefault();
      const cartItems = this.closest('cart-items') || this.closest('cart-drawer-items');

      const giftWrapElement = document.getElementById(`Quantity-${this.dataset.index}`);

      // Sending in the new values of null, whether the item is gift wrapped, and the old quantity
      cartItems.updateLineItem(
        this.dataset.index,
        0,
        null,
        giftWrapElement.dataset.giftWrap,
        giftWrapElement.dataset.currentQuantity
      );
    });
  }
}

customElements.define('cart-remove-button', CartRemoveButton);

class CartItems extends HTMLElement {
  constructor() {
    super();
    this.lineItemStatusElement =
      document.getElementById('shopping-cart-line-item-status') || document.getElementById('CartDrawer-LineItemStatus');

    const debouncedOnChange = debounce((event) => {
      this.onChange(event);
    }, ON_CHANGE_DEBOUNCE_TIMER);

    this.addEventListener('change', debouncedOnChange.bind(this));

    // Call updateGiftWrap on initialisation
    this.updateGiftWrap(giftWrapAmount, amountOfGiftWrapNeeded);
  }

  cartUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.cartUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.cartUpdate, (event) => {
      if (event.source === 'cart-items') {
        return;
      }
      this.onCartUpdate();
    });
  }

  disconnectedCallback() {
    if (this.cartUpdateUnsubscriber) {
      this.cartUpdateUnsubscriber();
    }
  }

  onChange(event) {
    // If statement to only determine a change when the quantity changes
    // Writting in a textarea counts as a change event
    if (event.target.id === `Quantity-${event.target.dataset.index}`) {
      // Sending in the new values of whether the item is gift wrapped, and the old quantity
      this.updateLineItem(
        event.target.dataset.index,
        event.target.value,
        document.activeElement.getAttribute('name'),
        event.target.dataset.giftWrap,
        event.target.dataset.currentQuantity
      );
    }
  }

  // Function to add gift wrap to the cart using the previous and new quantity and init to determine whether it is first DOM load
  updateGiftWrap(previousQuantity, newQuantity) {
    // Setting the variant ID for the gift wrap
    let variantID = '[ENTER VARIANT ID HERE]';

    // Calculating the total gift wrap needed
    // By adding the new quantity minus the previous quantity to the amount needed
    amountOfGiftWrapNeeded = parseInt(amountOfGiftWrapNeeded) + parseInt(newQuantity) - parseInt(previousQuantity);

    // Creating an object that holds the data for the gift wrap as well as the sections that need reloading
    const body = JSON.stringify({
      id: variantID,
      quantity: amountOfGiftWrapNeeded,
      sections: this.getSectionsToRender().map((section) => section.section),
      sections_url: window.location.pathname,
    });

    // Creating a state variable that fetches the change to the gift wrap quantity as well as the
    // section html change
    const state = fetch(`${routes.cart_change_url}`, {
      ...fetchConfig(),
      ...{ body },
    })
      .then((response) => {
        if (response.status == 200) {
          // Changing the gift wrap amount to the current gift wrap amount
          giftWrapAmount = amountOfGiftWrapNeeded;
        }

        return response.text();
      })
      .then((state) => {
        // returning the html code
        return state;
      })
      .catch((e) => {
        console.error(e);
      });

    // returning the html code
    return state;
  }

  onCartUpdate() {
    if (this.tagName === 'CART-DRAWER-ITEMS') {
      fetch(`${routes.cart_url}?section_id=cart-drawer`)
        .then((response) => response.text())
        .then((responseText) => {
          const html = new DOMParser().parseFromString(responseText, 'text/html');
          const selectors = ['cart-drawer-items', '.cart-drawer__footer'];
          for (const selector of selectors) {
            const targetElement = document.querySelector(selector);
            const sourceElement = html.querySelector(selector);
            if (targetElement && sourceElement) {
              targetElement.replaceWith(sourceElement);
            }
          }
        })
        .catch((e) => {
          console.error(e);
        });
    } else {
      fetch(`${routes.cart_url}?section_id=main-cart-items`)
        .then((response) => response.text())
        .then((responseText) => {
          const html = new DOMParser().parseFromString(responseText, 'text/html');
          const sourceQty = html.querySelector('cart-items');
          this.innerHTML = sourceQty.innerHTML;
        })
        .catch((e) => {
          console.error(e);
        });
    }
  }

  getSectionsToRender() {
    return [
      {
        id: 'main-cart-items',
        section: document.getElementById('main-cart-items').dataset.id,
        selector: '.js-contents',
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section',
      },
      {
        id: 'cart-live-region-text',
        section: 'cart-live-region-text',
        selector: '.shopify-section',
      },
      {
        id: 'main-cart-footer',
        section: document.getElementById('main-cart-footer').dataset.id,
        selector: '.js-contents',
      },
    ];
  }

  // Pulled out the render for loop from updateLineItem and made it it's own function
  renderSection(parsedState) {
    this.getSectionsToRender().forEach((section) => {
      const elementToReplace =
        document.getElementById(section.id).querySelector(section.selector) || document.getElementById(section.id);
      elementToReplace.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.section], section.selector);
    });
  }

  // Adding a boolean gift wrap value as well as the current quantity value
  // Changing the updateQuantity to updateLineItem and adding a newGiftMessage that defaults to undefined
  // Adding data when updating the properties of a line item
  updateLineItem(line, quantity, name, hasGiftWrap, currentQuantity, newGiftMessage = undefined, data) {
    this.enableLoading(line);

    // Making the body
    let body = {
      line,
      quantity,
      sections: this.getSectionsToRender().map((section) => section.section),
      sections_url: window.location.pathname,
    };

    // If statement that remakes the body object to hold the new gift message
    if (newGiftMessage || newGiftMessage == '') {
      // Adding the properties from data
      body = {
        line,
        quantity,
        properties: { ...data[line - 1].properties },
        sections: this.getSectionsToRender().map((section) => section.section),
        sections_url: window.location.pathname,
      };

      // Updating the Gift message
      body.properties['Gift Message'] = newGiftMessage;
    }

    fetch(`${routes.cart_change_url}`, {
      ...fetchConfig(),
      body: JSON.stringify(body),
    })
      .then((response) => {
        let state = response.text();

        // If the change is successfull and the line item has gift wrapping it gets new html code from the
        // gift wrap function to parse
        // Adding another condition to not run when the quanity is not changing
        console.log(hasGiftWrap);
        console.log(quantity);
        console.log(currentQuantity);

        if (response.status === 200 && hasGiftWrap && quantity !== currentQuantity) {
          state = this.updateGiftWrap(currentQuantity, quantity);
        }

        return state;
      })
      .then((state) => {
        const parsedState = JSON.parse(state);
        const quantityElement =
          document.getElementById(`Quantity-${line}`) || document.getElementById(`Drawer-quantity-${line}`);
        const items = document.querySelectorAll('.cart-item');

        if (parsedState.errors) {
          quantityElement.value = quantityElement.getAttribute('value');
          this.updateLiveRegions(line, parsedState.errors);
          return;
        }

        this.classList.toggle('is-empty', parsedState.item_count === 0);
        const cartDrawerWrapper = document.querySelector('cart-drawer');
        const cartFooter = document.getElementById('main-cart-footer');

        if (cartFooter) cartFooter.classList.toggle('is-empty', parsedState.item_count === 0);
        if (cartDrawerWrapper) cartDrawerWrapper.classList.toggle('is-empty', parsedState.item_count === 0);

        // Calling the renderSection function
        this.renderSection(parsedState);

        const updatedValue = parsedState.items[line - 1] ? parsedState.items[line - 1].quantity : undefined;
        let message = '';
        if (items.length === parsedState.items.length && updatedValue !== parseInt(quantityElement.value)) {
          if (typeof updatedValue === 'undefined') {
            message = window.cartStrings.error;
          } else {
            message = window.cartStrings.quantityError.replace('[quantity]', updatedValue);
          }
        }
        this.updateLiveRegions(line, message);

        const lineItem =
          document.getElementById(`CartItem-${line}`) || document.getElementById(`CartDrawer-Item-${line}`);
        if (lineItem && lineItem.querySelector(`[name="${name}"]`)) {
          cartDrawerWrapper
            ? trapFocus(cartDrawerWrapper, lineItem.querySelector(`[name="${name}"]`))
            : lineItem.querySelector(`[name="${name}"]`).focus();
        } else if (parsedState.item_count === 0 && cartDrawerWrapper) {
          trapFocus(cartDrawerWrapper.querySelector('.drawer__inner-empty'), cartDrawerWrapper.querySelector('a'));
        } else if (document.querySelector('.cart-item') && cartDrawerWrapper) {
          trapFocus(cartDrawerWrapper, document.querySelector('.cart-item__name'));
        }

        publish(PUB_SUB_EVENTS.cartUpdate, { source: 'cart-items', cartData: parsedState, variantId: variantId });
      })
      .catch(() => {
        this.querySelectorAll('.loading__spinner').forEach((overlay) => overlay.classList.add('hidden'));
        const errors = document.getElementById('cart-errors') || document.getElementById('CartDrawer-CartErrors');
        errors.textContent = window.cartStrings.error;
      })
      .finally(() => {
        this.disableLoading(line);
      });
  }

  updateLiveRegions(line, message) {
    const lineItemError =
      document.getElementById(`Line-item-error-${line}`) || document.getElementById(`CartDrawer-LineItemError-${line}`);
    if (lineItemError) lineItemError.querySelector('.cart-item__error-text').innerHTML = message;

    this.lineItemStatusElement.setAttribute('aria-hidden', true);

    const cartStatus =
      document.getElementById('cart-live-region-text') || document.getElementById('CartDrawer-LiveRegionText');
    cartStatus.setAttribute('aria-hidden', false);

    setTimeout(() => {
      cartStatus.setAttribute('aria-hidden', true);
    }, 1000);
  }

  getSectionInnerHTML(html, selector) {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
  }

  enableLoading(line) {
    const mainCartItems = document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
    mainCartItems.classList.add('cart__items--disabled');

    const cartItemElements = this.querySelectorAll(`#CartItem-${line} .loading__spinner`);
    const cartDrawerItemElements = this.querySelectorAll(`#CartDrawer-Item-${line} .loading__spinner`);

    [...cartItemElements, ...cartDrawerItemElements].forEach((overlay) => overlay.classList.remove('hidden'));

    document.activeElement.blur();
    this.lineItemStatusElement.setAttribute('aria-hidden', false);
  }

  disableLoading(line) {
    const mainCartItems = document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
    mainCartItems.classList.remove('cart__items--disabled');

    const cartItemElements = this.querySelectorAll(`#CartItem-${line} .loading__spinner`);
    const cartDrawerItemElements = this.querySelectorAll(`#CartDrawer-Item-${line} .loading__spinner`);

    cartItemElements.forEach((overlay) => overlay.classList.add('hidden'));
    cartDrawerItemElements.forEach((overlay) => overlay.classList.add('hidden'));
  }
}

customElements.define('cart-items', CartItems);

if (!customElements.get('cart-note')) {
  customElements.define(
    'cart-note',
    class CartNote extends HTMLElement {
      constructor() {
        super();

        this.addEventListener(
          'input',
          debounce((event) => {
            const body = JSON.stringify({ note: event.target.value });
            fetch(`${routes.cart_update_url}`, { ...fetchConfig(), ...{ body } });
          }, ON_CHANGE_DEBOUNCE_TIMER)
        );
      }
    }
  );
}

// Custom Element to handle the changing of the gift message
class EditGiftWrap extends HTMLElement {
  constructor() {
    super();

    // Keyup event listener
    this.addEventListener('keyup', (event) => {
      // Sending the new value to the update method
      this.updateCharacterCount(event.target.value.length);
    });

    // Click event listener
    this.addEventListener('click', (event) => {
      event.preventDefault();

      // If statement when the anchor tag is clicked
      if (event.target.id === `editGiftMessage-${this.dataset.index}`) {
        // Calling the show element method and passing the html element
        this.showElement(document.getElementById(`giftMessageDiv-${this.dataset.index}`));
        // If statement when the edit button is clicked
      } else if (event.target.id === `messageButton-${this.dataset.index}`) {
        // Calling the handleMessage method and passing the html element
        this.handleMessage(document.getElementById(`giftMessage-${this.dataset.index}`));
      }
    });
  }

  updateCharacterCount(newAmount) {
    const current = this.querySelector('.textareaCurrentCount');

    current.innerText = newAmount;
  }

  // Toggle's the hidden class for the text area container
  showElement(element) {
    element.classList.toggle('tw-hidden');

    let count = element.querySelector('textarea').value.length;

    this.updateCharacterCount(count);

    // Hiding the absolutely position button
    element.querySelector('#giftMessageContainer').classList.add('tw-flex');
    element.querySelector('#giftMessageContainer').classList.remove('tw-hidden');
  }

  // Calling the get properties function and setting the element to hidden
  handleMessage(element) {
    this.getProperties(element);

    // Toggles the hidden class for the text area container
    element.parentNode.classList.toggle('tw-hidden');

    // Hiding the absolutely position button
    this.querySelector('#giftMessageContainer').classList.add('tw-hidden');
    this.querySelector('#giftMessageContainer').classList.remove('tw-flex');
  }

  // Function to use the cart url to get the cart
  getProperties(element) {
    fetch(`${routes.cart_url}.js`, {
      method: 'GET',
    })
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        // Calling the update message function and passing the cart items and elements
        this.updateMessage(element, data.items);
      })
      .catch((error) => {
        console.error('Error:', error);
      });
  }

  // Method to call the updateLineItem and passing the items array and new message
  updateMessage(element, data) {
    // Getting the cartItems custome element to call the correct function
    const cartItems = this.closest('cart-items') || this.closest('cart-drawer-items');

    // Calling the updateLineItem and passing the variables including the value of the textarea
    cartItems.updateLineItem(
      this.dataset.index,
      this.dataset.quantity,
      document.activeElement.getAttribute('name'),
      true,
      this.dataset.quantity,
      element.value,
      data
    );
  }
}

// Defining the element
customElements.define('edit-gift-wrap', EditGiftWrap);
