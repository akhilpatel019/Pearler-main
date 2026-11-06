/* global SideDrawer */

class CartDrawer extends SideDrawer {
  connectedCallback() {
    this.bindEvents();
  }

  bindEvents() {
    this.openDrawerViaEventHandler = this.handleDrawerOpenViaEvent.bind(this);
    this.closeDrawerViaEventHandler = this.close.bind(this, null);
    document.addEventListener('dispatch:cart-drawer:open', this.openDrawerViaEventHandler);
    document.addEventListener('dispatch:cart-drawer:close', this.closeDrawerViaEventHandler);
    document.addEventListener('dispatch:cart-drawer:refresh', this.cartRefreshHandler);
    this.addEventListener('on:cart-drawer:before-open', () => {
      this.syncEmptyState();
      theme.manuallyLoadImages(this);
      this.querySelectorAll('cc-cart-cross-sell').forEach((el) => el.init());
      window.initAllNwCartRecs?.(this);
    });
    this.addEventListener('on:cart:after-merge', () => {
      this.syncEmptyState();
      theme.manuallyLoadImages(this);
      this.querySelectorAll('cc-cart-cross-sell').forEach((el) => el.init());
      window.initAllNwCartRecs?.(this);
    });
  }

  disconnectedCallback() {
    document.removeEventListener('dispatch:cart-drawer:refresh', this.cartRefreshHandler);
    document.removeEventListener('dispatch:cart-drawer:open', this.openDrawerViaEventHandler);
    document.removeEventListener('dispatch:cart-drawer:close', this.closeDrawerViaEventHandler);
  }

  /**
   * Toggle cart-drawer--empty on the drawer root (merge does not update this element).
   */
  syncEmptyState() {
    const itemList = this.querySelector('.cart-item-list');
    const isEmpty = itemList?.classList.contains('cart-item-list--empty') ?? true;
    this.classList.toggle('cart-drawer--empty', isEmpty);
  }

  /**
   * Handle when the drawer is opened via an event
   * @param {object} evt - Event object.
   */
  handleDrawerOpenViaEvent(evt) {
    this.open(evt.detail ? evt.detail.opener : null);
  }

  /**
   * Trigger refresh of contents
   */
  cartRefreshHandler() {
    this.querySelector('cart-form').refresh();
  }

  /**
   * Update section's cart-form element with new contents
   * @param {string} html - Whole-section HTML.
   */
  updateFromCartChange(html) {
    this.querySelector('cart-form').refreshFromHtml(html);
  }
}

window.customElements.define('cart-drawer', CartDrawer);
