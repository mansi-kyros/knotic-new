document.addEventListener("DOMContentLoaded", () => {
  const key = "wishlist";
  const wishlistBlock = document.querySelector(".js-wishlistBlock");
  const wishlistButtons = document.querySelectorAll(".wishlist_button");

  /* ----------------------------------------------------
     🧠 Step 1: Pre-render Skeleton Loader (improves FCP)
  ---------------------------------------------------- */
  if (document.body.classList.contains("custom-wishlist") && wishlistBlock) {
    wishlistBlock.innerHTML = `
      <div class="wishlist-skeleton" style="min-height:400px;display:flex;align-items:center;justify-content:center;">
        <img src="https://cdn.shopify.com/s/files/1/0857/2085/8938/files/Animation_-_1741843753530.gif?v=1741843804" width="70" height="70" alt="Loading..." loading="lazy" decoding="async">
      </div>`;
  }

  /* ----------------------------------------------------
     🧩 Step 2: Activate wishlist buttons instantly
  ---------------------------------------------------- */
  const wishlist = JSON.parse(localStorage.getItem(key)) || [];
  wishlistButtons.forEach((btn) => {
    const title = btn.dataset.productTitle;
    if (wishlist.some((item) => item.productTitle === title)) {
      btn.classList.add("active");
    }
  });

  updateWishlistCount();

  // Load wishlist items only on wishlist page
  if (document.body.classList.contains("custom-wishlist")) {
    requestAnimationFrame(displayWishlist);
  }

  /* ----------------------------------------------------
     🖱️ Step 3: Event Delegation for all wishlist actions
  ---------------------------------------------------- */
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest(".wishlist_button");
    const removeBtn = e.target.closest(".remove_wishlist");
    const moveBtn = e.target.closest(".move_to_cart");

    // ➕ ADD / REMOVE from Wishlist
    if (btn) {
      const data = {
        productTitle: btn.dataset.productTitle,
        productImg: btn.dataset.productImg,
        productPrice: btn.dataset.productPrice,
        productUrl: btn.dataset.productUrl,
        productId: btn.dataset.productId,
        productVariant: btn.dataset.productVariantId,
      };

      let list = JSON.parse(localStorage.getItem(key)) || [];
      const index = list.findIndex((i) => i.productTitle === data.productTitle);

      if (index === -1) {
        list.push(data);
        btn.classList.add("active");
      } else {
        list.splice(index, 1);
        btn.classList.remove("active");
      }

      localStorage.setItem(key, JSON.stringify(list));
      updateWishlistCount();

      if (document.body.classList.contains("custom-wishlist")) {
        requestAnimationFrame(displayWishlist);
      }
      return;
    }

    // ❌ REMOVE item
    if (removeBtn) {
      const title = removeBtn.dataset.productTitle;
      let list = JSON.parse(localStorage.getItem(key)) || [];
      list = list.filter((i) => i.productTitle !== title);
      localStorage.setItem(key, JSON.stringify(list));
      updateWishlistCount();

      if (document.body.classList.contains("custom-wishlist")) {
        requestAnimationFrame(displayWishlist);
      }
      return;
    }

    // 🛒 MOVE TO CART
    if (moveBtn) {
      const variantId = moveBtn.dataset.productVariantId;
      const title = moveBtn.dataset.productTitle;
      moveBtn.textContent = "Moving...";
      moveBtn.style.opacity = "0.6";
      moveBtn.setAttribute("aria-disabled", "true");

      try {
        const res = await fetch("/cart/add.js", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: variantId, quantity: 1 }),
        });
        if (!res.ok) throw new Error("Add to cart failed");

        let list = JSON.parse(localStorage.getItem(key)) || [];
        list = list.filter((i) => i.productTitle !== title);
        localStorage.setItem(key, JSON.stringify(list));

        updateWishlistCount();
        if (document.body.classList.contains("custom-wishlist")) {
          requestAnimationFrame(displayWishlist);
        }

        if (typeof updateCartCount === "function") updateCartCount();
        if (typeof fetchCartDrawer === "function") fetchCartDrawer();

        setTimeout(() => {
          const drawer = document.querySelector(".cart-drawer__dialog");
          if (drawer) drawer.open = true;
          document.documentElement.setAttribute("scroll-lock", "");
        }, 500);
      } catch (err) {
        console.error("Move to cart error:", err);
        alert("Unable to add product to cart.");
      } finally {
        moveBtn.textContent = "Move to Cart";
        moveBtn.style.opacity = "1";
        moveBtn.removeAttribute("aria-disabled");
      }
    }
  });

  /* ----------------------------------------------------
     💫 Step 4: Display Wishlist (Lazy + Stable Layout)
  ---------------------------------------------------- */
  function displayWishlist() {
    const list = JSON.parse(localStorage.getItem(key)) || [];
    if (!wishlistBlock) return;

    if (!list.length) {
      wishlistBlock.innerHTML = `
        <div class="wishlist-empty" style="min-height:400px;display:flex;align-items:center;justify-content:center;">
          <img src="https://cdn.shopify.com/s/files/1/0857/2085/8938/files/Animation_-_1741693242592.gif?v=1741693298" width="200" height="200" alt="Empty" loading="lazy">
        </div>`;
      return;
    }

    const query = list.map(i => 'id:' + i.productId).join(' OR ');
    fetch(`/search?section_id=wishlist-render&type=product&q=${encodeURIComponent(query)}`)
      .then(res => res.text())
      .then(html => {
        const temp = document.createElement("div");
        temp.innerHTML = html;
        const section = temp.querySelector("[data-wishlist-render]");
        if (section && section.innerHTML.trim()) {
          wishlistBlock.innerHTML = section.innerHTML;
        } else {
          wishlistBlock.innerHTML = `<p>No wishlist items found.</p>`;
        }
      })
      .catch(err => {
        console.error("Wishlist render error:", err);
        wishlistBlock.innerHTML = `<p>Error loading wishlist.</p>`;
      });
  }

  /* ----------------------------------------------------
     🔢 Step 5: Wishlist Count Update
  ---------------------------------------------------- */
  function updateWishlistCount() {
    const wishlist = JSON.parse(localStorage.getItem("wishlist")) || [];
    const count = wishlist.length;
    document.querySelectorAll(".wishlist-total-count").forEach((el) => {
      el.textContent = count;
      el.dataset.total = count;
    });
  }

  /* ----------------------------------------------------
     🛍️ Step 6: Cart Drawer & Count (unchanged)
  ---------------------------------------------------- */
  function fetchCartDrawer() {
    const drawer = document.querySelector(".cart-drawer__dialog");
    if (!drawer) return;
    fetch("/cart?sections=cart-drawer")
      .then(r => r.json())
      .then(data => {
        const html = data["cart-drawer"];
        const temp = document.createElement("div");
        temp.innerHTML = html;
        const newInner = temp.querySelector(".cart-drawer__content");
        const oldInner = drawer.querySelector(".cart-drawer__content");
        if (newInner && oldInner) oldInner.innerHTML = newInner.innerHTML;
      })
      .catch(e => console.error("Drawer update failed:", e));
  }

  function updateCartCount() {
    $.ajax({
      type: "GET",
      url: "/cart.js",
      dataType: "json",
      success: (cart) => $(".cart-bubble__text-count").text(cart.item_count),
    });
  }
});
