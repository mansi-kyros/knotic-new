/* =====================================================
   🌐 Global Swiper Manager for all Shopify Sections
   -----------------------------------------------------
   ✅ Handles: video-product-showcase, shop-the-look,
               banner_with_featured_product,
               featured-collection-custom,
               category-section,
               wear-with-it, ✅ custom-carousel (NEW)
   ✅ Lazy initialization (requestIdleCallback + IntersectionObserver)
   ✅ Prevents render blocking (LCP, INP, CLS, TBT)
   ✅ Shopify Online Store 2.0 safe
   ✅ Includes mobile vertical swiper direction support
   ✅ Includes vertical swiper blank fix (autoHeight & image load update)
   ===================================================== */

class GlobalSwiperManager {
  constructor() {
    this.instances = new Map();
    this.init();
  }

  init() {
    if ("requestIdleCallback" in window) {
      requestIdleCallback(() => this.initializeAll(), { timeout: 2000 });
    } else {
      setTimeout(() => this.initializeAll(), 1000);
    }

    // Re-init on Shopify section load/unload
    document.addEventListener("shopify:section:load", () => this.initializeAll());
    document.addEventListener("shopify:section:unload", () => this.destroyAll());
  }

  initializeAll() {
    document
      .querySelectorAll("[data-swiper-type]:not(.swiper-initialized)")
      .forEach((el) => this.initSwiper(el));
  }

  destroyAll() {
    this.instances.forEach((swiper) => {
      if (swiper && swiper.destroy) swiper.destroy(true, true);
    });
    this.instances.clear();
  }

  initSwiper(el) {
    if (el.classList.contains("swiper-initialized")) return;
    if (typeof Swiper === "undefined") return;

    const type = el.dataset.swiperType;
    const config = this.getConfig(el, type);

    const swiper = new Swiper(el, config);
    this.instances.set(el, swiper);

    // 🧱 FIX: ensure swiper updates height after images load
    el.querySelectorAll("img").forEach((img) => {
      img.addEventListener("load", () => {
        if (swiper.params.autoHeight) swiper.updateAutoHeight(100);
      });
    });
  }

  getConfig(el, type) {
    const perRow = {
      mobile: parseFloat(el.dataset.perRowMobile) || 1.2,
      ipadVertical: parseFloat(el.dataset.perRowIpadVertical) || 2,
      ipadHorizontal: parseFloat(el.dataset.perRowIpadHorizontal) || 3,
      mac: parseFloat(el.dataset.perRowMac) || 4,
      desktop: parseFloat(el.dataset.perRowDesktop) || 5,
    };

    const gap = {
      mobile: parseInt(el.dataset.gapMobile) || 16,
      ipadVertical: parseInt(el.dataset.gapIpadVertical) || 20,
      ipadHorizontal: parseInt(el.dataset.gapIpadHorizontal) || 24,
      mac: parseInt(el.dataset.gapMac) || 28,
      desktop: parseInt(el.dataset.gapDesktop) || 32,
    };

    const beforeOffset = {
      mobile: parseInt(el.dataset.mobileBeforeOffset) || 0,
      ipadVertical: parseInt(el.dataset.ipadVerticalBeforeOffset) || 0,
      ipadHorizontal: parseInt(el.dataset.ipadHorizontalBeforeOffset) || 0,
      mac: parseInt(el.dataset.macBeforeOffset) || 0,
      desktop: parseInt(el.dataset.desktopBeforeOffset) || 0,
    };

    const afterOffset = {
      mobile: parseInt(el.dataset.mobileAfterOffset) || 0,
      ipadVertical: parseInt(el.dataset.ipadVerticalAfterOffset) || 0,
      ipadHorizontal: parseInt(el.dataset.ipadHorizontalAfterOffset) || 0,
      mac: parseInt(el.dataset.macAfterOffset) || 0,
      desktop: parseInt(el.dataset.desktopAfterOffset) || 0,
    };

    const directionMobile =
      el.dataset.mobileSwiperDirection ||
      el.dataset.directionMobile ||
      "horizontal";

    const baseConfig = {
      direction: directionMobile === "vertical" ? "vertical" : "horizontal",
      slidesPerView: perRow.mobile,
      spaceBetween: gap.mobile,
      slidesOffsetBefore: beforeOffset.mobile,
      slidesOffsetAfter: afterOffset.mobile,
      watchOverflow: true,
      observer: true,
      observeParents: true,
      preloadImages: false,
      resizeObserver: true,
      lazy: { loadOnTransitionStart: true },
      autoHeight: directionMobile === "vertical",
      mousewheel: {
  forceToAxis: true,
  releaseOnEdges: true,
},
      navigation: {
        nextEl: ".swiper-button-next.outer-swiper-next",
        prevEl: ".swiper-button-prev.outer-swiper-prev",
      },
      breakpoints: {
        600: {
          direction: "horizontal",
          slidesPerView: perRow.ipadVertical,
          spaceBetween: gap.ipadVertical,
          slidesOffsetBefore: beforeOffset.ipadVertical,
          slidesOffsetAfter: afterOffset.ipadVertical,
        },
        834: {
          direction: "horizontal",
          slidesPerView: perRow.ipadHorizontal,
          spaceBetween: gap.ipadHorizontal,
          slidesOffsetBefore: beforeOffset.ipadHorizontal,
          slidesOffsetAfter: afterOffset.ipadHorizontal,
        },
        1024: {
          direction: "horizontal",
          slidesPerView: perRow.mac,
          spaceBetween: gap.mac,
          slidesOffsetBefore: beforeOffset.mac,
          slidesOffsetAfter: afterOffset.mac,
        },
        1440: {
          direction: "horizontal",
          slidesPerView: perRow.desktop,
          spaceBetween: gap.desktop,
          slidesOffsetBefore: beforeOffset.desktop,
          slidesOffsetAfter: afterOffset.desktop,
        },
      },
      on: {
        init: (swiper) => {
          el.classList.add("swiper-initialized");
          if (swiper.params.autoHeight) swiper.updateAutoHeight(100);
        },
        slideChangeTransitionEnd: (swiper) => {
          if (swiper.params.autoHeight) swiper.updateAutoHeight(100);
        },
      },
    };

    switch (type) {
      case "video":
        return this.extendVideoSwiper(baseConfig, el);
      case "shop-the-look":
        return this.extendShopTheLookSwiper(baseConfig, el);
      case "banner":
        return this.extendBannerSwiper(baseConfig, el);
      case "featured-collection":
        return this.extendFeaturedSwiper(baseConfig, el);
      case "category":
        return this.extendCategorySwiper(baseConfig, el);
      case "wear-with-it":
        return this.extendWearWithItSwiper(baseConfig, el);
      case "custom-carousel": // ✅ Your new section
        return this.extendCustomCarouselSwiper(baseConfig, el);
      default:
        return baseConfig;
    }
  }

