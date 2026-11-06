(function () {
  function parseStepNumber(el) {
    var n = parseInt(el.getAttribute('data-nw-quiz-step'), 10);
    return Number.isFinite(n) ? n : 0;
  }

  function parseProgressStep(el) {
    var n = parseInt(el.getAttribute('data-progress-step'), 10);
    if (Number.isFinite(n) && n > 0) {
      return n;
    }
    return parseStepNumber(el);
  }

  function getSteps(root) {
    var steps = Array.prototype.slice.call(root.querySelectorAll('.nw-quiz__step[data-nw-quiz-step]'));
    steps.sort(function (a, b) {
      return parseStepNumber(a) - parseStepNumber(b);
    });
    return steps;
  }

  function getStepNumbers(steps) {
    return steps.map(parseStepNumber).filter(function (n) {
      return n > 0;
    });
  }

  function findStepByNumber(steps, stepNumber) {
    for (var i = 0; i < steps.length; i++) {
      if (parseStepNumber(steps[i]) === stepNumber) {
        return steps[i];
      }
    }
    return null;
  }

  function getStepType(stepEl) {
    return stepEl.getAttribute('data-step-type') || 'choices';
  }

  function applyShopLinks(root, url) {
    if (!url) {
      return;
    }
    root.querySelectorAll('[data-nw-quiz-result-link]').forEach(function (link) {
      link.setAttribute('href', url);
    });
  }

  function isProgressStepComplete(progressN, state, steps) {
    if (progressN === 5) {
      return Boolean(state.pearlerContinued);
    }

    for (var i = 0; i < steps.length; i++) {
      var stepEl = steps[i];
      if (parseProgressStep(stepEl) !== progressN) {
        continue;
      }

      var stepNumber = parseStepNumber(stepEl);
      var type = getStepType(stepEl);

      if (type === 'choices_multi') {
        var max = parseInt(stepEl.getAttribute('data-multi-max') || '3', 10);
        if (getMultiSelection(stepEl).length >= max) {
          return true;
        }
        continue;
      }

      if (type === 'choices') {
        if (stepNumber === 2) {
          var sizeGender = getQuizSizeGender(state);
          return Boolean(
            stepEl.querySelector(
              '[data-nw-quiz-option][data-shoe-size-gender="' + sizeGender + '"].is-selected'
            )
          );
        }
        if (state.selections[stepNumber]) {
          return true;
        }
      }
    }

    return false;
  }

  function updateProgress(root, state, steps) {
    root.querySelectorAll('[data-nw-quiz-progress-step]').forEach(function (item) {
      var n = parseInt(item.getAttribute('data-nw-quiz-progress-step'), 10);
      item.classList.remove('is-active', 'is-complete');
      if (isProgressStepComplete(n, state, steps)) {
        item.classList.add('is-active');
      }
    });
  }

  function getMultiSelection(stepEl) {
    return Array.prototype.slice
      .call(stepEl.querySelectorAll('[data-nw-quiz-option-multi].is-selected'))
      .map(function (btn) {
        return btn.getAttribute('data-option-value') || '';
      })
      .filter(Boolean);
  }

  function destroyRecoSwiper(root) {
    if (root._nwQuizRecoSwiper) {
      root._nwQuizRecoSwiper.destroy(true, true);
      root._nwQuizRecoSwiper = null;
    }
  }

  function normalizeRecoType(type) {
    type = (type || '').toLowerCase().trim();
    if (type === 'clout') {
      return 'cloud';
    }
    return type;
  }

  function getQuizSizeGender(state) {
    if (state.styleGender === 'womens') {
      return 'womens';
    }
    if (state.styleGender === 'mens') {
      return 'mens';
    }
    return 'womens';
  }

  function updateStep2GenderSizes(root, state) {
    var step2 = root.querySelector('.nw-quiz__step[data-nw-quiz-step="2"]');
    if (!step2) {
      return;
    }
    var gender = getQuizSizeGender(state);
    step2.querySelectorAll('.nw-quiz__size-group[data-shoe-size-gender]').forEach(function (group) {
      var groupGender = group.getAttribute('data-shoe-size-gender');
      var isActiveGroup = groupGender === gender;
      group.hidden = !isActiveGroup;
      if (!isActiveGroup) {
        group.querySelectorAll('[data-nw-quiz-option].is-selected').forEach(function (btn) {
          btn.classList.remove('is-selected');
        });
      }
    });
    var activeGroup = step2.querySelector('.nw-quiz__size-group[data-shoe-size-gender="' + gender + '"]');
    var selected =
      activeGroup &&
      activeGroup.querySelector('[data-nw-quiz-option][data-shoe-size-gender="' + gender + '"].is-selected');
    if (selected) {
      state.selections[2] = selected.getAttribute('data-option-value') || '';
      state.shoeSizeValue = selected.getAttribute('data-shoe-size-value') || '';
    } else {
      delete state.selections[2];
      state.shoeSizeValue = '';
    }
  }

  function syncShoeSizeValueFromStep2(root, state) {
    var step2 = root.querySelector('.nw-quiz__step[data-nw-quiz-step="2"]');
    if (!step2) {
      return;
    }
    var gender = getQuizSizeGender(state);
    var selected = step2.querySelector(
      '[data-nw-quiz-option][data-shoe-size-gender="' + gender + '"].is-selected'
    );
    if (!selected) {
      return;
    }
    var sizeValue = selected.getAttribute('data-shoe-size-value') || '';
    if (sizeValue) {
      state.shoeSizeValue = sizeValue;
    }
  }

  function updatePearlerHeading(root, state) {
    syncShoeSizeValueFromStep2(root, state);
    var sizeLabel = state.shoeSizeValue || '';
    root.querySelectorAll('[data-nw-quiz-pearler-heading]').forEach(function (headingEl) {
      var template = headingEl.getAttribute('data-heading-template') || headingEl.textContent || '';
      if (!sizeLabel) {
        headingEl.textContent = template.replace(/\[size\]/gi, '—');
        return;
      }
      headingEl.textContent = template.replace(/\[size\]/gi, sizeLabel);
    });
  }

  function applyRecoDisplaySlot(displayItem, sourceItem, headingText) {
    var headingEl = displayItem.querySelector('[data-nw-quiz-reco-heading]');
    var mount = displayItem.querySelector('[data-nw-quiz-reco-card-mount]');
    var defaultHeading = sourceItem.querySelector('[data-nw-quiz-reco-heading-default]');
    var sourceCard = sourceItem.querySelector('.nw-quiz__reco-card--link, .nw-quiz__reco-card');
    if (!mount || !sourceCard) {
      return;
    }
    if (headingEl) {
      var fallback = defaultHeading ? defaultHeading.textContent : '';
      headingEl.textContent = headingText || fallback;
    }
    mount.innerHTML = '';
    mount.appendChild(sourceCard.cloneNode(true));
  }

  function updateRecommendations(root, state) {
    var step6 = root.querySelector('[data-step-type="recommendations"]');
    if (!step6) {
      return;
    }

    var gender = state.styleGender === 'womens' ? 'womens' : 'mens';
    var lists = step6.querySelectorAll('[data-reco-gender]');
    lists.forEach(function (list) {
      var isMatch = list.getAttribute('data-reco-gender') === gender;
      list.hidden = !isMatch;
    });

    var activeList = step6.querySelector('[data-reco-gender="' + gender + '"]');
    if (!activeList) {
      return;
    }

    var displayItems = activeList.querySelectorAll('[data-reco-display-slot]');
    var order = state.recoSelectionOrder || [];

    displayItems.forEach(function (displayItem, index) {
      var selection = order[index];
      if (!selection) {
        return;
      }
      var type = normalizeRecoType(selection.type);
      if (!type) {
        return;
      }
      var source = activeList.querySelector('.nw-quiz__reco-item--source[data-reco-type="' + type + '"]');
      if (source) {
        applyRecoDisplaySlot(displayItem, source, selection.heading);
      }
    });

    var swiperWrapper = step6.querySelector('[data-nw-quiz-reco-swiper-wrapper]');
    var liveHeading = step6.querySelector('[data-nw-quiz-reco-live-heading]');
    if (!swiperWrapper) {
      return;
    }

    swiperWrapper.innerHTML = '';
    displayItems.forEach(function (item, index) {
      var slide = document.createElement('div');
      slide.className = 'swiper-slide nw-quiz__reco-slide';
      slide.setAttribute('data-reco-slide-index', String(index));

      var heading = item.querySelector('.nw-quiz__reco-heading');
      if (heading) {
        var slideHeading = document.createElement('p');
        slideHeading.className = 'nw-quiz__reco-slide-heading';
        slideHeading.textContent = heading.textContent;
        slide.appendChild(slideHeading);
      }

      var card = item.querySelector('.nw-quiz__reco-card-mount');
      if (card) {
        slide.appendChild(card.cloneNode(true));
      }

      swiperWrapper.appendChild(slide);
    });

    destroyRecoSwiper(root);

    if (typeof Swiper === 'undefined') {
      return;
    }

    var swiperEl = step6.querySelector('[data-nw-quiz-reco-swiper]');
    if (!swiperEl) {
      return;
    }

    root._nwQuizRecoSwiper = new Swiper(swiperEl, {
      slidesPerView: 1.15,
      spaceBetween: 16,
      speed: 450,
      grabCursor: true,
      watchOverflow: true,
      preventClicks: false,
      preventClicksPropagation: false,
      pagination: {
        el: swiperEl.querySelector('.swiper-pagination'),
        clickable: true,
      },
      on: {
        init: function (swiper) {
          updateLiveRecoHeading(swiper, liveHeading);
        },
        slideChange: function (swiper) {
          updateLiveRecoHeading(swiper, liveHeading);
        },
      },
    });

    if (liveHeading && displayItems[0]) {
      var firstHeading = displayItems[0].querySelector('.nw-quiz__reco-heading');
      if (firstHeading) {
        liveHeading.textContent = firstHeading.textContent;
      }
    }
  }

  function updateLiveRecoHeading(swiper, liveHeading) {
    if (!liveHeading || !swiper || !swiper.slides) {
      return;
    }
    var activeSlide = swiper.slides[swiper.activeIndex];
    if (!activeSlide) {
      return;
    }
    var slideHeading = activeSlide.querySelector('.nw-quiz__reco-slide-heading');
    if (slideHeading) {
      liveHeading.textContent = slideHeading.textContent;
    }
  }

  function stepHasSelection(stepEl, state) {
    var stepNumber = parseStepNumber(stepEl);
    var type = getStepType(stepEl);

    if (type === 'choices_multi') {
      return getMultiSelection(stepEl).length >= parseInt(stepEl.getAttribute('data-multi-max') || '3', 10);
    }

    if (type === 'pearler_result') {
      return Boolean(state.pearlerContinued);
    }

    if (type === 'recommendations' || type === 'result') {
      return true;
    }

    if (stepNumber === 2) {
      var sizeGender = getQuizSizeGender(state);
      return Boolean(
        stepEl.querySelector(
          '[data-nw-quiz-option][data-shoe-size-gender="' + sizeGender + '"].is-selected'
        )
      );
    }

    return Boolean(state.selections[stepNumber]);
  }

  function setActiveStep(root, steps, stepNumber, state) {
    var target = findStepByNumber(steps, stepNumber);
    if (!target) {
      return;
    }

    steps.forEach(function (stepEl) {
      stepEl.classList.toggle('is-active', stepEl === target);
    });

    root.querySelectorAll('[data-nw-quiz-step-header]').forEach(function (headerEl) {
      var headerStep = parseInt(headerEl.getAttribute('data-nw-quiz-step'), 10);
      headerEl.classList.toggle('is-active', headerStep === stepNumber);
    });

    state.currentStep = stepNumber;
    root.setAttribute('data-active-step', String(stepNumber));
    root.classList.forEach(function (className) {
      if (className.indexOf('nw-step-') === 0) {
        root.classList.remove(className);
      }
    });
    root.classList.add('nw-step-' + stepNumber);
    updateProgress(root, state, steps);

    var stepNumbers = getStepNumbers(steps);
    var isFirst = stepNumber === stepNumbers[0];
    var stepType = getStepType(target);
    var isRecommendations = stepType === 'recommendations';

    if (!isRecommendations) {
      destroyRecoSwiper(root);
    }

    var prevBtn = root.querySelector('[data-nw-quiz-prev]');
    var nextBtn = root.querySelector('[data-nw-quiz-next]');
    var backBtn = root.querySelector('[data-nw-quiz-back]');

    if (prevBtn) {
      prevBtn.disabled = isFirst;
    }
    if (backBtn) {
      backBtn.disabled = isFirst;
    }
    if (nextBtn) {
      var hideNext = isRecommendations || stepType === 'result';
      nextBtn.hidden = hideNext;
      nextBtn.style.display = hideNext ? 'none' : '';
      nextBtn.disabled = hideNext || !stepHasSelection(target, state);
    }

    applyShopLinks(root, state.styleProductUrl);
    updateStep2GenderSizes(root, state);
    updatePearlerHeading(root, state);

    if (isRecommendations) {
      updateRecommendations(root, state);
    }
  }

  function getAdjacentStepNumber(steps, current, direction) {
    var numbers = getStepNumbers(steps);
    var index = numbers.indexOf(current);
    if (index === -1) {
      return current;
    }
    var nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= numbers.length) {
      return current;
    }
    return numbers[nextIndex];
  }

  function advanceStep(root, steps, state, fromStepNumber) {
    var nextStep = getAdjacentStepNumber(steps, fromStepNumber, 1);
    if (nextStep !== fromStepNumber) {
      window.setTimeout(function () {
        setActiveStep(root, steps, nextStep, state);
      }, 220);
    }
  }

  function initQuiz(root) {
    if (root._nwQuizInit) {
      return;
    }
    root._nwQuizInit = true;

    var steps = getSteps(root);
    if (!steps.length) {
      return;
    }

    var stepNumbers = getStepNumbers(steps);
    var firstStep = stepNumbers[0];

    var state = {
      currentStep: firstStep,
      selections: {},
      multiSelections: {},
      recoSelectionOrder: [],
      styleProductUrl: '',
      styleGender: '',
      shoeSizeValue: '',
      pearlerContinued: false,
    };

    setActiveStep(root, steps, firstStep, state);
    updateStep2GenderSizes(root, state);
    updatePearlerHeading(root, state);

    root.addEventListener('click', function (event) {
      var pearlerBtn = event.target.closest('[data-nw-quiz-pearler-continue]');
      if (pearlerBtn && root.contains(pearlerBtn)) {
        state.pearlerContinued = true;
        updateProgress(root, state, steps);
        advanceStep(root, steps, state, state.currentStep);
        return;
      }

      var optionBtn = event.target.closest('[data-nw-quiz-option]');
      if (optionBtn && root.contains(optionBtn)) {
        var stepEl = optionBtn.closest('[data-nw-quiz-step]');
        if (!stepEl || !stepEl.classList.contains('is-active')) {
          return;
        }

        var stepNumber = parseStepNumber(stepEl);
        var stepType = getStepType(stepEl);

        if (stepType === 'choices_multi') {
          var max = parseInt(stepEl.getAttribute('data-multi-max') || '3', 10);
          var selected = stepEl.querySelectorAll('[data-nw-quiz-option-multi].is-selected');
          var optionValue = optionBtn.getAttribute('data-option-value') || '';
          var recoHeading = optionBtn.getAttribute('data-reco-heading') || '';
          var recoType = optionBtn.getAttribute('data-reco-type') || '';

          if (optionBtn.classList.contains('is-selected')) {
            optionBtn.classList.remove('is-selected');
            state.recoSelectionOrder = state.recoSelectionOrder.filter(function (entry) {
              return entry.value !== optionValue;
            });
          } else if (selected.length < max) {
            optionBtn.classList.add('is-selected');
            state.recoSelectionOrder.push({
              value: optionValue,
              heading: recoHeading,
              type: recoType,
            });
          } else {
            return;
          }

          var values = getMultiSelection(stepEl);
          state.multiSelections[stepNumber] = values;
          state.selections[stepNumber] = values.join(',');

          var nextBtn = root.querySelector('[data-nw-quiz-next]');
          if (nextBtn) {
            nextBtn.disabled = values.length < max;
          }

          updateProgress(root, state, steps);

          if (values.length >= max) {
            advanceStep(root, steps, state, stepNumber);
          }
          return;
        }

        var deselectSelector = '[data-nw-quiz-option].is-selected';
        if (stepNumber === 2) {
          var sizeGender = optionBtn.getAttribute('data-shoe-size-gender') || getQuizSizeGender(state);
          deselectSelector =
            '[data-nw-quiz-option][data-shoe-size-gender="' + sizeGender + '"].is-selected';
        }
        stepEl.querySelectorAll(deselectSelector).forEach(function (btn) {
          btn.classList.remove('is-selected');
        });
        optionBtn.classList.add('is-selected');
        state.selections[stepNumber] = optionBtn.getAttribute('data-option-value') || '';

        if (stepNumber === firstStep) {
          state.styleGender = optionBtn.getAttribute('data-option-value') || '';
          if (optionBtn.getAttribute('data-product-url')) {
            state.styleProductUrl = optionBtn.getAttribute('data-product-url');
            applyShopLinks(root, state.styleProductUrl);
          }
          updateStep2GenderSizes(root, state);
        }

        if (stepNumber === 2) {
          state.shoeSizeValue = optionBtn.getAttribute('data-shoe-size-value') || '';
          updatePearlerHeading(root, state);
        }

        var nextButton = root.querySelector('[data-nw-quiz-next]');
        if (nextButton) {
          nextButton.disabled = false;
        }

        updateProgress(root, state, steps);
        advanceStep(root, steps, state, stepNumber);
        return;
      }

      var prevBtn = event.target.closest('[data-nw-quiz-prev]');
      if (prevBtn && root.contains(prevBtn) && !prevBtn.disabled) {
        var prevStep = getAdjacentStepNumber(steps, state.currentStep, -1);
        if (prevStep !== state.currentStep) {
          setActiveStep(root, steps, prevStep, state);
        }
        return;
      }

      var nextNav = event.target.closest('[data-nw-quiz-next]');
      if (nextNav && root.contains(nextNav) && !nextNav.disabled) {
        var forwardStep = getAdjacentStepNumber(steps, state.currentStep, 1);
        if (forwardStep !== state.currentStep) {
          setActiveStep(root, steps, forwardStep, state);
        }
        return;
      }

      var backBtn = event.target.closest('[data-nw-quiz-back]');
      if (backBtn && root.contains(backBtn) && !backBtn.disabled) {
        var backStep = getAdjacentStepNumber(steps, state.currentStep, -1);
        if (backStep !== state.currentStep) {
          setActiveStep(root, steps, backStep, state);
        }
      }
    });
  }

  function initAll() {
    document.querySelectorAll('[data-nw-quiz]').forEach(initQuiz);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', function (event) {
    var root = event.target.querySelector('[data-nw-quiz]');
    if (root) {
      destroyRecoSwiper(root);
      root._nwQuizInit = false;
      initQuiz(root);
    }
  });
})();
