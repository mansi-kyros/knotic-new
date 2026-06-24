/********************************************************************
 🧩 SUPER OPTIMIZED GLOBAL INITIALIZER  
 - No DOMContentLoaded
 - No window load
 - Auto-runs on Filters, Ajax, Section Render, Infinite Scroll
 - Zero blocking → best LCP, FCP, CLS, INP, TBT
*********************************************************************/

function initMediaSwipers(scope = document) {
  scope.querySelectorAll(".card-wrapper").forEach((card) => {
    const container = card.querySelector(".media-swiper");
    if (!container || container.classList.contains("swiper-initialized")) return;

    new Swiper(container, {
      slidesPerView: 1,
      effect: "fade",
      fadeEffect: { crossFade: true },
      loop: true,
      autoplay: { delay: 60000000, disableOnInteraction: false },
      pagination: {
        el: card.querySelector(".media-swiper-pagination"),
        clickable: true,
      },
      observer: true,
      observeParents: true,
    });
  });
}

/********************************************************************
 🎨 SWATCH INITIALIZER
*********************************************************************/
function initializeSwatches(scope = document) {
  const blocks = scope.querySelectorAll(".card-wrapper .color-swatches");

  blocks.forEach((block) => {
    const first = block.querySelector(".swatch-label");
    if (!first) return;

    const swatch = first.querySelector(".swatch");
    const color = swatch?.getAttribute("title");

    const wishlistBtn = block.closest(".card-wrapper")?.querySelector(".wishlist_button");
    if (wishlistBtn && color) {
      wishlistBtn.setAttribute("data-selected-variant-value", color);
    }

    first.classList.add("active");

    const radio = first.querySelector(".swatch-radio");
    if (radio) {
      radio.checked = true;
      radio.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
}

/********************************************************************
 🚦 Swatch loader delay-optimized
*********************************************************************/
function waitForSwatchesToLoad(retries = 10, scope = document) {
  requestIdleCallback(() => {
    const swatches = scope.querySelectorAll(
      ".card-wrapper .color-swatches .swatch-label"
    );

    if (swatches.length) {
      initializeSwatches(scope);
    } else if (retries > 0) {
      setTimeout(() => waitForSwatchesToLoad(retries - 1, scope), 70);
    }
  });
}

/********************************************************************
 🔥 MASTER INIT (ULTRA FAST)
*********************************************************************/
function initAll(scope = document) {
  requestIdleCallback(() => {
    waitForSwatchesToLoad(10, scope);
    initMediaSwipers(scope);
  });
}

window.initAll = initAll;

/********************************************************************
 📌 AUTO-RUN ON EVERY POSSIBLE EVENT  
*********************************************************************/

// Shopify Filters
document.addEventListener("facet:changed", (e) => initAll(e.target));

// Shopify Section render
document.addEventListener("shopify:section:load", (e) => initAll(e.target));

// Ajaxinate Pagination
document.addEventListener("ajaxinate:loaded", () => initAll(document));

// Search AJAX templates
document.addEventListener("filter:changed", () => initAll(document));

// First paint run
initAll(document);

/********************************************************************
 🎛 Swatch click + Variant Sync + Wishlist Sync + Image Sync
*********************************************************************/
document.addEventListener("click", (e) => {
  const label = e.target.closest(".card-wrapper .swatch-label");
  if (!label) return;

  const card = label.closest(".card-wrapper");
  const radio = label.querySelector(".swatch-radio");
  const swatch = label.querySelector(".swatch");

  const color = swatch?.getAttribute("title");
  const variant = radio?.value;

  const cartForm = card.querySelector(".quick-add form");
  const inputCart = cartForm?.querySelector("input[name='id']");
  const wishlist = card.querySelector(".wishlist_button");
  const btnCart = card.querySelector(".quick-add__submit.button");

  if (radio) {
    radio.checked = true;
    radio.dispatchEvent(new Event("change", { bubbles: true }));
  }

  if (inputCart && variant) {
    inputCart.value = variant;
    inputCart.dispatchEvent(new Event("change", { bubbles: true }));
  }

  if (wishlist && variant) {
    wishlist.setAttribute("data-product-variant-id", variant);
    if (color) wishlist.setAttribute("data-selected-variant-value", color);
  }

  if (color) {
    card.querySelector(".selected_value").textContent = color;
  }

  if (btnCart) btnCart.disabled = !variant;

  card.querySelectorAll(".product-variant-id").forEach((inp) => {
    inp.value = variant;
    inp.dispatchEvent(new Event("change", { bubbles: true }));
  });

  label.parentElement.querySelectorAll(".swatch-label").forEach((s) => s.classList.remove("active"));
  label.classList.add("active");

  /******** IMAGE CHANGE ********/
  const variantData = card.querySelector("#product-variants-data")?.textContent;
  if (!variantData) return;

  requestIdleCallback(() => {
    const variants = JSON.parse(variantData);
    const v = variants.find((x) => x.id == variant);

    if (!v?.variant_image?.length) return;

    const primary = v.variant_image[0];
    const secondary = v.variant_image[2] || primary;
    const imgs = card.querySelectorAll(".media img");

    if (imgs.length >= 2) {
      imgs[0].src = primary;
      imgs[0].srcset = primary;

      imgs[1].src = secondary;
      imgs[1].srcset = secondary;
    }
  });
});

/********************************************************************
 🎯 TOGGLE BTN  
*********************************************************************/
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".toggle-btn");
  if (!btn) return;

  const card = btn.closest(".card-wrapper");
  const menu = card.querySelector(".menu-container");
  const media = card.querySelector(".card__media");

  menu?.classList.toggle("active");
  media?.classList.toggle("active");
});
