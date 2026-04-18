// ============================================
// SubShare — Main Frontend Script
// ============================================

// ---- STATE ----
let currentUser = null;
let authToken = null;
let allProducts = [];
let currentPurchaseProduct = null;
let currentPurchaseTab = 'credentials';
let currentInboxOrderId = null;

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
    loadAuthFromStorage();
    setupNavigation();
    setupModals();
    setupForms();
    setupFAQ();
    setupMobileMenu();
    setupProfileDropdown();
    loadProducts();
    loadNews();
    loadActivities();
    animateCounters();
    updateNavUI();
    if (currentUser) {
        refreshBalance();
        loadInboxCount();
    }
});

// ============================================
// AUTH PERSISTENCE
// ============================================
function loadAuthFromStorage() {
    const token = localStorage.getItem('subshare_token');
    const userJson = localStorage.getItem('subshare_user');
    
    if (token) {
        authToken = token;
        if (userJson) {
            try {
                currentUser = JSON.parse(userJson);
            } catch (e) {
                console.error('Error parsing user data:', e);
            }
        }
        // Even if user data is missing, we keep the token and try to refresh profile
    }
}

function saveAuth(token, user) {
    authToken = token;
    currentUser = user;
    localStorage.setItem('subshare_token', token);
    localStorage.setItem('subshare_user', JSON.stringify(user));
}

function clearAuth() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('subshare_token');
    localStorage.removeItem('subshare_user');
}

// ============================================
// API HELPERS
// ============================================
async function apiCall(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (authToken) headers['Authorization'] = 'Bearer ' + authToken;

    const res = await fetch(endpoint, { ...options, headers });
    return res.json();
}

// ============================================
// NAVIGATION
// ============================================
function setupNavigation() {
    document.querySelectorAll('[data-page]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            const page = el.getAttribute('data-page');
            const filter = el.getAttribute('data-filter');
            navigateTo(page);
            if (filter) {
                setTimeout(() => applyShopFilter(filter), 100);
            }
        });
    });
}

function navigateTo(page) {
    // Hide all pages
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    // Show target page
    const target = document.getElementById('page-' + page);
    if (target) {
        target.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    // Update nav links
    document.querySelectorAll('.nav-link').forEach(l => {
        l.classList.toggle('active', l.getAttribute('data-page') === page);
    });
    // Close mobile menu
    document.getElementById('navMenu')?.classList.remove('open');
}

function applyShopFilter(filter) {
    const categorySelect = document.getElementById('shopCategory');
    if (categorySelect) {
        categorySelect.value = filter;
        renderShopProducts();
    }
}

// ============================================
// MOBILE MENU
// ============================================
function setupMobileMenu() {
    const btn = document.getElementById('mobileMenuBtn');
    const menu = document.getElementById('navMenu');
    if (btn && menu) {
        btn.addEventListener('click', () => menu.classList.toggle('open'));
    }
}

// ============================================
// PROFILE DROPDOWN
// ============================================
function setupProfileDropdown() {
    const trigger = document.getElementById('profileTrigger');
    const dropdown = document.getElementById('profileDropdown');
    if (!trigger || !dropdown) return;

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        trigger.classList.toggle('open');
        dropdown.classList.toggle('open');
    });

    document.addEventListener('click', () => {
        trigger.classList.remove('open');
        dropdown.classList.remove('open');
    });
}

// ============================================
// UPDATE NAV UI
// ============================================
function updateNavUI() {
    const navAuth = document.getElementById('navAuth');
    const userProfile = document.getElementById('userProfile');
    const inboxGroup = document.getElementById('inboxGroup');
    const adminBtn = document.getElementById('adminPanelBtn');

    if (currentUser) {
        navAuth?.classList.add('hidden');
        userProfile?.classList.remove('hidden');
        inboxGroup?.classList.remove('hidden');

        document.getElementById('userName').textContent = currentUser.name.split(' ')[0];
        document.getElementById('userAvatar').textContent = currentUser.name.charAt(0).toUpperCase();
        updateBalanceDisplay(currentUser.balance || 0);

        if (adminBtn) adminBtn.style.display = currentUser.role === 'admin' ? 'flex' : 'none';
    } else {
        navAuth?.classList.remove('hidden');
        userProfile?.classList.add('hidden');
        inboxGroup?.classList.add('hidden');
    }
}

function updateBalanceDisplay(balance) {
    const formatted = '฿' + parseFloat(balance).toFixed(2);
    const displays = ['userBalanceDisplay', 'topupCurrentBalance', 'pageTopupBalance'];
    displays.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = id === 'pageTopupBalance' ? parseFloat(balance).toFixed(2) : formatted;
    });
}

