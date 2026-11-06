(function () {
  function initNwBestsellerSliders() {
    if (typeof Swiper === 'undefined') {
      return;
    }

    document.querySelectorAll('[data-nw-bestseller-slider]:not([data-nw-bestseller-initialized])').forEach(function (sliderEl) {
      sliderEl.setAttribute('data-nw-bestseller-initialized', 'true');

      new Swiper(sliderEl, {
        slidesPerView: 1.55,
        spaceBetween: 11,
        speed: 500,
        grabCursor: true,
        watchOverflow: true,
        loop: false,
        breakpoints: {
          750: {
            slidesPerView: 2.1,
            spaceBetween: 24,
          },
          1024: {
            slidesPerView: 3,
            spaceBetween: 34,
          },
          1199: {
            slidesPerView: 3,
            spaceBetween: 44,
          },
        },
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNwBestsellerSliders);
  } else {
    initNwBestsellerSliders();
  }

  document.addEventListener('shopify:section:load', initNwBestsellerSliders);
})();