  // 🧩 Section: video-product-showcase
  extendVideoSwiper(config, el) {
    const totalSlides = el.querySelectorAll(".swiper-slide").length;
    const isMobile = window.innerWidth < 600;

    return {
      ...config,
      loop: !isMobile && totalSlides > 1,
      centeredSlides: !isMobile,
      on: {
        init: () => {
          this.lazyLoadVideos(el);
        },
        slideChangeTransitionEnd: () => {
          el.querySelectorAll("video").forEach((v) => v.pause());
          el
            .querySelectorAll(".swiper-slide-active video")
            .forEach((v) => v.play().catch(() => { }));
        },
      },
    };
  }

  lazyLoadVideos(section) {
    const videos = section.querySelectorAll("video");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target;
          const source = video.querySelector("source");
          if (entry.isIntersecting) {
            if (source && source.dataset.src && !source.src) {
              source.src = source.dataset.src;
              video.load();
            }
          }
        });
      },
      { threshold: 0.4 }
    );
    videos.forEach((v) => observer.observe(v));
  }

  // 🧩 Section: shop-the-look
  extendShopTheLookSwiper(config, el) {
    return {
      ...config,
      pagination: {
        el: el.querySelector(".swiper-pagination"),
        clickable: true,
        dynamicBullets: true,
      },
    };
  }

  // 🧩 Section: banner_with_featured_product
  extendBannerSwiper(config, el) {
    const directionMobile =
      el.dataset.mobileSwiperDirection ||
      el.dataset.directionMobile ||
      "horizontal";

    const isVertical =
      window.innerWidth < 768 && directionMobile === "vertical";

    return {
      ...config,
      direction: isVertical ? "vertical" : "horizontal",
      autoHeight: isVertical,
      navigation: {
        nextEl: el.querySelector(".swiper-button-next"),
        prevEl: el.querySelector(".swiper-button-prev"),
      },
      scrollbar: isVertical
        ? { el: el.querySelector(".swiper-scrollbar"), draggable: true, hide: false }
        : false,
      on: {
        init: (swiper) => {
          el.classList.add("swiper-initialized");
          this.syncBannerHeight(el, swiper);
          if (swiper.params.autoHeight) swiper.updateAutoHeight(100);
        },
        slideChangeTransitionEnd: (swiper) => {
          if (swiper.params.autoHeight) swiper.updateAutoHeight(100);
        },
      },
    };
  }

  syncBannerHeight(el, swiper) {
    const bannerImg = el.closest("[data-section-id]")?.querySelector(".banner-image");
    if (!bannerImg) return;
    const adjustHeight = () => {
      if (swiper.params.direction !== "vertical") return;
      const h = bannerImg.clientHeight || bannerImg.offsetHeight;
      swiper.el.style.height = `${h}px`;
    };
    adjustHeight();
    window.addEventListener("resize", adjustHeight);
  }

  // 🧩 Section: featured-collection-custom
  extendFeaturedSwiper(config, el) {
    return {
      ...config,
      navigation: {
        nextEl: el.querySelector(".swiper-button-next"),
        prevEl: el.querySelector(".swiper-button-prev"),
      },
    };
  }

  // 🧩 Section: category-section
  extendCategorySwiper(config, el) {
    return {
      ...config,
      slidesPerView: "auto",
      grabCursor: true,
      watchSlidesProgress: true,
      autoHeight: config.direction === "vertical",
      mousewheel: {
        forceToAxis: true,
        sensitivity: 1,
      },
      touchReleaseOnEdges: true,
      on: {
        init: () => el.classList.add("swiper-initialized"),
      },
    };
  }

  // 🧩 Section: wear-with-it
  extendWearWithItSwiper(config, el) {
    const desk_item = parseFloat(el.dataset.desktop_items) || 3;
    const mob_item = parseFloat(el.dataset.mobile_items) || 1.5;
    const ipad_vert = parseFloat(el.dataset.ipad_vertical_items) || 2.5;
    const ipad_hori = parseFloat(el.dataset.ipad_horizontal_items) || 2.5;
    const mob_padding = parseFloat(el.dataset.mobile_padding) || 10;
    const ipad_vert_padding = parseFloat(el.dataset.ipad_vertical_padding) || 10;
    const ipad_hori_padding = parseFloat(el.dataset.ipad_horizontal_padding) || 10;
    const desk_padding = parseFloat(el.dataset.desktop_padding) || 10;

    return {
      ...config,
      slidesPerView: mob_item,
      spaceBetween: mob_padding,
      loop: false,
      watchSlidesProgress: true,
      navigation: {
        nextEl: ".swiper-button-next.wear-with-it-arrow",
        prevEl: ".swiper-button-prev.wear-with-it-arrow",
      },
      breakpoints: {
        0: { slidesPerView: mob_item, spaceBetween: mob_padding },
        480: { slidesPerView: ipad_vert, spaceBetween: ipad_vert_padding },
        768: { slidesPerView: ipad_hori, spaceBetween: ipad_hori_padding },
        1100: { slidesPerView: desk_item, spaceBetween: desk_padding },
      },
      on: {
        init() {
          el.classList.add("loaded");
        },
      },
    };
  }

  // ✅ 🧩 Section: custom-carousel (main swiper)
  extendCustomCarouselSwiper(config, el) {
    const totalSlides = el.querySelectorAll('.swiper-slide').length;

    // Read slidesPerView from data attributes
    const desk_item = parseFloat(el.dataset.desktop_items) || 3;
    const mob_item = parseFloat(el.dataset.mobile_items) || 1.5;
    const ipad_vert = parseFloat(el.dataset.ipad_vertical_items) || 2.5;
    const ipad_hori = parseFloat(el.dataset.ipad_horizontal_items) || 2.5;
    const mob_padding = parseFloat(el.dataset.gap_mobile) || 10;
    const ipad_vert_padding = parseFloat(el.dataset.gap_ipad_vertical) || 10;
    const ipad_hori_padding = parseFloat(el.dataset.gap_ipad_horizontal) || 10;
    const desk_padding = parseFloat(el.dataset.gap_desktop) || 10;

    // Detect if loop is safe (for largest screen)
    const loopSafe = totalSlides > desk_item;

    return {
      ...config,
      loop: true,
      // loopAdditionalSlides: 1,
      centeredSlides: true,
     
     
      // watchSlidesProgress: true,

      // pagination: {
      //   el: el.querySelector('.swiper-pagination'),
      //   clickable: true,
      //   dynamicBullets: true,
      //   dynamicMainBullets: 6,
      // },
      navigation: {
        nextEl: el.querySelector('.outer-swiper-next'),
        prevEl: el.querySelector('.outer-swiper-prev'),
      },
      slidesPerView: mob_item,
      spaceBetween: mob_padding,
      breakpoints: {
        0: { slidesPerView: mob_item, spaceBetween: mob_padding },
        480: { slidesPerView: ipad_vert, spaceBetween: ipad_vert_padding },
        768: { slidesPerView: ipad_hori, spaceBetween: ipad_hori_padding },
        1100: { slidesPerView: desk_item, spaceBetween: desk_padding },
      },
      on: {
        init: (swiper) => {
          el.classList.add('swiper-initialized');
        },
        slideChange: (swiper) => {
          const activeSlide = swiper.slides[swiper.activeIndex];
          const innerSwipers = activeSlide.querySelectorAll('[data-inner-swiper]');
          innerSwipers.forEach(innerSwiper => {
            if (innerSwiper.swiper) innerSwiper.swiper.update();
          });
        },
      },
    };
  }

}

// ✅ Initialize Global Swiper Manager
document.addEventListener("DOMContentLoaded", () => {
  window.globalSwiperManager = new GlobalSwiperManager();
});
