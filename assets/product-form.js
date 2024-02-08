if (!customElements.get('product-form')) {
  customElements.define(
    'product-form',
    class ProductForm extends HTMLElement {
      constructor() {
        super();

        this.form = this.querySelector('form');
        this.form.querySelector('[name=id]').disabled = false;
        this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
        this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
        this.submitButton = this.querySelector('[type="submit"]');

        if (document.querySelector('cart-drawer')) this.submitButton.setAttribute('aria-haspopup', 'dialog');

        this.hideErrors = this.dataset.hideErrors === 'true';
      }

      onSubmitHandler(evt) {
        evt.preventDefault();
        if (this.submitButton.getAttribute('aria-disabled') === 'true') return;

        this.handleErrorMessage();

        this.submitButton.setAttribute('aria-disabled', true);
        this.submitButton.classList.add('loading');
        this.querySelector('.loading__spinner').classList.remove('hidden');

        const config = fetchConfig('javascript');
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        delete config.headers['Content-Type'];

        const formData = new FormData(this.form);
        if (this.cart) {
          formData.append(
            'sections',
            this.cart.getSectionsToRender().map((section) => section.id)
          );
          formData.append('sections_url', window.location.pathname);
          this.cart.setActiveElement(document.activeElement);
        }
        config.body = formData;

        const giftCheckbox = document.querySelector('#giftmessageselect input');
        const giftMessage = document.querySelector('#giftmessageoption textarea');

        if (giftCheckbox) {
          if (!giftCheckbox.checked && formData.has('properties[Gift Message]')) {
            formData.delete('properties[Gift Message]');
          }

          if (!giftCheckbox.checked && formData.has('properties[Gift Wrap]')) {
            formData.delete('properties[Gift Wrap]');
          }

          giftCheckbox.checked = false;

          giftToggle();
        }

        if (giftMessage) {
          giftMessage.value = '';
        }

        fetch(`${routes.cart_add_url}`, config)
          .then((response) => response.json())
          .then((response) => {
            if (response.status) {
              publish(PUB_SUB_EVENTS.cartError, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                errors: response.errors || response.description,
                message: response.message,
              });
              this.handleErrorMessage(response.description);

              const soldOutMessage = this.submitButton.querySelector('.sold-out-message');
              if (!soldOutMessage) return;
              this.submitButton.setAttribute('aria-disabled', true);
              this.submitButton.querySelector('span').classList.add('hidden');
              soldOutMessage.classList.remove('hidden');
              this.error = true;
              return;
            } else if (!this.cart) {
              window.location = window.routes.cart_url;
              return;
            }

            // Calling a add gift wrap function if the item has gift wrap
            if (formData.get('properties[Gift Wrap]') == 'Selected') {
              // Sending in the quantity of the item being added
              this.addGiftWrap(formData.get('quantity'));
            }

            if (!this.error)
              publish(PUB_SUB_EVENTS.cartUpdate, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                cartData: response,
              });
            this.error = false;
            const quickAddModal = this.closest('quick-add-modal');
            if (quickAddModal) {
              document.body.addEventListener(
                'modalClosed',
                () => {
                  setTimeout(() => {
                    this.cart.renderContents(response);
                  });
                },
                { once: true }
              );
              quickAddModal.hide(true);
            } else {
              this.cart.renderContents(response);
            }
          })
          .catch((e) => {
            console.error(e);
          })
          .finally(() => {
            this.submitButton.classList.remove('loading');
            if (this.cart && this.cart.classList.contains('is-empty')) this.cart.classList.remove('is-empty');
            if (!this.error) this.submitButton.removeAttribute('aria-disabled');
            this.querySelector('.loading__spinner').classList.add('hidden');
          });
      }

      // Takes the item quantity and builds a fetch request to add the gift wrap
      // as well
      addGiftWrap(quantity) {
        const giftWrapID = '[ENTER VARIANT ID HERE]';

        // Building the body of the fetch request
        let body = JSON.stringify({
          items: [
            {
              id: giftWrapID,
              quantity: parseInt(quantity),
            },
          ],
        });

        // Firing the fetch request to add the gift wrap
        fetch(`${routes.cart_add_url}`, { ...fetchConfig(), ...{ body } })
          .then((response) => {
            return response.json();
          })
          .catch((error) => {
            console.error('Error:', error);
          });
      }

      handleErrorMessage(errorMessage = false) {
        if (this.hideErrors) return;

        this.errorMessageWrapper =
          this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
        if (!this.errorMessageWrapper) return;
        this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');

        this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);

        if (errorMessage) {
          this.errorMessage.textContent = errorMessage;
        }
      }
    }
  );
}

// Moving the toggle of the text area to the js file
function giftToggle() {
  const gwSelector = document.getElementById('giftwrap');
  const gwMessage = document.getElementById('giftmessageoption');
  const gwSelect = document.getElementById('giftmessageselect');

  if (!gwSelector || !gwMessage || !gwSelect) {
    return;
  }

  if (gwSelector.checked == true) {
    gwMessage.classList.add('tw-flex');
    gwMessage.classList.remove('tw-hidden');
    gwSelect.classList.add('tw-mb-2');
  } else {
    gwMessage.classList.add('tw-hidden');
    gwMessage.classList.remove('tw-flex');
  }
}
