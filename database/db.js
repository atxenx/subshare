// ============================================
// SubShare - Supabase Database Layer
// ============================================

const supabase = require('./supabase');

// User operations
const userOps = {
    findByEmail: async (email) => {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();
        if (error && error.code !== 'PGRST116') console.error('DB Error findByEmail:', error);
        return data || null;
    },

    findById: async (id) => {
        const { data, error } = await supabase
            .from('users')
            .select('id, name, email, balance, role, created_at')
            .eq('id', id)
            .single();
        if (error) console.error('DB Error findById:', error);
        return data || null;
    },

    create: async (name, email, passwordHash) => {
        // First user logic: check if users exist
        const { count, error: countError } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });
            
        const role = count === 0 ? 'admin' : 'user';

        const { data, error } = await supabase
            .from('users')
            .insert([{ name, email, password_hash: passwordHash, role }])
            .select()
            .single();
            
        if (error) throw error;
        return { ...data, balance: 0 };
    },

    updateBalance: async (userId, newBalance) => {
        const { error } = await supabase
            .from('users')
            .update({ balance: newBalance })
            .eq('id', userId);
        if (error) throw error;
        return true;
    },

    deductBalance: async (userId, amount) => {
        // Note: For atomic deduction in Supabase, we should use an RPC (Remote Procedure Call)
        // or a raw SQL logic. For now, we'll do a simple update with a check (less safe than SQLite transaction but works for MVP).
        // PRO TIP: In production, create a Postgres function 'deduct_balance(user_id, amount)' and call it via .rpc()
        
        const { data: user } = await supabase.from('users').select('balance').eq('id', userId).single();
        if (!user || user.balance < amount) return false;
        
        const { error } = await supabase
            .from('users')
            .update({ balance: user.balance - amount })
            .eq('id', userId);
            
        return !error;
    },

    getAll: async () => {
        const { data, error } = await supabase
            .from('users')
            .select('id, name, email, balance, role, created_at')
            .order('id', { ascending: false });
        return data || [];
    },

    update: async (id, data) => {
        const payload = { 
            name: data.name, 
            email: data.email, 
            role: data.role, 
            balance: data.balance 
        };
        if (data.password_hash) payload.password_hash = data.password_hash;

        const { error } = await supabase
            .from('users')
            .update(payload)
            .eq('id', id);
        if (error) throw error;
        return true;
    },

    delete: async (id) => {
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) throw error;
        return true;
    },

    count: async () => {
        const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
        return count || 0;
    }
};

