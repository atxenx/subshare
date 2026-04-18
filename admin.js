// ============================================
// WEBSHOP Admin Panel JavaScript
// ============================================

const API_BASE = '/api';
let authToken = null;
let currentAdmin = null;
let products = [];
let selectedProductId = null;

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    initNavigation();
    initModals();
    initForms();
    initNewsForm();
    initActivityForm();
    
    // Initialize icons
    if (window.lucide) {
        lucide.createIcons();
    }
});

// ============================================
// AUTHENTICATION
// ============================================
function initAuth() {
    // Try to get token from main site first, then fallback to admin-specific
    const token = localStorage.getItem('subshare_token');

    if (token) {
        // Verify token and get user info
        verifyAndLogin(token);
        return;
    }

    showLoginScreen();
}

async function verifyAndLogin(token) {
    try {
        const response = await fetch(`${API_BASE}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();

        if (result.success && result.data.user.role === 'admin') {
            authToken = token;
            currentAdmin = result.data.user;
            
            // Sync with main site storage
            localStorage.setItem('subshare_token', token);
            localStorage.setItem('subshare_user', JSON.stringify(result.data.user));
            
            showAdminPanel();
        } else {
            showLoginScreen();
        }
    } catch (error) {
        showLoginScreen();
    }
}

function showLoginScreen() {
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('adminContainer').classList.add('hidden');

    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', handleLogin);
}

function showAdminPanel() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('adminContainer').classList.remove('hidden');

    // Update admin info
    document.getElementById('adminName').textContent = currentAdmin.name;

    // Load initial data
    loadDashboardStats();

    // Setup logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (result.success) {
            if (result.data.user.role !== 'admin') {
                errorEl.textContent = 'Access denied. Admin privileges required.';
                return;
            }

            authToken = result.data.token;
            currentAdmin = result.data.user;

            // Use same keys as main site to synchronize session
            localStorage.setItem('subshare_token', authToken);
            localStorage.setItem('subshare_user', JSON.stringify(currentAdmin));

            showAdminPanel();
        } else {
            errorEl.textContent = result.message;
        }
    } catch (error) {
        errorEl.textContent = 'Connection error. Please try again.';
    }
}

function handleLogout() {
    localStorage.removeItem('subshare_token');
    localStorage.removeItem('subshare_user');
    authToken = null;
    currentAdmin = null;
    window.location.href = '/'; // Go back to home after admin logout
}

// ============================================
// API HELPER
// ============================================
async function apiRequest(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: { ...headers, ...options.headers }
    });

    const result = await response.json();

    if (!response.ok && response.status === 401) {
        handleLogout();
        throw new Error('Session expired');
    }

    return result;
}

// ============================================
// NAVIGATION
// ============================================
function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            navigateToSection(section);
        });
    });
}

function navigateToSection(section) {
    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === section);
    });

    // Show/hide sections
    document.querySelectorAll('.content-section').forEach(s => {
        s.classList.toggle('active', s.id === `section-${section}`);
    });

    // Load section data
    switch (section) {
        case 'dashboard':
            loadDashboardStats();
            break;
        case 'users':
            loadUsers();
            break;
        case 'products':
            loadProducts();
            break;
        case 'keys':
            loadKeyProducts();
            break;
        case 'orders':
            loadOrders();
            break;
        case 'transactions':
            loadTransactions();
            break;
        case 'topup-history':
            loadTopupHistory();
            break;
        case 'issues':
            loadIssues();
            break;
        case 'decoration':
            loadDecorationSettings();
            break;
        case 'news':
            loadNews();
            break;
    }
}

// ============================================
// DASHBOARD
// ============================================
async function loadDashboardStats() {
    try {
        const result = await apiRequest('/admin/stats');
        if (result.success) {
            const stats = result.data;
            document.getElementById('statUsers').textContent = stats.totalUsers.toLocaleString();
            document.getElementById('statProducts').textContent = stats.totalProducts.toLocaleString();
            document.getElementById('statOrders').textContent = stats.totalOrders.toLocaleString();
            document.getElementById('statTodayOrders').textContent = stats.todayOrders.toLocaleString();
            document.getElementById('statTopup').textContent = (stats.totalTopup || 0).toFixed(2) + ' THB';
            document.getElementById('statSales').textContent = (stats.totalSales || 0).toFixed(2) + ' THB';
        }
    } catch (error) {
        console.error('Load stats error:', error);
    }
}

// ============================================
// USERS MANAGEMENT
// ============================================
async function loadUsers() {
    try {
        const result = await apiRequest('/admin/users');
        if (result.success) {
            renderUsersTable(result.data.users);
        }
    } catch (error) {
        console.error('Load users error:', error);
    }
}

function renderUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.id}</td>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>฿${user.balance.toFixed(2)}</td>
            <td><span class="badge ${user.role === 'admin' ? 'badge-admin' : 'badge-info'}">${user.role}</span></td>
            <td>${formatDate(user.created_at)}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon" onclick="openEditUser(${user.id})" title="แก้ไข"><i data-lucide="edit-2"></i></button>
                    <button class="btn-icon" onclick="openAddBalance(${user.id})" title="Member Payment"><i data-lucide="wallet"></i></button>
                    ${user.id !== currentAdmin.id ? `<button class="btn-icon danger" onclick="deleteUser(${user.id})" title="ลบ"><i data-lucide="trash-2"></i></button>` : ''}
                </div>
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
}

function openEditUser(userId) {
    apiRequest(`/admin/users`).then(result => {
        const user = result.data.users.find(u => u.id === userId);
        if (user) {
            document.getElementById('userId').value = user.id;
            document.getElementById('userName').value = user.name;
            document.getElementById('userEmail').value = user.email;
            document.getElementById('userBalance').value = user.balance;
            document.getElementById('userRole').value = user.role;
            openModal('userModal');
        }
    });
}

function openAddBalance(userId) {
    apiRequest(`/admin/users`).then(result => {
        const user = result.data.users.find(u => u.id === userId);
        if (user) {
            document.getElementById('balanceUserId').value = user.id;
            document.getElementById('balanceUserName').textContent = user.name;
            document.getElementById('balanceCurrentBalance').textContent = user.balance.toFixed(2);
            document.getElementById('addBalanceAmount').value = '';
            openModal('addBalanceModal');
        }
    });
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
        const result = await apiRequest(`/admin/users/${userId}`, { method: 'DELETE' });
        if (result.success) {
            showToast(result.message, 'success');
            loadUsers();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        showToast('An error occurred.', 'error');
    }
}

// ============================================
// PRODUCTS MANAGEMENT
// ============================================
async function loadProducts() {
    try {
        const result = await apiRequest('/admin/products/all');
        if (result.success) {
            products = result.data.products;
            renderProductsTable(products);
        }
    } catch (error) {
        console.error('Load products error:', error);
    }
}

function renderProductsTable(products) {
    const tbody = document.getElementById('productsTableBody');
    tbody.innerHTML = products.map(p => `
        <tr>
            <td>${p.id}</td>
            <td><img src="${p.image_path || 'assets/product-1.png'}" class="product-thumb" alt="${p.title}"></td>
            <td>
                <div><strong>${p.title}</strong></div>
                <div style="font-size: 0.85rem; color: var(--text-muted)">${p.name}</div>
            </td>
            <td>฿${p.price.toFixed(2)}</td>
            <td>${p.stock}</td>
            <td>
                <span class="badge badge-success">${p.available_keys || 0}</span> /
                <span style="color: var(--text-muted)">${p.total_keys || 0}</span>
            </td>
            <td><span class="badge ${p.key_type === 'idpass' ? 'badge-purple' : 'badge-info'}">${p.key_type === 'idpass' ? 'ID|Pass' : 'Key'}</span></td>
            <td>${p.category || '-'}</td>
            <td><span class="badge ${p.is_active ? 'badge-success' : 'badge-danger'}">${p.is_active ? 'เปิด' : 'ปิด'}</span></td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon" onclick="openEditProduct(${p.id})" title="แก้ไข"><i data-lucide="edit-2"></i></button>
                    <button class="btn-icon" onclick="goToKeys(${p.id})" title="จัดการ Keys"><i data-lucide="key"></i></button>
                    <button class="btn-icon danger" onclick="deleteProduct(${p.id})" title="ลบ"><i data-lucide="trash-2"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
}

function openEditProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (product) {
        document.getElementById('productModalTitle').innerHTML = '<i data-lucide="package-open"></i> Edit Package';
        document.getElementById('productId').value = product.id;
        document.getElementById('productTitle').value = product.title;
        document.getElementById('productName').value = product.name;
        document.getElementById('productSubtitle').value = product.subtitle || '';
        document.getElementById('productBadge').value = product.badge || '';
        document.getElementById('productDescription').value = product.description || '';
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productCategory').value = product.category || 'other';
        document.getElementById('productKeyType').value = product.key_type || 'key';
        document.getElementById('productImagePath').value = product.image_path || '';
        openModal('productModal');
        lucide.createIcons();
    }
}

function goToKeys(productId) {
    navigateToSection('keys');
    setTimeout(() => {
        document.getElementById('keyProductSelect').value = productId;
        loadProductKeys(productId);
    }, 100);
}

async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this package?')) return;

    try {
        const result = await apiRequest(`/products/${productId}`, { method: 'DELETE' });
        if (result.success) {
            showToast(result.message, 'success');
            loadProducts();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        showToast('An error occurred.', 'error');
    }
}

// Add Product Button
document.getElementById('addProductBtn')?.addEventListener('click', () => {
    document.getElementById('productModalTitle').textContent = 'Add New Subscription Package';
    document.getElementById('productId').value = '';
    document.getElementById('productForm').reset();
    openModal('productModal');
});

// ============================================
// KEYS MANAGEMENT
// ============================================
async function loadKeyProducts() {
    try {
        const result = await apiRequest('/admin/products/all');
        if (result.success) {
            products = result.data.products;
            const select = document.getElementById('keyProductSelect');
            select.innerHTML = '<option value="">-- Select a package --</option>' +
                products.filter(p => p.is_active).map(p =>
                    `<option value="${p.id}">${p.title} (${p.available_keys || 0} keys)</option>`
                ).join('');
        }
    } catch (error) {
        console.error('Load products error:', error);
    }
}

document.getElementById('keyProductSelect')?.addEventListener('change', (e) => {
    const productId = parseInt(e.target.value);
    if (productId) {
        loadProductKeys(productId);
    } else {
        document.getElementById('keysPanel').classList.add('hidden');
    }
});

async function loadProductKeys(productId) {
    selectedProductId = productId;
    const product = products.find(p => p.id === productId);

    if (!product) return;

    try {
        const result = await apiRequest(`/admin/products/${productId}/keys`);
        if (result.success) {
            document.getElementById('keysPanel').classList.remove('hidden');
            document.getElementById('keyProductName').textContent = product.title;
            document.getElementById('keyAvailable').textContent = result.data.available;
            document.getElementById('keyTotal').textContent = result.data.total;

            // Update key type UI
            const keyType = product.key_type || 'key';
            const keyTypeText = document.getElementById('keyTypeText');
            const formatHint = document.getElementById('formatHint');
            const singleKeyInput = document.getElementById('singleKeyInput');
            const bulkKeysInput = document.getElementById('bulkKeysInput');

            if (keyType === 'idpass') {
                keyTypeText.textContent = 'ID|Password';
                formatHint.innerHTML = '<i data-lucide="info"></i><span>รูปแบบ: ID|Password (คั่นด้วย |)</span>';
                singleKeyInput.placeholder = 'เช่น: username123|password456';
                bulkKeysInput.placeholder = 'พิมพ์ทีละบรรทัด เช่น:\nuser1|pass1\nuser2|pass2\nuser3|pass3';
            } else {
                keyTypeText.textContent = 'Key';
                formatHint.innerHTML = '<i data-lucide="info"></i><span>1 line = 1 credential slot</span>';
                singleKeyInput.placeholder = 'e.g. email:password';
                bulkKeysInput.placeholder = 'Enter one credential per line';
            }

            lucide.createIcons();
            renderKeysTable(result.data.keys, keyType);
        }
    } catch (error) {
        console.error('Load keys error:', error);
    }
}

function renderKeysTable(keys, keyType = 'key') {
    const tbody = document.getElementById('keysTableBody');
    tbody.innerHTML = keys.map(key => {
        let displayData = key.key_data;
        if (keyType === 'idpass' && key.key_data.includes('|')) {
            const [id, pass] = key.key_data.split('|');
            displayData = `<span style="color: var(--info)">${id}</span> | <span style="color: var(--warning)">${pass}</span>`;
        }
        return `
        <tr>
            <td>${key.id}</td>
            <td><span class="key-data">${displayData}</span></td>
            <td><span class="badge ${key.is_sold ? 'badge-warning' : 'badge-success'}">${key.is_sold ? 'Assigned' : 'Available'}</span></td>
            <td>${key.sold_to_user_id || '-'}</td>
            <td>${formatDate(key.created_at)}</td>
            <td>
                ${!key.is_sold ? `<button class="btn-icon danger" onclick="deleteKey(${key.id})" title="ลบ"><i data-lucide="trash-2"></i></button>` : ''}
            </td>
        </tr>
    `}).join('');
    lucide.createIcons();
}

// Add single key
document.getElementById('addSingleKeyBtn')?.addEventListener('click', async () => {
    const keyData = document.getElementById('singleKeyInput').value.trim();
    if (!keyData || !selectedProductId) {
        showToast('Please enter credential data.', 'error');
        return;
    }

    try {
        const result = await apiRequest(`/admin/products/${selectedProductId}/keys`, {
            method: 'POST',
            body: JSON.stringify({ key_data: keyData })
        });

        if (result.success) {
            showToast(result.message, 'success');
            document.getElementById('singleKeyInput').value = '';
            loadProductKeys(selectedProductId);
            loadKeyProducts();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        showToast('An error occurred.', 'error');
    }
});

// Add bulk keys
document.getElementById('addBulkKeysBtn')?.addEventListener('click', async () => {
    const keysText = document.getElementById('bulkKeysInput').value.trim();
    if (!keysText || !selectedProductId) {
        showToast('Please enter credential data.s', 'error');
        return;
    }

    const keys = keysText.split('\n').filter(k => k.trim());
    if (keys.length === 0) {
        showToast('No valid credentials found.', 'error');
        return;
    }

    try {
        const result = await apiRequest(`/admin/products/${selectedProductId}/keys/bulk`, {
            method: 'POST',
            body: JSON.stringify({ keys })
        });

        if (result.success) {
            showToast(result.message, 'success');
            document.getElementById('bulkKeysInput').value = '';
            loadProductKeys(selectedProductId);
            loadKeyProducts();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        showToast('An error occurred.', 'error');
    }
});

async function deleteKey(keyId) {
    if (!confirm('Are you sure you want to delete this credential?')) return;

    try {
        const result = await apiRequest(`/admin/keys/${keyId}`, { method: 'DELETE' });
        if (result.success) {
            showToast(result.message, 'success');
            loadProductKeys(selectedProductId);
            loadKeyProducts();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        showToast('An error occurred.', 'error');
    }
}

// ============================================
// ORDERS
// ============================================
async function loadOrders() {
    try {
        const result = await apiRequest('/admin/orders');
        if (result.success) {
            renderOrdersTable(result.data.orders);
        }
    } catch (error) {
        console.error('Load orders error:', error);
    }
}

function renderOrdersTable(orders) {
    const tbody = document.getElementById('ordersTableBody');
    tbody.innerHTML = orders.map(order => {
        let displayKey = order.key_data || '-';
        if (displayKey.startsWith('{')) {
            try {
                const parsed = JSON.parse(displayKey);
                if (parsed.type === 'invite') {
                    displayKey = `<span style="color: var(--primary)">Invite: ${parsed.email}</span>`;
                }
            } catch(e) {}
        }
        return `
        <tr>
            <td>${order.id}</td>
            <td>
                <div>${order.user_name || 'Unknown'}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted)">${order.user_email || ''}</div>
            </td>
            <td>${order.product_title || 'Unknown'}</td>
            <td>${order.quantity}</td>
            <td>${order.total_price.toFixed(2)} THB</td>
            <td><span class="key-data">${displayKey}</span></td>
            <td><span class="badge badge-success">${order.status}</span></td>
            <td>${formatDate(order.created_at)}</td>
        </tr>`;
    }).join('');
}

// ============================================
// TRANSACTIONS
// ============================================
async function loadTransactions() {
    try {
        const result = await apiRequest('/admin/orders');
        if (result.success) {
            renderTransactionsTable(result.data.orders);
        }
    } catch (error) {
        console.error('Load transactions error:', error);
    }
}

async function loadTopupHistory() {
    try {
        const result = await apiRequest('/admin/topups');
        if (result.success) {
            renderTopupHistoryTable(result.data.topups);
        }
    } catch (error) {
        console.error('Load topup history error:', error);
    }
}

function renderTopupHistoryTable(topups) {
    const tbody = document.getElementById('topupHistoryTableBody');
    if (!tbody) return;

    tbody.innerHTML = topups.map(t => `
        <tr>
            <td>${t.id}</td>
            <td>
                <div>${t.user_name || 'Unknown'}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted)">${t.user_email || ''}</div>
            </td>
            <td><span class="badge ${t.method === 'admin_manual' ? 'badge-admin' : 'badge-success'}">${t.method === 'admin_manual' ? 'Admin Credit' : 'Member Payment'}</span></td>
            <td style="color: var(--success)">
                +${t.amount.toFixed(2)} THB
            </td>
            <td>${t.status === 'completed' ? 'Completed' : t.status}</td>
            <td>${formatDate(t.created_at)}</td>
        </tr>
    `).join('');
    lucide.createIcons();
}

function renderTransactionsTable(orders) {
    const tbody = document.getElementById('transactionsTableBody');
    if (!tbody) return;

    tbody.innerHTML = orders.map(o => {
        let displayKey = o.key_data || '-';
        let actionBtn = '';
        
        if (displayKey.startsWith('{')) {
            try {
                const parsed = JSON.parse(displayKey);
                if (parsed.type === 'invite') {
                    const isSent = parsed.status === 'sent';
                    displayKey = `<span style="color: ${isSent ? 'var(--success)' : 'var(--primary)'}">
                        ${isSent ? '<i data-lucide="check-check" style="width:14px; height:14px; margin-right:4px;"></i>' : '<i data-lucide="mail" style="width:14px; height:14px; margin-right:4px;"></i>'}
                        Invite: ${parsed.email}
                    </span>`;

                    if (!isSent) {
                        actionBtn = `
                            <button class="btn btn-sm btn-primary" onclick="markInviteSent(${o.id})" title="Mark as Sent">
                                <i data-lucide="send"></i>
                                Deliver
                            </button>
                        `;
                    }
                }
            } catch(e) {}
        } else if (displayKey.includes('|')) {
            const [id, pass] = displayKey.split('|');
            displayKey = `<span style="color: var(--info)">${id}</span> | <span style="color: var(--warning)">${pass}</span>`;
        }

        return `
        <tr>
            <td>${o.id}</td>
            <td>
                <div>${o.user_name || 'Unknown'}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted)">${o.user_email || ''}</div>
            </td>
            <td>${o.product_title || 'Unknown Product'}</td>
            <td><span class="key-data">${displayKey}</span></td>
            <td style="color: var(--danger)">
                -${o.total_price.toFixed(2)} THB
            </td>
            <td><span class="badge badge-success">${o.status}</span></td>
            <td>${formatDate(o.created_at)}</td>
            <td>${actionBtn}</td>
        </tr>
    `}).join('');
    lucide.createIcons();
}

async function markInviteSent(orderId) {
    if (!confirm('ยืนยันว่าส่งคำเชิญเรียบร้อยแล้ว? (Confirm deliver invite?)')) return;

    try {
        // Find existing order to get key_data
        const ordersResult = await apiRequest('/admin/orders');
        const order = ordersResult.data.orders.find(o => o.id === orderId);
        
        if (!order || !order.key_data.startsWith('{')) {
            throw new Error('Invalid order data');
        }

        const parsed = JSON.parse(order.key_data);
        parsed.status = 'sent';

        const result = await apiRequest(`/admin/orders/${orderId}`, {
            method: 'PUT',
            body: JSON.stringify({
                key_data: JSON.stringify(parsed)
            })
        });

        if (result.success) {
            showToast('ส่งคำเชิญสำเร็จ (Status updated)', 'success');
            loadTransactions(); // Reload table
        } else {
            showToast(result.message || 'Update failed', 'error');
        }
    } catch (error) {
        console.error('Mark invite sent error:', error);
        showToast('An error occurred while updating status.', 'error');
    }
}

// ============================================
// DECORATION SETTINGS
// ============================================
async function loadDecorationSettings() {
    try {
        const settings = await apiRequest('/settings', { method: 'GET' }); // Public endpoint

        // Populate form fields
        for (const [key, value] of Object.entries(settings)) {
            const input = document.getElementById(`setting_${key}`);
            if (input) {
                input.value = value;

                // Handle color pickers sync
                if (key.startsWith('theme_')) {
                    const picker = document.getElementById(`setting_${key}_picker`);
                    if (picker) picker.value = value;
                }

                // Handle image previews
                if (key.endsWith('_url')) {
                    const preview = document.getElementById(`preview_${key}`);
                    if (preview && value) preview.src = value;
                }
            }
        }
    } catch (error) {
        console.error('Load settings error:', error);
        showToast('Failed to load settings.', 'error');
    }
}

function initDecorationForm() {
    // Save button
    document.getElementById('saveDecorationBtn')?.addEventListener('click', async () => {
        const updates = {};
        const inputs = document.querySelectorAll('[id^="setting_"]');

        inputs.forEach(input => {
            if (!input.id.endsWith('_picker')) { // Skip color pickers
                const key = input.id.replace('setting_', '');
                updates[key] = input.value;
            }
        });

        try {
            const result = await apiRequest('/settings', {
                method: 'PUT',
                body: JSON.stringify(updates)
            });

            if (result.message) { // success check
                showToast('Settings saved successfully.', 'success');
            }
        } catch (error) {
            showToast('An error occurred.ในการบันทึก', 'error');
        }
    });

    // Color Pickers Sync
    const colors = ['theme_color_primary', 'theme_color_secondary', 'theme_bg_primary', 'theme_bg_card'];
    colors.forEach(key => {
        const textInput = document.getElementById(`setting_${key}`);
        const picker = document.getElementById(`setting_${key}_picker`);

        if (textInput && picker) {
            // Picker -> Text
            picker.addEventListener('input', (e) => {
                textInput.value = e.target.value;
            });
            // Text -> Picker
            textInput.addEventListener('input', (e) => {
                picker.value = e.target.value;
            });
        }
    });

    // Theme Presets
    const themes = {
        'dark-orange': {
            primary: '#ff6b00', secondary: '#ff8c00', bg: '#0a0a0a', card: '#1a1a1a'
        },
        'neon-blue': {
            primary: '#3b82f6', secondary: '#06b6d4', bg: '#0a0a0a', card: '#1a1a1a'
        },
        'purple-haze': {
            primary: '#8b5cf6', secondary: '#d946ef', bg: '#0a0a0a', card: '#1a1a1a'
        },
        'emerald-green': {
            primary: '#10b981', secondary: '#34d399', bg: '#0a0a0a', card: '#1a1a1a'
        },
        'midnight-red': {
            primary: '#ef4444', secondary: '#b91c1c', bg: '#0a0a0a', card: '#1a1a1a'
        }
    };

    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const themeName = btn.dataset.theme;
            const theme = themes[themeName];
            if (theme) {
                // Helper to update both picker and text input explicitly
                // This avoids relying on event listeners which might be flaky
                const updateColorPair = (baseKey, colorValue) => {
                    const picker = document.getElementById(`setting_${baseKey}_picker`);
                    const textInput = document.getElementById(`setting_${baseKey}`);

                    if (picker) {
                        picker.value = colorValue;
                        // Dispatch input for visual feedback if needed
                        picker.dispatchEvent(new Event('input', { bubbles: true }));
                    }

                    if (textInput) {
                        textInput.value = colorValue;
                        // Dispatch input so any other listeners know it changed
                        textInput.dispatchEvent(new Event('input', { bubbles: true }));
                    }

                    if (!picker && !textInput) {
                        console.error(`Elements not found for ${baseKey}`);
                    }
                };

                updateColorPair('theme_color_primary', theme.primary);
                updateColorPair('theme_color_secondary', theme.secondary);
                updateColorPair('theme_bg_primary', theme.bg);
                updateColorPair('theme_bg_card', theme.card);

                showToast(`Applied theme: ${themeName}`, 'success');
            }
        });
    });


    // File Uploads
    // 1. Handle File Selection (Show filename)
    const fileInputs = [
        'upload_logo_url',
        'upload_favicon_url',
        'upload_hero_bg_url',
        'upload_promo_bg_url',
        'upload_promo_character_url',
        'upload_category_roblox_url',
        'upload_category_premium_url',
        'upload_category_gameid_url',
        'upload_category_topup_url'
    ];
    fileInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('change', (e) => {
                const file = e.target.files[0];
                const label = document.querySelector(`label[for="${id}"]`);
                if (file && label) {
                    label.innerHTML = `<i data-lucide="check"></i> ${file.name.substring(0, 15)}${file.name.length > 15 ? '...' : ''}`;
                    lucide.createIcons();
                }
            });
        }
    });

    // 2. Handle Upload Button Click
    document.querySelectorAll('.btn-upload').forEach(btn => {
        btn.addEventListener('click', async () => {
            const targetKey = btn.dataset.target;
            const fileInput = document.getElementById(`upload_${targetKey}`);
            const file = fileInput.files[0];

            if (!file) {
                showToast('กรุณาเลือกไฟล์ก่อน', 'warning');
                return;
            }

            const formData = new FormData();
            formData.append('image', file);

            // Show loading state
            const originalText = btn.innerHTML;
            btn.innerHTML = `<i data-lucide="loader-2" class="animate-spin"></i> กำลังอัปโหลด...`;
            btn.disabled = true;
            lucide.createIcons();

            try {
                // Must use fetch directly for FormData to handle Content-Type correctly
                const response = await fetch(`${API_BASE}/settings/upload`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${authToken}` },
                    body: formData
                });

                const result = await response.json();

                if (response.ok) {
                    showToast('อัปโหลดCompleted', 'success');
                    // Update input and preview
                    document.getElementById(`setting_${targetKey}`).value = result.path;
                    document.getElementById(`preview_${targetKey}`).src = result.path;

                    // Reset file input and label
                    fileInput.value = '';
                    const label = document.querySelector(`label[for="upload_${targetKey}"]`);
                    if (label) {
                        label.innerHTML = `<i data-lucide="file"></i> เลือกไฟล์`;
                        lucide.createIcons();
                    }
                } else {
                    showToast(result.message || 'อัปโหลดล้มเหลว', 'error');
                }
            } catch (error) {
                showToast('An error occurred.ในการอัปโหลด', 'error');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
                lucide.createIcons();
            }
        });
    });

}

// ============================================
// MODALS
// ============================================
function initModals() {
    // Close buttons
    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal-overlay').classList.add('hidden');
        });
    });

    // Click outside to close
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.add('hidden');
            }
        });
    });
}

function openModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// ============================================
// FORMS
// ============================================
function initForms() {
    // Edit User Form
    document.getElementById('userForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = document.getElementById('userId').value;
        const data = {
            name: document.getElementById('userName').value,
            email: document.getElementById('userEmail').value,
            balance: parseFloat(document.getElementById('userBalance').value),
            role: document.getElementById('userRole').value
        };

        try {
            const result = await apiRequest(`/admin/users/${userId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });

            if (result.success) {
                showToast(result.message, 'success');
                closeModal('editUserModal');
                loadUsers();
            } else {
                showToast(result.message, 'error');
            }
        } catch (error) {
            showToast('An error occurred.', 'error');
        }
    });

    // Add Balance Form
    document.getElementById('addBalanceForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = document.getElementById('balanceUserId').value;
        const amount = parseFloat(document.getElementById('addBalanceAmount').value);

        try {
            const result = await apiRequest(`/admin/users/${userId}/add-balance`, {
                method: 'POST',
                body: JSON.stringify({ amount })
            });

            if (result.success) {
                showToast(result.message, 'success');
                closeModal('addBalanceModal');
                loadUsers();
            } else {
                showToast(result.message, 'error');
            }
        } catch (error) {
            showToast('An error occurred.', 'error');
        }
    });

    // Edit Product Form
    document.getElementById('productForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        
        const productId = document.getElementById('productId').value;
        const data = {
            title: document.getElementById('productTitle').value,
            name: document.getElementById('productName').value,
            subtitle: document.getElementById('productSubtitle').value,
            badge: document.getElementById('productBadge').value,
            description: document.getElementById('productDescription').value,
            price: parseFloat(document.getElementById('productPrice').value) || 0,
            stock: parseInt(document.getElementById('productStock').value) || 0,
            category: document.getElementById('productCategory').value,
            key_type: document.getElementById('productKeyType').value,
            image_path: document.getElementById('productImagePath').value
        };

        try {
            // Loading State
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="lucide-refresh-cw spin"></i> Saving...';
            
            const url = productId ? `/products/${productId}` : '/products';
            const method = productId ? 'PUT' : 'POST';

            const result = await apiRequest(url, {
                method,
                body: JSON.stringify(data)
            });

            if (result.success) {
                showToast(result.message, 'success');
                closeModal('productModal');
                loadProducts();
            } else {
                showToast(result.message, 'error');
            }
        } catch (error) {
            console.error('Product save error:', error);
            showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    });

    initDecorationForm();
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}</span>
        <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// UTILITIES
