document.addEventListener("DOMContentLoaded", () => {

    function initKymeeSwipers(context = document) {
        // ❌ Width restriction removed → Works on all devices
        if (typeof Swiper === "undefined") return;

        const cards = context.querySelectorAll(".product-grid .card-wrapper:not(.swiper-ready)");
        if (!cards.length) return;

        const batchSize = 8;
        let i = 0;

        function processBatch() {
            const slice = Array.from(cards).slice(i, i + batchSize);

            slice.forEach((card) => {
                const media = card.querySelector(".card__media .media");
                if (!media || media.classList.contains("swiper-initialized")) return;

                card.classList.add("swiper-ready");
                media.classList.add("swiper-container", "swiper-initialized");

                if (!media.querySelector(".swiper-wrapper")) {
                    const wrapper = document.createElement("div");
                    wrapper.className = "swiper-wrapper";

                    const frag = document.createDocumentFragment();
                    while (media.firstChild) frag.appendChild(media.firstChild);
                    wrapper.appendChild(frag);
                    media.appendChild(wrapper);
                }

                media.querySelectorAll(".swiper-wrapper > *").forEach((el) => el.classList.add("swiper-slide"));

                // ✅ ARROWS instead of progressbar
                const prevBtn = document.createElement("div");
                prevBtn.className = "swiper-button-prev";
                prevBtn.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12.5763 17.2253C12.7346 17.2253 12.893 17.1669 13.018 17.0419C13.2596 16.8003 13.2596 16.4003 13.018 16.1586L7.58464 10.7253C7.18464 10.3253 7.18464 9.67526 7.58464 9.27526L13.018 3.84193C13.2596 3.60026 13.2596 3.20026 13.018 2.95859C12.7763 2.71693 12.3763 2.71693 12.1346 2.95859L6.7013 8.39193C6.2763 8.81693 6.03464 9.39193 6.03464 10.0003C6.03464 10.6086 6.26797 11.1836 6.7013 11.6086L12.1346 17.0419C12.2596 17.1586 12.418 17.2253 12.5763 17.2253Z" fill="#292D32"/>
                    </svg>
                `;

                const nextBtn = document.createElement("div");
                nextBtn.className = "swiper-button-next";
                nextBtn.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7.42492 17.225C7.26659 17.225 7.10825 17.1667 6.98325 17.0417C6.74159 16.8 6.74159 16.4 6.98325 16.1583L12.4166 10.725C12.8166 10.325 12.8166 9.67502 12.4166 9.27502L6.98325 3.84168C6.74159 3.60002 6.74159 3.20002 6.98325 2.95835C7.22492 2.71668 7.62492 2.71668 7.86658 2.95835L13.2999 8.39168C13.7249 8.81668 13.9666 9.39168 13.9666 10C13.9666 10.6084 13.7333 11.1834 13.2999 11.6084L7.86658 17.0417C7.74158 17.1584 7.58325 17.225 7.42492 17.225Z" fill="#292D32"/>
                    </svg>
                `;

                media.appendChild(prevBtn);
                media.appendChild(nextBtn);


                requestIdleCallback(() => {
                    new Swiper(media, {
                        slidesPerView: 1,
                        spaceBetween: 10,
                        watchOverflow: true,

                        // ⭐ Arrow navigation enabled
                        navigation: {
                            nextEl: nextBtn,
                            prevEl: prevBtn,
                        },

                        on: {
                            init() {
                                if (this.slides.length <= 1) {
                                    prevBtn.style.display = "none";
                                    nextBtn.style.display = "none";
                                }
                            },
                        },
                    });
                }, { timeout: 800 });
            });

            i += batchSize;
            if (i < cards.length) {
                requestIdleCallback(processBatch, { timeout: 200 });
            }
        }

        requestIdleCallback(processBatch, { timeout: 200 });
    }

    function observeProductGrid() {
        const grid = document.querySelector(".product-grid");
        if (!grid) return;

        const observer = new MutationObserver((mutations) => {
            const hasNewCards = mutations.some((m) =>
                [...m.addedNodes].some(
                    (n) =>
                        n.nodeType === 1 &&
                        (n.classList.contains("card-wrapper") || n.querySelector?.(".card-wrapper"))
                )
            );

            if (hasNewCards) {
                setTimeout(() => {
                    requestIdleCallback(() => initKymeeSwipers(grid), { timeout: 800 });
                }, 250);
            }
        });

        observer.observe(grid, { childList: true, subtree: true });
        requestIdleCallback(() => initKymeeSwipers(grid), { timeout: 500 });
    }

    document.addEventListener("ajaxinate:loaded", () => {
        setTimeout(() => {
            requestIdleCallback(() => initKymeeSwipers(document), { timeout: 500 });
        }, 300);
    });

    document.addEventListener("shopify:section:load", (e) => {
        requestIdleCallback(() => initKymeeSwipers(e.target), { timeout: 500 });
    });

    let resizeTimer;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => initKymeeSwipers(), 400);
    });

    setTimeout(observeProductGrid, 400);
});
