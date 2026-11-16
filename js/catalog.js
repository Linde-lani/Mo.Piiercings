import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { auth, db } from './firebase.js?v=20261111-1';

function formatPrice(price) {
    return `R${new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 2 }).format(Number(price) || 0)}`;
}

function addBookingOption(select, service) {
    let group = select.querySelector('optgroup[data-custom-services]');
    if (!group) {
        group = document.createElement('optgroup');
        group.label = 'New Services';
        group.dataset.customServices = 'true';
        select.append(group);
    }

    const option = document.createElement('option');
    option.value = service.name;
    option.textContent = `${service.name} - ${formatPrice(service.price)}`;
    group.append(option);

    const requestedService = new URLSearchParams(window.location.search).get('service');
    let cart = [];
    try {
        const savedCart = JSON.parse(localStorage.getItem('mopiiercings_cart') || '[]');
        cart = Array.isArray(savedCart)
            ? savedCart.filter((item) => item && typeof item.name === 'string')
            : [];
    } catch (error) {
        console.error('Could not read the selected service from the cart.', error);
    }

    const existingItem = cart.find((item) => item.name.toLowerCase() === service.name.toLowerCase());
    if (requestedService !== service.name && !existingItem) return;

    select.value = service.name;
    try {
        const updatedItem = {
            ...(existingItem || {}),
            name: service.name,
            price: Number(service.price) || 0,
            quantity: Number(existingItem?.quantity) || 1,
            image: service.imageUrl
        };
        const updatedCart = cart.filter((item) => item.name.toLowerCase() !== service.name.toLowerCase());
        updatedCart.push(updatedItem);
        localStorage.setItem('mopiiercings_cart', JSON.stringify(updatedCart));
    } catch (error) {
        console.error('Could not update the selected service in the cart.', error);
    }
    select.dispatchEvent(new Event('change', { bubbles: true }));
}

function createServiceCard(service) {
    const card = document.createElement('article');
    card.className = 'product-item';

    const image = document.createElement('img');
    image.className = 'product-image';
    image.src = service.imageUrl;
    image.alt = `${service.name} example`;
    image.width = 300;
    image.height = 300;
    card.append(image);

    const title = document.createElement('h4');
    title.textContent = service.name;
    card.append(title);

    const description = document.createElement('p');
    description.textContent = service.description;
    card.append(description);

    const price = document.createElement('p');
    price.className = 'price';
    price.textContent = formatPrice(service.price);
    card.append(price);

    const actions = document.createElement('div');
    actions.className = 'product-actions';

    const bookLink = document.createElement('a');
    bookLink.className = 'btn';
    bookLink.href = `bookings.html?service=${encodeURIComponent(service.name)}`;
    bookLink.textContent = 'Book Now';
    actions.append(bookLink);

    const cartButton = document.createElement('button');
    cartButton.type = 'button';
    cartButton.className = 'btn secondary add-to-cart';
    cartButton.dataset.name = service.name;
    cartButton.dataset.price = String(service.price);
    cartButton.dataset.image = service.imageUrl;
    cartButton.textContent = 'Add to Cart';
    actions.append(cartButton);

    card.append(actions);
    return card;
}

async function loadServices() {
    const servicesSnapshot = await getDocs(collection(db, 'services'));
    const services = servicesSnapshot.docs
        .map((service) => service.data())
        .filter((service) =>
            typeof service.name === 'string'
            && typeof service.description === 'string'
            && Number.isFinite(Number(service.price))
            && typeof service.imageUrl === 'string'
        )
        .sort((a, b) => a.name.localeCompare(b.name));

    const select = document.getElementById('service');
    if (select) services.forEach((service) => addBookingOption(select, service));

    const section = document.getElementById('custom-piercing-section');
    const grid = document.getElementById('custom-piercing-services');
    if (section && grid && services.length) {
        section.hidden = false;
        services.forEach((service) => grid.append(createServiceCard(service)));
    }
}

onAuthStateChanged(auth, (user) => {
    if (!user) return;

    loadServices().catch((error) => {
        console.error('Could not load additional bookable services.', error);
        const section = document.getElementById('custom-piercing-section');
        const message = document.getElementById('custom-services-message');
        if (section) section.hidden = false;
        if (message) {
            message.textContent = 'Additional services could not be loaded. Please try again later.';
            message.setAttribute('role', 'alert');
        }
    });
});
