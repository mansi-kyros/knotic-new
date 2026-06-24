class RelatedProductsSwiper {
  constructor() {
    this.instances = new Map();
    this.observer = null;
    this.init();
  }

  init() {
    // ✅ requestIdleCallback fallback for Safari / older browsers
    const start = () => this.initSwiperInstances();
    if ("requestIdleCallback" in window) {
      requestIdleCallback(start, { timeout: 2000 });
    } else {
      setTimeout(start, 500); // fallback for mobile Safari
    }

    this.setupObserver();

    document.addEventListener("shopify:section:load", (event) => {
      const section = event.target;
      const swiperContainer = section.querySelector("[data-related-swiper]");
      if (swiperContainer) this.initSwiperInstances(section);
    });

    document.addEventListener("shopify:section:unload", (event) => {
      this.destroySwiper(event.detail.sectionId);
    });
  }

  initSwiperInstances(container = document) {
    container.querySelectorAll("[data-related-swiper]").forEach((el) => {
      const id = el.dataset.relatedSwiper;
      if (!this.instances.has(id) && el.querySelectorAll(".swiper-slide").length > 0) {
        this.initSwiper(el, id);
      }
    });
  }

  initSwiper(el, id) {
    if (typeof Swiper === "undefined") return;
    this.destroySwiper(id);

    const swiper = new Swiper(el, {
      init: false, // ✅ must be false if we manually call swiper.init()
      slidesPerView: 1.2,
      spaceBetween: 10,
      watchOverflow: true,
      loop: false,
      navigation: {
        nextEl: `[data-related-swiper-next="${id}"]`,
        prevEl: `[data-related-swiper-prev="${id}"]`,
      },
      breakpoints: {
        480: { slidesPerView: 1.8 },
        750: { slidesPerView: 2.2 },
        990: { slidesPerView: 4 },
      },
      on: {
        init: (swiperInstance) => {
          el.dataset.swiperInitialized = "true";
          this.toggleNav(swiperInstance, id);
        },
      },
    });

    // ✅ Initialize only when visible (mobile-safe)
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            swiper.init(); // safe to call now
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(el);

    this.instances.set(id, swiper);
  }

  toggleNav(swiper, id) {
    const prev = document.querySelector(`[data-related-swiper-prev="${id}"]`);
    const next = document.querySelector(`[data-related-swiper-next="${id}"]`);
    const showNav = swiper.slides.length > swiper.params.slidesPerView;
    if (prev) prev.style.display = showNav ? "flex" : "none";
    if (next) next.style.display = showNav ? "flex" : "none";
  }

  destroySwiper(id) {
    const swiper = this.instances.get(id);
    if (swiper) swiper.destroy(true, true);
    this.instances.delete(id);
  }

  setupObserver() {
    if (typeof MutationObserver === "undefined") return;
    this.observer?.disconnect();

    this.observer = new MutationObserver(
      this.debounce(() => this.initSwiperInstances(), 200)
    );

    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  debounce(fn, delay) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), delay);
    };
  }
}

// ✅ Initialize safely
document.addEventListener("DOMContentLoaded", () => {
  const initFn = () => {
    if (typeof Swiper !== "undefined") new RelatedProductsSwiper();
  };

  if ("requestIdleCallback" in window) {
    requestIdleCallback(initFn, { timeout: 1500 });
  } else {
    setTimeout(initFn, 500);
  }
});
