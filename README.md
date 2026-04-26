# ⚡ Jeecom Information Technology — IT Company Sales & Services Platform

A complete full-stack web application for managing IT product sales and services, built with Node.js, Express, MongoDB, and vanilla HTML/CSS/JS.

---

## 🗂️ Project Structure

```
it-company/
├── backend/
│   ├── config/
│   │   ├── db.js              # MongoDB connection
│   │   └── seed.js            # Sample data seeder
│   ├── controllers/
│   │   ├── authController.js  # Admin login/logout
│   │   ├── productController.js
│   │   ├── orderController.js
│   │   └── serviceController.js
│   ├── middleware/
│   │   └── auth.js            # JWT authentication
│   ├── models/
│   │   ├── Admin.js
│   │   ├── Product.js
│   │   ├── Order.js
│   │   └── ServiceRequest.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── productRoutes.js
│   │   ├── orderRoutes.js
│   │   └── serviceRoutes.js
│   ├── .env
│   ├── package.json
│   └── server.js
│
└── frontend/
    ├── css/
    │   └── style.css
    ├── js/
    │   └── app.js
    └── index.html
```

---

## ⚙️ Prerequisites

Make sure these are installed before starting:

- **Node.js** v18+ — https://nodejs.org
- **MongoDB** v6+ (local or Atlas) — https://www.mongodb.com/try/download/community
- **npm** (comes with Node.js)
- A code editor (VS Code recommended)

---

## 🚀 Step-by-Step Setup

### Step 1 — Clone / Extract the project

Place the `it-company` folder anywhere on your computer, e.g.:
```
C:\Projects\it-company\     (Windows)
~/Projects/it-company/      (Mac/Linux)
```

---

### Step 2 — Start MongoDB

**Option A: Local MongoDB**
```bash
# Mac (with Homebrew)
brew services start mongodb-community

# Windows — MongoDB should be running as a service, or run:
"C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe"

# Linux (Ubuntu)
sudo systemctl start mongod
```

**Option B: MongoDB Atlas (Cloud - Free tier)**
1. Go to https://cloud.mongodb.com and create a free account
2. Create a free M0 cluster
3. Get your connection string (looks like `mongodb+srv://user:pass@cluster.mongodb.net/`)
4. Update `backend/.env` → replace `MONGODB_URI` with your Atlas URI

---

### Step 3 — Install backend dependencies

```bash
# Navigate to backend folder
cd it-company/backend

# Install all packages
npm install
```

This installs: express, mongoose, bcryptjs, jsonwebtoken, cors, dotenv, nodemon.

---

### Step 4 — Configure environment variables

Open `backend/.env` and review/update these values:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/it_company_db
JWT_SECRET=itcompany_super_secret_key_2024
JWT_EXPIRES_IN=7d
ADMIN_EMAIL=admin@techsphere.com
ADMIN_PASSWORD=admin123
```

> ⚠️ For production, change `JWT_SECRET` to a long random string.

---

### Step 5 — Seed the database

This creates sample products and the admin user:

```bash
# Make sure you're in the backend folder
cd it-company/backend

npm run seed
```

Expected output:
```
✅ MongoDB Connected: localhost
🗑️  Cleared existing data
✅ Inserted 10 products
✅ Admin user created
   Email: admin@techsphere.com
   Password: admin123

🚀 Database seeded successfully!
```

---

### Step 6 — Start the server

```bash
# Development mode (auto-restarts on changes)
npm run dev

