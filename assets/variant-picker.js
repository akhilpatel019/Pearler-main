/* eslint-disable max-len */
/**
 * Dependencies:
 * - Custom select component
 * - Fetch cache (theme.fetchCache)
 * - Quickbuy content transformer (theme.quickBuy.convertToQuickBuyContent)
 *
 * Required translation strings:
 * - noStock
 * - noVariant
 */

if (!customElements.get('variant-picker')) {
  class VariantPicker extends HTMLElement {
    constructor() {
      super();
      this.quickBuyContainer = this.closest('.js-quickbuy');
      this.featuredProductContainer = this.closest('.cc-featured-product');
      this.section = this.quickBuyContainer
                     || this.featuredProductContainer
                     || this.closest('.shopify-section');
      this.optionSelectors = this.querySelectorAll('.option-selector:not(.option-selector--custom)');
      this.productAvailable = this.classList.contains('variant-picker--product-available');
      this.variant = this.getVariantData();
      this.variantRequestId = 0;

      this.addListeners();
      this.updateVariantContent();
      if (!this.quickBuyContainer && !this.featuredProductContainer) {
        setTimeout(this.applyInitialVariantState.bind(this), 0);
      }
      this.setAttribute('loaded', '');
    }

    addListeners() {
      this.boundHandleVariantChange = this.handleVariantChange.bind(this);
      this.addEventListener('change', this.boundHandleVariantChange);

      this.boundHandleLabelMouseEnter = this.handleLabelMouseEnter.bind(this);
      this.querySelectorAll('.opt-label, .custom-select__option').forEach((el) => {
        el.addEventListener('mouseenter', this.boundHandleLabelMouseEnter);
        el.addEventListener('touchstart', this.boundHandleLabelMouseEnter, { passive: true, once: true });
        el.addEventListener('mouseleave', VariantPicker.handleLabelMouseLeave);
      });
    }

    removeListeners() {
      this.removeEventListener('change', this.boundHandleVariantChange);
      this.querySelectorAll('.opt-label, .custom-select__option').forEach((el) => {
        el.removeEventListener('mouseenter', this.boundHandleLabelMouseEnter);
        el.removeEventListener('touchstart', this.boundHandleLabelMouseEnter);
        el.removeEventListener('mouseleave', VariantPicker.handleLabelMouseLeave);
      });
    }

    /**
     * Update parts of this component that require JS to display correctly.
     */
    updateVariantContent() {
      this.updateStatusClasses();
      this.updateAddToCartButton();
      this.updateSwatchLabel();
      this.updateAvailability();
    }

    getProductForm() {
      const sectionForm = this.section?.querySelector('.js-product-form');
      if (sectionForm) return sectionForm;
      return this.closest('product-form')?.querySelector('.js-product-form') ?? null;
    }

    /**
     * Keep the product form variant id in sync with variant JSON (add to cart / checkout).
     */
    syncVariantIdInput() {
      const resolved = this.resolveVariantFromSelectedOptions();
      if (resolved) {
        this.variant = resolved;
        this.updateCurrentVariantJson(resolved);
      } else if (this.getSelectedOptions().indexOf(null) === -1) {
        this.variant = null;
      }

      const idInput = this.getProductForm()?.querySelector('input[name="id"]');
      if (!idInput) return;

      const variant = resolved ?? null;
      if (!variant?.id) {
        if (idInput.value !== '') {
          idInput.value = '';
          idInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return;
      }

      const variantId = String(variant.id);
      if (idInput.value !== variantId) {
        idInput.value = variantId;
        idInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    getProductVariantsData() {
      const dataEl = this.querySelector('script[data-product-variants]')
        || this.section?.querySelector('variant-picker script[data-product-variants]');
      if (!dataEl) return null;
      try {
        return JSON.parse(dataEl.textContent);
      } catch (err) {
        return null;
      }
    }

    resolveVariantFromSelectedOptions() {
      const variants = this.getProductVariantsData();
      const selectedOptions = this.getSelectedOptions();
      if (!variants?.length || selectedOptions.includes(null)) return null;

      return variants.find((variant) => selectedOptions.every((value, index) => {
        const optionValue = variant[`option${index + 1}`];
        return optionValue === value;
      })) || null;
    }

    updateCurrentVariantJson(variant) {
      if (!variant) return;
      let dataEl = this.querySelector('script[data-current-variant]');
      if (!dataEl) {
        dataEl = document.createElement('script');
        dataEl.type = 'application/json';
        dataEl.dataset.currentVariant = '';
        this.appendChild(dataEl);
      }
      dataEl.textContent = JSON.stringify(variant);
    }

    applyResolvedVariantFromOptions() {
      const variant = this.resolveVariantFromSelectedOptions();
      if (variant) {
        this.variant = variant;
        this.updateCurrentVariantJson(variant);
      } else if (this.getSelectedOptions().indexOf(null) === -1) {
        this.variant = null;
      }
      this.syncVariantIdInput();
      this.updateCustomProductTitle();
    }

    static sanitizeTitleSpaces(str) {
      return str
    }

    /**
     * Replace [Option name] tokens in the product title from data-nw-title-template.
     */
    updateCustomProductTitle() {
      const titleRow = this.section?.querySelector('.title-row[data-nw-title-template]')
        || this.closest('product-form')?.querySelector('.title-row[data-nw-title-template]');
      if (!titleRow?.dataset.nwTitleTemplate) return;

      let template;
      try {
        template = JSON.parse(titleRow.dataset.nwTitleTemplate);
      } catch (err) {
        return;
      }
      if (!template || typeof template !== 'string') return;

      let title = VariantPicker.sanitizeTitleSpaces(template);
      this.optionSelectors.forEach((selector) => {
        const optionName = selector.dataset.option;
        if (!optionName) return;

        const placeholder = `[${optionName}]`;
        let value = '';
        if (selector.dataset.selectorType === 'dropdown') {
          const selected = selector.querySelector('.custom-select__option[aria-selected="true"]');
          if (selected && selected.dataset.value !== '') {
            value = selected.dataset.value || selected.textContent.trim();
          }
        } else {
          const selected = selector.querySelector('input:checked');
          if (selected) value = selected.value;
        }
        title = title.split(placeholder).join(VariantPicker.sanitizeTitleSpaces(value));
      });

      title = VariantPicker.sanitizeTitleSpaces(title);
      const heading = titleRow.querySelector('.product-title');
      if (heading) heading.textContent = title;
    }

    /**
     * Handles 'mouseenter' events on option labels. Preloads links.
     * @param {object} evt - Event object.
     */
    handleLabelMouseEnter(evt) {
      const label = evt.currentTarget;
      if (label.dataset.preloaded) return; // Preload completed
      if (label.dataset.preloadTimeout) return; // Preload waiting
      if (label.matches('.opt-btn:checked + .opt-label, [aria-selected="true"]')) return; // Already selected

      // Build option array if clicked
      const input = label.htmlFor ? document.getElementById(label.htmlFor) : label;
      const optionIds = this.getSelectedOptionIds();
      const inputOptionIndex = Array.from(this.optionSelectors).indexOf(input.closest('.option-selector'));
      optionIds[inputOptionIndex] = input.dataset.valueId;

      // If all options are selected
      if (optionIds.indexOf(null) === -1) {
        // Wait to predict click-intent and preload link
        label.dataset.preloadTimeout = setTimeout(() => {
          label.dataset.preloaded = true;
          label.removeAttribute('data-preload-timeout');
          const combinedProductUrl = input.dataset.productUrl;
          const url = this.constructVariantUrl(
            combinedProductUrl,
            optionIds,
            input.dataset.variantId
          );
          theme.fetchCache.preload(url.toString());
        }, 250);
      }
    }

    /**
     * Handles 'mouseleave' events on option labels. Cancels link preload if in/out fast.
     * @param {object} evt - Event object.
     */
    static handleLabelMouseLeave(evt) {
      const label = evt.currentTarget;
      clearTimeout(label.dataset.preloadTimeout);
      label.removeAttribute('data-preload-timeout');
    }

    /**
     * Create a URL for fetching a product or variant.
     * @param {string} combinedProductUrl - URL for a combined product. Optional.
     * @param {Array} optionIds - Selected option IDs to include in the URL. Optional.
     * @param {string} variantId - Variant ID to use if not a combined product. Optional.
     * @returns {URL} Variant URL
     */
    constructVariantUrl(combinedProductUrl, optionIds, variantId) {
      let url = null;
      if (combinedProductUrl) {
        url = new URL(combinedProductUrl, window.location.origin);
        url.searchParams.set('option_values', optionIds.join(','));
      } else {
        url = new URL(this.dataset.url, window.location.origin);
      }
      const sectionIds = [this.dataset.sectionId];
      if (!this.quickBuyContainer && !this.featuredProductContainer) {
        document.querySelectorAll('.cc-variant-dependent-section [data-section-id]').forEach((e) => {
          if (e.closest('.rte')) return;
          sectionIds.push(e.dataset.sectionId);
        });
      }
      url.searchParams.set('sections', sectionIds.join(','));
      if (combinedProductUrl || optionIds.includes(null)) {
        url.searchParams.set('option_values', optionIds.join(','));
      } else {
        url.searchParams.set('option_values', optionIds.join(','));
      }
      return url;
    }

    /**
     * Handles 'change' events on the variant picker element.
     * @param {object} evt - Event object.
     */
    handleVariantChange(evt) {
      const selectedOptionIds = this.getSelectedOptionIds();

      // Immediately update swatch label, form id, URL, and media (do not wait for section fetch)
      this.updateSwatchLabel();
      this.applyResolvedVariantFromOptions();
      this.announceChange();

      // Construct new variant URL and fetch it, using theme cache
      const combinedProductUrl = evt.target.dataset.productUrl || evt.detail?.productUrl;
      const variantId = evt.target.dataset.variantId || evt.detail?.variantId;
      const url = this.constructVariantUrl(combinedProductUrl, selectedOptionIds, variantId);
      this.variantRequestId += 1;
      const currentRequestId = this.variantRequestId;

      theme.fetchCache.fetch(url.toString())
        .then((responseText) => {
          if (currentRequestId !== this.variantRequestId) return;

          const responseData = JSON.parse(responseText);

          // Update content
          Object.entries(responseData).forEach(([section, htmlStr]) => {
            const html = new DOMParser().parseFromString(htmlStr, 'text/html');
            const sectionId = `shopify-section-${section}`;
            let target = this.section;
            let newContent = html.getElementById(sectionId);

            if (this.section.id !== sectionId) {
              if (!this.quickBuyContainer) {
                target = document.getElementById(sectionId);
              } else {
                const quickBuyTemplate = html.getElementById('quick-buy-template')?.content.querySelector('.js-product');
                if (quickBuyTemplate) newContent = quickBuyTemplate;
              }
            }

            this.updateContent(target, newContent, combinedProductUrl);
          });

          // Restore focus
          if (!evt.detail?.noFocus) {
            document.querySelector(`#${evt.target.id}-button, input#${evt.target.id}`)?.focus();
          }

          // Update URL and announce changes
          const newVariantPicker = this.section.querySelector('variant-picker');
          setTimeout(() => {
            if (newVariantPicker) {
              newVariantPicker.announceChange();
              newVariantPicker.syncVariantIdInput();
            }
          }, 10);
        });
    }

    /**
     * Announces the current variant after a variant change.
     */
    announceChange() {
      const resolvedVariant = this.resolveVariantFromSelectedOptions();
      if (resolvedVariant) {
        this.variant = resolvedVariant;
        this.updateCurrentVariantJson(resolvedVariant);
      } else {
        this.variant = null;
      }
      this.syncVariantIdInput();
      this.updateCustomProductTitle();
      this.updateAddToCartButton();

      const selectedOptionIds = this.getSelectedOptionIds();
      if (!selectedOptionIds.includes(null)) {
        this.updateUrl();
      }

      this.dispatchEvent(new CustomEvent('on:variant:change', {
        bubbles: true,
        detail: {
          form: this.getProductForm(),
          variant: this.variant,
          selectedOptions: this.getSelectedOptions()
        }
      }));

      if (typeof window.nwRefreshAnimateOnScroll === 'function') {
        window.nwRefreshAnimateOnScroll();
      }
    }

    /**
     * Replace content when the variant or product changes.
     * @param {Element} target - Target container for replacing content within.
     * @param {document} newContent - New content containing elements to use.
     * @param {boolean} productChange - Product is changing.
     */
    updateContent(target, newContent, productChange) {
      // If something's not right, do nothing
      if (!target || !newContent) return;

      // Preselection - only update certain option value attributes
      if (this.getSelectedOptions().indexOf(null) !== -1 && !productChange) {
        target.querySelectorAll('.js-option[data-value-id]').forEach((input) => {
          const newInput = newContent.querySelector(`.js-option[data-value-id="${input.dataset.valueId}"]`);
          input.className = newInput.className;
          if (newInput.dataset.variantId) {
            input.dataset.variantId = newInput.dataset.variantId;
          } else {
            delete input.dataset.variantId;
          }
          if (input.classList.contains('custom-select__option')) {
            input.innerHTML = newInput.innerHTML;
          }
        });
        this.updateStatusClasses();
        return;
      }

      let replaceSelector = '[data-dynamic-variant-content]';
      if (productChange) {
        replaceSelector += ', [data-dynamic-product-content]';
      }
      const toReplaceList = target.querySelectorAll(replaceSelector);
      const preservedOptionIds = productChange ? null : this.getSelectedOptionIds();

      toReplaceList.forEach((toReplace) => {
        const replaceWith = toReplace.dataset.dynamicVariantContent
          ? newContent.querySelector(`[data-dynamic-variant-content="${CSS.escape(toReplace.dataset.dynamicVariantContent)}"]`)
          : newContent.querySelector(`[data-dynamic-product-content="${CSS.escape(toReplace.dataset.dynamicProductContent)}"]`);
        if (!replaceWith) return;

        // Dispatch 'on:variant:before-replace-element' event before replacing element
        document.dispatchEvent(new CustomEvent('on:variant:before-replace-element', {
          bubbles: true,
          detail: {
            toReplace,
            replaceWith
          }
        }));

        // If in quick buy, content needs mutating
        if (this.quickBuyContainer && theme.quickBuy) {
          theme.quickBuy.convertToQuickBuyContent(
            replaceWith,
            this.quickBuyContainer.dataset.productUrl
          );
        }

        // Transfer basic input values
        toReplace.querySelectorAll('input[id]:not([type="hidden"]), select[id]').forEach((sourceInput) => {
          if (sourceInput.matches('.custom-select__native')) {
            const customSelectId = sourceInput.id.replace('-native', '');
            const targetInput = replaceWith.querySelector(`#${CSS.escape(customSelectId)}`);
            const option = targetInput.querySelector(`.js-option[data-value="${CSS.escape(sourceInput.value)}"]`);
            setTimeout(() => {
              targetInput.selectOption(option);
            }, 0);
          } else {
            const targetInput = replaceWith.querySelector(`#${CSS.escape(sourceInput.id)}`);
            if (!targetInput) return;
            if (sourceInput.type === 'radio' || sourceInput.type === 'checkbox') {
              targetInput.toggleAttribute('checked', sourceInput.checked);
            } else {
              targetInput.value = sourceInput.value;
            }
          }
        });

        // Replace content
        const isIdInput = replaceWith.matches('input[name="id"]');
        if (isIdInput) {
          // Update ID input - preserving listeners
          [...replaceWith.attributes].forEach(
            (attr) => toReplace.setAttribute(attr.name, attr.value)
          );
          toReplace.value = replaceWith.value;
          // Defer change event until all forms are accurate
          setTimeout(() => {
            toReplace.dispatchEvent(new Event('change', { bubbles: true }));
          }, 0);
        } else {
          // Remember toReplace becomes detached
          toReplace.replaceWith(replaceWith);
        }

        // Do not mistake input value changes for variant changes - remove listeners
        replaceWith.querySelectorAll('variant-picker').forEach((el) => el.removeListeners());

        // Restore client selection after section HTML replace (server markup can lag option_values)
        if (!productChange && preservedOptionIds) {
          preservedOptionIds.forEach((optionId) => {
            if (!optionId) return;
            const escapedId = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(optionId) : optionId;
            const listedInput = replaceWith.querySelector(`.js-option[data-value-id="${escapedId}"]`);
            if (listedInput && listedInput.type === 'radio') {
              listedInput.checked = true;
            }
            const toSelect = replaceWith.querySelector(`.option-selector .custom-select__option[data-value-id="${escapedId}"]:not([aria-selected="true"])`);
            if (toSelect) {
              setTimeout(() => {
                toSelect.closest('custom-select').selectOption(toSelect);
              }, 0);
            }
          });
        }

        // Update variant picker after potential changes are applied
        setTimeout(() => {
          replaceWith.querySelectorAll('variant-picker').forEach((el) => {
            el.applyResolvedVariantFromOptions();
            el.addListeners();
            el.updateVariantContent();
          });
        }, 10);
      });
    }

    /**
     * Set status classes to help with styling.
     */
    updateStatusClasses() {
      const selectedOpts = this.getSelectedOptionIds();
      const nullCount = selectedOpts.filter((x) => x === null).length;
      const isSingleNullAtEnd = nullCount === 1 && selectedOpts[selectedOpts.length - 1] === null;
      this.classList.toggle('variant-picker--preselection', nullCount > 0);
      this.classList.toggle('variant-picker--pre-last-selection', nullCount > 0 && !isSingleNullAtEnd);
    }

    /**
     * Copies the selected value into a swatch label. (Required for pre-selection.)
     */
    updateSwatchLabel() {
      this.querySelectorAll('.option-selector:has(.js-color-text)').forEach((option) => {
        const label = option.querySelector('.js-color-text');
        const input = option.querySelector('.js-option:is(:checked, [aria-selected="true"])');
        label.textContent = input ? input.value : '';
      });
    }

    /**
     * Updates the availability status in option selectors.
     */
    updateAvailability() {
      if (this.dataset.availability === 'prune') {
        const toChange = this.querySelectorAll('.js-option.is-unavailable:is(:checked, [aria-selected="true"])');
        toChange.forEach((selected) => {
          const toSelect = selected.closest('.option-selector').querySelector('.js-option:not(.is-unavailable, [data-value=""])');
          if (toSelect) {
            setTimeout(() => {
              if (toSelect.closest('custom-select')) {
                toSelect.closest('custom-select').selectOption(toSelect);
              } else {
                toSelect.click();
              }
            }, 20); // Trigger after any updateContent logic has occurred
          }
        });
      }
    }

    /**
     * Updates the "Add to Cart" button label and disabled state.
     */
    syncStickyAddToCartButton() {
      if (!this.addBtn) return;
      const stickyAddBtn = this.section?.querySelector('sticky-atc [name="add"]');
      if (!stickyAddBtn) return;
      stickyAddBtn.disabled = this.addBtn.disabled;
      stickyAddBtn.textContent = this.addBtn.textContent;
    }

    updateAddToCartButton() {
      const productForm = this.getProductForm();
      if (!productForm) return;

      this.addBtn = productForm.querySelector('[name="add"]');
      if (!this.addBtn) return;

      // Product not available
      if (!this.productAvailable) {
        this.addBtn.disabled = true;
        this.addBtn.textContent = theme.strings.noStock;
        this.syncStickyAddToCartButton();
        return;
      }

      // Preselection
      if (this.getSelectedOptions().indexOf(null) !== -1) {
        if (this.addBtn.dataset.preselectionDisabled === 'true') {
          this.addBtn.disabled = true;
          this.addBtn.textContent = this.addBtn.dataset.preselectionText;
        } else {
          this.addBtn.disabled = false;
          this.addBtn.textContent = this.addBtn.dataset.addToCartText;
        }
        this.syncStickyAddToCartButton();
        return;
      }

      // No variant
      if (!this.variant) {
        this.addBtn.disabled = true;
        this.addBtn.textContent = theme.strings.noVariant;
        this.syncStickyAddToCartButton();
        return;
      }

      // Sold out
      if (!this.variant.available) {
        this.addBtn.disabled = true;
        this.addBtn.textContent = theme.strings.noStock;
        this.syncStickyAddToCartButton();
        return;
      }

      // Add to cart
      this.addBtn.disabled = false;
      this.addBtn.textContent = this.addBtn.dataset.addToCartText;
      this.syncStickyAddToCartButton();
    }

    /**
     * Updates the url with the selected variant id.
     */
    updateUrl() {
      if (this.dataset.updateUrl === 'false') return;
      const url = this.variant ? `${this.dataset.url}?variant=${this.variant.id}` : this.dataset.url;
      window.history.replaceState({ }, '', url);
    }

    /**
     * Gets the variant data for a product.
     * @returns {?object}
     */
    getVariantData() {
      const dataEl = this.querySelector('script[data-current-variant]')
        || this.section?.querySelector('variant-picker script[data-current-variant]');
      if (!dataEl) return null;
      try {
        return JSON.parse(dataEl.textContent);
      } catch (err) {
        return null;
      }
    }

    /**
     * Get the selected values from a list of variant options.
     * @returns {Array} Array of selected option values, value is null if not selected.
     */
    getSelectedOptions() {
      const selectedOptions = [];

      this.optionSelectors.forEach((selector) => {
        if (selector.dataset.selectorType === 'dropdown') {
          const selected = selector.querySelector('.custom-select__option[aria-selected="true"]');
          selectedOptions.push(selected && selected.dataset.value !== '' ? selected.dataset.value : null);
        } else {
          const selected = selector.querySelector('input:checked');
          selectedOptions.push(selected ? selected.value : null);
        }
      });

      return selectedOptions;
    }

    /**
     * Get the selected option value ids from a list of variant options.
     * @returns {Array} Array of selected option value ids, value is null if not selected.
     */
    getSelectedOptionIds() {
      const selectedOptionIds = [];

      this.optionSelectors.forEach((selector) => {
        if (selector.dataset.selectorType === 'dropdown') {
          const selected = selector.querySelector('.custom-select__option[aria-selected="true"]');
          selectedOptionIds.push(selected && selected.dataset.value !== '' ? selected.dataset.valueId : null);
        } else {
          const selected = selector.querySelector('input:checked');
          selectedOptionIds.push(selected ? selected.dataset.valueId : null);
        }
      });

      return selectedOptionIds;
    }

    /**
     * Apply search parameters (set by product card swatches).
     */
    static productSwitchRequestId = 0;

    /**
     * Fetch product JSON for variant matching across product switches.
     * @param {string} productUrl - Product URL or path.
     * @returns {Promise<object>}
     */
    static async fetchProductJson(productUrl) {
      const path = new URL(productUrl, window.location.origin).pathname.replace(/\/$/, '');
      const jsonUrl = `${path}.js`;
      const text = await theme.fetchCache.fetch(jsonUrl);
      return JSON.parse(text);
    }

    /**
     * Find a variant id on a product that matches selected option values.
     * @param {object} product - Product JSON from /products/handle.js
     * @param {Array<string|null>} selectedOptions - Selected option values
     * @returns {?number}
     */
    static resolveVariantIdFromOptions(product, selectedOptions) {
      if (!product?.variants?.length) return null;

      const allSelected = selectedOptions?.length
        && selectedOptions.every((value) => value !== null && value !== '');

      if (allSelected) {
        const match = product.variants.find((variant) => selectedOptions.every((value, index) => {
          const optionValue = variant[`option${index + 1}`];
          return optionValue === value;
        }));
        if (match) return match.id;
      }

      const available = product.variants.find((variant) => variant.available);
      return (available || product.variants[0])?.id ?? null;
    }

    /**
     * Apply option selections by value (for cross-product switches).
     * @param {VariantPicker} variantPicker - Destination variant picker
     * @param {Array<string|null>} selectedOptions - Option values to select
     */
    static applySelectedOptionsByValue(variantPicker, selectedOptions) {
      if (!variantPicker || !selectedOptions?.length) return;

      variantPicker.optionSelectors.forEach((selector, index) => {
        const value = selectedOptions[index];
        if (!value) return;

        if (selector.dataset.selectorType === 'dropdown') {
          const option = selector.querySelector(`.custom-select__option[data-value="${CSS.escape(value)}"]`);
          if (option) {
            option.closest('custom-select')?.selectOption(option);
          }
        } else {
          const input = selector.querySelector(`input.js-option[value="${CSS.escape(value)}"]`);
          if (input && !input.checked) {
            input.checked = true;
            input.dispatchEvent(new CustomEvent('change', {
              bubbles: true,
              cancelable: false,
              detail: { noFocus: true }
            }));
          }
        }
      });
    }

    /**
     * Build a Section Rendering API URL for switching to another product.
     * @param {string} productUrl - Destination product URL
     * @param {?number} variantId - Variant to render
     * @returns {URL}
     */
    buildProductSwitchUrl(productUrl, variantId) {
      const url = new URL(productUrl, window.location.origin);
      const sectionIds = [this.dataset.sectionId];
      if (!this.quickBuyContainer && !this.featuredProductContainer) {
        document.querySelectorAll('.cc-variant-dependent-section [data-section-id]').forEach((e) => {
          if (e.closest('.rte')) return;
          sectionIds.push(e.dataset.sectionId);
        });
      }
      url.searchParams.set('sections', sectionIds.join(','));
      if (variantId) {
        url.searchParams.set('variant', String(variantId));
      }
      return url;
    }

    /**
     * Switch to another product via the Section Rendering API (NW size / thickness).
     * @param {string} productUrl - Destination product URL
     * @param {object} [options]
     * @param {boolean} [options.pushState=true] - Update history with pushState
     * @returns {Promise<void>}
     */
    switchProduct(productUrl, { pushState = true } = {}) {
      if (!productUrl) return Promise.resolve();

      const destUrl = new URL(productUrl, window.location.origin);
      const variantFromUrl = destUrl.searchParams.get('variant');

      const selectedOptions = this.getSelectedOptions();
      VariantPicker.productSwitchRequestId += 1;
      const requestId = VariantPicker.productSwitchRequestId;
      this.pendingSelectedOptions = selectedOptions;

      const resolveVariant = variantFromUrl
        ? Promise.resolve(Number(variantFromUrl))
        : VariantPicker.fetchProductJson(destUrl.pathname)
          .then((product) => VariantPicker.resolveVariantIdFromOptions(product, selectedOptions))
          .catch(() => null);

      return resolveVariant.then((variantId) => {
        const fetchUrl = this.buildProductSwitchUrl(destUrl.pathname, variantId);
        return theme.fetchCache.fetch(fetchUrl.toString())
          .then((responseText) => {
            if (requestId !== VariantPicker.productSwitchRequestId) return;

            const responseData = JSON.parse(responseText);
            const sectionRoot = this.section;

            Object.entries(responseData).forEach(([section, htmlStr]) => {
              const html = new DOMParser().parseFromString(htmlStr, 'text/html');
              const sectionId = `shopify-section-${section}`;
              let target = sectionRoot;
              let newContent = html.getElementById(sectionId);

              if (sectionRoot.id !== sectionId) {
                target = document.getElementById(sectionId);
              }

              this.updateContent(target, newContent, productUrl);
            });

            const sectionEl = sectionRoot?.id ? document.getElementById(sectionRoot.id) : sectionRoot;
            const newVariantPicker = sectionEl?.querySelector('variant-picker')
              || document.querySelector('product-form.js-product variant-picker');

            if (newVariantPicker && this.pendingSelectedOptions) {
              VariantPicker.applySelectedOptionsByValue(newVariantPicker, this.pendingSelectedOptions);
            }

            const resolvedVariantId = variantId;
            const destinationPath = destUrl.pathname;

            setTimeout(() => {
              const vp = sectionEl?.querySelector('variant-picker')
                || document.querySelector('product-form.js-product variant-picker');
              if (vp) {
                vp.applyResolvedVariantFromOptions();
                vp.announceChange();
              }

              if (pushState) {
                const historyUrl = resolvedVariantId
                  ? `${destinationPath}?variant=${resolvedVariantId}`
                  : destinationPath;
                window.history.pushState({ nwProductSwitch: true }, '', historyUrl);
              }

              if (typeof window.nwPdpProductSwitchOnNavigate === 'function') {
                window.nwPdpProductSwitchOnNavigate(
                  resolvedVariantId ? `${destinationPath}?variant=${resolvedVariantId}` : destinationPath
                );
              }

              this.pendingSelectedOptions = null;
            }, 20);
          })
          .catch(() => {
            if (requestId === VariantPicker.productSwitchRequestId) {
              this.pendingSelectedOptions = null;
            }
          });
      });
    }

    applyInitialVariantState() {
      if (this.applyVariantFromUrlParam()) {
        this.applyResolvedVariantFromOptions();
        this.syncVariantIdInput();
        this.updateCustomProductTitle();
        this.updateVariantContent();
        return;
      }

      this.applySearchParams();
      this.applyResolvedVariantFromOptions();
      this.syncVariantIdInput();
      this.updateCustomProductTitle();
      this.updateVariantContent();
    }

    /**
     * Select picker options from ?variant= on product URLs (e.g. NW product cards).
     * @returns {boolean} Whether a matching variant was applied
     */
    applyVariantFromUrlParam() {
      const variantId = new URLSearchParams(window.location.search).get('variant');
      if (!variantId) return false;

      const variants = this.getProductVariantsData();
      if (!variants?.length) return false;

      const variant = variants.find((v) => String(v.id) === String(variantId));
      if (!variant) return false;

      const selectedOptions = [variant.option1, variant.option2, variant.option3];
      VariantPicker.applySelectedOptionsByValue(this, selectedOptions);
      this.variant = variant;
      this.updateCurrentVariantJson(variant);
      return true;
    }

    applySearchParams() {
      const searchParams = new URLSearchParams(window.location.search);

      Array.from(searchParams.keys()).forEach((key) => {
        const value = searchParams.get(key);
        const optionSelectors = Array.from(this.optionSelectors);
        const matchingOptionSelector = optionSelectors.find((x) => x.dataset.option === key);
        if (!matchingOptionSelector) return;

        if (matchingOptionSelector.dataset.selectorType === 'dropdown') {
          const colorOptionDropdown = matchingOptionSelector.querySelector(`.custom-select__option[data-value="${CSS.escape(value)}"]:not([aria-selected="true"])`);
          if (colorOptionDropdown) {
            const customSelect = colorOptionDropdown.closest('custom-select');
            const convertEvent = (evt) => {
              evt.detail.noFocus = true;
              customSelect.dispatchEvent(
                new CustomEvent('change', { bubbles: true, cancelable: false, detail: evt.detail })
              );
            };
            customSelect.addEventListener('change', convertEvent, { once: true });
            customSelect.selectOption(colorOptionDropdown);
          }
        } else {
          const matchingInput = matchingOptionSelector.querySelector(`input[value="${CSS.escape(value)}"]:not(:checked)`);
          if (matchingInput) {
            const matchingOptionValue = matchingOptionSelector.querySelector('.option-selector__label-value');
            if (matchingOptionValue) {
              matchingOptionSelector.querySelector('.option-selector__label-value').textContent = value;
            }
            matchingInput.checked = true;
            matchingInput.dispatchEvent(
              new CustomEvent('change', { bubbles: true, cancelable: false, detail: { noFocus: true } })
            );
          }
        }
      });
    }
  }

  customElements.define('variant-picker', VariantPicker);
}
