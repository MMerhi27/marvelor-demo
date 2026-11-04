// Select the product details section
const detailsSection = document.querySelector(".product-details");

// Read the selected item from the URL
const params = new URLSearchParams(window.location.search);
const itemId = params.get("id");
const itemType = params.get("type") || "product";

// Display an error message
function showDetailsError(message) {
    const container = document.createElement("div");
    container.className = "container";

    const text = document.createElement("p");
    text.textContent = message;
    text.setAttribute("role", "alert");

    const link = document.createElement("a");
    link.href = "index.html#shop";
    link.textContent = "Back to Shop";

    container.append(text, link);
    detailsSection.replaceChildren(container);
}

// Load and validate a JSON array
async function fetchItems(url) {
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

// Display text and hide its heading when empty
function displayExtraText(element, value) {
    if (!element) return;

    const text = typeof value === "string" ? value.trim() : "";

    element.textContent = text;
    element.hidden = !text;

    if (element.previousElementSibling) {
        element.previousElementSibling.hidden = element.hidden;
    }
}

// Display a list and hide its heading when empty
function displayExtraList(element, values) {
    if (!element) return;

    const validValues = Array.isArray(values)
        ? values.filter(
              (value) =>
                  typeof value === "string" &&
                  value.trim().length > 0
          )
        : [];

    const fragment = document.createDocumentFragment();

    validValues.forEach((value) => {
        const li = document.createElement("li");
        li.textContent = value.trim();
        fragment.append(li);
    });

    element.replaceChildren(fragment);
    element.hidden = validValues.length === 0;

    if (element.previousElementSibling) {
        element.previousElementSibling.hidden = element.hidden;
    }
}

// Display benefits, usage instructions, and bundle contents
function displayExtraInformation(item, products) {
    const extra = detailsSection.querySelector(".details-extra");

    if (!extra) return;

    const includes = extra.querySelector(".details-includes");
    const benefits = extra.querySelector(".details-benefits");
    const howToUse = extra.querySelector(".details-how-to-use");
    const recommendedUse = extra.querySelector(
        ".details-recommended-use"
    );

    // Match bundle product IDs with their names
    const includedNames =
        itemType === "bundle" && Array.isArray(item.includes)
            ? item.includes.map((id) => {
                  const product = products.find(
                      (entry) => entry && entry.id === id
                  );

                  return product ? product.name : "";
              })
            : [];

    displayExtraList(includes, includedNames);
    displayExtraList(benefits, item.benefits);
    displayExtraText(howToUse, item.howToUse);
    displayExtraText(recommendedUse, item.recommendedUse);

    const sections = [
        includes,
        benefits,
        howToUse,
        recommendedUse
    ];

    // Hide the block when all information is empty
    extra.hidden = sections.every(
        (element) => !element || element.hidden
    );
}

// Display the selected product or bundle
function displayItem(item, products) {
    const gallery = detailsSection.querySelector(".product-gallery");
    const name = detailsSection.querySelector(".details-name");
    const size = detailsSection.querySelector(".details-size");
    const price = detailsSection.querySelector(".details-price");
    const description = detailsSection.querySelector(
        ".details-description"
    );

    document.title = `${item.name} | MARVELOR`;

    // Display the main image
    const image = document.createElement("img");
    image.src = item.image;
    image.alt = item.name;

    gallery.replaceChildren(image);

    // Display item information safely
    name.textContent = item.name;

    size.textContent =
        typeof item.size === "string" ? item.size.trim() : "";
    size.hidden = !size.textContent;

    price.textContent = `$${item.price}`;

    description.textContent =
        typeof item.description === "string"
            ? item.description.trim()
            : "";
    description.hidden = !description.textContent;

    // Display the previous price when available
    if (
        typeof item.oldPrice === "number" &&
        Number.isFinite(item.oldPrice) &&
        item.oldPrice > item.price
    ) {
        const oldPrice = document.createElement("del");
        oldPrice.className = "details-old-price";
        oldPrice.textContent = `$${item.oldPrice}`;

        price.append(" ", oldPrice);
    }

    displayExtraInformation(item, products);
}

// Set up the product quantity buttons
function setupProductQuantity(quantityInput) {
    const minusButton = detailsSection.querySelector(".quantity-minus");
    const plusButton = detailsSection.querySelector(".quantity-plus");

    if (!minusButton || !plusButton) return;

    // Update button states
    function updateQuantityButtons() {
        const quantity = Number(quantityInput.value);
        const valid =
            Number.isSafeInteger(quantity) && quantity >= 1;

        minusButton.disabled = !valid || quantity <= 1;
        plusButton.disabled =
            !valid || quantity >= Number.MAX_SAFE_INTEGER;
    }

    // Change the quantity without allowing invalid values
    function changeQuantity(change) {
        const quantity = Number(quantityInput.value);
        const nextQuantity = quantity + change;

        if (
            !Number.isSafeInteger(quantity) ||
            quantity < 1 ||
            !Number.isSafeInteger(nextQuantity) ||
            nextQuantity < 1
        ) {
            return;
        }

        quantityInput.value = String(nextQuantity);
        updateQuantityButtons();
    }

    minusButton.addEventListener("click", () => {
        changeQuantity(-1);
    });

    plusButton.addEventListener("click", () => {
        changeQuantity(1);
    });

    quantityInput.addEventListener("input", updateQuantityButtons);
    quantityInput.addEventListener("change", updateQuantityButtons);

    updateQuantityButtons();
}

// Connect the selected item to the cart button
function setupCartButton(item) {
    const button = detailsSection.querySelector(".add-to-cart");
    const quantityInput = detailsSection.querySelector(
        "#product-quantity"
    );
    const actions = detailsSection.querySelector(".product-actions");

    if (!button || !quantityInput || !actions) return;

    setupProductQuantity(quantityInput);

    // Create an accessible status message
    const message = document.createElement("p");
    message.className = "cart-message";
    message.setAttribute("role", "status");

    actions.after(message);

    // Check that the cart script is available
    if (typeof addToCart !== "function") {
        button.disabled = true;
        message.textContent =
            "The cart is unavailable. Please refresh the page.";
        return;
    }

    button.disabled = false;

    // Validate the quantity and save the item
    button.addEventListener("click", () => {
        const quantity = Number(quantityInput.value);

        if (
            !quantityInput.checkValidity() ||
            !Number.isSafeInteger(quantity) ||
            quantity < 1
        ) {
            message.textContent =
                "Please enter a whole quantity of at least 1.";

            quantityInput.reportValidity();
            quantityInput.focus();
            return;
        }

        const saved = addToCart(item.id, itemType, quantity);

        message.textContent = saved
            ? "Added to your cart."
            : "Unable to add this item. Please try again.";
    });
}

// Load the selected product or bundle
async function loadItemDetails() {
    if (!detailsSection) return;

    // Disable the cart button while loading
    const button = detailsSection.querySelector(".add-to-cart");

    if (button) {
        button.disabled = true;
    }

    if (!itemId) {
        showDetailsError("No product selected.");
        return;
    }

    if (itemType !== "product" && itemType !== "bundle") {
        showDetailsError("Invalid item type.");
        return;
    }

    const dataUrl =
        itemType === "bundle"
            ? "data/bundles.json"
            : "data/product.json";

    try {
        const items = await fetchItems(dataUrl);

        // Find the item matching the URL ID
        const item = items.find(
            (entry) => entry && entry.id === itemId
        );

        if (!item) {
            showDetailsError("Product not found.");
            return;
        }

        // Validate required fields
        if (
            typeof item.name !== "string" ||
            typeof item.image !== "string" ||
            typeof item.price !== "number" ||
            !Number.isFinite(item.price) ||
            item.price < 0
        ) {
            throw new Error("Invalid item data.");
        }

        let products = [];

        // Load individual products for bundle contents
        if (itemType === "bundle") {
            products = await fetchItems("data/product.json");
        }

        displayItem(item, products);
        setupCartButton(item);
    } catch (error) {
        console.error("Error loading item details:", error);

        showDetailsError(
            "Unable to load this product. Please try again later."
        );
    }
}

// Load item details on page load
loadItemDetails();