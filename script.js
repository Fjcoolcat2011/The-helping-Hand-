// Minecraft Shop Items Database - Loaded from data.json
let items = [];
let categories = [];

// Load data from Google Sheets via Apps Script
async function loadData() {
    loadingElement.style.display = 'flex';
    try {
        const SHEET_URL = 'https://script.google.com/macros/s/AKfycbxprWuf1shfuRMSpIJH1LOcuHlV0Cf457Nq9OZaUfacwPuON_xy4C_g5in5v-BmmhvT/exec';
        const response = await fetch(SHEET_URL);
        const data = await response.json();
        items = data.items;
        categories = data.categories;
        loadingElement.style.display = 'none';
        initializeShop();
    } catch (error) {
        console.error('Error loading data:', error);
        // Fallback to empty arrays if fetch fails
        items = [];
        categories = [];
        loadingElement.style.display = 'none';
        initializeShop();
    }
}

// ============================================
// DOM Elements
// ============================================

const itemsGrid = document.getElementById('itemsGrid');
const filtersContainer = document.getElementById('filtersContainer');
const searchInput = document.getElementById('searchInput');
const noResults = document.getElementById('noResults');
const loadingElement = document.getElementById('loading');

// Order Modal Elements
const orderModal = document.getElementById('orderModal');
const orderBtn = document.getElementById('orderBtn');
const closeModal = document.getElementById('closeModal');
const cancelBtn = document.getElementById('cancelBtn');
const orderForm = document.getElementById('orderForm');
const itemInput = document.getElementById('itemInput');

// Discord Webhook URL - REPLACE WITH YOUR WEBHOOK URL
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1458756022087843913/SXGBluXESGZ-P-dvmMAemHOPsysGCpQ1UKL8yz0JD-37MdQv6x9HPORaLAWYSLoecgj5';

let currentFilter = 'all';
let searchQuery = '';

// ============================================
// Initialize Shop
// ============================================

function initializeShop() {
    renderFilterButtons();
    renderItems(currentFilter, searchQuery);
    attachFilterListeners();
    attachSearchListener();
    attachOrderListeners();
}

// ============================================
// Render Filter Buttons
// ============================================

function renderFilterButtons() {
    // Clear existing category buttons (keep "All Items")
    const allButton = filtersContainer.querySelector('[data-filter="all"]');
    filtersContainer.innerHTML = '';
    filtersContainer.appendChild(allButton);

    // Add category buttons
    categories.forEach(category => {
        const button = document.createElement('button');
        button.className = 'filter-btn';
        button.setAttribute('data-filter', category.id);
        button.textContent = category.name;
        filtersContainer.appendChild(button);
    });
}

// ============================================
// Render Items
// ============================================

function renderItems(filter = 'all', search = '') {
    // Clear grid
    itemsGrid.innerHTML = '';

    // Filter items
    let filteredItems = items;
    if (filter !== 'all') {
        filteredItems = filteredItems.filter(item => item.category === filter);
    }

    // Search filter
    if (search.trim()) {
        filteredItems = filteredItems.filter(item => 
            item.name.toLowerCase().includes(search.toLowerCase()) ||
            item.description.toLowerCase().includes(search.toLowerCase())
        );
    }

    // Show/hide no results message
    if (filteredItems.length === 0) {
        noResults.style.display = 'block';
        return;
    } else {
        noResults.style.display = 'none';
    }

    // Render each item
    filteredItems.forEach(item => {
        const card = createItemCard(item);
        itemsGrid.appendChild(card);
    });
}

function createItemCard(item) {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.setAttribute('data-category', item.category);

    const stockBadgeClass = item.inStock ? 'stock-in-stock' : 'stock-out';
    const stockText = item.inStock ? 'In Stock' : 'Out of Stock';
    const floorTag = (item.floor !== undefined && item.floor !== null && String(item.floor).toString().trim() !== '')
        ? `<span class="floor-tag">Floor ${item.floor}</span>`
        : '';

    card.innerHTML = `
        <div class="item-content">
            <div>
                <h3 class="item-name">${item.name}</h3>
                <p class="item-category">${item.category}</p>
                <p class="item-description"><span class="unit-highlight">${item.unit || 'item'}</span>${floorTag}</p>
            </div>
        </div>
        <div class="item-meta">
            <div class="price">${item.price} ${item.priceCurrency}</div>
            <div class="stock-indicator">
                <span class="stock-label">Stock</span>
                <span class="stock-badge ${stockBadgeClass}">${stockText}</span>
            </div>
        </div>
    `;

    return card;
}

// ============================================
// Filter Functionality
// ============================================

function attachFilterListeners() {
    const filterButtons = filtersContainer.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Update active state
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Update filter and render
            currentFilter = button.getAttribute('data-filter');
            renderItems(currentFilter, searchQuery);
        });
    });
}

// ============================================
// Search Functionality
// ============================================

function attachSearchListener() {
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderItems(currentFilter, searchQuery);
    });
}

// ============================================
// Order Modal Functionality
// ============================================

function attachOrderListeners() {
    // Open modal
    orderBtn.addEventListener('click', () => {
        orderModal.style.display = 'flex';
    });

    // Close modal
    closeModal.addEventListener('click', () => {
        closeOrderModal();
    });

    cancelBtn.addEventListener('click', () => {
        closeOrderModal();
    });

    // Close modal when clicking outside
    orderModal.addEventListener('click', (e) => {
        if (e.target === orderModal) {
            closeOrderModal();
        }
    });

    // Handle form submission
    orderForm.addEventListener('submit', handleOrderSubmit);
}

function closeOrderModal() {
    orderModal.style.display = 'none';
    orderForm.reset();
}

async function handleOrderSubmit(e) {
    e.preventDefault();

    const minecraftUsername = document.getElementById('minecraftUsername').value;
    const discordUsername = document.getElementById('discordUsername').value;
    const itemRequired = document.getElementById('itemInput').value;
    const unitType = document.getElementById('unitType').value;
    const itemAmount = document.getElementById('itemAmount').value;

    if (!itemRequired.trim()) {
        alert('Please enter an item name');
        return;
    }

    // Create Discord embed message
    const embedMessage = {
        content: '<@&1458757199047163949>',
        embeds: [
            {
                title: '📦 New Order Placed',
                color: 5585717, // Blue color
                fields: [
                    {
                        name: 'Minecraft Username',
                        value: minecraftUsername,
                        inline: true
                    },
                    {
                        name: 'Discord Username',
                        value: discordUsername,
                        inline: true
                    },
                    {
                        name: 'Item Required',
                        value: itemRequired,
                        inline: false
                    },
                    {
                        name: 'Quantity',
                        value: `${itemAmount} ${unitType}${itemAmount > 1 ? 's' : ''}`,
                        inline: false
                    }
                ],
                timestamp: new Date().toISOString()
            }
        ]
    };

    try {
        const response = await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(embedMessage)
        });

        if (response.ok) {
            alert('✅ Order submitted successfully! Check Discord for confirmation.');
            closeOrderModal();
        } else {
            alert('❌ Error submitting order. Please try again.');
            console.error('Discord webhook error:', response.status);
        }
    } catch (error) {
        alert('❌ Error submitting order. Please make sure the webhook URL is configured.');
        console.error('Order submission error:', error);
    }
}

// ============================================
// Initialize on DOM Ready
// ============================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadData);
} else {
    loadData();
}