// ============================================
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ============================================
// NEWS MANAGEMENT
// ============================================
async function loadNews() {
    try {
        const news = await apiRequest('/news/all');
        const tbody = document.getElementById('newsTableBody');
        tbody.innerHTML = '';

        news.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <img src="${item.image_url || 'assets/no-image.png'}" class="product-img-preview" style="width: 50px; height: 30px; object-fit: cover;">
                </td>
                <td>${item.title}</td>
                <td><span class="badge badge-secondary">${item.category}</span></td>
                <td>
                    <span class="status-badge ${item.is_active ? 'status-success' : 'status-pending'}"
                          onclick="toggleNewsStatus(${item.id}, ${item.is_active})" style="cursor: pointer;">
                        ${item.is_active ? 'แสดงผล' : 'ซ่อน'}
                    </span>
                </td>
                <td>${formatDate(item.created_at)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon" onclick="editNews(${item.id})">
                            <i data-lucide="edit"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="deleteNews(${item.id})">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
        lucide.createIcons();
    } catch (error) {
        showToast('ไม่สามารถโหลดข้อมูลข่าวสารได้', 'error');
    }
}

function initNewsForm() {
    const form = document.getElementById('newsForm');
    const uploadBtn = document.getElementById('uploadNewsImageBtn');
    const fileInput = document.getElementById('newsImageFile');
    const addBtn = document.getElementById('addNewsBtn');

    // Add News Button
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            document.getElementById('newsId').value = '';
            document.getElementById('newsTitle').value = '';
            document.getElementById('newsContent').value = '';
            document.getElementById('newsImageUrl').value = '';
            document.getElementById('newsImagePreview').innerHTML = '<span class="text-muted">No Image</span>';
            document.getElementById('newsCategory').value = 'general';
            document.getElementById('newsStatus').value = '1';
            openModal('addNewsModal');
        });
    }

    // Image Upload
    if (uploadBtn && fileInput) {
        uploadBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('image', file);

            try {
                const response = await fetch(`${API_BASE}/news/upload`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${authToken}` },
                    body: formData
                });
                const result = await response.json();

                if (response.ok) {
                    document.getElementById('newsImageUrl').value = result.path;
                    document.getElementById('newsImagePreview').innerHTML = `<img src="${result.path}" alt="Preview">`;
                    showToast('อัปโหลดรูปภาพCompleted', 'success');
                } else {
                    showToast('อัปโหลดล้มเหลว: ' + result.message, 'error');
                }
            } catch (error) {
                showToast('An error occurred.ในการอัปโหลด', 'error');
            }
        });
    }

    // URL Input Change Preview
    if (document.getElementById('newsImageUrl')) {
        document.getElementById('newsImageUrl').addEventListener('change', (e) => {
            const url = e.target.value;
            if (url) {
                document.getElementById('newsImagePreview').innerHTML = `<img src="${url}" alt="Preview">`;
            }
        });
    }

    // Form Submit
    if (form) {
        form.addEventListener('submit', handleNewsSubmit);
    }
}

async function handleNewsSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('newsId').value;
    const title = document.getElementById('newsTitle').value;
    const content = document.getElementById('newsContent').value;
    const image_url = document.getElementById('newsImageUrl').value;
    const category = document.getElementById('newsCategory').value;
    const is_active = document.getElementById('newsStatus').value;

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/news/${id}` : '/news';

    try {
        await apiRequest(url, {
            method,
            body: JSON.stringify({ title, content, image_url, category, is_active })
        });
        showToast(id ? 'แก้ไขข่าวสารCompleted' : 'เพิ่มข่าวสารCompleted', 'success');
        closeModal('addNewsModal');
        loadNews();
    } catch (error) {
        showToast('An error occurred.', 'error');
    }
}

async function editNews(id) {
    try {
        const news = await apiRequest('/news/all');
        const item = news.find(n => n.id === id);
        if (item) {
            document.getElementById('newsId').value = item.id;
            document.getElementById('newsTitle').value = item.title;
            document.getElementById('newsContent').value = item.content;
            document.getElementById('newsImageUrl').value = item.image_url || '';
            document.getElementById('newsCategory').value = item.category;
            document.getElementById('newsStatus').value = item.is_active;

            if (item.image_url) {
                document.getElementById('newsImagePreview').innerHTML = `<img src="${item.image_url}" alt="Preview">`;
            } else {
                document.getElementById('newsImagePreview').innerHTML = '<span class="text-muted">No Image</span>';
            }
            openModal('addNewsModal');
        }
    } catch (error) {
        showToast('ไม่สามารถโหลดข้อมูลข่าวได้', 'error');
    }
}

async function deleteNews(id) {
    if (!confirm('คุณต้องการลบข่าวนี้ใช่หรือไม่?')) return;
    try {
        await apiRequest(`/news/${id}`, { method: 'DELETE' });
        showToast('ลบข่าวสารCompleted', 'success');
        loadNews();
    } catch (error) {
        showToast('ลบข่าวสารล้มเหลว', 'error');
    }
}

async function toggleNewsStatus(id, currentStatus) {
    try {
        await apiRequest(`/news/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ is_active: currentStatus ? 0 : 1 })
        });
        showToast('เปลี่ยนสถานะCompleted', 'success');
        loadNews();
    } catch (error) {
        showToast('เปลี่ยนสถานะไม่Completed', 'error');
    }
}

// ============================================
// ============================================
// ACTIVITY MANAGEMENT
// ============================================
async function loadActivities() {
    try {
        const activities = await apiRequest('/activities');
        const systemTbody = document.getElementById('activitiesSystemTableBody');
        const promoTbody = document.getElementById('activitiesPromoTableBody');

        systemTbody.innerHTML = '';
        promoTbody.innerHTML = '';

        activities.forEach(item => {
            const isActive = item.is_active === 1;
            const toggleHtml = `
                <label class="switch">
                    <input type="checkbox" ${isActive ? 'checked' : ''} onchange="toggleActivity('${item.key}', this.checked)">
                    <span class="slider round"></span>
                </label>
            `;

            if (item.type === 'system') {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><span style="font-size: 1.5rem;">${item.icon || '⚙️'}</span></td>
                    <td>${item.name}</td>
                    <td>${item.description}</td>
                    <td>${toggleHtml}</td>
                `;
                systemTbody.appendChild(tr);
            } else {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><span style="font-size: 1.5rem;">${item.icon || '🎁'}</span></td>
                    <td>${item.name}</td>
                    <td>${item.description}</td>
                    <td><span class="badge badge-secondary">${item.status_label || '-'}</span></td>
                    <td>${toggleHtml}</td>
                    <td>
                        <div class="action-btns">
                            <button class="btn-icon" onclick="editActivity('${item.key}')" title="แก้ไข">
                                <i data-lucide="edit"></i>
                            </button>
                            <button class="btn-icon danger" onclick="deleteActivity('${item.key}')" title="ลบ">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    </td>
                `;
                promoTbody.appendChild(tr);
            }
        });
        lucide.createIcons();
    } catch (error) {
        showToast('ไม่สามารถโหลดข้อมูลกิจกรรมได้', 'error');
    }
}

async function toggleActivity(key, isActive) {
    try {
        await apiRequest(`/activities/${key}`, {
            method: 'PUT',
            body: JSON.stringify({ is_active: isActive ? 1 : 0 })
        });
        showToast('อัปเดตสถานะCompleted', 'success');
    } catch (error) {
        showToast('อัปเดตสถานะล้มเหลว', 'error');
        loadActivities(); // Revert toggle on error
    }
}

async function editActivity(key) {
    try {
        const activities = await apiRequest('/activities');
        const item = activities.find(a => a.key === key);

        if (item) {
            document.getElementById('editActivityKey').value = item.key;
            document.getElementById('editActivityName').value = item.name;
            document.getElementById('editActivityDesc').value = item.description;
            document.getElementById('editActivityLabel').value = item.status_label || '';

            openModal('editActivityModal');
        }
    } catch (error) {
        showToast('โหลดข้อมูลล้มเหลว', 'error');
    }
}

async function deleteActivity(key) {
    if (!confirm('ยืนยันลบกิจกรรมนี้? การกระทำนี้ไม่สามารถย้อนกลับได้')) return;

    try {
        const result = await apiRequest(`/activities/${key}`, { method: 'DELETE' });
        if (result.success) {
            showToast('ลบกิจกรรมCompleted', 'success');
            loadActivities();
        } else {
            showToast(result.message || 'ลบกิจกรรมล้มเหลว', 'error');
        }
    } catch (error) {
        showToast('An error occurred.ในการลบ', 'error');
    }
}

function initActivityForm() {
    // Helper to open Add Modal
    document.getElementById('addActivityBtn')?.addEventListener('click', () => {
        document.getElementById('addActivityForm').reset();
        openModal('addActivityModal');
    });

    // Handle Edit Submit
    const editForm = document.getElementById('editActivityForm');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const key = document.getElementById('editActivityKey').value;
            const name = document.getElementById('editActivityName').value;
            const description = document.getElementById('editActivityDesc').value;
            const status_label = document.getElementById('editActivityLabel').value;

            try {
                await apiRequest(`/activities/${key}`, {
                    method: 'PUT',
                    body: JSON.stringify({ name, description, status_label })
                });
                showToast('บันทึกข้อมูลCompleted', 'success');
                closeModal('editActivityModal');
                loadActivities();
            } catch (error) {
                showToast('บันทึกข้อมูลล้มเหลว', 'error');
            }
        });
    }

    // Handle Add Submit
    const addForm = document.getElementById('addActivityForm');
    if (addForm) {
        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const key = document.getElementById('addActivityKey').value;
            const name = document.getElementById('addActivityName').value;
            const description = document.getElementById('addActivityDesc').value;
            const type = document.getElementById('addActivityType').value;
            const icon = document.getElementById('addActivityIcon').value;
            const status_label = document.getElementById('addActivityLabel').value;

            try {
                const response = await apiRequest('/activities', {
                    method: 'POST',
                    body: JSON.stringify({ key, name, description, type, icon, status_label })
                });

                showToast('เพิ่มกิจกรรมCompleted', 'success');
                closeModal('addActivityModal');
                loadActivities();
            } catch (error) {
                // Note: apiRequest throws on 401, but we might get 400 or 500 in result
                console.error(error);
                showToast('เพิ่มกิจกรรมล้มเหลว (Key อาจซ้ำ)', 'error');
            }
        });
    }
}
