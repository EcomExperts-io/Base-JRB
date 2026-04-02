export class ProductInfo extends HTMLElement {
  abortController = undefined;
  swiper = undefined;

  constructor() {
    super();
  }

  setupEventListeners() {
    this.variantSelector?.addEventListener('change', this.onVariantChange.bind(this));
    this.quantitySelector?.addEventListener('change', this.onQuantitySelectorEvent.bind(this));
    this.quantitySelector?.querySelector('button[name="plus"]')?.addEventListener('click', this.onQuantitySelectorEvent.bind(this));
    this.quantitySelector?.querySelector('button[name="minus"]')?.addEventListener('click', this.onQuantitySelectorEvent.bind(this));

    // Shade tab filtering
    this.setupShadeTabFiltering();

    // Shade description update on swatch change
    this.setupShadeDescription();
  }

  connectedCallback() {
    this.setupEventListeners();
    this.initSwiper();

    // On initial load, swap gallery to selected variant's metafield images
    this.initVariantGallery();

    this.initStickyBar();
  }

  initVariantGallery() {
    const variantMediaData = this.getVariantMediaData();
    if (!variantMediaData) return;

    // Get selected variant ID from URL or form input
    const urlParams = new URLSearchParams(window.location.search);
    let variantId = urlParams.get('variant');

    if (!variantId) {
      const variantInput = this.querySelector('input[name="id"]');
      variantId = variantInput?.value;
    }

    if (variantId && variantMediaData[String(variantId)]) {
      this.updateGalleryMedia(variantId);
    }
  }

  initSwiper() {
    const thumbnailGalleryEl = this.querySelector('.product-media-gallery__thumbnails');
    const thumbnailWrapperEl = this.querySelector('.product-media-gallery__thumbnails-wrapper');
    const isVerticalThumbs = thumbnailWrapperEl?.classList.contains('product-media-gallery__thumbnails-wrapper--vertical');

    if (thumbnailGalleryEl) {
      const mainGalleryEl = this.querySelector('.product-media-gallery__main');
      if (mainGalleryEl) {
        const isDesktop = window.innerWidth >= 769;

        if (isVerticalThumbs && isDesktop) {
          // Desktop vertical thumbnails: no Swiper for thumbs, just main Swiper
          this.swiper = new Swiper(mainGalleryEl, {
            spaceBetween: 0,
            initialSlide: 0,
            observer: true,
            observeParents: true,
          });

          // Click thumbnail to change main slide
          const thumbSlides = thumbnailGalleryEl.querySelectorAll('.swiper-slide');
          thumbSlides.forEach((thumb, index) => {
            thumb.addEventListener('click', () => {
              this.swiper.slideTo(index);
              // Update active state
              thumbSlides.forEach((t) => t.classList.remove('swiper-slide-thumb-active'));
              thumb.classList.add('swiper-slide-thumb-active');
            });
          });

          // Set initial active
          if (thumbSlides.length > 0) {
            thumbSlides[0].classList.add('swiper-slide-thumb-active');
          }

          // Sync active thumb when main swiper changes
          this.swiper.on('slideChange', () => {
            const activeIndex = this.swiper.activeIndex;
            thumbSlides.forEach((t, i) => {
              t.classList.toggle('swiper-slide-thumb-active', i === activeIndex);
            });
            // Scroll active thumbnail into view
            if (thumbSlides[activeIndex]) {
              thumbSlides[activeIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
          });

          // Scroll-down button
          const scrollDownBtn = this.querySelector('.js-thumbnailScrollDown');
          const scrollContainer = this.querySelector('.product-media-gallery__thumbnails-scroll');
          if (scrollDownBtn && scrollContainer) {
            scrollDownBtn.addEventListener('click', () => {
              scrollContainer.scrollBy({ top: 100, behavior: 'smooth' });
            });
          }
        } else {
          // Mobile / non-vertical: use horizontal Swiper for thumbnails
          this.swiper = new Swiper(mainGalleryEl, {
            spaceBetween: 0,
            thumbs: {
              swiper: new Swiper(thumbnailGalleryEl, {
                spaceBetween: 12,
                slidesPerView: 'auto',
                freeMode: true,
                watchSlidesProgress: true,
                slideToClickedSlide: true,
                navigation: {
                  prevEl: thumbnailWrapperEl?.querySelector('.swiper-button-prev') || thumbnailGalleryEl.querySelector('.swiper-button-prev'),
                  nextEl: thumbnailWrapperEl?.querySelector('.swiper-button-next') || thumbnailGalleryEl.querySelector('.swiper-button-next'),
                },
                breakpoints: {
                  768: {
                    spaceBetween: 14,
                  },
                  1024: {
                    spaceBetween: 16,
                  }
                }
              }),
            },
          });
        }
      }
    }

    const carouselGalleryEl = this.querySelector('.product-media-gallery__carousel');
    if (carouselGalleryEl) {
      this.swiper = new Swiper(carouselGalleryEl, {
        autoHeight: true,
        direction: 'horizontal',
        pagination: {
          el: carouselGalleryEl.querySelector('.swiper-pagination'),
        },
        navigation: {
          prevEl: carouselGalleryEl.querySelector('.swiper-button-prev'),
          nextEl: carouselGalleryEl.querySelector('.swiper-button-next'),
        },
      });
    }
  }

  get variantSelector() {
    return this.querySelector('variant-selector');
  }

  get quantitySelector() {
    return this.querySelector('quantity-selector');
  }

  get selectedOptionValues() {
    if (this.variantSelector.dataset.pickerType === 'dropdown') {
      const list = Array.from(this.variantSelector.querySelectorAll('select')).map(
        (select) => select.options[select.selectedIndex].dataset.optionValueId
      );
      return list;
    } else {
      const list = Array.from(this.variantSelector.querySelectorAll('fieldset input:checked')).map(
        ({ dataset }) => dataset.optionValueId
      );
      return list;
    }
  }

  getSelectedVariant(html) {
    const selectedVariant = html.querySelector('[data-selected-variant]')?.innerHTML;
    return !!selectedVariant ? JSON.parse(selectedVariant) : null;
  }

  onVariantChange(e) {
    const productUrlChanged = e.target?.dataset?.productUrl ? (e.target?.dataset?.productUrl !== this.dataset.url) : false;
    const productUrl = e.target?.dataset?.productUrl || this.dataset.url;
    this.renderSection(productUrlChanged, productUrl);
  }

  onQuantitySelectorEvent(e) {
    const quantityInput = this.quantitySelector.querySelector('input[type="number"]');
    let currentValue = parseInt(quantityInput.value);
    const minValue = parseInt(quantityInput.getAttribute('min')) || 0;
    const maxValue = parseInt(quantityInput.getAttribute('max')) || Infinity;

    if (e.target.name === 'minus' && currentValue > minValue) {
      quantityInput.value = currentValue - 1;
    } else if (e.target.name === 'plus' && currentValue < maxValue) {
      quantityInput.value = currentValue + 1;
    } else if (e.type === 'change') {
      if (currentValue < minValue) {
        quantityInput.value = minValue;
      } else if (currentValue > maxValue) {
        quantityInput.value = maxValue;
      }
    }
  }

  getVariantMediaData() {
    if (this._variantMediaData) return this._variantMediaData;
    const dataEl = document.getElementById(`variant-media-data-${this.dataset.section}`);
    if (dataEl) {
      try {
        this._variantMediaData = JSON.parse(dataEl.textContent);
      } catch (e) {
        this._variantMediaData = null;
      }
    }
    return this._variantMediaData;
  }

  updateGalleryMedia(variantId) {
    if (!variantId) return;
    const variantMediaData = this.getVariantMediaData();
    if (!variantMediaData) return;

    const variantData = variantMediaData[String(variantId)];
    if (!variantData || !variantData.media || variantData.media.length === 0) return;

    const mediaItems = variantData.media;

    // Destroy existing Swiper before modifying DOM
    if (this.swiper) {
      try { this.swiper.destroy(true, true); } catch (e) { /* ignore */ }
      this.swiper = undefined;
    }

    // Build new main gallery slides
    const mainWrapper = this.querySelector('.product-media-gallery__main .swiper-wrapper');
    const thumbWrapper = this.querySelector('.product-media-gallery__thumbnails .swiper-wrapper');

    if (mainWrapper) {
      mainWrapper.innerHTML = mediaItems.map((media, index) => {
        if (media.type === 'video') {
          return `<div class="swiper-slide" data-media-index="${index}">
            <video class="product-media-gallery__video" autoplay muted loop playsinline
              poster="${media.poster || ''}"
              style="width:100%;height:100%;object-fit:cover;">
              <source src="${media.src}" type="video/mp4">
            </video>
          </div>`;
        }
        return `<div class="swiper-slide" data-media-index="${index}">
          <img src="${media.src}"
               srcset="${media.srcset} 1200w, ${media.src} 600w"
               sizes="(min-width: 769px) 60vw, 100vw"
               loading="${index === 0 ? 'eager' : 'lazy'}"
               alt="${variantData.title}"
               style="width:100%;height:100%;object-fit:cover;">
        </div>`;
      }).join('');
    }

    // Build new thumbnail slides
    if (thumbWrapper) {
      thumbWrapper.innerHTML = mediaItems.map((media, index) => {
        const thumbSrc = media.type === 'video' ? (media.poster || '') : media.src;
        return `<div class="swiper-slide${index === 0 ? ' swiper-slide-thumb-active' : ''}" data-media-index="${index}">
          <img src="${thumbSrc}"
               loading="lazy"
               alt="${variantData.title}"
               style="width:100%;height:100%;object-fit:cover;">
          ${media.type === 'video' ? '<span class="product-media-gallery__video-badge">▶</span>' : ''}
        </div>`;
      }).join('');
    }

    // Re-initialize Swiper with new slides
    this.initSwiper();

    // Slide to first image
    if (this.swiper) {
      try { this.swiper.slideTo(0, 0); } catch (e) { /* ignore */ }
    }
  }

  updateMedia(variantFeaturedMediaId) {
    if (!variantFeaturedMediaId) return;

    // Query within the main gallery only (not thumbnails) to get the correct slide
    const mainGallery = this.querySelector('.product-media-gallery__main');
    const searchRoot = mainGallery || this;
    const mediaSlide = searchRoot.querySelector(`.swiper-slide[data-media-id="${variantFeaturedMediaId}"]`);
    if (!mediaSlide) return;

    const slideIndex = parseInt(mediaSlide.dataset.mediaIndex);

    // Safety: ensure Swiper exists and index is within bounds
    if (this.swiper && typeof slideIndex === 'number' && slideIndex >= 0 && slideIndex < (this.swiper.slides?.length || 0)) {
      try {
        this.swiper.slideTo(slideIndex);
      } catch (e) {
        // If Swiper state is stale, re-init and retry
        console.warn('Swiper slideTo failed, reinitializing...', e);
        this.swiper.destroy(true, true);
        this.initSwiper();
        this.swiper?.slideTo(slideIndex);
      }
    }

    // Also sync vertical thumbnail active state
    const thumbnailGallery = this.querySelector('.product-media-gallery__thumbnails');
    if (thumbnailGallery) {
      const thumbSlides = thumbnailGallery.querySelectorAll('.swiper-slide');
      thumbSlides.forEach((t, i) => {
        t.classList.toggle('swiper-slide-thumb-active', i === slideIndex);
      });
      // Scroll active thumbnail into view
      if (thumbSlides[slideIndex]) {
        thumbSlides[slideIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }

  updateURL(variantId) {
    // this.querySelector('share-button')?.updateUrl(
    //   `${window.shopUrl}${url}${variantId ? `?variant=${variantId}` : ''}`
    // );

    // Don't update URL if this is in a modal/quick-add context
    if (this.dataset.updateUrl === 'false') return;

    if (!window.location.pathname.includes('/products/')) return;
    window.history.replaceState({}, '', `${this.dataset.url}${variantId ? `?variant=${variantId}` : ''}`);
  }

  updateSourceFromDestination = (html, id) => {
    const source = html.getElementById(`${id}`);
    const destination = this.querySelector(`#${id}`);
    if (source && destination) {
      destination.innerHTML = source.innerHTML;
    }
  };

  updateVariantInputs(variantId) {
    this.querySelectorAll(`#product-form-${this.dataset.section}, #product-form-installment-${this.dataset.section}`).forEach(
      (productForm) => {
        const input = productForm.querySelector('input[name="id"]');
        input.value = variantId ?? '';
      }
    );
  }

  getShadeDescriptions() {
    if (this._shadeDescriptions) return this._shadeDescriptions;
    const dataEl = document.getElementById(`shade-descriptions-${this.dataset.section}`);
    if (dataEl) {
      try {
        this._shadeDescriptions = JSON.parse(dataEl.textContent);
      } catch (e) {
        this._shadeDescriptions = {};
      }
    }
    return this._shadeDescriptions || {};
  }

  setupShadeTabFiltering() {
    const tabButtons = this.querySelectorAll('.js-swatchesTabHeading');
    if (!tabButtons.length) return;

    tabButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        // Update active state
        tabButtons.forEach((b) => b.classList.remove('active'));
        e.currentTarget.classList.add('active');

        const tab = e.currentTarget.dataset.tab;
        const swatches = this.querySelectorAll('.product__form-swatch');

        swatches.forEach((swatch) => {
          if (tab === 'all' || swatch.dataset.shadeCategory === tab) {
            swatch.removeAttribute('hidden');
          } else {
            swatch.setAttribute('hidden', '');
          }
        });
      });
    });
  }

  setupShadeDescription() {
    const swatchRadios = this.querySelectorAll('.swatch-radio');
    if (!swatchRadios.length) return;

    // Set initial description
    const checkedRadio = this.querySelector('.swatch-radio:checked');
    if (checkedRadio) {
      this.updateShadeDescription(checkedRadio.value);
    }

    swatchRadios.forEach((radio) => {
      radio.addEventListener('change', (e) => {
        this.updateShadeDescription(e.target.value);
      });
    });
  }

  updateShadeDescription(shadeName) {
    const nameEl = this.querySelector('.product__shade-name');
    const descEl = this.querySelector('.product__shade-description');
    if (nameEl) nameEl.textContent = shadeName;
    if (descEl) {
      const descriptions = this.getShadeDescriptions();
      descEl.textContent = descriptions[shadeName.toLowerCase()] || '';
    }
  }

  initStickyBar() {
    const bar = this.querySelector('[data-product-sticky-bar]');
    if (!bar || this._stickyBarInited) return;

    const buyButtons = this.querySelector('.product-form__buttons');
    if (!buyButtons) return;

    this._stickyBarInited = true;

    const setTop = () => {
      const headerSection = document.querySelector('#main-header')?.closest('[id^="shopify-section"]');
      const h = headerSection?.offsetHeight ?? 72;
      bar.style.setProperty('--product-sticky-bar-top', `${h}px`);
    };
    setTop();
    window.addEventListener('resize', setTop);

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const showSticky = !entry.isIntersecting && entry.boundingClientRect.top < 0;
        bar.classList.toggle('is-active', showSticky);
        bar.setAttribute('aria-hidden', showSticky ? 'false' : 'true');
      },
      { threshold: 0, rootMargin: '0px' },
    );
    io.observe(buyButtons);

    this._stickyBarEl = bar;
    this._onStickyDocumentClick = (e) => {
      if (!this._stickyBarEl?.contains(e.target)) {
        this.closeAllStickyDropdowns(this._stickyBarEl);
      }
    };
    this._onStickyDocumentKeydown = (e) => {
      if (e.key === 'Escape') this.closeAllStickyDropdowns(this._stickyBarEl);
    };
    document.addEventListener('click', this._onStickyDocumentClick);
    document.addEventListener('keydown', this._onStickyDocumentKeydown);

    bar.querySelectorAll('[data-sticky-field]').forEach((field) => {
      const dropdown = field.querySelector('[data-sticky-dropdown]');
      const trigger = dropdown?.querySelector('[data-sticky-dropdown-trigger]');
      const list = dropdown?.querySelector('[data-sticky-dropdown-list]');
      const syncSelect = field.querySelector('select[data-sticky-sync-select]');
      if (!dropdown || !trigger || !list || !syncSelect) return;

      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const wasOpen = dropdown.classList.contains('is-open');
        this.closeAllStickyDropdowns(bar);
        if (!wasOpen) {
          dropdown.classList.add('is-open');
          trigger.setAttribute('aria-expanded', 'true');
          list.hidden = false;
        }
      });

      list.querySelectorAll('[data-sticky-option-btn]').forEach((btn) => {
        btn.addEventListener('click', (ev) => {
          ev.preventDefault();
          if (btn.disabled) return;
          const val = btn.dataset.value;
          if (syncSelect.value === val) {
            this.closeAllStickyDropdowns(bar);
            return;
          }
          syncSelect.value = val;
          this.updateStickyDropdownTriggerFromField(field);
          this.applyStickyOptionFromStickyBar(syncSelect);
          this.closeAllStickyDropdowns(bar);
        });
      });
    });

    const stickySubmit = bar.querySelector('[data-sticky-submit]');
    const mainBtn = this.querySelector(`#AddToCart-${this.dataset.section}`);
    stickySubmit?.addEventListener('click', () => mainBtn?.click());

    this.syncStickyBarFromMain();
  }

  closeAllStickyDropdowns(bar) {
    if (!bar) return;
    bar.querySelectorAll('[data-sticky-dropdown].is-open').forEach((dd) => {
      dd.classList.remove('is-open');
      const tr = dd.querySelector('[data-sticky-dropdown-trigger]');
      const list = dd.querySelector('[data-sticky-dropdown-list]');
      tr?.setAttribute('aria-expanded', 'false');
      if (list) list.hidden = true;
    });
  }

  updateStickyDropdownTriggerFromField(field) {
    const selectEl = field.querySelector('select[data-sticky-sync-select]');
    const dropdown = field.querySelector('[data-sticky-dropdown]');
    const trigger = dropdown?.querySelector('[data-sticky-dropdown-trigger]');
    const labelEl = trigger?.querySelector('[data-sticky-trigger-label]');
    const swatchEl = trigger?.querySelector('[data-sticky-trigger-swatch]');
    const showSwatch = dropdown?.dataset.stickyShowSwatch === 'true';
    if (!selectEl || !labelEl) return;

    const opt = selectEl.selectedOptions[0];
    if (!opt) return;

    labelEl.textContent = opt.value;

    if (showSwatch && swatchEl) {
      const useImg = opt.dataset.swatchUseImage === 'true';
      const img = opt.dataset.swatchImage || '';
      const color = opt.dataset.swatchColor || '';
      swatchEl.classList.toggle('product-sticky-bar__dropdown-swatch--image', Boolean(useImg && img));
      if (useImg && img) {
        swatchEl.style.backgroundImage = `url(${JSON.stringify(img)})`;
        swatchEl.style.backgroundColor = 'transparent';
      } else if (color) {
        swatchEl.style.backgroundColor = color;
        swatchEl.style.backgroundImage = 'none';
      }
    }

    field.querySelectorAll('[data-sticky-option-btn]').forEach((btn) => {
      btn.setAttribute('aria-selected', btn.dataset.value === opt.value ? 'true' : 'false');
    });
  }

  refreshStickyDropdownTriggers(bar) {
    bar.querySelectorAll('[data-sticky-field]').forEach((field) => {
      this.updateStickyDropdownTriggerFromField(field);
    });
  }

  syncStickyBarFromMain() {
    const bar = this.querySelector('[data-product-sticky-bar]');
    if (!bar) return;

    const mainVs = this.querySelector(`#variant-selector-${this.dataset.section}`);
    const scriptEl = mainVs?.querySelector('[data-selected-variant]');
    if (scriptEl?.textContent) {
      let variant;
      try {
        variant = JSON.parse(scriptEl.textContent);
      } catch (e) {
        variant = null;
      }
      if (variant) {
        bar.querySelectorAll('select[data-sticky-sync-select]').forEach((sel) => {
          const optIdx = parseInt(sel.dataset.stickyOptionIndex, 10);
          const key = `option${optIdx + 1}`;
          const v = variant[key];
          if (v == null) return;
          const match = Array.from(sel.options).find((o) => o.value === v && !o.disabled);
          if (match) sel.value = v;
        });
      }
    }

    this.refreshStickyDropdownTriggers(bar);

    const mainPrice = this.querySelector(`#product-form-price-${this.dataset.section}`);
    const stickyPrice = bar.querySelector('[data-sticky-price]');
    if (mainPrice && stickyPrice) stickyPrice.textContent = mainPrice.textContent;

    const mainBtn = this.querySelector(`#AddToCart-${this.dataset.section}`);
    const stickyBtn = bar.querySelector('[data-sticky-submit]');
    const mainLabel = mainBtn?.querySelector('.product__form-button__text');
    const stickyLabel = stickyBtn?.querySelector('.product-sticky-bar__submit-text');
    if (mainBtn && stickyBtn) stickyBtn.disabled = mainBtn.disabled;
    if (mainLabel && stickyLabel) stickyLabel.textContent = mainLabel.textContent;
  }

  applyStickyOptionFromStickyBar(stickySelect) {
    const mainVs = this.querySelector(`#variant-selector-${this.dataset.section}`);
    if (!mainVs) return;

    const idx = parseInt(stickySelect.dataset.stickyOptionIndex, 10);
    const val = stickySelect.value;
    const pickerType = mainVs.dataset.pickerType;

    if (pickerType === 'dropdown') {
      const selects = mainVs.querySelectorAll('select');
      const mainSel = selects[idx];
      if (mainSel && mainSel.value !== val) {
        mainSel.value = val;
        mainSel.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return;
    }

    const fieldsets = mainVs.querySelectorAll('fieldset.product-form__input');
    const fs = fieldsets[idx];
    if (!fs) return;

    const inputs = fs.querySelectorAll('input[type="radio"], input[type="checkbox"]');
    for (const input of inputs) {
      if (input.value === val && !input.disabled) {
        if (!input.checked) {
          input.checked = true;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
        break;
      }
    }
  }

  renderSection(productUrlChanged, productUrl) {
    this.abortController?.abort();
    this.abortController = new AbortController();

    // If the section is in a modal, use the original section id without the modal suffix
    const sectionId = this.dataset.updateUrl === 'false' ? this.dataset.section.split('-modal')[0] : this.dataset.section;
    fetch(`${productUrl}?option_values=${this.selectedOptionValues}&section_id=${sectionId}`, {
      signal: this.abortController.signal,
    })
      .then((response) => response.text())
      .then((responseText) => {
        // If the section is in a modal, replace the original section id with the modal section id
        if (this.dataset.updateUrl === 'false') {
          responseText = responseText.replaceAll(this.dataset.section.split('-modal')[0], this.dataset.section);
        }

        // Parse the response text into an HTML document
        const html = new DOMParser().parseFromString(responseText, 'text/html');
        const variant = this.getSelectedVariant(html);
        if (productUrlChanged) {
          // If the product url has changed, replace the current section with the new section
          const productInfo = html.querySelector('product-info');
          this.replaceWith(productInfo);
          productInfo.updateURL(variant?.id);
        } else {
          // Try variant-specific gallery swap first, fall back to slide-to-featured
          const variantMediaData = this.getVariantMediaData();
          if (variantMediaData && variantMediaData[String(variant?.id)]) {
            this.updateGalleryMedia(variant?.id);
          } else {
            this.updateMedia(variant?.featured_media?.id);
          }
          this.updateURL(variant?.id);
          this.updateVariantInputs(variant?.id);
          this.updateSourceFromDestination(html, `add-to-cart-container-${this.dataset.section}`);
          this.updateSourceFromDestination(html, `variant-selector-${this.dataset.section}`);
          this.updateSourceFromDestination(html, `price-${this.dataset.section}`);
          this.updateSourceFromDestination(html, `sku-${this.dataset.section}`);
          this.updateSourceFromDestination(html, `inventory-${this.dataset.section}`);
          this.updateSourceFromDestination(html, `shade-info-${this.dataset.section}`);
          this.updateSourceFromDestination(html, `product-form-price-${this.dataset.section}`);

          // Re-setup shade filtering and descriptions after DOM update
          this.setupShadeTabFiltering();
          this.setupShadeDescription();
          this.syncStickyBarFromMain();
        }
      })
      .catch((error) => {
        if (error.name === 'AbortError') {
          console.log('Fetch aborted by user');
        } else {
          console.error(error);
        }
      });
  }
}

if (!customElements.get('product-info')) {
  customElements.define('product-info', ProductInfo);
}

/* ==========================================
   Accordion Behavior for Product Description Tabs
   ========================================== */
(function initProductAccordions() {
  function initAccordions(container) {
    if (!container) return;
    const buttons = container.querySelectorAll('[data-controls]');
    buttons.forEach((btn) => {
      const panelId = btn.getAttribute('data-controls');
      const panel = document.getElementById(panelId);
      if (!panel) return;

      // Set initial state based on aria-expanded
      const isExpanded = btn.getAttribute('aria-expanded') === 'true';
      if (isExpanded) {
        panel.style.height = 'auto';
        panel.setAttribute('aria-hidden', 'false');
      } else {
        panel.style.height = '0px';
        panel.setAttribute('aria-hidden', 'true');
      }

      btn.addEventListener('click', () => {
        const willExpand = btn.getAttribute('aria-expanded') === 'false';
        const contentHeight = panel.firstElementChild ? panel.firstElementChild.scrollHeight : panel.scrollHeight;

        if (willExpand) {
          // Expand
          btn.setAttribute('aria-expanded', 'true');
          panel.setAttribute('aria-hidden', 'false');
          panel.style.height = '0px';
          // Force reflow
          panel.offsetHeight;
          panel.style.height = contentHeight + 'px';
          setTimeout(() => { panel.style.height = 'auto'; }, 400);
        } else {
          // Collapse
          panel.style.height = panel.scrollHeight + 'px';
          panel.offsetHeight;
          btn.setAttribute('aria-expanded', 'false');
          panel.setAttribute('aria-hidden', 'true');
          panel.style.height = '0px';
        }
      });
    });
  }

  // Init accordions
  document.querySelectorAll('.product__description-accordions.js-accordion').forEach(initAccordions);

  // Ingredients modal toggle
  document.querySelectorAll('.js-ingredientsToggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modal = document.querySelector('.modal--ingredients');
      if (!modal) return;
      const isVisible = modal.style.display !== 'none';
      modal.style.display = isVisible ? 'none' : 'flex';
      document.body.style.overflow = isVisible ? '' : 'hidden';
    });
  });

  // Upsell "Add to Bag" via Liquid Ajax Cart (same request pipeline as theme ATC; cart-drawer opens on successful add).
  document.querySelectorAll('.product__upsell-add.js-addToBag').forEach((btn) => {
    btn.addEventListener('click', () => {
      const variantId = btn.dataset.id;
      if (!variantId || !window.liquidAjaxCart?.add) return;

      const labelEl = btn.querySelector('.product__upsell-label');
      const originalText = labelEl?.textContent;
      if (labelEl) labelEl.textContent = 'Adding...';
      btn.disabled = true;

      const vid = parseInt(variantId, 10);

      let fallbackTimer;
      const onRequestEnd = (e) => {
        const { requestState } = e.detail || {};
        if (requestState?.requestType !== 'add') return;

        const items = requestState.requestBody?.items;
        const matches =
          Array.isArray(items) && items.some((item) => Number(item.id) === vid);
        if (!matches) return;

        document.removeEventListener('liquid-ajax-cart:request-end', onRequestEnd);
        clearTimeout(fallbackTimer);

        if (requestState?.responseData?.ok) {
          if (labelEl) labelEl.textContent = 'Added!';
          setTimeout(() => {
            if (labelEl) labelEl.textContent = originalText || 'Add To Bag';
            btn.disabled = false;
          }, 2000);
        } else {
          if (labelEl) labelEl.textContent = originalText || 'Add To Bag';
          btn.disabled = false;
        }
      };

      fallbackTimer = setTimeout(() => {
        document.removeEventListener('liquid-ajax-cart:request-end', onRequestEnd);
        if (labelEl) labelEl.textContent = originalText || 'Add To Bag';
        btn.disabled = false;
      }, 15000);

      document.addEventListener('liquid-ajax-cart:request-end', onRequestEnd);
      window.liquidAjaxCart.add({ items: [{ id: vid, quantity: 1 }] });
    });
  });

  // How-to video play/pause toggle
  document.querySelectorAll('.product__how-to-video-wrapper.js-productVideo').forEach((wrapper) => {
    wrapper.addEventListener('click', () => {
      const video = wrapper.querySelector('video');
      if (!video) return;
      if (video.paused) {
        video.play();
        wrapper.classList.add('is-playing');
      } else {
        video.pause();
        wrapper.classList.remove('is-playing');
      }
    });
  });

  // Videowise re-init on variant change (URL change)
  if (typeof window.videowiseBulkTrigger === 'function') {
    const origPush = history.pushState;
    history.pushState = function() {
      origPush.apply(history, arguments);
      setTimeout(() => {
        window.videowiseIdsLoaded = [];
        window.videowiseBulkTrigger();
      }, 1000);
    };
  }
})();