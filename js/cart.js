// Set the storage key for the cart
const CART_KEY = "marvelor-cart";

// Select the cart interface elements
const cartPanel = document.querySelector(".cart-panel");
const cartOpenButton = document.querySelector(".cart-button");
const cartCloseButton = document.querySelector(".cart-close");
const cartItemsContainer = document.querySelector(".cart-items");
const cartTotalElement = document.querySelector(".cart-total");
const cartCheckoutButton = document.querySelector(".checkout-button");

// Format prices in US dollars
const cartCurrency = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
});

// Track renders and cache catalog requests
let cartRenderVersion = 0;
let cartCatalogPromise = null;

// Read valid cart entries from local storage
function getCart() {
    try {
        const storedCart = localStorage.getItem(CART_KEY);

        if (!storedCart) return [];

        const cart = JSON.parse(storedCart);

        if (!Array.isArray(cart)) return [];

        return cart
            .filter(
                (item) =>
                    item &&
                    typeof item.id === "string" &&
                    item.id.trim().length > 0 &&
                    (item.type === "product" || item.type === "bundle") &&
                    Number.isSafeInteger(item.quantity) &&
                    item.quantity > 0
            )
            .map((item) => ({
                id: item.id,
                type: item.type,
                quantity: item.quantity
            }));
    } catch (error) {
        console.error("Unable to read the cart:", error);
        return [];
    }
}

// Save the cart to local storage
function saveCart(cart) {
    try {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
        return true;
    } catch (error) {
        console.error("Unable to save the cart:", error);
        return false;
    }
}

// Add an item or increase its quantity
function addToCart(id, type, quantity) {
    if (
        typeof id !== "string" ||
        !id.trim() ||
        (type !== "product" && type !== "bundle") ||
        !Number.isSafeInteger(quantity) ||
        quantity < 1
    ) {
        return false;
    }

    const cart = getCart();

    const existingItem = cart.find(
        (item) => item.id === id && item.type === type
    );

    if (existingItem) {
        const totalQuantity = existingItem.quantity + quantity;

        if (!Number.isSafeInteger(totalQuantity)) {
            return false;
        }

        existingItem.quantity = totalQuantity;
    } else {
        cart.push({ id, type, quantity });
    }

    const saved = saveCart(cart);

    if (saved && cartPanel && cartPanel.open) {
        renderCart();
    }

    return saved;
}

// Change an existing item's quantity
function updateCartQuantity(id, type, quantity) {
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
        return false;
    }

    const cart = getCart();

    const item = cart.find(
        (entry) => entry.id === id && entry.type === type
    );

    if (!item) return false;

    item.quantity = quantity;

    return saveCart(cart);
}

// Remove an item from the cart
function removeCartItem(id, type) {
    const cart = getCart().filter(
        (item) => !(item.id === id && item.type === type)
    );

    return saveCart(cart);
}

