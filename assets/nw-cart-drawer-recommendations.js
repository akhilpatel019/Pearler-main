/* global theme */

class NwCartDrawerRecommendations {
  constructor(root) {
    this.root = root;
    this.enableImageSlider = root.dataset.enableImageSlider === 'true';
    this.bindCards();
  }

  bindCards() {
    this.root.querySelectorAll('.nw-cart-rec-card').forEach((card) => this.bindCard(card));
  }

  bindCard(card) {
    if (card.dataset.nwRecBound === 'true') return;
    card.dataset.nwRecBound = 'true';

    const variantEl = card.querySelector('[data-nw-rec-variant]');
    const priceEl = card.querySelector('[data-nw-rec-price]');
    const addBtn = card.querySelector('[data-nw-rec-add]');

    if (variantEl && variantEl.tagName === 'SELECT' && priceEl) {
      variantEl.addEventListener('change', () => {
        const option = variantEl.selectedOptions[0];
        if (option?.dataset.price) {
          priceEl.textContent = option.dataset.price;
        }
        if (addBtn) {
          addBtn.disabled = Boolean(option?.disabled);
        }
      });
    }

    if (addBtn) {
      addBtn.addEventListener('click', () => this.addToCart(card, addBtn));
    }

    if (this.enableImageSlider) {
      this.bindMediaSlider(card);
    }
  }

  bindMediaSlider(card) {
    const slides = [...card.querySelectorAll('[data-nw-rec-slide]')];
    if (slides.length < 2) return;

    let index = slides.findIndex((slide) => slide.classList.contains('is-active'));
    if (index < 0) index = 0;

    const show = (nextIndex) => {
      index = (nextIndex + slides.length) % slides.length;
      slides.forEach((slide, i) => {
        slide.classList.toggle('is-active', i === index);
      });
    };

    card.querySelector('[data-nw-rec-slide-prev]')?.addEventListener('click', (evt) => {
      evt.preventDefault();
      show(index - 1);
    });

    card.querySelector('[data-nw-rec-slide-next]')?.addEventListener('click', (evt) => {
      evt.preventDefault();
      show(index + 1);
    });
  }

  async addToCart(card, button) {
    const variantEl = card.querySelector('[data-nw-rec-variant]');
    const variantId = variantEl?.value;
    if (!variantId) return;

    button.setAttribute('aria-disabled', 'true');
    button.classList.add('is-loading');

    const formData = new FormData();
    formData.append('id', variantId);
    formData.append('quantity', 1);
    formData.append('sections_url', window.location.pathname);

    const sectionsToUpdate = ['page-header', 'cart-drawer']
      .map((sel) => document.querySelector(sel))
      .filter((el) => el);
    const sectionIds = sectionsToUpdate.map((el) => el.dataset.sectionId);
    if (sectionIds.length) {
      formData.append('sections', sectionIds.join(','));
    }

    try {
      const response = await fetch(theme.routes.cartAdd, {
        method: 'POST',
        headers: {
          Accept: 'application/javascript',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.description || data.message || response.status);
      }

      if (data.sections && sectionsToUpdate.length === Object.keys(data.sections).length) {
        sectionsToUpdate.forEach((el) => {
          el.updateFromCartChange(data.sections[el.dataset.sectionId]);
        });
      } else {
        document.dispatchEvent(new CustomEvent('on:cart:change', { bubbles: true }));
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      document.dispatchEvent(new CustomEvent('on:cart:change', { bubbles: true }));
    } finally {
      button.removeAttribute('aria-disabled');
      button.classList.remove('is-loading');
    }
  }
}

const initNwCartRecs = (container) => {
  if (!container) return;
  theme.manuallyLoadImages(container);
  // eslint-disable-next-line no-new
  new NwCartDrawerRecommendations(container);
};

const initAllNwCartRecs = (scope = document) => {
  scope.querySelectorAll('[data-nw-cart-recs]').forEach(initNwCartRecs);
};

window.initAllNwCartRecs = initAllNwCartRecs;

document.addEventListener('DOMContentLoaded', () => initAllNwCartRecs());

document.addEventListener('on:cart:after-merge', (evt) => {
  const drawer = evt.target?.closest?.('cart-drawer') || document.querySelector('cart-drawer');
  if (drawer) initAllNwCartRecs(drawer);
});

document.addEventListener('on:cart-cross-sell:loaded', (evt) => {
  theme.manuallyLoadImages(evt.target);
  initAllNwCartRecs(evt.target);
});
