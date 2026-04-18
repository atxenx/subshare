# SubShare

SubShare is a modern subscription management and item shop platform. It allows users to browse subscriptions, top up their wallet, and purchase digital items/accounts.

## 🚀 Features
- **User Dashboard**: Browse and buy subscriptions.
- **Wallet System**: Top up balance and track transaction history.
- **Inbox**: Receive digital keys and credentials instantly after purchase.
- **Admin Panel**: Manage products, users, transactions, and site settings.
- **Issue Reports**: Users can submit tickets for support.

## 🛠️ Technology Stack
- **Backend**: Node.js & Express
- **Database**: Supabase (PostgreSQL)
- **Frontend**: Vanilla HTML/CSS & Javascript

## ⚙️ Setup Instructions

### 1. Prerequisites
- [Node.js](https://nodejs.org/) installed on your machine.
- A [Supabase](https://supabase.com/) account.

### 2. Installation
1. Clone this repository:
   ```bash
   git clone <your-repo-url>
   cd subshareproject
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### 3. Database Configuration
1. Create a new project in Supabase.
2. Open the **SQL Editor** in Supabase and execute the script found in `database/supabase_schema.sql`.
3. Create a `.env` file in the root directory and add your credentials:
   ```env
   SUPABASE_URL=your_project_url
   SUPABASE_KEY=your_anon_key
   JWT_SECRET=your_random_secret_string
   ```

### 4. Run the Application
Start the development server:
```bash
node server.js
```
The app will be available at `http://localhost:3000`.

## 📄 License
MIT License.
