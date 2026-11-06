/**
 * AJAX product switching for NW size / thickness pickers (Section Rendering API).
 */
(function initNwPdpProductSwitch() {
  if (window.__nwPdpProductSwitchInit) return;
  window.__nwPdpProductSwitchInit = true;

  let popstateNavigation = false;

  window.nwPdpProductSwitchOnNavigate = () => {};

  function getProductForm() {
    return document.querySelector('product-form.js-product');
  }

  function getVariantPicker() {
    return getProductForm()?.querySelector('variant-picker') ?? null;
  }

  function getThicknessPicker() {
    return getProductForm()?.querySelector('nw-thickness-picker') ?? null;
  }

  function normalizePath(url) {
    return new URL(url, window.location.origin).pathname.replace(/\/$/, '') || '/';
  }

  function resolveSizeSwitchUrl(link) {
    const target = link.dataset.nwSizeTarget;
    const thickness = getThicknessPicker();
    if (target === 'men' && thickness?.dataset.activeMensUrl) {
      return thickness.dataset.activeMensUrl;
    }
    if (target === 'women' && thickness?.dataset.activeWomensUrl) {
      return thickness.dataset.activeWomensUrl;
    }
    return link.getAttribute('href') || '';
  }

  function isSwitchInProgress() {
    const vp = getVariantPicker();
    return vp?.dataset.nwSwitchLoading === 'true';
  }

  function switchProduct(productUrl, options) {
    const vp = getVariantPicker();
    if (!vp || typeof vp.switchProduct !== 'function') {
      return Promise.resolve(false);
    }

    if (normalizePath(productUrl) === normalizePath(window.location.pathname)) {
      return Promise.resolve(true);
    }

    if (isSwitchInProgress()) {
      return Promise.resolve(false);
    }

    vp.dataset.nwSwitchLoading = 'true';
    return vp.switchProduct(productUrl, options)
      .then(() => true)
      .catch(() => false)
      .finally(() => {
        delete vp.dataset.nwSwitchLoading;
      });
  }

  window.nwPdpProductSwitch = { switchProduct };

  document.addEventListener('click', (evt) => {
    const sizeLink = evt.target.closest('.nw-product-size-links__link[href][data-nw-size-target]');
    if (!sizeLink || !sizeLink.closest('.nw-product-size-links')) return;
    if (sizeLink.classList.contains('is-active')) return;

    const productUrl = resolveSizeSwitchUrl(sizeLink);
    if (!productUrl) return;

    evt.preventDefault();
    switchProduct(productUrl, { pushState: true });
  });

  window.addEventListener('popstate', () => {
    if (popstateNavigation) return;

    const vp = getVariantPicker();
    if (!vp || typeof vp.switchProduct !== 'function') return;

    popstateNavigation = true;
    const destination = `${window.location.pathname}${window.location.search}`;

    vp.dataset.nwSwitchLoading = 'true';
    vp.switchProduct(`${window.location.pathname}${window.location.search}`, { pushState: false })
      .finally(() => {
        delete vp.dataset.nwSwitchLoading;
        popstateNavigation = false;
        window.nwPdpProductSwitchOnNavigate(destination);
      });
  });
})();
