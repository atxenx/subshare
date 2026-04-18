-- ============================================
-- SubShare - Supabase (Postgres) Schema
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    balance DECIMAL(10,2) DEFAULT 0,
    role TEXT DEFAULT 'user',
    is_active INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscription Packages table (products)
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    subtitle TEXT,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    stock INT DEFAULT 0,
    badge TEXT,
    image_path TEXT,
    category TEXT,
    key_type TEXT DEFAULT 'credentials',
    is_active INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Account Credentials / Slots table (product_keys)
CREATE TABLE IF NOT EXISTS product_keys (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(id),
    key_data TEXT NOT NULL,
    is_sold INT DEFAULT 0,
    sold_to_user_id INT REFERENCES users(id),
    order_id INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sold_at TIMESTAMPTZ
);

-- Transactions table (wallet credits & purchases)
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    type TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    reference_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments table (for separate payment history)
CREATE TABLE IF NOT EXISTS topups (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    method TEXT DEFAULT 'manual',
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders / Subscriptions table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    product_id INT NOT NULL REFERENCES products(id),
    quantity INT DEFAULT 1,
    total_price DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'completed',
    key_data TEXT,
    is_read INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Issue Reports table
CREATE TABLE IF NOT EXISTS issue_reports (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    order_id INT REFERENCES orders(id),
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    admin_reply TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Announcements table
CREATE TABLE IF NOT EXISTS news (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    image_url TEXT,
    category TEXT DEFAULT 'general',
    is_active INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform Activities table
CREATE TABLE IF NOT EXISTS activities (
    key TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT,
    is_active INT DEFAULT 1,
    status_label TEXT,
    icon TEXT
);

-- Site Settings table
CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    type TEXT DEFAULT 'text',
    description TEXT
);

-- Note: Static data (INSERTS) should be run in Supabase SQL editor after this schema.

-- Disable RLS for all tables to ensure connectivity (Harden for initial deploy)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_keys DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE topups DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE issue_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE news DISABLE ROW LEVEL SECURITY;
ALTER TABLE activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings DISABLE ROW LEVEL SECURITY;
