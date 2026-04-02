/**
 * Cards Carousel – component-based Swiper for cards-carousel section.
 * Uses window.Swiper (theme loads swiper7.4.1.min.js).
 */

const SELECTOR_CAROUSEL = '.js-cardsCarousel';
const SELECTOR_SLIDE = '.js-cardsCarouselSlide';

class CardsCarousel extends HTMLElement {
  constructor() {
    super();
    this.swiper = null;
    this._sectionLoadHandler = this._onSectionChange.bind(this);
    this._sectionUnloadHandler = this._onSectionChange.bind(this);
  }

  connectedCallback() {
    this.init();
    document.addEventListener('shopify:section:load', this._sectionLoadHandler);
    document.addEventListener('shopify:section:unload', this._sectionUnloadHandler);
  }

  disconnectedCallback() {
    this.destroy();
    document.removeEventListener('shopify:section:load', this._sectionLoadHandler);
    document.removeEventListener('shopify:section:unload', this._sectionUnloadHandler);
  }

  _onSectionChange(evt) {
    const target = evt && evt.target;
    if (!target || typeof target.querySelector !== 'function') return;
    if (target.querySelector('[data-component="cardsCarousel"]')) {
      this.destroy();
      this.init();
    }
  }

  init() {
    if (!window.Swiper) return;

    const elCarousel = this.querySelector(SELECTOR_CAROUSEL);
    const elSlides = elCarousel ? elCarousel.querySelectorAll(SELECTOR_SLIDE) : [];

    if (!elCarousel || !elSlides.length) return;
    if (elCarousel.classList.contains('swiper-initialized')) return;

    const slideCount = elSlides.length;
    const options = {
      centeredSlides: true,
      slidesPerView: 'auto',
      loop: true,
      loopedSlides: slideCount,
      navigation: false,
      pagination: false,
      breakpoints: {
        700: {
          slidesPerView: 4,
          allowTouchMove: false,
          centeredSlides: false,
        },
      },
    };

    this.swiper = new window.Swiper(elCarousel, options);
  }

  destroy() {
    if (this.swiper && typeof this.swiper.destroy === 'function') {
      this.swiper.destroy(true, true);
      this.swiper = null;
    }
  }
}

if (!customElements.get('cards-carousel')) {
  customElements.define('cards-carousel', CardsCarousel);
}
