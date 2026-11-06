(function () {
  function destroySwiper(sliderEl) {
    if (sliderEl._nwImageSwiper) {
      sliderEl._nwImageSwiper.destroy(true, true);
      sliderEl._nwImageSwiper = null;
    }
    sliderEl.removeAttribute('data-nw-image-initialized');
  }

  function refreshNwImageScrollAnimations() {
    if (typeof window.nwRefreshAnimateOnScroll === 'function') {
      window.nwRefreshAnimateOnScroll();
    }
  }

  function isInViewport(el) {
    var rect = el.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  }

  function syncHiddenBranchAnimations() {
    var isDesktop = window.matchMedia('(min-width: 750px)').matches;
    var hiddenRoot = isDesktop
      ? document.querySelectorAll('.nw-image__slider .nw-image__figure[data-cc-animate]')
      : document.querySelectorAll('.nw-image__grid .nw-image__grid-item[data-cc-animate]');

    hiddenRoot.forEach(function (el) {
      el.classList.add('cc-animate-in');
    });
  }

  function revealVisibleBranchAnimations(root) {
    var isDesktop = window.matchMedia('(min-width: 750px)').matches;
    var visibleRoot = root
      ? root.querySelectorAll(
          isDesktop ? '.nw-image__grid .nw-image__grid-item[data-cc-animate]' : '.nw-image__slider .nw-image__figure[data-cc-animate]'
        )
      : document.querySelectorAll(
          isDesktop ? '.nw-image__grid .nw-image__grid-item[data-cc-animate]' : '.nw-image__slider .nw-image__figure[data-cc-animate]'
        );

    visibleRoot.forEach(function (el) {
      if (isInViewport(el)) {
        el.classList.add('cc-animate-in');
      }
    });
  }

  function initMobileSlider(sliderEl) {
    if (typeof Swiper === 'undefined') {
      return;
    }

    if (window.matchMedia('(min-width: 750px)').matches) {
      destroySwiper(sliderEl);
      return;
    }

    if (sliderEl.getAttribute('data-nw-image-initialized') === 'true') {
      return;
    }

    sliderEl.setAttribute('data-nw-image-initialized', 'true');

    sliderEl._nwImageSwiper = new Swiper(sliderEl, {
      slidesPerView: 1,
      centeredSlides: true,
      spaceBetween: 0,
      speed: 450,
      grabCursor: true,
      watchOverflow: true,
      loop: false,
    });

    syncHiddenBranchAnimations();
    revealVisibleBranchAnimations(sliderEl.closest('.nw-image'));
  }

  function initNwImageSection(sectionEl) {
    var sliderEl = sectionEl.querySelector('[data-nw-image-slider]');
    if (sliderEl) {
      initMobileSlider(sliderEl);
    }
    syncHiddenBranchAnimations();
    revealVisibleBranchAnimations(sectionEl);
    refreshNwImageScrollAnimations();
  }

  function initNwImageSections() {
    document.querySelectorAll('.nw-image').forEach(initNwImageSection);
  }

  function onResize() {
    document.querySelectorAll('[data-nw-image-slider]').forEach(function (sliderEl) {
      if (window.matchMedia('(min-width: 750px)').matches) {
        destroySwiper(sliderEl);
      } else {
        initMobileSlider(sliderEl);
      }
    });
    document.querySelectorAll('.nw-image').forEach(function (sectionEl) {
      syncHiddenBranchAnimations();
      revealVisibleBranchAnimations(sectionEl);
      refreshNwImageScrollAnimations();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNwImageSections);
  } else {
    initNwImageSections();
  }

  window.addEventListener('resize', onResize);
  document.addEventListener('shopify:section:load', function (event) {
    var sectionEl = event.target.querySelector('.nw-image');
    if (sectionEl) {
      initNwImageSection(sectionEl);
    }
  });
})();
