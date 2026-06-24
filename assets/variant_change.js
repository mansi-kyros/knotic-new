// =======================
// Stable Swiper + Variant + Zoom (Buddy😎 Final Edition)
// - Same structure preserved
// - All functionalities active
// - Optimized for Shopify
// =======================

(function () {
    "use strict";

    const swiperByEl = new WeakMap();
    let lastIsMobile = null;
    let resizeTimer;
    let variantTimer;
    let lastSwatchValue = null;
    let hasRunVariantImageUpdate = false;

    // -----------------------------
    // 🌀 SWIPER (MOBILE ONLY)
    // -----------------------------
    function destroySwiper(el) {
        const inst = swiperByEl.get(el);
        if (inst && typeof inst.destroy === "function") {
            try {
                inst.destroy(true, true);
            } catch (e) { }
        }
        swiperByEl.delete(el);
        const pag = el.querySelector(".mobile-product-media-pagination");
        if (pag) pag.remove();
    }

    function initSwiper(el) {
        if (!el || swiperByEl.has(el)) return;

        if (!el.classList.contains("swiper")) el.classList.add("swiper");

        // let pag = el.querySelector(".mobile-product-media-pagination");
        // if (!pag) {
        //     pag = document.createElement("div");
        //     pag.className = "mobile-product-media-pagination";
        //     el.appendChild(pag);
        // }

        // if (!document.getElementById("swiper-pagination-styles")) {
        //     const style = document.createElement("style");
        //     style.id = "swiper-pagination-styles";
        //     style.textContent = `
        // .mobile-product-media-pagination{position:absolute;display:flex;justify-content:center;align-items:center;margin-top:15px;padding:8px 0;gap:6px;z-index:10}
        // .swiper-pagination-bullet{width:4px;height:4px;border-radius:50%;background:rgba(0,0,0,.2);margin:0!important;transition:all .3s cubic-bezier(.4,0,.2,1);cursor:pointer;border:none;outline:none;padding:0;opacity:.6}
        // .swiper-pagination-bullet-active{width:20px;height:6px;border-radius:9999px;background:#000;opacity:1}
        // .swiper-pagination-bullet.is-near-1{width:8px;height:8px;opacity:.8}
        // .swiper-pagination-bullet.is-near-2{width:6px;height:6px;opacity:.7}
        // .swiper-pagination-bullet:hover{opacity:1;transform:scale(1.1)}
        // .swiper-pagination-bullet-active:hover{transform:none}`;
        //     document.head.appendChild(style);
        // }

        const inst = new Swiper(el, {
            loop: false,
            slidesPerView: 1,
            spaceBetween: 10,
            observer: true,
            observeParents: true,
            resizeObserver: true,
            speed: 300,
            // pagination: {
            //     el: pag,
            //     clickable: true,
            //     type: "bullets",
            //     bulletClass: "swiper-pagination-bullet",
            //     bulletActiveClass: "swiper-pagination-bullet-active",
            //     renderBullet(index, className) {
            //         return `<span class="${className}" data-index="${index}"></span>`;
            //     },
            // },
            on: {
                init() {
                    this.updatePaginationClasses = () => {
                        const bullets = Array.from(this.pagination.bullets || []);
                        const activeIndex = this.activeIndex;
                        bullets.forEach((b, i) => {
                            const dist = Math.abs(i - activeIndex);
                            b.classList.toggle("is-near-1", dist === 1);
                            b.classList.toggle("is-near-2", dist === 2);
                        });
                    };
                    this.updatePaginationClasses();
                },
                slideChange() {
                    if (this.updatePaginationClasses) this.updatePaginationClasses();

                    // 🖼️ keep the thumbnail strip below in sync with the mobile swiper.
                    // Initial (server-rendered) slides carry a real data-media-id, but
                    // slides rebuilt client-side after a color change only carry a
                    // data-slide-index (variant.variant_image has no media id) — try
                    // the media-id match first, then fall back to index matching.
                    const activeSlide = this.slides[this.activeIndex];
                    if (!activeSlide) return;

                    const mediaGallery = el.closest('media-gallery');
                    const thumbnailsContainer = mediaGallery?.querySelector('[id^="GalleryThumbnails"]');
                    if (!thumbnailsContainer) return;

                    const mediaId = activeSlide.querySelector('[data-media-id]')?.dataset.mediaId;
                    const slideIndex = activeSlide.dataset.slideIndex;

                    let activeThumbnail = null;
                    if (mediaId) {
                        activeThumbnail = thumbnailsContainer.querySelector(`[data-target$="-${mediaId}"]`);
                    }
                    if (!activeThumbnail && slideIndex != null) {
                        activeThumbnail = thumbnailsContainer.querySelector(`[data-slide-index="${slideIndex}"]`);
                    }
                    if (!activeThumbnail) return;

                    thumbnailsContainer
                        .querySelectorAll('button')
                        .forEach((button) => button.removeAttribute('aria-current'));
                    activeThumbnail.querySelector('button')?.setAttribute('aria-current', 'true');

                    if (thumbnailsContainer.isSlideVisible?.(activeThumbnail, 10)) return;
                    thumbnailsContainer.slider?.scrollTo?.({ left: activeThumbnail.offsetLeft });
                },
            },
        });

        swiperByEl.set(el, inst);
    }

    function initAllSwipers(force = false) {
        const isMobile = window.innerWidth <= 789;
        if (!force && lastIsMobile === isMobile) return;

        document.querySelectorAll(".product-media-swiper").forEach((el) => {
            if (!el.isConnected) return;
            if (isMobile) {
                destroySwiper(el);
                initSwiper(el);
            } else {
                destroySwiper(el);
            }
        });

        lastIsMobile = isMobile;
    }

    // -----------------------------
    // 🧬 VARIANT CHANGE HANDLER
    // -----------------------------
    function processVariantCustom() {
        const infoWrapper = document.querySelector(".product__info-wrapper");
        if (!infoWrapper) return;

        const swatch = document.querySelector('.product__info-wrapper .swatch-input__input:checked');
        const currentSwatch = swatch ? swatch.value : null;

        console.log(swatch, currentSwatch);

        /* -----------------------------------------
       👉 Only change IMAGES if COLOR changed
    ----------------------------------------- */
        const shouldUpdateImages = currentSwatch !== lastSwatchValue;

        console.warn("Should update images:", shouldUpdateImages);

        // Update tracker
        lastSwatchValue = currentSwatch;

        const fieldsets = document.querySelectorAll("fieldset");
        const selectedValues = Array.from(fieldsets)
            .map((fs) => fs.querySelector("input:checked"))
            .filter(Boolean)
            .map((i) => i.value);

        const uniqueValues = [...new Set(selectedValues)];
        const selectedVariant = uniqueValues.join(" / ");
        if (!selectedVariant) return;

        const wishlistBtn = infoWrapper.querySelector(".wishlist_button");

        if (typeof p_variants === "undefined") return;
        const variant = p_variants.find((v) => v.title === selectedVariant);
        if (!variant) return;

        if (wishlistBtn) {
            wishlistBtn.setAttribute("data-product-variant-id", variant.id);
            wishlistBtn.setAttribute("data-selected-variant-value", variant.option1);
            console.log(wishlistBtn);
        }

        document
            .querySelectorAll(".stock-label, .estimated-delivery")
            .forEach((e) => (e.style.display = "none"));
        document
            .querySelector(`.stock-label[data-variant-id="${variant.id}"]`)
            ?.style.setProperty("display", "flex");
        document
            .querySelector(`.estimated-delivery[data-variant-id="${variant.id}"]`)
            ?.style.setProperty("display", "block");

        // if (!shouldUpdateImages) {
        //     console.log("Image update skipped. Variant changed but COLOR unchanged.");
        //     return;
        // }

        const grid = document.querySelector(".product__media-list");
        const mediaGallery = document.querySelector("media-gallery");
        if (!grid && !mediaGallery) return;

        // 🚫 skip the rebuild on the very first run (page load). The server already
        // rendered the swiper + thumbnails consistently from product.media — rebuilding
        // here with variant.variant_image (a different, plain-URL list with no
        // data-media-id) would immediately break the swiper↔thumbnail sync. Only rebuild
        // in response to a real, user-triggered color change.
        const isInitialLoad = !hasRunVariantImageUpdate;
        hasRunVariantImageUpdate = true;
        if (isInitialLoad) return;

        // Variant image rebuild logic
        if (variant.variant_image?.length) {
            const gridRef = grid || mediaGallery;
            gridRef.style.opacity = 0;

            setTimeout(() => {
                let html = "";
                if (window.innerWidth <= 749) {
                    html += '<div class="swiper-wrapper">';
                    // 🖼️ build the thumbnail strip from the SAME variant.variant_image list
                    // so it always matches whatever the swiper is showing for this color.
                    let thumbHtml = "";
                    variant.variant_image.forEach((media, index) => {
                        if (typeof media === "string") {
                            const fetchPriority = index === 0 ? 'fetchpriority="high"' : '';
                            html += `
                <div class="swiper-slide product__media-item grid__item scroll-trigger animate--fade-in swiper-slide-active" role="group" aria-label="1 / 3" data-slide-index="${index}" style="width: 345px; margin-right: 10px;">


                                        <div class="product-media-container media-type-image media-fit-cover global-media-settings gradient constrain-height" style="--ratio: 1.0; --preview-ratio: 1.0;">
                                        <modal-opener class="product__modal-opener product__modal-opener--image" data-modal="#ProductModal-template--25018520174871__main">

                                        <div class="loading__spinner hidden">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="spinner" viewBox="0 0 66 66"><circle stroke-width="6" cx="33" cy="33" r="30" fill="none" class="path"></circle></svg>

                                        </div>
                                        <div class="product__media media media--transparent">
                                            <img src="${media}" alt="" ${fetchPriority} srcset="${media.replace(/width=\d+/g, 'width=246')} 246w, ${media.replace(/width=\d+/g, 'width=493')} 493w, ${media.replace(/width=\d+/g, 'width=600')} 600w, ${media.replace(/width=\d+/g, 'width=713')} 713w, ${media.replace(/width=\d+/g, 'width=823')} 823w, ${media.replace(/width=\d+/g, 'width=990')} 990w, ${media.replace(/width=\d+/g, 'width=1100')} 1100w, ${media.replace(/width=\d+/g, 'width=1206')} 1206w, ${media.replace(/width=\d+/g, 'width=1346')} 1346w, ${media.replace(/width=\d+/g, 'width=1426')} 1426w, ${media.replace(/width=\d+/g, 'width=1646')} 1646w, ${media.replace(/width=\d+/g, 'width=1946')} 1946w" width="1946" height="2433" loading="lazy" class="image-magnify-hover" sizes="(min-width: 1200px) 715px, (min-width: 990px) calc(65.0vw - 10rem), (min-width: 750px) calc((100vw - 11.5rem) / 2), calc(100vw / 1 - 4rem)">
                                            </div>
                                        </modal-opener></div>

                                                </div>`;
                            thumbHtml += `
                                <li class="thumbnail-list__item slider__slide" data-slide-index="${index}">
                                    <button class="thumbnail global-media-settings global-media-settings--no-shadow"${index === 0 ? ' aria-current="true"' : ''}>
                                        <img src="${media.replace(/width=\d+/g, 'width=208')}" alt="" loading="lazy" width="208" height="208">
                                    </button>
                                </li>`;
                        }
                        if (media.media_type === "video" && media.sources) {
                            html += `<div class="swiper-slide product__media-item grid__item scroll-trigger animate--fade-in swiper-slide-active" role="group" aria-label="1 / 3" data-slide-index="${index}" style="width: 345px; margin-right: 10px;"><div class="product-media-container media-type-video media-fit-cover global-media-settings gradient constrain-height" style="--ratio: 1.0; --preview-ratio: 1.0;">
                                        <div class="product__media media media--transparent">
                                        <deferred-media><video autoplay loop muted playsinline style="aspect-ratio: 1.0; object-fit: cover; width: 100%; height: 100%;">`;
                            media.sources.forEach(source => {
                                if (source.mime_type.includes("video")) {
                                    html += `<source src="${source.url}" type="${source.mime_type}">`;
                                }
                            });
                            html += `Your browser does not support the video tag.</video></deferred-media></div></div></div>`;
                            thumbHtml += `
                                <li class="thumbnail-list__item slider__slide" data-slide-index="${index}">
                                    <button class="thumbnail global-media-settings global-media-settings--no-shadow"${index === 0 ? ' aria-current="true"' : ''}>
                                        <span class="thumbnail__badge" aria-hidden="true">&#9654;</span>
                                    </button>
                                </li>`;
                        }
                    });
                    html += "</div>";

                    // ⚠️ previously this did `mediaGallery.innerHTML = ...`, which wiped out
                    // EVERYTHING inside <media-gallery> on every variant change — including the
                    // thumbnail strip (GalleryThumbnails) and the live region. Scope the rebuild
                    // to just the existing .product-media-swiper container so siblings survive.
                    let swiperContainer = mediaGallery.querySelector(".product-media-swiper");
                    if (!swiperContainer) {
                        swiperContainer = document.createElement("div");
                        swiperContainer.className = "product-media-swiper swiper only-mobile";
                        mediaGallery.appendChild(swiperContainer);
                    }
                    swiperContainer.innerHTML = html;

                    // 🖼️ rebuild the thumbnail strip too — without this it stays frozen on
                    // the server-rendered product.media list forever, so it goes out of
                    // sync the moment a real color change swaps the swiper's images.
                    const thumbList = mediaGallery.querySelector('[id^="GalleryThumbnails"] .thumbnail-list');
                    if (thumbList) thumbList.innerHTML = thumbHtml;

                    setTimeout(() => {
                        initAllSwipers(true);
                        if (typeof enableZoomOnHover === "function") enableZoomOnHover(2);
                        // if (container) initCustomZoom(container);
                    }, 100);
                } else {
                    variant.variant_image.forEach((media, index) => {
                        console.log(media);
                        if (typeof media === "string") {
                            const fetchPriority = index === 0 ? 'fetchpriority="high"' : '';
                            html += `
                      <li class="product__media-item grid__item slider__slide scroll-trigger animate--fade-in" 
                            data-media-id="template--25018520174871__main-40888521785623">

                            <div class="product-media-container media-type-image media-fit-fill global-media-settings gradient constrain-height" style="--ratio: 1; --preview-ratio: 1;">
                            <modal-opener class="product__modal-opener product__modal-opener--image" data-modal="#ProductModal-template--25018520174871__main">
                                

                            <div class="loading__spinner hidden">
                            <svg xmlns="http://www.w3.org/2000/svg" class="spinner" viewBox="0 0 66 66"><circle stroke-width="6" cx="33" cy="33" r="30" fill="none" class="path"></circle></svg>

                            </div>
                            <div class="product__media media media--transparent">
                                <img src="${media}?width=1946" alt="" ${fetchPriority} srcset="${media}?width=246 246w, ${media}?width=493 493w, ${media}?width=600 600w, ${media}?width=713 713w, ${media}?width=823 823w, ${media}?width=990 990w, ${media}?width=1100 1100w, ${media}?width=1206 1206w, ${media}?width=1346 1346w, ${media}?width=1426 1426w, ${media}?width=1646 1646w, ${media}?width=1946 1946w" width="1946" height="2433" loading="lazy" class="image-magnify-hover" sizes="(min-width: 1200px) 715px, (min-width: 990px) calc(65.0vw - 10rem), (min-width: 750px) calc((100vw - 11.5rem) / 2), calc(100vw / 1 - 4rem)">
                                </div>
                            </modal-opener></div>

                                    </li>
                      `;
                        } else if (media.media_type === "video" && media.sources) {
                            html += `<li class="product__media-item grid__item slider__slide scroll-trigger animate--fade-in"><div class="product-media-container media-type-image media-fit-fill global-media-settings gradient constrain-height" style="--ratio: 1; --preview-ratio: 1;"><deferred-media><video autoplay loop muted playsinline style="aspect-ratio: 1;object-fit: cover;width: 100%;height: 100%;float: left;">`;
                            media.sources.forEach(source => {
                                if (source.mime_type.includes("video")) {
                                    html += `<source src="${source.url}" type="${source.mime_type}">`;
                                }
                            });
                            html += `</video></deferred-media></div></li>`;
                        }
                    });
                    grid.innerHTML = html;
                    if (typeof enableZoomOnHover === "function") enableZoomOnHover(2);
                    // initCustomZoom(grid);
                }
                gridRef.style.opacity = 1;
            }, 500);
        }
    }

    // -----------------------------
    // 🔍 CUSTOM ZOOM
    // -----------------------------
    // class CustomZoom {
    //     constructor() {
    //         this.dialog = null;
    //         this.media = [];
    //         this.currentIndex = 0;
    //         this.setup();
    //     }

    //     setup() {
    //         if (document.getElementById("custom-zoom-dialog")) {
    //             this.dialog = document.getElementById("custom-zoom-dialog");
    //             this.thumbs = this.dialog.querySelector("[ref='thumbnails']");
    //             this.content = this.dialog.querySelector(
    //                 ".dialog-zoomed-gallery__content"
    //             );
    //             return;
    //         }

    //         const html = `
    //     <div id="custom-zoom-dialog" hidden>
    //       <button class="close-btn" aria-label="Close">&times;</button>
    //       <div class="dialog-thumbnails-list" ref="thumbnails"></div>
    //       <div class="dialog-zoomed-gallery__content"></div>
    //     </div>`;
    //         document.body.insertAdjacentHTML("beforeend", html);

    //         const style = document.createElement("style");
    //         style.textContent = `
    //     #custom-zoom-dialog{position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:1000;display:flex;flex-direction:column;align-items:center;justify-content:center}
    //     #custom-zoom-dialog[hidden]{display:none!important}
    //     .close-btn{position:absolute;top:15px;right:15px;background:#000;color:#fff;border:none;font-size:24px;cursor:pointer}
    //     .dialog-thumbnails-list{display:flex;gap:6px;margin-top:10px;overflow-x:auto}
    //     .dialog-thumbnails-list img{width:60px;height:60px;object-fit:cover;cursor:pointer;opacity:.6;border:2px solid transparent;border-radius:6px}
    //     .dialog-thumbnails-list img.active{opacity:1;border-color:#fff}
    //     .dialog-zoomed-gallery__content img{max-width:90vw;max-height:80vh;object-fit:contain;animation:fadeIn .3s ease}
    //     @keyframes fadeIn{from{opacity:0}to{opacity:1}}`;
    //         document.head.appendChild(style);

    //         this.dialog = document.getElementById("custom-zoom-dialog");
    //         this.thumbs = this.dialog.querySelector("[ref='thumbnails']");
    //         this.content = this.dialog.querySelector(".dialog-zoomed-gallery__content");

    //         this.dialog.querySelector(".close-btn").addEventListener("click", () => this.close());
    //         this.dialog.addEventListener("click", (e) => {
    //             if (e.target === this.dialog) this.close();
    //         });
    //     }

    //     open(index, mediaArr) {
    //         this.media = mediaArr;
    //         this.currentIndex = index;
    //         this.updateDialog();
    //         this.dialog.hidden = false;
    //         document.body.style.overflow = "hidden";
    //     }

    //     close() {
    //         this.dialog.hidden = true;
    //         document.body.style.overflow = "";
    //     }

    //     updateDialog() {
    //         this.content.innerHTML = "";
    //         this.thumbs.innerHTML = "";
    //         this.media.forEach((m, i) => {
    //             const img = document.createElement("img");
    //             img.src = m.src;
    //             img.alt = m.alt || "";
    //             if (i === this.currentIndex) img.classList.add("active");
    //             img.addEventListener("click", () => {
    //                 this.currentIndex = i;
    //                 this.updateDialog();
    //             });
    //             this.thumbs.appendChild(img);
    //         });

    //         const current = this.media[this.currentIndex];
    //         if (current) {
    //             const main = document.createElement("img");
    //             main.src = current.src;
    //             main.alt = current.alt || "";
    //             this.content.appendChild(main);
    //         }
    //     }
    // }

    // const customZoom = new CustomZoom();

    // function initCustomZoom(container) {
    //     if (!container) return;
    //     const imgs = container.querySelectorAll(".product__media img");
    //     imgs.forEach((img, index) => {
    //         img.style.cursor = "zoom-in";
    //         img.addEventListener("click", () => {
    //             const mediaArr = Array.from(container.querySelectorAll(".product__media img")).map(
    //                 (el) => ({ src: el.src, alt: el.alt })
    //             );
    //             customZoom.open(index, mediaArr);
    //         });
    //     });
    // }

    // -----------------------------
    // ⚡ EVENT BINDINGS
    // -----------------------------
    document.addEventListener("DOMContentLoaded", () => {
        initAllSwipers(true);
        const container = document.querySelector(".product-media-swiper, .product__media-list");
        // if (container) initCustomZoom(container);
        processVariantCustom();
    });

    document.addEventListener("change", (e) => {
        if (e.target.matches(".product__info-wrapper fieldset input[type='radio']")) {
            clearTimeout(variantTimer);
            variantTimer = setTimeout(processVariantCustom, 1000);
        }
    });

    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => initAllSwipers(true), 400);
    });

    // -----------------------------
    // 🖼️ THUMBNAIL CLICK → MOVE MOBILE SWIPER
    // -----------------------------
    // media-gallery.js's own click handler only drives Dawn's native viewer
    // (GalleryViewer), which is hidden on mobile. Without this, clicking a
    // thumbnail updates the active highlight but never moves the visible
    // custom swiper, causing the main image and the highlighted thumbnail to
    // go out of sync.
    document.addEventListener("click", (event) => {
        const thumbItem = event.target.closest(
            '[id^="GalleryThumbnails"] li[data-target], [id^="GalleryThumbnails"] li[data-slide-index]'
        );
        if (!thumbItem) return;
        if (window.innerWidth > 749) return;

        const mediaGallery = thumbItem.closest("media-gallery");
        const swiperEl = mediaGallery?.querySelector(".product-media-swiper");
        const swiperInstance = swiperEl && swiperByEl.get(swiperEl);
        if (!swiperInstance) return;

        const slides = Array.from(swiperInstance.slides || []);
        let slideIndex = -1;

        // SSR thumbnails carry a real data-target (-> media id); thumbnails
        // rebuilt after a color change only carry a positional data-slide-index.
        const mediaId = thumbItem.dataset.target?.match(/(\d+)$/)?.[1];
        if (mediaId) {
            slideIndex = slides.findIndex(
                (slide) => slide.querySelector("[data-media-id]")?.dataset.mediaId === mediaId
            );
        }
        if (slideIndex === -1 && thumbItem.dataset.slideIndex != null) {
            slideIndex = parseInt(thumbItem.dataset.slideIndex, 10);
        }
        if (slideIndex === -1 || Number.isNaN(slideIndex)) return;

        swiperInstance.slideTo(slideIndex);
    });
})();
