/**
 * ⚡ Optimized FacetFiltersForm + Sticky Facets (LCP / INP / CLS Safe)
 * Fully functional with active-facets and performance-tuned for Shopify collections.
 */

/* =======================================================
   🧠 SAFARI-SAFE requestIdleCallback POLYFILL
========================================================== */
window.requestIdleCallback =
  window.requestIdleCallback ||
  function (cb) {
    return setTimeout(() => {
      cb({
        didTimeout: false,
        timeRemaining: () => 20
      });
    }, 1);
  };

/* ===============================  
   🔁 DEBOUNCE UTILITY
================================= */
function debounce(fn, delay) {
  let timer;
  return function () {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, arguments), delay);
  };
}

/* =======================================================
   🛍️ FACET FILTERS (100% iOS FIXED)
========================================================== */
class FacetFiltersForm extends HTMLElement {
  constructor() {
    super();
    this.onActiveFilterClick = this.onActiveFilterClick.bind(this);
    this.debouncedOnSubmit = debounce((e) => this.onSubmitHandler(e), 400);

    const form = this.querySelector("form");

    if (form) {
      form.addEventListener("input", this.debouncedOnSubmit);
      form.addEventListener("change", this.debouncedOnSubmit); // ⭐ iOS fix
    }
  }

  static setListeners() {
    window.addEventListener("popstate", (event) => {
      const searchParams = event.state?.searchParams ?? FacetFiltersForm.searchParamsInitial;

      if (searchParams !== FacetFiltersForm.searchParamsPrev) {
        requestIdleCallback(() => FacetFiltersForm.renderPage(searchParams, null, false));
      }
    });
  }

  static renderPage(searchParams, event, updateURLHash = true) {
    FacetFiltersForm.searchParamsPrev = searchParams;

    const sections = FacetFiltersForm.getSections();

    // show loading state
    const grid = document.getElementById("ProductGridContainer");
    grid?.classList.add("loading");

    document.querySelectorAll(".loading__spinner").forEach((s) => s.classList.remove("hidden"));

    sections.forEach((section) => {
      const url = `${window.location.pathname}?section_id=${section.section}&${searchParams}`;

      const cached = FacetFiltersForm.filterData.find((d) => d.url === url);

      requestIdleCallback(() => {
        cached
          ? FacetFiltersForm.renderFromCache(cached.html, event)
          : FacetFiltersForm.fetchAndRender(url, event);
      });
    });

    if (updateURLHash) {
      history.pushState({ searchParams }, "", `${window.location.pathname}?${searchParams}`);
    }
  }

  static fetchAndRender(url, event) {
    fetch(url)
      .then((res) => res.text())
      .then((html) => {
        FacetFiltersForm.filterData.push({ url, html });
        FacetFiltersForm.renderFromCache(html, event);
      })
      .catch(console.error);
  }

  static renderFromCache(html, event) {
    const parsed = new DOMParser().parseFromString(html, "text/html");
    requestIdleCallback(() => FacetFiltersForm.updateDOM(parsed, event));
  }

  static updateDOM(parsedHTML, event) {
    const newGrid = parsedHTML.getElementById("ProductGridContainer");
    const oldGrid = document.getElementById("ProductGridContainer");
    if (newGrid && oldGrid) oldGrid.innerHTML = newGrid.innerHTML;

    // update active facets & count
    const selectors = [
      ".active-facets-desktop",
      ".active-facets-mobile",
      "#ProductCount",
      "#ProductCountDesktop"
    ];

    selectors.forEach((sel) => {
      const newEl = parsedHTML.querySelector(sel);
      const curEl = document.querySelector(sel);
      if (newEl && curEl) curEl.innerHTML = newEl.innerHTML;
    });

    // hide loading
    document.querySelectorAll(".loading").forEach((el) => el.classList.remove("loading"));
    document.querySelectorAll(".loading__spinner").forEach((el) => el.classList.add("hidden"));

    //⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐
    // CRITICAL FIX → Re-activate Custom Elements
    //⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐

    customElements.upgrade(document.querySelector("facet-filters-form"));
    document.querySelectorAll("price-range").forEach((el) => customElements.upgrade(el));
    document.querySelectorAll("facet-remove").forEach((el) => customElements.upgrade(el));

    document.dispatchEvent(new CustomEvent("ajaxinate:loaded"));
  }

  createSearchParams(form) {
    return new URLSearchParams(new FormData(form)).toString();
  }

  onSubmitHandler(event) {
    event.preventDefault();

    const forms = Array.from(document.querySelectorAll("facet-filters-form form"));
    const searchParams = forms.map((f) => this.createSearchParams(f)).join("&");

    FacetFiltersForm.renderPage(searchParams, event);
  }

