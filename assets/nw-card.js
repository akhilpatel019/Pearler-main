(function () {
  function playTeaserVideos() {
    document.querySelectorAll('.nw-card__figure-video').forEach(function (video) {
      video.play().catch(function () {});
    });
  }

  function playModalVideo(modal) {
    var video = modal.querySelector('.nw-card__modal-video');
    if (!video) return;
    video.play().catch(function () {});
  }

  function pauseModalVideo(modal) {
    var video = modal.querySelector('.nw-card__modal-video');
    if (video) {
      video.pause();
    }
  }

  function bindNwCardVideoModals(root) {
    (root || document).querySelectorAll('.nw-card__video-modal:not([data-nw-card-modal-bound])').forEach(function (modal) {
      modal.setAttribute('data-nw-card-modal-bound', 'true');

      var observer = new MutationObserver(function () {
        if (modal.hasAttribute('open')) {
          playTeaserVideos();
          window.requestAnimationFrame(function () {
            playModalVideo(modal);
          });
        } else {
          pauseModalVideo(modal);
          window.setTimeout(function () {
            playTeaserVideos();
          }, 0);
        }
      });

      observer.observe(modal, { attributes: true, attributeFilter: ['open'] });
    });
  }

  function initNwCard() {
    bindNwCardVideoModals();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNwCard);
  } else {
    initNwCard();
  }

  document.addEventListener('shopify:section:load', function (event) {
    bindNwCardVideoModals(event.target);
  });
})();