// Product operations
const productOps = {
    getAll: async () => {
        const { data } = await supabase
            .from('products')
            .select('*')
            .eq('is_active', 1)
            .order('id');
        return data || [];
    },

    getAllIncludingInactive: async () => {
        const { data } = await supabase.from('products').select('*').order('id');
        return data || [];
    },

    getById: async (id) => {
        const { data } = await supabase.from('products').select('*').eq('id', id).single();
        return data || null;
    },

    create: async (product) => {
        const { data, error } = await supabase
            .from('products')
            .insert([{
                title: product.title,
                subtitle: product.subtitle,
                name: product.name,
                description: product.description,
                price: product.price,
                stock: product.stock,
                badge: product.badge,
                image_path: product.image_path,
                category: product.category,
                key_type: product.key_type || 'credentials'
            }])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    update: async (id, product) => {
        const { error } = await supabase
            .from('products')
            .update({
                title: product.title,
                subtitle: product.subtitle,
                name: product.name,
                description: product.description,
                price: product.price,
                stock: product.stock,
                badge: product.badge,
                image_path: product.image_path,
                category: product.category,
                key_type: product.key_type || 'credentials',
                updated_at: new Date().toISOString()
            })
            .eq('id', id);
        if (error) throw error;
        return true;
    },

    delete: async (id) => {
        const { error } = await supabase.from('products').update({ is_active: 0 }).eq('id', id);
        if (error) throw error;
        return true;
    },

    updateStock: async (id, newStock) => {
        const { error } = await supabase.from('products').update({ stock: newStock }).eq('id', id);
        if (error) throw error;
        return true;
    },

    updateImage: async (id, imagePath) => {
        const { error } = await supabase.from('products').update({ image_path: imagePath }).eq('id', id);
        if (error) throw error;
        return true;
    },

    count: async () => {
        const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', 1);
        return count || 0;
    }
};

// Product Keys operations
const productKeyOps = {
    getByProduct: async (productId) => {
        const { data } = await supabase
            .from('product_keys')
            .select('*')
            .eq('product_id', productId)
            .order('created_at', { ascending: false });
        return data || [];
    },

    getAvailableByProduct: async (productId) => {
        const { data } = await supabase
            .from('product_keys')
            .select('*')
            .eq('product_id', productId)
            .eq('is_sold', 0)
            .order('created_at', { ascending: true });
        return data || [];
    },

    getOne: async (id) => {
        const { data } = await supabase.from('product_keys').select('*').eq('id', id).single();
        return data || null;
    },

    add: async (productId, keyData) => {
        const { data, error } = await supabase
            .from('product_keys')
            .insert([{ product_id: productId, key_data: keyData }])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    addBulk: async (productId, keys) => {
        const rows = keys.map(k => ({ product_id: productId, key_data: k }));
        const { error } = await supabase.from('product_keys').insert(rows);
        if (error) throw error;
        return { count: keys.length };
    },

    markAsSold: async (keyId, userId, orderId) => {
        const { error } = await supabase
            .from('product_keys')
            .update({ 
                is_sold: 1, 
                sold_to_user_id: userId, 
                order_id: orderId, 
                sold_at: new Date().toISOString() 
            })
            .eq('id', keyId);
        if (error) throw error;
        return true;
    },

    delete: async (id) => {
        const { error } = await supabase.from('product_keys').delete().eq('id', id).eq('is_sold', 0);
        if (error) throw error;
        return true;
    },

    countAvailable: async (productId) => {
        const { count } = await supabase
            .from('product_keys')
            .select('*', { count: 'exact', head: true })
            .eq('product_id', productId)
            .eq('is_sold', 0);
        return count || 0;
    },

    countTotal: async (productId) => {
        const { count } = await supabase
            .from('product_keys')
            .select('*', { count: 'exact', head: true })
            .eq('product_id', productId);
        return count || 0;
    }
};

// Transaction operations
const transactionOps = {
    create: async (userId, type, amount, description, referenceId = null) => {
        const { data, error } = await supabase
            .from('transactions')
            .insert([{ user_id: userId, type, amount, description, reference_id: referenceId }])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    getByUser: async (userId, limit = 50) => {
        const { data } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);
        return data || [];
    },

    getAll: async (limit = 100) => {
        const { data } = await supabase
            .from('transactions')
            .select(`
                *,
                users:user_id (name, email)
            `)
            .order('created_at', { ascending: false })
            .limit(limit);
        return data || [];
    },

    getTotalTopup: async () => {
        const { data } = await supabase.from('transactions').select('amount').eq('type', 'topup');
        return data?.reduce((sum, item) => sum + parseFloat(item.amount), 0) || 0;
    },

    getTotalPurchase: async () => {
        const { data } = await supabase.from('transactions').select('amount').eq('type', 'purchase');
        return data?.reduce((sum, item) => sum + Math.abs(parseFloat(item.amount)), 0) || 0;
    }
};

// Order operations
const orderOps = {
    create: async (userId, productId, quantity, totalPrice, keyData) => {
        const { data, error } = await supabase
            .from('orders')
            .insert([{ user_id: userId, product_id: productId, quantity, total_price: totalPrice, key_data: keyData }])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    getByUser: async (userId, limit = 50) => {
        const { data } = await supabase
            .from('orders')
            .select(`
                *,
                products:product_id (title, image_path)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);
        return data || [];
    },

    getAll: async (limit = 100) => {
        const { data } = await supabase
            .from('orders')
            .select(`
                *,
                products:product_id (title),
                users:user_id (name, email)
            `)
            .order('created_at', { ascending: false })
            .limit(limit);
        return data || [];
    },

    count: async () => {
        const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true });
        return count || 0;
    },

    getTodayCount: async () => {
        const today = new Date().toISOString().split('T')[0];
        const { count } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', `${today}T00:00:00Z`);
        return count || 0;
    },

    getById: async (id) => {
        const { data } = await supabase.from('orders').select('*').eq('id', id).single();
        return data || null;
    },

    update: async (id, payload) => {
        const { error } = await supabase.from('orders').update(payload).eq('id', id);
        if (error) throw error;
        return true;
    },

    getUnreadCount: async (userId) => {
        const { count } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('status', 'completed')
            .eq('is_read', 0);
        return count || 0;
    },

    markAsRead: async (id, userId) => {
        const { error } = await supabase
            .from('orders')
            .update({ is_read: 1 })
            .eq('id', id)
            .eq('user_id', userId);
        if (error) throw error;
        return true;
    }
};

// Topup operations
const topupOps = {
    create: async (userId, amount, method = 'manual', status = 'completed') => {
        const { data, error } = await supabase
            .from('topups')
            .insert([{ user_id: userId, amount, method, status }])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    getAll: async (limit = 100) => {
        const { data } = await supabase
            .from('topups')
            .select(`
                *,
                users:user_id (name, email)
            `)
            .order('created_at', { ascending: false })
            .limit(limit);
        return data || [];
    }
};

// Issue Report operations
const issueOps = {
    getAll: async () => {
        const { data } = await supabase
            .from('issue_reports')
            .select(`
                *,
                users:user_id (name, email),
                orders:order_id (
                    product_id,
                    products:product_id (title)
                )
            `)
            .order('status', { ascending: true }) // Note: Simplified ordering, proper case-by-case ordering should be done in SQL/RPC if needed
            .order('created_at', { ascending: false });
        return data || [];
    },

    getById: async (id) => {
        const { data } = await supabase.from('issue_reports').select('*').eq('id', id).single();
        return data || null;
    },

    update: async (id, payload) => {
        const { error } = await supabase
            .from('issue_reports')
            .update({ ...payload, updated_at: new Date().toISOString() })
            .eq('id', id);
        if (error) throw error;
        return true;
    },

    create: async (userId, orderId, subject, message) => {
        const { data, error } = await supabase
            .from('issue_reports')
            .insert([{ user_id: userId, order_id: orderId, subject, message }])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    getByUser: async (userId) => {
        const { data } = await supabase
            .from('issue_reports')
            .select(`
                *,
                products:order_id (
                    products (title)
                )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        return data || [];
    }
};

// News operations
const newsOps = {
    getAll: async (activeOnly = false) => {
        let query = supabase.from('news').select('*').order('created_at', { ascending: false });
        if (activeOnly) query = query.eq('is_active', 1);
        const { data } = await query;
        return data || [];
    },

    create: async (news) => {
        const { data, error } = await supabase.from('news').insert([news]).select().single();
        if (error) throw error;
        return data;
    },

    update: async (id, news) => {
        const { error } = await supabase.from('news').update(news).eq('id', id);
        if (error) throw error;
        return true;
    },

    delete: async (id) => {
        const { error } = await supabase.from('news').delete().eq('id', id);
        if (error) throw error;
        return true;
    }
};

// Activity operations
const activityOps = {
    getAll: async () => {
        const { data } = await supabase.from('activities').select('*');
        return data || [];
    },

    update: async (key, activity) => {
        const { error } = await supabase.from('activities').update(activity).eq('key', key);
        if (error) throw error;
        return true;
    },

    create: async (activity) => {
        const { data, error } = await supabase.from('activities').insert([activity]).select().single();
        if (error) throw error;
        return data;
    },

    delete: async (key) => {
        const { error } = await supabase.from('activities').delete().eq('key', key);
        if (error) throw error;
        return true;
    }
};

// Site Settings operations
const settingsOps = {
    getAll: async () => {
        const { data } = await supabase.from('site_settings').select('*');
        return data || [];
    },

    updateBulk: async (updates) => {
        // Updates is an array of { key, value }
        // Postgres UPSERT: INSERT ... ON CONFLICT (key) DO UPDATE SET value = ...
        const { error } = await supabase.from('site_settings').upsert(updates);
        if (error) throw error;
        return true;
    }
};

module.exports = {
    userOps,
    productOps,
    productKeyOps,
    transactionOps,
    orderOps,
    topupOps,
    issueOps,
    newsOps,
    activityOps,
    settingsOps
};
