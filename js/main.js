// Select the header element
const header = document.querySelector(".site-header");

// Toggle the scrolled class based on the scroll position
function updateHeader() {
    if (header) {
        header.classList.toggle("scrolled", window.scrollY > 30);
    }
}

// Update the header on scroll and page load
window.addEventListener("scroll", updateHeader);
updateHeader();

// Select the grids
const productsGrid = document.querySelector(".products-grid");
const bundlesGrid = document.querySelector(".bundles-grid");

// Create an element with an optional class and text
function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
        element.classList.add(className);
    }

    if (text !== undefined) {
        element.textContent = text;
    }

    return element;
}

// Create a product card
function createProductCard(product) {
    const card = createElement("article", "product-card");

    const image = document.createElement("img");
    image.src = product.image;
    image.alt = product.name;
    image.loading = "lazy";

    const info = createElement("div", "product-info");
    const name = createElement("h3", null, product.name);
    const size = createElement("p", "product-size", product.size || "");
    const price = createElement("p", "product-price", `$${product.price}`);

    const link = createElement("a", "product-link", "View Product");
    link.href = product.link;

    info.append(name, size, price, link);
    card.append(image, info);

    return card;
}

// Create a bundle card
function createBundleCard(bundle) {
    const card = createElement("article", "bundle-card");

    const image = document.createElement("img");
    image.src = bundle.image;
    image.alt = bundle.name;
    image.loading = "lazy";

    const info = createElement("div", "bundle-info");
    const name = createElement("h3", null, bundle.name);
    const description = createElement("p", null, bundle.description);

    const prices = createElement("div", "bundle-prices");
    const price = createElement("span", "bundle-price", `$${bundle.price}`);
    const oldPrice = createElement("del", null, `$${bundle.oldPrice}`);

    prices.append(price, oldPrice);

    const link = createElement("a", "bundle-link", "View Bundle");
    link.href = bundle.link;

    info.append(name, description, prices, link);
    card.append(image, info);

    return card;
}

// Load JSON data and display cards in the selected grid
async function loadCards(url, grid, createCard) {
    if (!grid) return;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to load ${url}: ${response.status}`);
        }

        const items = await response.json();

        if (!Array.isArray(items)) {
            throw new Error(`Data in ${url} must be an array.`);
        }

        const fragment = document.createDocumentFragment();

        items.forEach((item) => {
            fragment.append(createCard(item));
        });

        grid.replaceChildren(fragment);
    } catch (error) {
        console.error("Error loading cards:", error);

        const message = createElement(
            "p",
            null,
            "Unable to load items. Please try again later."
        );

        grid.replaceChildren(message);
    }
}

// Display products and bundles on page load
loadCards("data/product.json", productsGrid, createProductCard);
loadCards("data/bundles.json", bundlesGrid, createBundleCard);