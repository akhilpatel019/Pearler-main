(function () {
  function isFindWideLayout() {
    return window.matchMedia('(min-width: 750px)').matches;
  }

  function syncFindHeights(sectionEl, swiper) {
    var layout = sectionEl.querySelector('.nw-find__layout');
    var nav = sectionEl.querySelector('[data-nw-find-nav]');
    var figure = sectionEl.querySelector('.nw-find__figure');

    if (!layout || !figure || !nav) {
      if (swiper) {
        swiper.update();
      }
      return;
    }

    figure.style.removeProperty('height');
    figure.style.removeProperty('min-height');

    if (!isFindWideLayout()) {
      if (swiper) {
        swiper.update();
      }
      return;
    }

    var navHeight = nav.getBoundingClientRect().height;
    if (navHeight > 0) {
      figure.style.height = navHeight + 'px';
    }

    if (swiper) {
      swiper.update();
      if (typeof swiper.updateSize === 'function') {
        swiper.updateSize();
      }
      if (typeof swiper.updateSlides === 'function') {
        swiper.updateSlides();
      }
    }
  }

  function cleanupFindSection(sectionEl) {
    if (sectionEl._nwFindResizeObserver) {
      sectionEl._nwFindResizeObserver.disconnect();
      sectionEl._nwFindResizeObserver = null;
    }

    if (sectionEl._nwFindWindowResize) {
      window.removeEventListener('resize', sectionEl._nwFindWindowResize);
      sectionEl._nwFindWindowResize = null;
    }
  }

  function bindFindHeightSync(sectionEl, swiper) {
    var nav = sectionEl.querySelector('[data-nw-find-nav]');
    if (!nav) {
      return;
    }

    var sync = function () {
      syncFindHeights(sectionEl, swiper);
    };

    var layout = sectionEl.querySelector('.nw-find__layout');

    if (typeof ResizeObserver !== 'undefined') {
      sectionEl._nwFindResizeObserver = new ResizeObserver(sync);
      sectionEl._nwFindResizeObserver.observe(nav);
      if (layout) {
        sectionEl._nwFindResizeObserver.observe(layout);
      }
    }

    sectionEl._nwFindWindowResize = sync;
    window.addEventListener('resize', sync);
  }

  function scrollToNwFindHash(sectionEl) {
    if (!sectionEl.id) {
      return;
    }
    var hash = window.location.hash;
    if (!hash || hash.length < 2) {
      return;
    }
    var id;
    try {
      id = decodeURIComponent(hash.slice(1));
    } catch (error) {
      id = hash.slice(1);
    }
    if (sectionEl.id !== id || typeof theme === 'undefined' || !theme.scrollToRevealElement) {
      return;
    }
    theme.scrollToRevealElement(sectionEl);
  }

  function updateFindSection(sectionEl, swiper) {
    var navItems = sectionEl.querySelectorAll('[data-nw-find-nav-item]');
    var counterEl = sectionEl.querySelector('[data-nw-find-counter]');
    var activeIndex = swiper.activeIndex;
    var total = navItems.length;

    navItems.forEach(function (btn, index) {
      var isActive = index === activeIndex;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      var entry = btn.closest('.nw-find__nav-entry');
      if (entry) {
        entry.classList.toggle('is-active', isActive);
      }
    });

    if (counterEl && total > 0) {
      counterEl.textContent = activeIndex + 1 + '/' + total;
    }
  }

  function initNwFindSection(sectionEl) {
    if (sectionEl.getAttribute('data-nw-find-initialized') === 'true') {
      return;
    }

    var sliderEl = sectionEl.querySelector('[data-nw-find-slider]');
    if (!sliderEl || typeof Swiper === 'undefined') {
      return;
    }

    var slideCount = sliderEl.querySelectorAll('.swiper-slide').length;
    if (slideCount < 1) {
      return;
    }

    cleanupFindSection(sectionEl);

    if (sliderEl.swiper) {
      sliderEl.swiper.destroy(true, true);
    }

    sectionEl.setAttribute('data-nw-find-initialized', 'true');

    var speed = parseInt(sectionEl.getAttribute('data-transition-duration'), 10);
    if (Number.isNaN(speed)) {
      speed = 500;
    }

    var autoplayEnabled = sectionEl.getAttribute('data-autoplay') === 'true';
    var autoplayDelay = parseInt(sectionEl.getAttribute('data-autoplay-delay'), 10);
    if (Number.isNaN(autoplayDelay)) {
      autoplayDelay = 4000;
    }

    var swiperOptions = {
      slidesPerView: 1,
      speed: speed,
      allowTouchMove: true,
      watchOverflow: true,
      loop: false,
      effect: 'fade',
      fadeEffect: {
        crossFade: true,
      },
      on: {
        slideChange: function (swiper) {
          updateFindSection(sectionEl, swiper);
        },
      },
    };

    if (autoplayEnabled && slideCount > 1) {
      swiperOptions.autoplay = {
        delay: autoplayDelay,
        disableOnInteraction: false,
        pauseOnMouseEnter: true,
      };
    }

    var swiper;
    try {
      swiper = new Swiper(sliderEl, swiperOptions);
    } catch (error) {
      delete swiperOptions.effect;
      delete swiperOptions.fadeEffect;
      swiper = new Swiper(sliderEl, swiperOptions);
    }

    var nav = sectionEl.querySelector('[data-nw-find-nav]');
    var canAutoplay = autoplayEnabled && slideCount > 1;

    if (nav) {
      nav.querySelectorAll('.nw-find__nav-entry').forEach(function (entry) {
        entry.addEventListener('mouseenter', function () {
          if (!isFindWideLayout()) {
            return;
          }
          var btn = entry.querySelector('[data-nw-find-nav-item]');
          if (!btn) {
            return;
          }
          var index = parseInt(btn.getAttribute('data-nw-find-index'), 10);
          if (Number.isNaN(index)) {
            return;
          }
          if (canAutoplay && swiper.autoplay) {
            swiper.autoplay.stop();
          }
          swiper.slideTo(index);
        });
      });

      nav.addEventListener('mouseleave', function () {
        if (!isFindWideLayout()) {
          return;
        }
        if (canAutoplay && swiper.autoplay && !swiper.autoplay.running) {
          swiper.autoplay.start();
        }
      });
    }

    sectionEl.querySelectorAll('[data-nw-find-nav-item]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var index = parseInt(btn.getAttribute('data-nw-find-index'), 10);
        if (!Number.isNaN(index)) {
          swiper.slideTo(index);
        }
      });
    });

    updateFindSection(sectionEl, swiper);
    bindFindHeightSync(sectionEl, swiper);

    requestAnimationFrame(function () {
      syncFindHeights(sectionEl, swiper);
      requestAnimationFrame(function () {
        syncFindHeights(sectionEl, swiper);
        scrollToNwFindHash(sectionEl);
      });
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        syncFindHeights(sectionEl, swiper);
        scrollToNwFindHash(sectionEl);
      });
    }
  }

  function initNwFindSections() {
    document.querySelectorAll('[data-nw-find]:not([data-nw-find-initialized])').forEach(initNwFindSection);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNwFindSections);
  } else {
    initNwFindSections();
  }

  document.addEventListener('shopify:section:load', function (event) {
    var sectionEl = event.target.querySelector('[data-nw-find]');
    if (sectionEl) {
      sectionEl.removeAttribute('data-nw-find-initialized');
      initNwFindSection(sectionEl);
    }
  });
})();
