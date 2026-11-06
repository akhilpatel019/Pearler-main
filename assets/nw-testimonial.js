(function () {
  function clearTestimonialAutoplay(sectionEl) {
    if (sectionEl._nwTestimonialTimer) {
      clearInterval(sectionEl._nwTestimonialTimer);
      sectionEl._nwTestimonialTimer = null;
    }
  }

  function getSlideCount(sliderEl) {
    return sliderEl.querySelectorAll('.swiper-wrapper > .swiper-slide').length;
  }

  function goNext(sectionEl) {
    var swiper = sectionEl._nwTestimonialSwiper;
    var slideCount = sectionEl._nwTestimonialSlideCount || 0;
    if (!swiper || slideCount <= 1) {
      return;
    }
    if (sectionEl._nwTestimonialLoopEnabled) {
      swiper.slideNext();
      return;
    }
    if (swiper.isEnd) {
      swiper.slideTo(0);
    } else {
      swiper.slideNext();
    }
  }

  function goPrev(sectionEl) {
    var swiper = sectionEl._nwTestimonialSwiper;
    var slideCount = sectionEl._nwTestimonialSlideCount || 0;
    if (!swiper || slideCount <= 1) {
      return;
    }
    if (sectionEl._nwTestimonialLoopEnabled) {
      swiper.slidePrev();
      return;
    }
    if (swiper.isBeginning) {
      swiper.slideTo(slideCount - 1);
    } else {
      swiper.slidePrev();
    }
  }

  function updateArrowState(sectionEl) {
    var slideCount = sectionEl._nwTestimonialSlideCount || 0;
    var prevEl = sectionEl.querySelector('[data-nw-testimonial-prev]');
    var nextEl = sectionEl.querySelector('[data-nw-testimonial-next]');
    var disabled = slideCount <= 1;

    if (prevEl) {
      prevEl.disabled = disabled;
    }
    if (nextEl) {
      nextEl.disabled = disabled;
    }
  }

  function bindSectionControls(sectionEl) {
    if (sectionEl._nwTestimonialControlsBound) {
      return;
    }

    sectionEl._nwTestimonialControlsBound = true;

    sectionEl.addEventListener('click', function (event) {
      if (event.target.closest('[data-nw-testimonial-prev]')) {
        event.preventDefault();
        goPrev(sectionEl);
      }
      if (event.target.closest('[data-nw-testimonial-next]')) {
        event.preventDefault();
        goNext(sectionEl);
      }
    });
  }

  function createSwiper(sliderEl, speed, slideCount, loopEnabled) {
    var useLoop = loopEnabled && slideCount > 1;

    return new Swiper(sliderEl, {
      slidesPerView: 1,
      speed: speed,
      allowTouchMove: slideCount > 1,
      watchOverflow: true,
      loop: useLoop,
      observer: true,
      observeParents: true,
      resistanceRatio: 0,
    });
  }

  function initNwTestimonialSection(sectionEl) {
    if (sectionEl.getAttribute('data-nw-testimonial-initialized') === 'true') {
      return;
    }

    var sliderEl = sectionEl.querySelector('[data-nw-testimonial-slider]');
    if (!sliderEl || typeof Swiper === 'undefined') {
      return;
    }

    var slideCount = getSlideCount(sliderEl);
    if (slideCount < 1) {
      return;
    }

    clearTestimonialAutoplay(sectionEl);
    bindSectionControls(sectionEl);

    if (sliderEl.swiper) {
      sliderEl.swiper.destroy(true, true);
    }

    var speed = parseInt(sectionEl.getAttribute('data-transition-duration'), 10);
    if (Number.isNaN(speed)) {
      speed = 600;
    }

    var autoplayEnabled = sectionEl.getAttribute('data-autoplay') === 'true';
    var autoplayDelay = parseInt(sectionEl.getAttribute('data-autoplay-delay'), 10);
    if (Number.isNaN(autoplayDelay)) {
      autoplayDelay = 5000;
    }

    var loopEnabled = sectionEl.getAttribute('data-enable-loop') === 'true';
    sectionEl._nwTestimonialLoopEnabled = loopEnabled && slideCount > 1;

    var swiper = createSwiper(sliderEl, speed, slideCount, loopEnabled);
    sectionEl._nwTestimonialSwiper = swiper;
    sectionEl._nwTestimonialSlideCount = slideCount;

    updateArrowState(sectionEl);

    if (autoplayEnabled && slideCount > 1) {
      sectionEl._nwTestimonialTimer = setInterval(function () {
        goNext(sectionEl);
      }, autoplayDelay);
    }

    sectionEl.setAttribute('data-nw-testimonial-initialized', 'true');
  }

  function initNwTestimonialSections() {
    if (typeof Swiper === 'undefined') {
      window.setTimeout(initNwTestimonialSections, 50);
      return;
    }

    document.querySelectorAll('[data-nw-testimonial]:not([data-nw-testimonial-initialized])').forEach(function (sectionEl) {
      initNwTestimonialSection(sectionEl);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNwTestimonialSections);
  } else {
    initNwTestimonialSections();
  }

  document.addEventListener('shopify:section:load', function (event) {
    var sectionEl = event.target.querySelector('[data-nw-testimonial]');
    if (!sectionEl) {
      return;
    }

    clearTestimonialAutoplay(sectionEl);
    sectionEl.removeAttribute('data-nw-testimonial-initialized');
    sectionEl._nwTestimonialSwiper = null;

    var sliderEl = sectionEl.querySelector('[data-nw-testimonial-slider]');
    if (sliderEl && sliderEl.swiper) {
      sliderEl.swiper.destroy(true, true);
    }

    initNwTestimonialSection(sectionEl);
  });
})();
