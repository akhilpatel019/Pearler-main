/* global theme */

const NW_TIER_REWARD_PROPERTY = '_nw_tier_reward';
const NW_FREE_GIFT_PROPERTY = 'Free gift';

const getTierRewardsConfig = () => {
  const configEl = document.querySelector('cart-drawer [data-nw-tier-rewards-config]');
  if (!configEl) return null;
  try {
    return JSON.parse(configEl.textContent);
  } catch (err) {
    return null;
  }
};

const getSectionElsToRefresh = () => ['page-header', 'cart-drawer']
  .map((sel) => document.querySelector(sel))
  .filter((el) => el?.dataset?.sectionId);

const applySectionUpdates = (sections) => {
  if (!sections) return;
  getSectionElsToRefresh().forEach((el) => {
    const html = sections[el.dataset.sectionId];
    if (!html) return;
    if (typeof el.updateFromCartChange === 'function') {
      el.updateFromCartChange(html);
    } else {
      el.querySelector('cart-form')?.refreshFromHtml(html);
    }
  });
};

const findTierRewardLine = (cart, tier) => cart.items.find(
  (item) => String(item.properties?.[NW_TIER_REWARD_PROPERTY]) === String(tier)
);

let nwTierRewardsSyncing = false;

const syncNwCartTierRewards = async () => {
  if (nwTierRewardsSyncing) return;

  const config = getTierRewardsConfig();
  if (!config?.tiers?.length) return;

  nwTierRewardsSyncing = true;
  try {
    const cartRes = await fetch(`${window.Shopify.routes.root}cart.js`);
    if (!cartRes.ok) return;
    const cart = await cartRes.json();

    const toAdd = [];
    const toRemove = [];

    config.tiers.forEach((tierConfig) => {
      if (!tierConfig.variantId) return;
      const line = findTierRewardLine(cart, tierConfig.tier);
      if (tierConfig.unlocked && !line) {
        toAdd.push(tierConfig);
      } else if (!tierConfig.unlocked && line) {
        toRemove.push(line.key);
      }
    });

    if (toAdd.length === 0 && toRemove.length === 0) return;

    const sectionEls = getSectionElsToRefresh();
    const sectionIds = sectionEls.map((el) => el.dataset.sectionId);

    for (const tierConfig of toAdd) {
      const formData = new FormData();
      formData.append('id', tierConfig.variantId);
      formData.append('quantity', 1);
      formData.append(`properties[${NW_TIER_REWARD_PROPERTY}]`, String(tierConfig.tier));
      formData.append('sections_url', window.location.pathname);
      if (sectionIds.length) {
        formData.append('sections', sectionIds.join(','));
      }

      // eslint-disable-next-line no-await-in-loop
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
      applySectionUpdates(data.sections);
    }

    if (toRemove.length) {
      const updates = {};
      toRemove.forEach((key) => {
        updates[key] = 0;
      });
      const sectionElsForRemove = getSectionElsToRefresh();
      const sectionIdsForRemove = sectionElsForRemove.map((el) => el.dataset.sectionId);
      const body = { updates };
      if (sectionIdsForRemove.length) {
        body.sections = sectionIdsForRemove.join(',');
        body.sections_url = window.location.pathname;
      }
      const response = await fetch(theme.routes.cartUpdate, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body)
      });
      if (!response.ok) return;
      const data = await response.json();
      if (data.sections && sectionIdsForRemove.length) {
        applySectionUpdates(data.sections);
      } else {
        document.dispatchEvent(new CustomEvent('on:cart:change', { bubbles: true }));
      }
    } else if (toAdd.length) {
      document.dispatchEvent(new CustomEvent('on:cart:change', { bubbles: true }));
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
  } finally {
    nwTierRewardsSyncing = false;
  }
};

window.syncNwCartTierRewards = syncNwCartTierRewards;

document.addEventListener('on:cart:after-merge', () => {
  syncNwCartTierRewards();
});

document.addEventListener('on:cart-drawer:before-open', () => {
  syncNwCartTierRewards();
});