// Load a catalog file
async function fetchCartCatalog(url) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to load ${url}: ${response.status}`);
    }

    const items = await response.json();

    if (!Array.isArray(items)) {
        throw new Error(`Data in ${url} must be an array.`);
    }

    return items;
}

// Reuse catalog data during the current page visit
function loadCartCatalogs() {
    if (!cartCatalogPromise) {
        cartCatalogPromise = Promise.all([
            fetchCartCatalog("data/product.json"),
            fetchCartCatalog("data/bundles.json")
        ]).catch((error) => {
            cartCatalogPromise = null;
            throw error;
        });
    }

    return cartCatalogPromise;
}

// Create a text element safely
function createCartText(tag, className, text) {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text;

    return element;
}

// Match cart entries with catalog items
function resolveCartEntries(cart, products, bundles) {
    return cart.map((entry) => {
        const catalog = entry.type === "bundle" ? bundles : products;

        const foundItem = catalog.find(
            (item) => item && item.id === entry.id
        );

        const validItem =
            foundItem &&
            typeof foundItem.name === "string" &&
            typeof foundItem.image === "string" &&
            typeof foundItem.price === "number" &&
            Number.isFinite(foundItem.price) &&
            foundItem.price >= 0 &&
            Number.isFinite(foundItem.price * entry.quantity);

        return {
            entry,
            item: validItem ? foundItem : null
        };
    });
}

// Calculate the subtotal for available items
function calculateCartSubtotal(rows) {
    const subtotal = rows.reduce(
        (total, row) =>
            total + (row.item ? row.item.price * row.entry.quantity : 0),
        0
    );

    if (!Number.isFinite(subtotal)) {
        throw new Error("Invalid cart subtotal.");
    }

    return subtotal;
}

// Create one cart item
function createCartItem(entry, item, products, bundles) {
    const card = document.createElement("article");
    card.className = "cart-item";

    const info = document.createElement("div");
    info.className = "cart-item-info";

    const name = createCartText(
        "h3",
        "cart-item-name",
        item ? item.name : "Unavailable item"
    );

    info.append(name);

    if (!item) {
        info.append(
            createCartText(
                "p",
                "cart-item-notice",
                "This item is no longer available."
            )
        );
    } else {
        // Display the product image and unit price
        const image = document.createElement("img");
        image.className = "cart-item-image";
        image.src = item.image;
        image.alt = item.name;
        image.loading = "lazy";

        const price = createCartText(
            "p",
            "cart-item-price",
            `${cartCurrency.format(item.price)} each`
        );

        // Create minus and plus quantity controls
        const controls = document.createElement("div");
        controls.className = "cart-quantity-controls";
        controls.setAttribute("role", "group");
        controls.setAttribute(
            "aria-label",
            `Quantity for ${item.name}`
        );

        const minusButton = document.createElement("button");
        minusButton.type = "button";
        minusButton.className = "cart-quantity-button";
        minusButton.textContent = "−";
        minusButton.setAttribute(
            "aria-label",
            `Decrease quantity for ${item.name}`
        );

        const quantityValue = createCartText(
            "span",
            "cart-quantity-value",
            String(entry.quantity)
        );
        quantityValue.setAttribute("aria-live", "polite");

        const plusButton = document.createElement("button");
        plusButton.type = "button";
        plusButton.className = "cart-quantity-button";
        plusButton.textContent = "+";
        plusButton.setAttribute(
            "aria-label",
            `Increase quantity for ${item.name}`
        );

        controls.append(minusButton, quantityValue, plusButton);

        const lineTotal = createCartText(
            "p",
            "cart-item-total",
            cartCurrency.format(item.price * entry.quantity)
        );

        const message = createCartText("p", "cart-item-message", "");
        message.setAttribute("role", "status");

        let currentQuantity = entry.quantity;

        // Update controls without replacing the item
        function refreshQuantityControls() {
            quantityValue.textContent = String(currentQuantity);
            minusButton.disabled = currentQuantity <= 1;
            plusButton.disabled =
                currentQuantity >= Number.MAX_SAFE_INTEGER;

            lineTotal.textContent = cartCurrency.format(
                item.price * currentQuantity
            );
        }

        // Save the quantity and update the subtotal
        function changeQuantity(change) {
            const latestCart = getCart();

            const latestItem = latestCart.find(
                (row) => row.id === entry.id && row.type === entry.type
            );

            if (!latestItem) {
                renderCart();
                return;
            }

            const nextQuantity = latestItem.quantity + change;

            if (
                !Number.isSafeInteger(nextQuantity) ||
                nextQuantity < 1 ||
                !Number.isFinite(item.price * nextQuantity)
            ) {
                return;
            }

            // Validate the resulting subtotal before saving
            latestItem.quantity = nextQuantity;

            let subtotal;

            try {
                const rows = resolveCartEntries(
                    latestCart,
                    products,
                    bundles
                );

                subtotal = calculateCartSubtotal(rows);
            } catch (error) {
                message.textContent = "Unable to update the quantity.";
                return;
            }

            if (!updateCartQuantity(entry.id, entry.type, nextQuantity)) {
                message.textContent = "Unable to update the quantity.";
                return;
            }

            currentQuantity = nextQuantity;
            message.textContent = "";

            refreshQuantityControls();

            if (cartTotalElement) {
                cartTotalElement.textContent =
                    cartCurrency.format(subtotal);
            }
        }

        minusButton.addEventListener("click", () => {
            changeQuantity(-1);
        });

        plusButton.addEventListener("click", () => {
            changeQuantity(1);
        });

        refreshQuantityControls();

        info.append(price, controls, lineTotal, message);
        card.append(image);
    }

    // Create the remove button
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "cart-item-remove";
    removeButton.textContent = "Remove";
    removeButton.setAttribute(
        "aria-label",
        `Remove ${item ? item.name : "unavailable item"}`
    );

    const removeMessage = createCartText(
        "p",
        "cart-item-message",
        ""
    );
    removeMessage.setAttribute("role", "status");

    removeButton.addEventListener("click", () => {
        if (removeCartItem(entry.id, entry.type)) {
            renderCart();
        } else {
            removeMessage.textContent = "Unable to remove this item.";
        }
    });

    info.append(removeButton, removeMessage);
    card.append(info);

    return card;
}

// Display the cart and its subtotal
async function renderCart() {
    if (!cartItemsContainer || !cartTotalElement) return;

    const version = ++cartRenderVersion;

    cartTotalElement.textContent = cartCurrency.format(0);

    // Keep checkout disabled until checkout functionality is added
    if (cartCheckoutButton) {
        cartCheckoutButton.disabled = true;
    }

    if (getCart().length === 0) {
        cartItemsContainer.replaceChildren(
            createCartText("p", "cart-empty", "Your cart is empty.")
        );
        return;
    }

    cartItemsContainer.replaceChildren(
        createCartText("p", "cart-loading", "Loading your cart...")
    );

    try {
        const [products, bundles] = await loadCartCatalogs();

        if (version !== cartRenderVersion) return;

        // Read the latest cart after loading the catalogs
        const cart = getCart();

        if (cart.length === 0) {
            cartItemsContainer.replaceChildren(
                createCartText("p", "cart-empty", "Your cart is empty.")
            );
            return;
        }

        const rows = resolveCartEntries(cart, products, bundles);
        const subtotal = calculateCartSubtotal(rows);
        const fragment = document.createDocumentFragment();

        rows.forEach(({ entry, item }) => {
            fragment.append(
                createCartItem(entry, item, products, bundles)
            );
        });

        cartItemsContainer.replaceChildren(fragment);
        cartTotalElement.textContent = cartCurrency.format(subtotal);
    } catch (error) {
        if (version !== cartRenderVersion) return;

        console.error("Unable to display the cart:", error);

        const message = createCartText(
            "p",
            "cart-error",
            "Unable to load your cart. Please close it and try again."
        );

        message.setAttribute("role", "alert");
        cartItemsContainer.replaceChildren(message);
    }
}

// Open and refresh the cart
if (cartPanel && cartOpenButton) {
    cartOpenButton.addEventListener("click", () => {
        if (!cartPanel.open) {
            cartPanel.showModal();
        }

        renderCart();
    });
}

// Close the cart
if (cartPanel && cartCloseButton) {
    cartCloseButton.addEventListener("click", () => {
        cartPanel.close();
    });
}

// Refresh an open cart when another tab changes it
window.addEventListener("storage", (event) => {
    if (
        (event.key === CART_KEY || event.key === null) &&
        cartPanel &&
        cartPanel.open
    ) {
        renderCart();
    }
});