  onActiveFilterClick(event) {
    event.preventDefault();
    const url = event.currentTarget.href.split("?")[1];
    FacetFiltersForm.renderPage(url);
  }

  static getSections() {
    return [
      {
        section: document.getElementById("product-grid")?.dataset.id
      }
    ];
  }
}

FacetFiltersForm.filterData = [];
FacetFiltersForm.searchParamsInitial = window.location.search.slice(1);
FacetFiltersForm.searchParamsPrev = window.location.search.slice(1);

customElements.define("facet-filters-form", FacetFiltersForm);
FacetFiltersForm.setListeners();

/* =======================================================
   PRICE RANGE COMPONENT
========================================================= */
class PriceRange extends HTMLElement {
  constructor() {
    super();

    /* -------- INPUT FIELDS -------- */
    this.textMin = this.querySelector('.price-input-min');
    this.textMax = this.querySelector('.price-input-max');

    /* -------- SLIDERS -------- */
    this.rangeMin = this.querySelector('.range-min');
    this.rangeMax = this.querySelector('.range-max');

    /* -------- LABELS (VISIBLE PRICE TEXT) -------- */
    this.minPriceText = this.querySelector('.min-range-price');
    this.maxPriceText = this.querySelector('.max-range-price');

    /* -------- TRACK BAR (FILLED AREA) -------- */
    this.track = this.querySelector('.price-slider-connect');

    /* -------- EVENTS -------- */
    this.rangeMin.addEventListener('input', () => this.sliderChanged('min'));
    this.rangeMax.addEventListener('input', () => this.sliderChanged('max'));

    this.textMin.addEventListener('input', () => this.textChanged());
    this.textMax.addEventListener('input', () => this.textChanged());

    /* Initial sync */
    this.syncFromInput();
    this.updateVisuals();
  }

  /* SLIDER → INPUT */
  sliderChanged(which) {
    let min = +this.rangeMin.value;
    let max = +this.rangeMax.value;

    // Prevent overlap
    if (max - min < 100) {
      if (which === 'min') min = this.rangeMin.value = max - 100;
      else max = this.rangeMax.value = min + 100;
    }

    this.textMin.value = min;
    this.textMax.value = max;

    this.updateVisuals();
    this.submitFilter();
  }

  /* INPUT → SLIDER */
  textChanged() {
    let min = parseInt((this.textMin.value || "0").replace(/,/g, ""));
    let max = parseInt((this.textMax.value || this.rangeMax.max).replace(/,/g, ""));

    if (max - min < 100) max = min + 100;

    this.rangeMin.value = min;
    this.rangeMax.value = max;

    this.updateVisuals();
    this.submitFilter();
  }

  /* SYNC SHOPIFY PREFILLED VALUES */
  syncFromInput() {
    const min = parseInt((this.textMin.value || "0").replace(/,/g, "")) || 0;
    const max = parseInt((this.textMax.value || this.rangeMax.max).replace(/,/g, ""));

    this.rangeMin.value = min;
    this.rangeMax.value = max;
  }

  /* UPDATE UI */
  updateVisuals() {
    const min = parseInt(this.rangeMin.value);
    const max = parseInt(this.rangeMax.value);
    const rangeMax = parseInt(this.rangeMax.max);

    const percent1 = (min / rangeMax) * 100;
    const percent2 = (max / rangeMax) * 100;

    // Track fill bar update
    this.track.style.left = percent1 + "%";
    this.track.style.width = (percent2 - percent1) + "%";

    // Update visible labels
    this.minPriceText.textContent = "₹ " + min;
    this.maxPriceText.textContent = "₹ " + max;
  }

