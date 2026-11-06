(function () {
  function setActiveSwatch(card, swatchButton) {
    card.querySelectorAll('[data-nw-product-card-swatch]').forEach(function (btn) {
      btn.classList.remove('nw-product-card__swatch--active');
      btn.setAttribute('aria-pressed', 'false');
    });
    swatchButton.classList.add('nw-product-card__swatch--active');
    swatchButton.setAttribute('aria-pressed', 'true');
  }

  function applyVariantToCard(card, swatchButton) {
    var label =
      swatchButton.getAttribute('data-variant-display-title') ||
      swatchButton.getAttribute('data-variant-label');
    var url = swatchButton.getAttribute('data-variant-url');
    var imageSrc = swatchButton.getAttribute('data-image-src');

    var mediaLink = card.querySelector('[data-nw-product-card-media]');
    var titleLink = card.querySelector('[data-nw-product-card-title]');
    var image = card.querySelector('[data-nw-product-card-image]');

    if (titleLink && label) {
      titleLink.textContent = label;
    }
    if (mediaLink && url) {
      mediaLink.setAttribute('href', url);
    }
    if (titleLink && url) {
      titleLink.setAttribute('href', url);
    }
    if (image && imageSrc) {
      image.setAttribute('src', imageSrc);
    }

    setActiveSwatch(card, swatchButton);
  }

  function initNwProductCards(root) {
    (root || document).querySelectorAll('[data-nw-product-card]:not([data-nw-product-card-initialized])').forEach(function (card) {
      card.setAttribute('data-nw-product-card-initialized', 'true');

      card.querySelectorAll('[data-nw-product-card-swatch]').forEach(function (swatchButton) {
        swatchButton.addEventListener('click', function (event) {
          event.preventDefault();
          event.stopPropagation();
          applyVariantToCard(card, swatchButton);
        });
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initNwProductCards();
    });
  } else {
    initNwProductCards();
  }

  document.addEventListener('shopify:section:load', function (event) {
    initNwProductCards(event.target);
  });
})();