# OR: Production mode
npm start
```

Expected output:
```
✅ MongoDB Connected: localhost
🚀 TechSphere Server running on http://localhost:5000
📦 API Endpoints: http://localhost:5000/api
🌐 Frontend: http://localhost:5000
```

---

### Step 7 — Open the application

Open your browser and go to:
```
http://localhost:5000
```

That's it! The full application is running. 🎉

---

## 🔐 Admin Panel Access

1. Click **"Admin Panel"** in the top navigation
2. Login with:
   - **Email:** `admin@jeecominformationtechnology.com`
   - **Password:** `jeecom@admin123`

### Admin capabilities:
- 📊 **Overview** — Stats: total products, revenue, service requests
- 📦 **Products** — Add, edit, delete products; update stock quantity
- 🧾 **Orders** — View all orders, update order status, view details
- 🔧 **Services** — Manage service tickets, update status, add cost estimates
- ➕ **Add Product** — Form to add new products with specs

---

## 👥 Customer Features

### Browsing & Buying:
1. Go to **Products** page
2. Filter by category (Laptops, Motherboards, etc.)
3. Search by name or description
4. Click **"Details"** to see full specs
5. Click **"Add to Cart"** → opens cart sidebar
6. Adjust quantity, then **"Proceed to Checkout"**
7. Fill in customer details → **"Place Order"**
8. Stock automatically decreases after purchase

### Service Requests:
1. Go to **Services** page
2. Browse service types
3. Fill the **"Submit a Service Request"** form
4. Receive a **ticket number** (e.g., `SVC-1712345678-0001`)

### Tracking:
1. Go to **Track Order** page
2. Enter your ticket number
3. View real-time status and tech notes

---

## 📡 API Endpoints Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Admin login |
| GET | `/api/auth/me` | Get current admin (protected) |
| POST | `/api/auth/logout` | Admin logout (protected) |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | Get all products (supports `?search=&category=&sort=&page=&limit=`) |
| GET | `/api/products/:id` | Get single product |
| POST | `/api/products` | Create product (admin) |
| PUT | `/api/products/:id` | Update product (admin) |
| DELETE | `/api/products/:id` | Soft delete product (admin) |
| PATCH | `/api/products/:id/stock` | Update stock quantity (admin) |
| GET | `/api/products/stats/overview` | Product statistics (admin) |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orders` | Place a new order (public) |
| GET | `/api/orders` | Get all orders (admin) |
| GET | `/api/orders/:id` | Get order by ID (admin) |
| PATCH | `/api/orders/:id/status` | Update order status (admin) |
| GET | `/api/orders/stats/overview` | Order statistics (admin) |

### Services
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/services` | Submit service request (public) |
| GET | `/api/services/track/:ticketNumber` | Track ticket (public) |
| GET | `/api/services` | Get all requests (admin) |
| GET | `/api/services/:id` | Get request by ID (admin) |
| PATCH | `/api/services/:id` | Update request (admin) |
| GET | `/api/services/stats/overview` | Service statistics (admin) |

---

## 🧪 Sample API Test with curl

```bash
# Test the API is running
curl http://localhost:5000/api/health

# Get all products
curl http://localhost:5000/api/products

# Admin login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@jeecominformationtechnology.com","password":"jeecom@admin123"}'

# Place an order (replace PRODUCT_ID with real ID from products list)
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {"name":"John Doe","email":"john@example.com","phone":"9876543210"},
    "items": [{"product":"PRODUCT_ID","quantity":1}],
    "paymentMethod":"UPI"
  }'

# Submit service request
curl -X POST http://localhost:5000/api/services \
  -H "Content-Type: application/json" \
  -d '{
    "customer":{"name":"Jane Smith","email":"jane@example.com","phone":"9876543211"},
    "serviceType":"Repair",
    "deviceInfo":{"type":"Laptop","brand":"Dell"},
    "issueDescription":"Screen is cracked and not displaying"
  }'
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Node.js, Express.js |
| Database | MongoDB with Mongoose ODM |
| Auth | JWT (JSON Web Tokens) + bcryptjs |
| Fonts | Google Fonts (Syne + DM Sans) |

---

## 🐛 Troubleshooting

**"Cannot connect to MongoDB"**
→ Make sure MongoDB is running. Check with: `mongod --version`

**"Port 5000 already in use"**
→ Change `PORT=5000` to `PORT=5001` in `.env`

**"CORS error in browser"**
→ Make sure you're accessing via `http://localhost:5000` (not opening index.html directly as a file)

**Admin login fails**
→ Re-run `npm run seed` to recreate the admin user

**Products not loading**
→ Check the browser console for errors. Ensure the backend server is running at port 5000.

---

## 📝 Notes

- The app uses **soft delete** for products (sets `isActive: false`) to preserve order history
- Stock is automatically decremented on successful order placement
- Cart data is persisted in `localStorage`
- Admin JWT token expires in 7 days by default
