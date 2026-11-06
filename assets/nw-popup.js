/**
 * Opens NW Popup modals from [data-nw-popup-target] triggers (links, buttons, icons).
 */
if (!window.nwPopupTriggersBound) {
  window.nwPopupTriggersBound = true;

  document.addEventListener('click', (evt) => {
    const trigger = evt.target.closest('[data-nw-popup-target]');
    if (!trigger) return;

    const popupId = trigger.dataset.nwPopupTarget;
    if (!popupId) return;

    const modal = document.getElementById(popupId);
    if (!modal || !modal.matches('modal-dialog')) return;

    evt.preventDefault();
    modal.open(trigger);
  });
}
