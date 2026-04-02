/**
 * Press Logo Bar – component-based JS for quotes carousel (mobile Swiper, desktop grid + autoplay).
 * Used by sections/press-logo-bar.liquid.
 */

const MOBILE_BREAKPOINT = 768;
const AUTOPLAY_DELAY = 5000;
const SWIPER_JS_URL = 'https://cdn.jsdelivr.net/npm/swiper@9/swiper-bundle.min.js';
const SWIPER_CSS_URL = 'https://cdn.jsdelivr.net/npm/swiper@9/swiper-bundle.min.css';
const INIT_ATTR = 'data-jrb11-initialized';

const selectors = {
  container: '.jrb11-quotes-container',
  wrapper: '.swiper-wrapper',
  slide: '.jrb11-quote-slide',
  logo: '.jrb11-logo-nav',
  progress: '.jrb11-progress-fill',
  logosWrapper: '.jrb11-desktop-logos-wrapper',
};

let assetsPromise = null;
let resizeTimeout = null;

function ensureSwiperAssets() {
  if (window.Swiper) return Promise.resolve();
  if (assetsPromise) return assetsPromise;

  assetsPromise = Promise.all([loadStylesheet(SWIPER_CSS_URL), loadScript(SWIPER_JS_URL)]).catch((error) => {
    console.error('JRB11: failed to load Swiper assets', error);
    assetsPromise = null;
  });

  return assetsPromise;
}

function loadStylesheet(href) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`link[href="${href}"]`)) {
      resolve();
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = resolve;
    link.onerror = reject;
    document.head.appendChild(link);
  });
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true' || existing.readyState === 'complete') {
        resolve();
        return;
      }
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function attachLogoHandlers(data) {
  if (!data.logoNavs.length) return;
  data.logoNavs.forEach((nav, idx) => {
    const handler = () => {
      if (window.innerWidth < MOBILE_BREAKPOINT) {
        if (data.swiper) data.swiper.slideToLoop(idx);
      } else {
        stopDesktopAutoplay(data);
        showDesktopSlide(data, idx);
        startDesktopAutoplay(data);
      }
    };
    nav.addEventListener('click', handler);
    if (!data.logoHandlers) data.logoHandlers = [];
    data.logoHandlers.push({ nav, handler });
  });
}

function updateProgress(data, index) {
  if (!data.progressFill || !data.slides.length) return;
  const segment = 100 / data.slides.length;
  data.progressFill.style.width = `${segment}%`;
  data.progressFill.style.marginLeft = `${segment * index}%`;
}

function centerDesktopLogo(data, index) {
  if (!data.logosWrapper || window.innerWidth < MOBILE_BREAKPOINT) return;
  const activeLogo = data.logoNavs[index];
  if (!activeLogo) return;

  const wrapperWidth = data.logosWrapper.offsetWidth;
  const logoLeft = activeLogo.offsetLeft;
  const logoWidth = activeLogo.offsetWidth;
  const scrollPosition = logoLeft - wrapperWidth / 2 + logoWidth / 2;
  const maxScrollLeft = data.logosWrapper.scrollWidth - wrapperWidth;
  const targetScroll = Math.max(0, Math.min(scrollPosition, maxScrollLeft));

  data.logosWrapper.scrollTo({ left: targetScroll, behavior: 'smooth' });
}

function showDesktopSlide(data, index) {
  const total = data.slides.length;
  if (!total) return;
  const newIndex = ((index % total) + total) % total;
  data.currentIndex = newIndex;

  data.slides.forEach((slide) => slide.classList.remove('active'));
  data.logoNavs.forEach((nav) => nav.classList.remove('active'));

  const activeSlide = data.slides[newIndex];
  if (activeSlide) activeSlide.classList.add('active');
  const activeLogo = data.logoNavs[newIndex];
  if (activeLogo) activeLogo.classList.add('active');

  updateProgress(data, newIndex);
  centerDesktopLogo(data, newIndex);
}

function stopDesktopAutoplay(data) {
  if (data.desktopTimer) {
    clearInterval(data.desktopTimer);
    data.desktopTimer = null;
  }
}

function startDesktopAutoplay(data) {
  if (data.slides.length <= 1) return;
  stopDesktopAutoplay(data);
  data.desktopTimer = setInterval(() => {
    showDesktopSlide(data, data.currentIndex + 1);
  }, AUTOPLAY_DELAY);
}

function destroyMobile(data) {
  if (data.swiper) {
    const idx = data.swiper.realIndex || 0;
    data.swiper.destroy(true, true);
    data.swiper = null;
    data.currentIndex = idx;
  }
  data.mobileInitPromise = null;
}

function enableDesktop(data) {
  if (data.mode === 'desktop') return;
  destroyMobile(data);
  if (data.currentIndex >= data.slides.length) data.currentIndex = 0;
  showDesktopSlide(data, data.currentIndex);
  startDesktopAutoplay(data);
  data.mode = 'desktop';
}

