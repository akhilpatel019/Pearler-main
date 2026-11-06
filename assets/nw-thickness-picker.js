if (!customElements.get('nw-thickness-picker')) {
  class NwThicknessPicker extends HTMLElement {
    connectedCallback() {
      this.buttons = [...this.querySelectorAll('[data-thickness-value]')];
      if (this.buttons.length === 0) return;

      this.buttons.forEach((btn) => {
        btn.addEventListener('click', this.handleButtonClick.bind(this));
      });
    }

    getActiveSizeContext() {
      const sizeLinks = document.querySelector('.nw-product-size-links[data-active-size]');
      if (sizeLinks?.dataset.activeSize === 'men') {
        return 'men';
      }
      if (sizeLinks?.dataset.activeSize === 'women') {
        return 'women';
      }
      return this.dataset.sizeContext === 'men' ? 'men' : 'women';
    }

    getProductUrl(btn) {
      const activeSize = this.getActiveSizeContext();
      if (activeSize === 'men') {
        return btn.dataset.mensUrl || '';
      }
      return btn.dataset.womensUrl || '';
    }

    handleButtonClick(evt) {
      const btn = evt.currentTarget;
      if (btn.classList.contains('is-active') || btn.disabled) return;

      const url = this.getProductUrl(btn);
      if (!url) return;

      if (window.nwPdpProductSwitch?.switchProduct) {
        window.nwPdpProductSwitch.switchProduct(url, { pushState: true });
        return;
      }

      const variantPicker = document.querySelector('product-form.js-product variant-picker');
      if (variantPicker?.switchProduct) {
        variantPicker.switchProduct(url, { pushState: true });
      }
    }
  }

  customElements.define('nw-thickness-picker', NwThicknessPicker);
}
