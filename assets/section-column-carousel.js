/**
 * Column Carousel – component-based Swiper for column-carousel section.
 * Uses window.Swiper (theme loads swiper7.4.1.min.js).
 */

const SELECTOR_CAROUSEL = '.js-columnCarousel';
const SELECTOR_SLIDE = '.js-columnSlide';
const SELECTOR_NAV = '.js-columnNavigation';
const SELECTOR_CURRENT = '.js-columnCurrent';

class ColumnCarousel extends HTMLElement {
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
    if (target.querySelector('[data-component="columnCarousel"]')) {
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
    const nextEl = elCarousel.querySelector(`${SELECTOR_NAV} .next`);
    const prevEl = elCarousel.querySelector(`${SELECTOR_NAV} .prev`);
    const elCurrent = elCarousel.querySelector(SELECTOR_CURRENT);

    const options = {
      loop: true,
      loopedSlides: slideCount,
      navigation: {
        nextEl,
        prevEl,
      },
      slidesPerView: 'auto',
      breakpoints: {
        700: {
          loop: false,
          slidesPerView: 4,
          allowTouchMove: false,
          spaceBetween: 48,
        },
      },
    };

    this.swiper = new window.Swiper(elCarousel, options);

    if (elCurrent && this.swiper.on) {
      this.swiper.on('slideChange', (swiper) => {
        elCurrent.textContent = (swiper.realIndex ?? swiper.activeIndex) + 1;
      });
    }
  }

  destroy() {
    if (this.swiper && typeof this.swiper.destroy === 'function') {
      this.swiper.destroy(true, true);
      this.swiper = null;
    }
  }
}

if (!customElements.get('column-carousel')) {
  customElements.define('column-carousel', ColumnCarousel);
}