function enableMobile(data) {
  if (data.swiper) {
    data.mode = 'mobile';
    if (data.swiper.autoplay) data.swiper.autoplay.start();
    updateProgress(data, data.swiper.realIndex || 0);
    return;
  }

  if (data.mobileInitPromise) return;

  stopDesktopAutoplay(data);
  data.slides.forEach((slide) => slide.classList.remove('active'));
  data.logoNavs.forEach((nav) => nav.classList.remove('active'));

  data.mobileInitPromise = ensureSwiperAssets()
    .then(() => {
      data.mobileInitPromise = null;
      if (window.innerWidth >= MOBILE_BREAKPOINT || data.swiper) return;

      data.swiper = new window.Swiper(data.container, {
        loop: true,
        slidesPerView: 1,
        allowTouchMove: true,
        autoplay: {
          delay: AUTOPLAY_DELAY,
          disableOnInteraction: false,
        },
        on: {
          init: (swiper) => {
            const idx = swiper.realIndex || 0;
            data.currentIndex = idx;
            updateProgress(data, idx);
          },
          slideChange: (swiper) => {
            const idx = swiper.realIndex || 0;
            data.currentIndex = idx;
            updateProgress(data, idx);
          },
        },
      });

      if (data.currentIndex > 0) {
        data.swiper.slideToLoop(data.currentIndex, 0);
      }
      data.mode = 'mobile';
    })
    .catch((error) => {
      console.error('JRB11: mobile initialisation failed', error);
      data.mobileInitPromise = null;
    });
}

function updateMode(data) {
  if (!data.section.isConnected) return;
  if (window.innerWidth < MOBILE_BREAKPOINT) {
    enableMobile(data);
  } else {
    enableDesktop(data);
  }
}

function createInstance(section) {
  const container = section.querySelector(selectors.container);
  if (!container) return null;
  const wrapper = container.querySelector(selectors.wrapper);
  if (!wrapper) return null;
  const slides = Array.from(wrapper.querySelectorAll(selectors.slide));
  if (!slides.length) return null;
  const logoNavs = Array.from(section.querySelectorAll(selectors.logo));
  const progressFill = section.querySelector(selectors.progress);
  const logosWrapper = section.querySelector(selectors.logosWrapper);

  slides.forEach((slide, idx) => {
    slide.dataset.slideIndex = idx;
    if (!slide.classList.contains('swiper-slide')) {
      slide.classList.add('swiper-slide');
    }
  });
  if (!wrapper.classList.contains('swiper-wrapper')) {
    wrapper.classList.add('swiper-wrapper');
  }

  const data = {
    section,
    container,
    wrapper,
    slides,
    logoNavs,
    progressFill,
    logosWrapper,
    swiper: null,
    desktopTimer: null,
    currentIndex: 0,
    mode: null,
    mobileInitPromise: null,
    logoHandlers: [],
    resizeHandler: null,
    visibilityHandler: null,
  };

  attachLogoHandlers(data);
  updateProgress(data, 0);
  updateMode(data);

  data.resizeHandler = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => updateMode(data), 150);
  };
  window.addEventListener('resize', data.resizeHandler);

  data.visibilityHandler = () => {
    if (document.hidden) {
      stopDesktopAutoplay(data);
      if (data.swiper && data.swiper.autoplay) data.swiper.autoplay.stop();
    } else {
      updateMode(data);
    }
  };
  document.addEventListener('visibilitychange', data.visibilityHandler);

  return data;
}

function destroyInstance(section) {
  const data = section._jrb11Instance;
  if (!data) return;

  stopDesktopAutoplay(data);
  destroyMobile(data);

  if (data.logoHandlers) {
    data.logoHandlers.forEach(({ nav, handler }) => {
      nav.removeEventListener('click', handler);
    });
  }
  if (data.resizeHandler) {
    window.removeEventListener('resize', data.resizeHandler);
  }
  if (data.visibilityHandler) {
    document.removeEventListener('visibilitychange', data.visibilityHandler);
  }

  section.removeAttribute(INIT_ATTR);
  delete section._jrb11Instance;
}

class PressLogoBar extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    if (location.pathname !== '/') return;
    if (this.hasAttribute(INIT_ATTR)) return;

    const data = createInstance(this);
    if (!data) return;

    this.setAttribute(INIT_ATTR, 'true');
    this._jrb11Instance = data;

    this._popstateHandler = () => {
      if (location.pathname !== '/') {
        destroyInstance(this);
      }
    };
    window.addEventListener('popstate', this._popstateHandler);
  }

  disconnectedCallback() {
    destroyInstance(this);
    if (this._popstateHandler) {
      window.removeEventListener('popstate', this._popstateHandler);
      this._popstateHandler = null;
    }
  }
}

if (!customElements.get('press-logo-bar')) {
  customElements.define('press-logo-bar', PressLogoBar);
}