async function refreshBalance() {
    try {
        const data = await apiCall('/api/wallet/balance');
        if (data.success) {
            currentUser.balance = data.data.balance;
            localStorage.setItem('subshare_user', JSON.stringify(currentUser));
            updateBalanceDisplay(data.data.balance);
        }
    } catch {}
}

// ============================================
// COUNTER ANIMATION
// ============================================
function animateCounters() {
    const counters = document.querySelectorAll('.stat-number[data-count]');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const target = parseInt(el.getAttribute('data-count'));
                animateCount(el, 0, target, 1800);
                observer.unobserve(el);
            }
        });
    }, { threshold: 0.5 });
    counters.forEach(c => observer.observe(c));
}

function animateCount(el, start, end, duration) {
    const startTime = performance.now();
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.round(start + (end - start) * eased);
        el.textContent = value.toLocaleString();
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

// ============================================
// PRODUCTS / SUBSCRIPTIONS
// ============================================
async function loadProducts() {
    try {
        const data = await apiCall('/api/products');
        if (data.success) {
            allProducts = data.data.products;
            renderHomeProducts();
            renderShopProducts();
        }
    } catch (e) {
        console.error('Load products error:', e);
    }
}

function getCategoryColor(category, title) {
    const t = (title || '').toLowerCase();
    const c = (category || '').toLowerCase();
    if (t.includes('netflix')) return ['#e50914', '#b20710'];
    if (t.includes('spotify')) return ['#1db954', '#158a3e'];
    if (t.includes('youtube')) return ['#ff0000', '#cc0000'];
    if (t.includes('disney')) return ['#0063e5', '#0050b5'];
    if (t.includes('apple')) return ['#555', '#333'];
    if (t.includes('hbo')) return ['#7b2d8b', '#5a2069'];
    if (t.includes('canva')) return ['#00c4cc', '#009ba0'];
    if (c === 'streaming') return ['#e50914', '#b20710'];
    if (c === 'music') return ['#1db954', '#158a3e'];
    if (c === 'productivity') return ['#2563eb', '#1d4ed8'];
    return ['#2563eb', '#1d4ed8'];
}

function buildProductCard(product, inShop = false) {
    const stock = product.stock || 0;
    const maxSlots = Math.max(stock + (product.total_keys || 0) - (product.available_keys || 0), stock, 5);
    const used = maxSlots - stock;
    const pct = Math.round((stock / Math.max(maxSlots, 1)) * 100);
    const slotClass = stock === 0 ? 'low' : stock <= 2 ? 'low' : 'good';
    const colors = getCategoryColor(product.category, product.title);
    const initial = (product.title || '?').charAt(0).toUpperCase();
    const hasImg = !!product.image_path;
    const catLabel = product.category ? product.category.charAt(0).toUpperCase() + product.category.slice(1) : 'Subscription';

    return `
    <div class="product-card" data-product-id="${product.id}">
        <div class="product-image-wrap">
            ${hasImg
                ? `<img src="${product.image_path}" alt="${product.title}" loading="lazy">`
                : `<div class="product-category-icon" style="background:linear-gradient(135deg,${colors[0]},${colors[1]})">${initial}</div>`
            }
            <div class="product-badge-wrap">
                ${product.badge ? `<span class="product-badge">${product.badge}</span>` : ''}
                ${stock > 0
                    ? `<span class="slot-badge ${slotClass}">${stock} slot${stock !== 1 ? 's' : ''} available</span>`
                    : `<span class="slot-badge low">Sold Out</span>`}
            </div>
        </div>
        <div class="product-info">
            <span class="product-category">${catLabel}</span>
            <h3 class="product-title">${product.title}</h3>
            ${product.subtitle ? `<p class="product-subtitle">${product.subtitle}</p>` : ''}
            <div class="slot-bar-wrap">
                <div class="slot-bar-label">
                    <span>Slot Availability</span>
                    <span>${stock}/${maxSlots} available</span>
                </div>
                <div class="slot-bar">
                    <div class="slot-bar-fill ${slotClass}" style="width:${pct}%"></div>
                </div>
            </div>
        </div>
        <div class="product-footer">
            <span class="product-price">฿${parseFloat(product.price).toFixed(2)}<span class="product-price-period">/mo</span></span>
            ${stock > 0
                ? `<button class="btn-subscribe" onclick="openPurchaseModal(${product.id})">Subscribe</button>`
                : `<span class="out-of-stock-label">Sold Out</span>`
            }
        </div>
    </div>`;
}

function renderHomeProducts() {
    const grid = document.getElementById('homeProductsGrid');
    if (!grid) return;
    const featured = allProducts.slice(0, 6);
    if (featured.length === 0) {
        grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📦</div><h3>No Plans Available</h3><p>Check back soon for new subscription packages.</p></div>`;
        return;
    }
    grid.innerHTML = featured.map(p => buildProductCard(p)).join('');
}

function renderShopProducts() {
    const grid = document.getElementById('shopProductsGrid');
    if (!grid) return;

    const search = (document.getElementById('shopSearch')?.value || '').toLowerCase();
    const category = document.getElementById('shopCategory')?.value || 'all';
    const sort = document.getElementById('shopSort')?.value || 'newest';

    let filtered = allProducts.filter(p => {
        const matchSearch = !search
            || p.title.toLowerCase().includes(search)
            || (p.subtitle || '').toLowerCase().includes(search)
            || (p.category || '').toLowerCase().includes(search);
        const matchCat = category === 'all' || p.category === category;
        return matchSearch && matchCat;
    });

    if (sort === 'price-low') filtered.sort((a, b) => a.price - b.price);
    else if (sort === 'price-high') filtered.sort((a, b) => b.price - a.price);
    else if (sort === 'popular') filtered.sort((a, b) => (b.stock || 0) - (a.stock || 0));

    if (filtered.length === 0) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">🔍</div><h3>No Results Found</h3><p>Try adjusting your search or category filter.</p></div>`;
        return;
    }
    grid.innerHTML = filtered.map(p => buildProductCard(p, true)).join('');
}

// Shop search & filter listeners
document.getElementById('shopSearch')?.addEventListener('input', () => renderShopProducts());
document.getElementById('shopCategory')?.addEventListener('change', () => renderShopProducts());
document.getElementById('shopSort')?.addEventListener('change', () => renderShopProducts());

// ============================================
// NEWS / ANNOUNCEMENTS
// ============================================
async function loadNews() {
    try {
        const data = await apiCall('/api/news');
        const container = document.getElementById('newsListContainer');
        if (!container) return;

        const items = Array.isArray(data) ? data : (data.data?.news || []);

        if (items.length === 0) {
            container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📢</div><h3>No Announcements Yet</h3><p>New platform updates and offers will appear here.</p></div>`;
            return;
        }

        container.innerHTML = items.map(n => `
            <div class="news-item">
                <span class="news-category">${n.category || 'General'}</span>
                <h3 class="news-title">${n.title}</h3>
                <p class="news-content">${n.content || ''}</p>
                <p class="news-date">📅 ${formatDate(n.created_at)}</p>
            </div>
        `).join('');
    } catch (e) {
        console.error('Load news error:', e);
    }
}

// ============================================
// ACTIVITIES / PROMOTIONS
// ============================================
async function loadActivities() {
    try {
        const data = await apiCall('/api/activities');
        const items = Array.isArray(data) ? data : (data.data || []);
        const promos = items.filter(a => a.type === 'promotion' && a.is_active);
        const container = document.getElementById('promotionsListContainer');
        if (!container) return;

        if (promos.length === 0) {
            container.innerHTML = `<p style="color:var(--text-muted);font-size:14px;">No active promotions at this time.</p>`;
            return;
        }

        container.innerHTML = promos.map(p => `
            <div class="promotion-item">
                <span class="promo-icon">${p.icon || '🎁'}</span>
                <div class="promo-info">
                    <h4>${p.name}</h4>
                    <p>${p.description || ''}</p>
                </div>
                <span class="promo-status ${p.status_label === 'Active' ? '' : 'pending'}">${p.status_label || 'Active'}</span>
            </div>
        `).join('');
    } catch (e) {
        console.error('Load activities error:', e);
    }
}

// ============================================
// MODALS SETUP
// ============================================
function setupModals() {
    // Auth Modal
    document.getElementById('loginBtn')?.addEventListener('click', e => { e.preventDefault(); openAuthModal('login'); });
    document.getElementById('registerBtn')?.addEventListener('click', e => { e.preventDefault(); openAuthModal('register'); });
    document.getElementById('closeModal')?.addEventListener('click', () => closeModal('authModal'));
    document.getElementById('switchToRegister')?.addEventListener('click', e => { e.preventDefault(); showRegisterForm(); });
    document.getElementById('switchToLogin')?.addEventListener('click', e => { e.preventDefault(); showLoginForm(); });

    // Top-up Modal
    document.getElementById('topupBtn')?.addEventListener('click', e => { e.preventDefault(); closeDropdown(); openTopupModal(); });
    document.getElementById('closeTopupModal')?.addEventListener('click', () => closeModal('topupModal'));

    // History Modal
    document.getElementById('historyBtn')?.addEventListener('click', e => { e.preventDefault(); closeDropdown(); openHistoryModal(); });
    document.getElementById('closeHistoryModal')?.addEventListener('click', () => closeModal('historyModal'));

    // Inbox (My Subscriptions)
    document.getElementById('inboxBtn')?.addEventListener('click', e => { e.preventDefault(); openInboxModal(); });
    document.querySelector('#inboxModal .modal-close')?.addEventListener('click', () => closeModal('inboxModal'));
    document.getElementById('backToInboxBtn')?.addEventListener('click', showInboxList);

    // Report Issue Modal
    document.getElementById('closeReportIssueModal')?.addEventListener('click', () => closeModal('reportIssueModal'));
    document.getElementById('reportIssueNavBtn')?.addEventListener('click', e => { e.preventDefault(); closeDropdown(); openReportIssueModal(); });
    document.getElementById('reportIssueFromInboxBtn')?.addEventListener('click', () => {
        closeModal('inboxModal');
        openReportIssueModal(currentInboxOrderId);
    });

    // My Issues Modal
    document.getElementById('closeMyIssuesModal')?.addEventListener('click', () => closeModal('myIssuesModal'));

    // Purchase Modal
    document.getElementById('closePurchaseModal')?.addEventListener('click', () => closeModal('purchaseModal'));
    document.getElementById('confirmPurchaseBtn')?.addEventListener('click', confirmPurchase);

    // Product Detail Modal
    document.getElementById('closeProductDetailModal')?.addEventListener('click', () => closeModal('productDetailModal'));

    // Page top-up
    document.getElementById('topupLoginBtn')?.addEventListener('click', () => { openAuthModal('login'); });

    // Close modal on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', e => {
            if (e.target === overlay) overlay.classList.add('hidden');
        });
    });

    // Quick amounts modal
    document.querySelectorAll('.quick-amount').forEach(btn => {
        btn.addEventListener('click', () => {
            const amount = btn.getAttribute('data-amount');
            const field = document.getElementById('topupAmount');
            if (field) field.value = amount;
        });
    });

    // Page topup amounts
    document.querySelectorAll('.topup-amount-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.topup-amount-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            const field = document.getElementById('pageTopupAmount');
            if (field) field.value = btn.getAttribute('data-amount');
        });
    });
}

function closeDropdown() {
    document.getElementById('profileTrigger')?.classList.remove('open');
    document.getElementById('profileDropdown')?.classList.remove('open');
}

function openModal(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.remove('hidden');
        el.style.display = 'flex';
    }
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.add('hidden');
        el.style.display = '';
    }
}

function openAuthModal(tab = 'login') {
    openModal('authModal');
    if (tab === 'register') showRegisterForm();
    else showLoginForm();
}

function showLoginForm() {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
}

function showRegisterForm() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.remove('hidden');
}

function openTopupModal() {
    if (!currentUser) { openAuthModal('login'); return; }
    updateBalanceDisplay(currentUser.balance || 0);
    openModal('topupModal');
}

async function openHistoryModal() {
    if (!currentUser) { openAuthModal('login'); return; }
    openModal('historyModal');
    const list = document.getElementById('historyList');
    list.innerHTML = '<div class="loading">Loading...</div>';
    try {
        const data = await apiCall('/api/wallet/history');
        if (data.success && data.data.transactions.length > 0) {
            list.innerHTML = data.data.transactions.map(t => {
                const isPos = t.amount > 0;
                const typeIcon = t.type === 'topup' || t.type === 'admin_topup' ? '💳' : '📦';
                const typeClass = t.type === 'topup' || t.type === 'admin_topup' ? 'topup' : 'purchase';
                return `
                <div class="history-item">
                    <div class="history-icon ${typeClass}">${typeIcon}</div>
                    <div class="history-info">
                        <div class="history-desc">${t.description || t.type}</div>
                        <div class="history-date">${formatDate(t.created_at)}</div>
                    </div>
                    <span class="history-amount ${isPos ? 'positive' : 'negative'}">
                        ${isPos ? '+' : ''}฿${Math.abs(t.amount).toFixed(2)}
                    </span>
                </div>`;
            }).join('');
        } else {
            list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📋</div><h3>No Transactions Yet</h3><p>Your payment and subscription history will appear here.</p></div>`;
        }
    } catch {
        list.innerHTML = '<div class="loading">Failed to load history.</div>';
    }
}

async function openInboxModal() {
    if (!currentUser) { openAuthModal('login'); return; }
    openModal('inboxModal');
    showInboxList();
    await loadInbox();
}

async function loadInbox() {
    const list = document.getElementById('inboxList');
    list.innerHTML = '<div class="loading">Loading your subscriptions...</div>';
    try {
        const orders = await fetch('/api/inbox', { headers: { Authorization: 'Bearer ' + authToken } }).then(r => r.json());

        if (!Array.isArray(orders) || orders.length === 0) {
            list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📦</div><h3>No Active Subscriptions</h3><p>Subscribe to a plan to see your credentials here.</p></div>`;
            return;
        }

        list.innerHTML = orders.map(o => {
            const purchaseDate = new Date(o.created_at);
            const now = new Date();
            const durationDays = 30; // Standard duration
            const expiryDate = new Date(purchaseDate.getTime() + (durationDays * 24 * 60 * 60 * 1000));
            
            // Calculate progress
            const totalMs = expiryDate.getTime() - purchaseDate.getTime();
            const elapsedMs = now.getTime() - purchaseDate.getTime();
            const remainingMs = expiryDate.getTime() - now.getTime();
            
            const daysLeft = Math.max(0, Math.floor(remainingMs / (1000 * 60 * 60 * 24)));
            let progressPercent = Math.max(0, Math.min(100, (elapsedMs / totalMs) * 100));
            const remainingPercent = 100 - progressPercent;
            
            const isUrgent = daysLeft <= 3;
            
            return `
                <div class="inbox-item ${o.is_read ? '' : 'unread'}" data-order-id="${o.id}" onclick="viewInboxItem(${o.id}, '${escStr(o.product_name)}', '${escStr(o.product_image)}', '${escStr(o.key_data)}', '${escStr(o.created_at)}')">
                    <div class="inbox-item-main">
                        <div class="inbox-item-img">
                            ${o.product_image
                                ? `<img src="${o.product_image}" alt="${o.product_name}">`
                                : getCategoryIcon('', o.product_name)
                            }
                        </div>
                        <div class="inbox-item-info">
                            <div class="inbox-item-name">${o.product_name}</div>
                            <div class="inbox-item-date">
                                <i class="lucide-calendar" style="width:12px;height:12px;margin-right:2px;"></i>
                                Subscribed: ${formatDate(o.created_at)}
                            </div>
                        </div>
                        <div class="inbox-item-arrow">›</div>
                    </div>
                    
                    <div class="inbox-item-progress-wrap">
                        <div class="progress-header">
                            <span style="color: var(--text-secondary);">Subscription Progress</span>
                            <span class="days-left ${isUrgent ? 'urgent' : ''}">${daysLeft} days left</span>
                        </div>
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill ${isUrgent ? 'urgent' : ''}" style="width: ${remainingPercent}%"></div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch {
        list.innerHTML = '<div class="loading">Failed to load subscriptions.</div>';
    }
}

function escStr(s) { return (s || '').replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, '\\n'); }

function viewInboxItem(orderId, name, imgPath, keyData, date) {
    currentInboxOrderId = orderId;
    document.getElementById('msgProductName').textContent = name;
    document.getElementById('msgDate').textContent = 'Subscribed: ' + formatDate(date);

    // Dynamic UI parsing for Email Invites vs Standard Credentials
    const keyBox = document.getElementById('msgKeyData').parentElement;
    const bodyContainer = keyBox.parentElement;
    const accountLabel = bodyContainer.querySelector('label');
    const copyBtn = keyBox.querySelector('.btn-copy');

    let isInvite = false;
    if (keyData && keyData.startsWith('{')) {
        try {
            const parsed = JSON.parse(keyData);
            if (parsed.type === 'invite') {
                isInvite = true;
                const isSent = parsed.status === 'sent';
                accountLabel.innerHTML = `<span style="display:flex; align-items:center; gap:6px;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z"/><path d="m22 10-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 10"/></svg> Invite Delivery Status</span>`;
                accountLabel.style.color = isSent ? '#10b981' : '#3b82f6';
                document.getElementById('msgKeyData').innerHTML = `
                    <div style="font-family: 'Kanit', sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px 10px; width: 100%;">
                        <span style="color: rgba(255,255,255,0.4); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Target Email</span>
                        <strong style="color: #fff; font-size: 1.2rem; margin-bottom: 20px; font-weight: 500; letter-spacing: 0.5px;">${parsed.email}</strong>
                        
                        <div style="display: flex; align-items: center; justify-content: center; gap: 8px; background: ${isSent ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)'}; padding: 10px 20px; border-radius: 12px; border: 1px solid ${isSent ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)'}; width: fit-content;">
                            <div style="width: 8px; height: 8px; border-radius: 50%; background: ${isSent ? '#10b981' : '#f59e0b'}; box-shadow: 0 0 10px ${isSent ? '#10b981' : '#f59e0b'}; flex-shrink: 0;"></div>
                            <span style="color: ${isSent ? '#10b981' : '#f59e0b'}; font-size: 0.95rem; font-weight: 500; white-space: nowrap;">
                                ${isSent ? 'Invite Sent Successfully' : 'Pending Admin Action'}
                            </span>
                        </div>

                        ${isSent ? '<p style="margin-top: 18px; color: rgba(255,255,255,0.5); font-size: 0.85rem; text-align: center; font-weight: 300;">Invite sent successfully. Check your email inbox.</p>' : ''}
                    </div>
                `;
                document.getElementById('msgKeyData').style.background = 'transparent';
                document.getElementById('msgKeyData').style.border = 'none';
                if (copyBtn) copyBtn.classList.add('hidden');
            }
        } catch(e) {}
    }

    if (!isInvite) {
        accountLabel.textContent = 'Account Credentials:';
        accountLabel.style.color = ''; // reset to default
        document.getElementById('msgKeyData').textContent = keyData || 'No credential data available.';
        if (copyBtn) copyBtn.classList.remove('hidden');
    }

    const imgEl = document.getElementById('msgProductImg');
    if (imgPath) {
        imgEl.src = imgPath;
        imgEl.style.display = 'block';
    } else {
        imgEl.style.display = 'none';
    }

    document.getElementById('inboxList').classList.add('hidden');
    document.getElementById('inboxMessage').classList.remove('hidden');

    // Mark as read
    fetch(`/api/inbox/${orderId}/read`, { method: 'PUT', headers: { Authorization: 'Bearer ' + authToken } });
    loadInboxCount();
}

function showInboxList() {
    document.getElementById('inboxList').classList.remove('hidden');
    document.getElementById('inboxMessage').classList.add('hidden');
}

async function loadInboxCount() {
    try {
        const data = await fetch('/api/inbox/unread', { headers: { Authorization: 'Bearer ' + authToken } }).then(r => r.json());
        const dot = document.getElementById('inboxBadge');
        if (dot) {
            if (data.count > 0) dot.classList.remove('hidden');
            else dot.classList.add('hidden');
        }
    } catch {}
}

// ============================================
// PURCHASE FLOW
// ============================================
function openPurchaseModal(productId) {
    if (!currentUser) { openAuthModal('login'); return; }

    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    currentPurchaseProduct = product;

    // Populate info — use brand-colored letter badge instead of emoji
    const infoEl = document.getElementById('purchaseProductInfo');
    const colors = getCategoryColor(product.category, product.title);
    const initial = (product.title || '?').charAt(0).toUpperCase();
    infoEl.innerHTML = `
        <div class="purchase-product-avatar" style="background: linear-gradient(135deg, ${colors[0]}, ${colors[1]})">${initial}</div>
        <div>
            <div class="purchase-product-name">${product.title}</div>
            <div class="purchase-product-subtitle">${product.subtitle || ''}</div>
        </div>
    `;

    // Tabs — show both always, but default based on key_type
    switchPurchaseTab(product.key_type === 'email_invite' ? 'email_invite' : 'credentials');

    // Price
    document.getElementById('purchasePriceDisplay').textContent = '฿' + parseFloat(product.price).toFixed(2);
    document.getElementById('purchaseBalanceDisplay').textContent = '฿' + parseFloat(currentUser.balance || 0).toFixed(2);

    // Move button into modal
    const btn = document.getElementById('confirmPurchaseBtn');
    if (btn) btn.closest('.modal').querySelector('form, .purchase-modal-actions') || {};

    openModal('purchaseModal');
}

function switchPurchaseTab(tab) {
    currentPurchaseTab = tab;
    document.getElementById('tabCredentials').classList.toggle('active', tab === 'credentials');
    document.getElementById('tabEmailInvite').classList.toggle('active', tab === 'email_invite');
    document.getElementById('panelCredentials').classList.toggle('hidden', tab !== 'credentials');
    document.getElementById('panelEmailInvite').classList.toggle('hidden', tab !== 'email_invite');
}

window.switchPurchaseTab = switchPurchaseTab;

async function confirmPurchase() {
    if (!currentPurchaseProduct || !currentUser) return;

    const btn = document.getElementById('confirmPurchaseBtn');
    btn.disabled = true;
    btn.textContent = 'Processing...';

    try {
        const payload = { 
            productId: currentPurchaseProduct.id, 
            quantity: 1 
        };

        if (currentPurchaseTab === 'email_invite') {
            payload.inviteEmail = document.getElementById('inviteEmail')?.value;
        }

        const data = await apiCall('/api/wallet/purchase', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (data.success) {
            currentUser.balance = data.data.balance;
            localStorage.setItem('subshare_user', JSON.stringify(currentUser));
            updateBalanceDisplay(data.data.balance);

            closeModal('purchaseModal');
            showToast('✅ Subscription activated successfully!', 'success');

            // Show credentials
            if (data.data.key) {
                if (currentPurchaseTab !== 'email_invite') {
                    showCredentialReveal(currentPurchaseProduct.title, data.data.key);
                }
            }

            // Reload products to update slot count
            setTimeout(loadProducts, 500);

            if (currentPurchaseTab === 'email_invite') {
                const email = document.getElementById('inviteEmail')?.value;
                if (email) {
                    showToast(`📧 Invite will be sent to ${email}`, 'success');
                }
            }
            loadInboxCount();
        } else {
            showToast('❌ ' + (data.message || 'Subscription failed. Please try again.'), 'error');
        }
    } catch (e) {
        showToast('❌ A network error occurred. Please try again.', 'error');
    }

    btn.disabled = false;
    btn.textContent = 'Subscribe Now';
}

function showCredentialReveal(title, keyData) {
    // Create a mini modal to show credentials
    const existing = document.getElementById('credentialRevealModal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'credentialRevealModal';
    overlay.innerHTML = `
        <div class="modal" style="max-width:500px;">
            <button class="modal-close" onclick="document.getElementById('credentialRevealModal').remove()">&times;</button>
            <div class="modal-header">
                <h2>🔐 Your Subscription Credentials</h2>
                <p>${title} — Keep this information private</p>
            </div>
            <div style="padding:24px;">
                <div class="key-box">
                    <code id="revealKeyCode" style="flex:1;font-family:monospace;font-size:13px;color:#a5f3fc;word-break:break-all;white-space:pre-wrap;line-height:1.7;">${keyData}</code>
                    <button class="btn-copy" onclick="copyToClipboard(document.getElementById('revealKeyCode').innerText)">Copy</button>
                </div>
                <div class="instruction-box" style="margin-top:16px;">
                    <h5>🔐 Security Notice:</h5>
                    <p>Keep these credentials private. Access your subscriptions anytime from "My Subscriptions" in the menu.</p>
                </div>
                <button class="btn btn-submit" style="margin-top:16px;" onclick="document.getElementById('credentialRevealModal').remove()">Done</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

// ============================================
// REPORT ISSUE
// ============================================
function openReportIssueModal(orderId = null) {
    if (!currentUser) { openAuthModal('login'); return; }
    document.getElementById('reportOrderId').value = orderId || '';
    document.getElementById('reportSubject').value = '';
    document.getElementById('reportMessage').value = '';
    openModal('reportIssueModal');
}

// ============================================
// FORMS
// ============================================
function setupForms() {
    // Login
    document.getElementById('loginFormElement')?.addEventListener('submit', async e => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const btn = e.target.querySelector('[type=submit]');
        btn.disabled = true;
        btn.textContent = 'Signing In...';

        const data = await apiCall('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        if (data.success) {
            saveAuth(data.data.token, data.data.user);
            updateNavUI();
            closeModal('authModal');
            showToast('✅ ' + (data.message || 'Signed in successfully!'), 'success');
            refreshBalance();
            loadInboxCount();
        } else {
            showToast('❌ ' + (data.message || 'Invalid credentials.'), 'error');
        }

        btn.disabled = false;
        btn.textContent = 'Sign In';
    });

    // Register
    document.getElementById('registerFormElement')?.addEventListener('submit', async e => {
        e.preventDefault();
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirm = document.getElementById('confirmPassword').value;
        const btn = e.target.querySelector('[type=submit]');

        if (password !== confirm) { showToast('❌ Passwords do not match.', 'error'); return; }

        btn.disabled = true;
        btn.textContent = 'Creating Account...';

        const data = await apiCall('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        });

        if (data.success) {
            saveAuth(data.data.token, data.data.user);
            updateNavUI();
            closeModal('authModal');
            showToast('🎉 ' + (data.message || 'Account created! Welcome to SubShare.'), 'success');
        } else {
            showToast('❌ ' + (data.message || 'Registration failed.'), 'error');
        }

        btn.disabled = false;
        btn.textContent = 'Create Account';
    });

    // Top-up Modal Form
    document.getElementById('topupForm')?.addEventListener('submit', async e => {
        e.preventDefault();
        const amount = parseFloat(document.getElementById('topupAmount').value);
        if (!amount || amount <= 0) { showToast('❌ Please enter a valid amount.', 'error'); return; }

        const btn = e.target.querySelector('[type=submit]');
        btn.disabled = true;
        btn.textContent = 'Processing...';

        const data = await apiCall('/api/wallet/topup', { method: 'POST', body: JSON.stringify({ amount }) });

        if (data.success) {
            currentUser.balance = data.data.balance;
            localStorage.setItem('subshare_user', JSON.stringify(currentUser));
            updateBalanceDisplay(data.data.balance);
            closeModal('topupModal');
            showToast(`✅ ฿${amount.toFixed(2)} credits added successfully!`, 'success');
        } else {
            showToast('❌ ' + (data.message || 'Payment failed.'), 'error');
        }

        btn.disabled = false;
        btn.textContent = 'Add Credits';
    });

    // Page Top-up Form
    document.getElementById('pageTopupForm')?.addEventListener('submit', async e => {
        e.preventDefault();
        const amount = parseFloat(document.getElementById('pageTopupAmount').value);
        if (!amount || amount <= 0) { showToast('❌ Please enter a valid amount.', 'error'); return; }

        const btn = e.target.querySelector('[type=submit]');
        btn.disabled = true;
        btn.textContent = 'Processing...';

        const data = await apiCall('/api/wallet/topup', { method: 'POST', body: JSON.stringify({ amount }) });

        if (data.success) {
            currentUser.balance = data.data.balance;
            localStorage.setItem('subshare_user', JSON.stringify(currentUser));
            updateBalanceDisplay(data.data.balance);
            showToast(`✅ ฿${amount.toFixed(2)} credits added!`, 'success');
        } else {
            showToast('❌ ' + (data.message || 'Payment failed.'), 'error');
        }

        btn.disabled = false;
        btn.textContent = 'Add Credits Now';
    });

    // Topup page — show/hide form
    updateTopupPageUI();

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', e => {
        e.preventDefault();
        clearAuth();
        updateNavUI();
        closeDropdown();
        navigateTo('home');
        showToast('✅ Signed out successfully.', 'success');
    });

    // Contact Form
    document.getElementById('contactForm')?.addEventListener('submit', e => {
        e.preventDefault();
        showToast('✅ Message sent! We\'ll respond within 24 hours.', 'success');
        e.target.reset();
    });

    // Redeem Code
    document.getElementById('redeemForm')?.addEventListener('submit', e => {
        e.preventDefault();
        showToast('❌ Invalid or expired promo code.', 'error');
    });

    // Daily Check-in
    document.getElementById('claimDailyBtn')?.addEventListener('click', () => {
        if (!currentUser) { openAuthModal('login'); return; }
        showToast('✅ Check-in successful! ฿3 credits added.', 'success');
        refreshBalance();
    });

    // Report Issue Form
    document.getElementById('reportIssueForm')?.addEventListener('submit', async e => {
        e.preventDefault();
        if (!currentUser) { openAuthModal('login'); return; }

        const subject = document.getElementById('reportSubject').value;
        const message = document.getElementById('reportMessage').value;
        const orderId = document.getElementById('reportOrderId').value;

        const btn = e.target.querySelector('[type=submit]');
        btn.disabled = true;
        btn.textContent = 'Submitting...';

        const data = await apiCall('/api/issues', {
            method: 'POST',
            body: JSON.stringify({ subject, message, order_id: orderId ? parseInt(orderId) : null })
        });

        if (data.success) {
            closeModal('reportIssueModal');
            showToast('✅ Issue submitted. We\'ll respond within 24 hours.', 'success');
            e.target.reset();
        } else {
            showToast('❌ ' + (data.message || 'Failed to submit issue.'), 'error');
        }

        btn.disabled = false;
        btn.textContent = 'Submit Report';
    });
}

function updateTopupPageUI() {
    const loginRequired = document.getElementById('topupLoginRequired');
    const form = document.getElementById('pageTopupForm');
    if (!loginRequired || !form) return;

    if (currentUser) {
        loginRequired.classList.add('hidden');
        form.classList.remove('hidden');
        updateBalanceDisplay(currentUser.balance || 0);
    } else {
        loginRequired.classList.remove('hidden');
        form.classList.add('hidden');
    }
}

// ============================================
// FAQ
// ============================================
function setupFAQ() {
    document.querySelectorAll('.faq-question').forEach(q => {
        q.addEventListener('click', () => {
            const item = q.closest('.faq-item');
            const isOpen = item.classList.contains('open');
            document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
            if (!isOpen) item.classList.add('open');
        });
    });
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================
let toastContainer = null;

function showToast(message, type = 'success') {
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }

    const icons = { success: '✅', error: '❌', warning: '⚠️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(24px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ============================================
// UTILITIES
// ============================================
function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('📋 Copied to clipboard!', 'success');
    }).catch(() => {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        showToast('📋 Copied!', 'success');
    });
}
window.copyToClipboard = copyToClipboard;

function togglePassword(fieldId) {
    const field = document.getElementById(fieldId);
    if (field) field.type = field.type === 'password' ? 'text' : 'password';
}
window.togglePassword = togglePassword;

window.openPurchaseModal = openPurchaseModal;
window.viewInboxItem = viewInboxItem;
window.openReportIssueModal = openReportIssueModal;