  /* SUBMIT SHOPIFY FILTER */
  submitFilter() {
    this.textMin.dispatchEvent(new Event("change", { bubbles: true }));
    this.textMax.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

customElements.define('price-range', PriceRange);

/* =======================================================
   FACET REMOVE COMPONENT (WORKING)
========================================================= */
class FacetRemove extends HTMLElement {
  constructor() {
    super();
    const link = this.querySelector("a");
    if (!link) return;

    link.setAttribute("role", "button");

    const handleClick = (e) => {
      e.preventDefault();
      const form =
        this.closest("facet-filters-form") || document.querySelector("facet-filters-form");
      form?.onActiveFilterClick?.(e);
    };

    link.addEventListener("click", handleClick);
    link.addEventListener("keyup", (e) => {
      if (e.code === "Space") handleClick(e);
    });
  }
}
customElements.define("facet-remove", FacetRemove);

/*************************************************************
 💎 CUSTOM DIAMOND FILTER → CONNECT WITH SHOPIFY FACET SYSTEM
**************************************************************/
function applyDiamondFilter(label) {
  const realInput = document.querySelector(
    `input[type="checkbox"][value="${label}"][name*="diamond"]`
  );
  if (!realInput) return;

  realInput.checked = !realInput.checked;
  realInput.dispatchEvent(new Event("input", { bubbles: true }));
  syncDiamondActiveUI();
}

function syncDiamondActiveUI() {
  document.querySelectorAll(".diamond_filter_item").forEach((el) => {
    const label = el.dataset.diamond?.trim();
    const realInput = document.querySelector(
      `input[type="checkbox"][value="${label}"][name*="diamond"]`
    );
    realInput?.checked ? el.classList.add("active") : el.classList.remove("active");
  });
}

document.addEventListener("click", (e) => {
  const item = e.target.closest(".diamond_filter_item");
  if (!item) return;
  applyDiamondFilter(item.dataset.diamond.trim());
});

/*************************************************************
 🎨 CUSTOM STYLE FILTER → SAME LOGIC
**************************************************************/
function applyStyleFilter(label) {
  const realInput = document.querySelector(
    `input[type="checkbox"][value="${label}"][name*="style"]`
  );
  if (!realInput) return;

  realInput.checked = !realInput.checked;
  realInput.dispatchEvent(new Event("input", { bubbles: true }));
  syncStyleActiveUI();
}

function syncStyleActiveUI() {
  document.querySelectorAll(".style_filter_item").forEach((el) => {
    const label = el.dataset.style?.trim();

    const realInput = document.querySelector(
      `input[type="checkbox"][value="${label}"][name*="style"]`
    );

    realInput?.checked ? el.classList.add("active") : el.classList.remove("active");
  });
}

document.addEventListener("click", (e) => {
  const item = e.target.closest(".style_filter_item");
  if (!item) return;

  applyStyleFilter(item.dataset.style.trim());
});

/*************************************************************
 🔥 RE-SYNC BOTH FILTERS AFTER AJAX RELOAD / DOM UPDATE
*************************************************************/
function syncAllCustomFilters() {
  syncDiamondActiveUI();
  syncStyleActiveUI();
  initFilterSwipers(); // Swiper refresh after filters load
}

document.addEventListener("DOMContentLoaded", syncAllCustomFilters);
document.addEventListener("shopify:section:load", syncAllCustomFilters);
document.addEventListener("ajaxinate:loaded", syncAllCustomFilters);
document.addEventListener("facet:changed", syncAllCustomFilters);
document.addEventListener("product-grid:updated", syncAllCustomFilters);
window.addEventListener("load", syncAllCustomFilters);


/*************************************************************
 🌀 SWIPER INITIALIZATION FOR BOTH FILTERS (WITH ARROWS)
**************************************************************/
function initFilterSwipers() {
  // Diamond Filter Swiper
  document.querySelectorAll(".diamond_filter_ul").forEach((el) => {
    if (el.classList.contains("swiper-initialized")) return;

    const nextArrow = document.createElement("div");
    nextArrow.className = "swiper-button-next diamond-next";

    const prevArrow = document.createElement("div");
    prevArrow.className = "swiper-button-prev diamond-prev";

    el.appendChild(nextArrow);
    el.appendChild(prevArrow);

    new Swiper(el, {
      slidesPerView: 4,
      spaceBetween: 10,
      navigation: {
        nextEl: nextArrow,
        prevEl: prevArrow,
      },

      breakpoints: {
        480: {
          slidesPerView: 5,
        },
        750: {
          slidesPerView: 6,
        },
        1100: {
          slidesPerView: 8,
        },
        1439: {
          slidesPerView: 9,
        },
      },
    });
  });

  // Style Filter Swiper
  document.querySelectorAll(".style_filter_ul").forEach((el) => {
    if (el.classList.contains("swiper-initialized")) return;

    const nextArrow = document.createElement("div");
    nextArrow.className = "swiper-button-next style-next";

    const prevArrow = document.createElement("div");
    prevArrow.className = "swiper-button-prev style-prev";

    el.appendChild(nextArrow);
    el.appendChild(prevArrow);

    new Swiper(el, {
      slidesPerView: 4,
      spaceBetween: 10,
      navigation: {
        nextEl: nextArrow,
        prevEl: prevArrow,
      },
      breakpoints: {
        480: {
          slidesPerView: 5,
        },
        750: {
          slidesPerView: 6,
        },
        1100: {
          slidesPerView: 8,
        },
        1439: {
          slidesPerView: 9,
        },
      },
    });
  });
}


