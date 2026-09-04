(function () {
    const CART_KEY = 'mopiiercings_cart';

    function parsePrice(value) {
        if (!value && value !== 0) return 0;
        const numericValue = Number(String(value).replace(/[^0-9.-]/g, ''));
        return Number.isFinite(numericValue) ? numericValue : 0;
    }

    function formatPrice(value) {
        return new Intl.NumberFormat('en-ZA', {
            style: 'currency',
            currency: 'ZAR',
            maximumFractionDigits: 0
        }).format(Number(value) || 0);
    }

    function getCart() {
        try {
            const saved = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
            return Array.isArray(saved) ? saved : [];
        } catch (error) {
            return [];
        }
    }

    function saveCart(cart) {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
    }

    function syncCartSummaries() {
        const cart = getCart();
        const totalItems = cart.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
        const subtotal = cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);

        document.querySelectorAll('.cart-count, .cart-item-count, .mini-cart-count').forEach((countElement) => {
            countElement.textContent = `${totalItems} item${totalItems === 1 ? '' : 's'}`;
        });

        document.querySelectorAll('.cart-total, #cart-total').forEach((totalElement) => {
            totalElement.textContent = formatPrice(subtotal);
        });

        const subtotalElements = document.querySelectorAll('.cart-subtotal, #cart-subtotal');
        subtotalElements.forEach((element) => {
            element.textContent = formatPrice(subtotal);
        });
    }

    function addToCart(item) {
        const cart = getCart();
        const existingItem = cart.find((cartItem) => cartItem.name === item.name);

        if (existingItem) {
            existingItem.quantity += Number(item.quantity) || 1;
        } else {
            cart.push({
                name: item.name,
                price: Number(item.price) || 0,
                quantity: Number(item.quantity) || 1,
                image: item.image || ''
            });
        }

        saveCart(cart);
        syncCartSummaries();
        renderCartPage();

        if (typeof window !== 'undefined' && window.alert) {
            const totalItems = cart.reduce((sum, cartItem) => sum + (Number(cartItem.quantity) || 1), 0);
            window.alert(`${item.name} added to cart. You now have ${totalItems} item(s) in your cart.`);
        }
    }

    function updateQuantity(itemName, change) {
        const cart = getCart();
        const updatedCart = cart
            .map((item) => {
                if (item.name !== itemName) return item;

                const newQuantity = (Number(item.quantity) || 1) + change;
                return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
            })
            .filter(Boolean);

        saveCart(updatedCart);
        syncCartSummaries();
        renderCartPage();
    }

    function removeItem(itemName) {
        const updatedCart = getCart().filter((item) => item.name !== itemName);
        saveCart(updatedCart);
        syncCartSummaries();
        renderCartPage();
    }

    function renderCartPage() {
        const cartList = document.getElementById('cart-items');
        const subtotalElement = document.getElementById('cart-subtotal');
        const totalElement = document.getElementById('cart-total');
        const itemCountElement = document.getElementById('cart-item-count');

        if (!cartList) return;

        const cart = getCart();
        const isMiniCart = cartList.classList.contains('mini-cart-items');

        if (!cart.length) {
            cartList.innerHTML = `
                <div class="empty-cart">
                    <h3>Your cart is empty</h3>
                    <p>Add jewelry or services to get started.</p>
                    <a href="products.html" class="btn">Browse Products</a>
                </div>
            `;
            if (subtotalElement) subtotalElement.textContent = formatPrice(0);
            if (totalElement) totalElement.textContent = formatPrice(0);
            if (itemCountElement) itemCountElement.textContent = '0 items';
            syncCartSummaries();
            return;
        }

        const subtotal = cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
        const totalItems = cart.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

        if (isMiniCart) {
            cartList.innerHTML = cart.map((item) => `
                <div class="mini-cart-item">
                    <img src="${item.image || 'pictures/jewelry_1.webp'}" alt="${item.name}" />
                    <div>
                        <h4>${item.name}</h4>
                        <p>${formatPrice(item.price)} each</p>
                        <div class="mini-cart-actions">
                            <div class="qty-control">
                                <button type="button" class="qty-btn" data-qty-action="decrease" data-item-name="${item.name}">-</button>
                                <span>${item.quantity}</span>
                                <button type="button" class="qty-btn" data-qty-action="increase" data-item-name="${item.name}">+</button>
                            </div>
                        </div>
                    </div>
                    <div class="mini-cart-item-actions">
                        <div class="mini-cart-cost">${formatPrice((Number(item.price) || 0) * (Number(item.quantity) || 1))}</div>
                        <button type="button" class="remove-item" data-item-name="${item.name}">Remove</button>
                    </div>
                </div>
            `).join('');
        } else {
            cartList.innerHTML = cart.map((item) => `
                <div class="cart-item">
                    <div class="cart-image-wrap">
                        <img src="${item.image || 'pictures/jewelry_1.webp'}" alt="${item.name}" class="cart-item-image" />
                    </div>
                    <div class="cart-item-details">
                        <h4>${item.name}</h4>
                        <p>${formatPrice(item.price)} each</p>
                        <div class="qty-control">
                            <button type="button" class="qty-btn" data-qty-action="decrease" data-item-name="${item.name}">-</button>
                            <span>${item.quantity}</span>
                            <button type="button" class="qty-btn" data-qty-action="increase" data-item-name="${item.name}">+</button>
                        </div>
                    </div>
                    <div class="cart-item-actions">
                        <p class="cart-line-total">${formatPrice((Number(item.price) || 0) * (Number(item.quantity) || 1))}</p>
                        <button type="button" class="remove-item" data-item-name="${item.name}">Remove</button>
                    </div>
                </div>
            `).join('');
        }

        if (subtotalElement) subtotalElement.textContent = formatPrice(subtotal);
        if (totalElement) totalElement.textContent = formatPrice(subtotal);
        if (itemCountElement) itemCountElement.textContent = `${totalItems} item${totalItems === 1 ? '' : 's'}`;
        syncCartSummaries();
    }

    function populateBookingSummary() {
        const bookingList = document.getElementById('booking-cart-items');
        const bookingTotal = document.getElementById('booking-cart-total');
        const serviceSelect = document.getElementById('service');
        if (!bookingList) return;

        const cart = getCart();

        if (!cart.length) {
            bookingList.innerHTML = '<li class="booking-empty">No items selected yet.</li>';
            if (bookingTotal) bookingTotal.textContent = formatPrice(0);
            return;
        }

        const subtotal = cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
        bookingList.innerHTML = cart.map((item) => `
            <li>
                <span>${item.name} x ${item.quantity}</span>
                <strong>${formatPrice((Number(item.price) || 0) * (Number(item.quantity) || 1))}</strong>
            </li>
        `).join('');

        if (bookingTotal) bookingTotal.textContent = formatPrice(subtotal);

        if (serviceSelect) {
            const firstItemName = cart[0]?.name;
            if (firstItemName) {
                const option = Array.from(serviceSelect.options).find((optionElement) => optionElement.textContent.toLowerCase().includes(firstItemName.toLowerCase()));
                if (option) serviceSelect.value = option.value;
            }
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.add-to-cart').forEach((button) => {
            button.addEventListener('click', () => {
                const item = {
                    name: button.dataset.name,
                    price: parsePrice(button.dataset.price),
                    quantity: Number(button.dataset.quantity || 1),
                    image: button.dataset.image || 'pictures/jewelry_1.webp'
                };

                if (!item.name) return;
                addToCart(item);
            });
        });

        document.addEventListener('click', (event) => {
            const quantityButton = event.target.closest('[data-qty-action]');
            if (quantityButton) {
                const action = quantityButton.dataset.qtyAction;
                const itemName = quantityButton.dataset.itemName;
                updateQuantity(itemName, action === 'increase' ? 1 : -1);
                return;
            }

            const removeButton = event.target.closest('.remove-item');
            if (removeButton) {
                removeItem(removeButton.dataset.itemName);
            }
        });

        syncCartSummaries();
        renderCartPage();
        populateBookingSummary();
    });
})();
