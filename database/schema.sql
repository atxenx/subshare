-- ============================================
-- SubShare - Subscription Sharing Platform
-- Database Schema
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    balance REAL DEFAULT 0,
    role TEXT DEFAULT 'user',
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Subscription Packages table (products)
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    subtitle TEXT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    stock INTEGER DEFAULT 0,
    badge TEXT,
    image_path TEXT,
    category TEXT,
    key_type TEXT DEFAULT 'credentials',
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Account Credentials / Slots table (product_keys)
CREATE TABLE IF NOT EXISTS product_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    key_data TEXT NOT NULL,
    is_sold INTEGER DEFAULT 0,
    sold_to_user_id INTEGER,
    order_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    sold_at DATETIME,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (sold_to_user_id) REFERENCES users(id)
);

-- Transactions table (wallet credits & purchases)
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    reference_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Payments table (for separate payment history)
CREATE TABLE IF NOT EXISTS topups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    method TEXT DEFAULT 'manual',
    status TEXT DEFAULT 'completed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Orders / Subscriptions table
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1,
    total_price REAL NOT NULL,
    status TEXT DEFAULT 'completed',
    key_data TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Issue Reports table
CREATE TABLE IF NOT EXISTS issue_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    order_id INTEGER,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    admin_reply TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- Announcements table
CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT,
    image_url TEXT,
    category TEXT DEFAULT 'general',
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Platform Activities table
CREATE TABLE IF NOT EXISTS activities (
    key TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT,
    is_active INTEGER DEFAULT 1,
    status_label TEXT,
    icon TEXT
);

-- Initial Activities (English)
INSERT OR IGNORE INTO activities (key, name, description, type, is_active, status_label, icon) VALUES
('daily_checkin', 'Daily Check-in', 'Check in every day to earn free credits', 'system', 1, NULL, '📅'),
('redeem_code', 'Redeem Code', 'Enter a promo code to claim your reward', 'system', 1, NULL, '🎟️'),
('promo_new_member', 'New Member Bonus — 10 Credits', 'Sign up today and get 10 free credits instantly', 'promotion', 1, 'Active', '🎉'),
('promo_topup_bonus', 'Add $100, Get $120', 'Top up $100 in credits and receive a bonus $20 instantly', 'promotion', 1, 'Active', '💎'),
('promo_referral', 'Refer a Friend', 'Earn 15 credits for every friend you refer who subscribes', 'promotion', 1, 'Active', '👥');

-- Site Settings (English / SubShare branding)
CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    type TEXT DEFAULT 'text',
    description TEXT
);

INSERT OR IGNORE INTO site_settings (key, value, type, description) VALUES
('site_title', 'SubShare - Subscription Sharing Platform', 'text', 'Page Title'),
('site_description', 'Share premium subscriptions — Netflix, Spotify, YouTube, and more. Save up to 80% with group plans.', 'text', 'Meta Description'),
('brand_name', 'SubShare', 'text', 'Brand Name used in Hero/Nav'),
('logo_url', 'assets/logo.png', 'image', 'Website Logo'),
('favicon_url', 'assets/logo.png', 'image', 'Website Favicon'),
('hero_bg_url', 'assets/hero-bg.jpg', 'image', 'Hero Background Image'),
('promo_bg_url', 'assets/promo-bg.jpg', 'image', 'Promo Banner Background'),
('theme_color_primary', '#2563eb', 'color', 'Primary Brand Color (Blue)'),
('theme_color_secondary', '#1d4ed8', 'color', 'Secondary/Hover Color'),
('theme_bg_primary', '#f8fafc', 'color', 'Main Background Color'),
('theme_bg_card', '#ffffff', 'color', 'Card Background Color'),
('contact_line', '@SubShare', 'text', 'Line ID'),
('contact_facebook', 'SubShare', 'text', 'Facebook Name'),
('contact_email', 'support@subshare.app', 'text', 'Contact Email');

-- Default Subscription Packages
INSERT OR IGNORE INTO products (id, title, subtitle, name, price, stock, badge, image_path, category, key_type) VALUES
(1,  'YouTube Premium', 'Individual Plan · 1 Month', 'YouTube Premium Individual', 139,  5,  'Popular',    'assets/product-1.png',  'streaming',    'credentials'),
(2,  'YouTube Premium', 'Family Plan · Up to 6 Members', 'YouTube Premium Family', 279,  4,  'Best Value', 'assets/product-2.png',  'streaming',    'email_invite'),
(3,  'Spotify Premium', 'Individual Plan · 1 Month', 'Spotify Premium Individual', 175,  6,  'Hot Deal',   'assets/product-3.png',  'music',        'credentials'),
(4,  'Spotify Duo',     '2 Accounts · 1 Month', 'Spotify Duo Plan', 245,  3,  '',           'assets/product-4.png',  'music',        'credentials'),
(5,  'Netflix Standard','2 Screens · HD · 1 Month', 'Netflix Standard Plan', 315,  4,  'Popular',    'assets/product-5.png',  'streaming',    'credentials'),
(6,  'Netflix Premium', '4K + 4 Screens · Family', 'Netflix Premium Family', 489, 3,  'Best Value', 'assets/product-6.png',  'streaming',    'credentials'),
(7,  'Disney+ Premium', '4K · 4 Profiles · 1 Month', 'Disney+ Premium Plan', 245,  5,  'New',        'assets/product-7.png',  'streaming',    'credentials'),
(8,  'Apple TV+',       '6 Family Members · 1 Month', 'Apple TV+ Family', 210,  6,  '',           'assets/product-8.png',  'streaming',    'email_invite'),
(9,  'Canva Pro',       'Team Plan · 5 Members', 'Canva Pro Team', 279,  5,  'Productivity','assets/product-9.png',  'productivity', 'email_invite'),
(10, 'HBO Max',         'Ad-Free · 3 Profiles', 'HBO Max Standard Share', 349,  3,  '',           'assets/product-10.png', 'streaming',    'credentials');
