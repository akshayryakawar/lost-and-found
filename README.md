# Campus Lost & Found 🎓

A modern, full-stack campus recovery portal built to help students, staff, and campus security register, track, verify, and safely reunite lost and found items.

---

## 🌟 Tech Stack
- **Runtime & Framework**: Node.js + Express
- **Database & Storage**: Supabase (PostgreSQL with Row Level Security & Supabase Storage for item images), with an in-memory development fallback
- **View Engine**: EJS (Embedded JavaScript) Templates
- **Design System**: Custom dark-mode theme with glassmorphic cards, responsive typography, and Bootstrap 5.3 utilities
- **Authentication & Security**: `express-session`, `bcryptjs` password hashing, `csurf` CSRF protection, and `express-rate-limit`
- **File Handling**: Multer (in-memory buffer) + Supabase Storage bucket (`item-images`)
- **Email Notifications**: Nodemailer (optional SMTP integration for claim status and password reset emails)

---

## 🏗️ Project Architecture
```text
campus-lost-and-found/
├── .github/
│   └── workflows/
│       └── ci.yml             # GitHub Actions CI workflow (npm ci & npm test)
├── config/
│   ├── sampleData.js          # Realistic mock dataset for development & testing
│   └── supabase.js            # Supabase client initialization & health check
├── controllers/               # MVC Controllers
│   ├── adminController.js     # Moderation, verification queue & user management
│   ├── authController.js      # Login, registration & token password reset
│   ├── claimController.js     # Ownership claim submission & verification
│   ├── itemController.js      # Item search, reporting, editing, deletion & API
│   └── notificationController.js # User notifications & mark-as-read actions
├── middleware/                # Custom Express Middleware
│   ├── auth.js                # ensureAuthenticated & ensureAdmin guards
│   └── validation.js          # Form inputs, email regex & password length validation
├── routes/                    # Modular Application Routers
│   ├── admin.js               # Admin moderation console routes
│   ├── auth.js                # Auth, registration & password reset routes
│   ├── claims.js              # Ownership claim routes
│   ├── dashboard.js           # Student personal dashboard routes
│   ├── items.js               # Item directory, reporting, edit & delete routes
│   └── notifications.js       # Notification center routes
├── services/                  # Business Logic & Data Layer
│   ├── dbService.js           # Supabase PostgreSQL data layer & memory fallback
│   ├── emailService.js        # Optional SMTP email delivery (claims & password reset)
│   ├── storageService.js      # Supabase Storage image upload & MIME validation
│   └── supabaseSessionStore.js# PostgreSQL-backed persistent session store
├── public/                    # Static Assets
│   ├── css/
│   │   └── style.css          # Design system (Dark palette, glassmorphism, buttons)
│   ├── js/
│   │   └── main.js            # Live duplicate search, image preview & toasts
│   └── vendor/                # Vendored Bootstrap & font assets
├── supabase/
│   └── schema.sql             # PostgreSQL schema, RLS policies & tables
├── tests/                     # Automated Test Suites
│   ├── auth_integration.test.js # Session & route protection tests
│   ├── dbservice.test.js      # Supabase PostgreSQL database service tests
│   ├── phase2.test.js         # Security, hashing, storage rules & validation tests
│   └── phase4_features.test.js# Item lifecycle, claim rules, admin & upload tests
├── views/                     # EJS Templates
│   ├── pages/                 # Full-page templates (items, auth, admin, dashboard)
│   └── partials/              # Modular UI components (navbar, footer, head, cards)
├── .env.example               # Environment variables configuration template
├── LICENSE                    # ISC License
├── package.json               # Dependencies & test scripts
├── server.js                  # Application server entry point
└── vercel.json                # Vercel deployment configuration
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** (v9 or higher)

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Copy the template configuration file:
```bash
cp .env.example .env
```

Configure the environment variables in `.env`:
```env
# Server Port & Mode
PORT=3000
NODE_ENV=development

# Session Encryption Secret (Required)
SESSION_SECRET=replace-with-a-long-random-secret-at-least-32-chars

# Supabase PostgreSQL & Storage (Optional for offline dev, required for production)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Collection Location
COLLECTION_LOCATION=Student Center Security Desk, Room 102

# Optional SMTP Settings (Leave empty to disable email sending)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@university.edu
```

*(Note: When Supabase credentials are not provided, the application runs seamlessly in local in-memory fallback mode!)*

### 4. Supabase Setup (When connecting to Supabase)
1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor**, paste the contents of [`supabase/schema.sql`](./supabase/schema.sql), and run it.
3. In **Project Settings → API**, copy your **Project URL** and **service_role key** into `.env`.

### 5. Running the Application
```bash
# Start server:
npm start

# Or start in watch mode:
npm run dev
```
Visit **`http://localhost:3000`** in your browser.

---

## 🧪 Testing Suite
Run the automated test suites:
```bash
npm test
```
The test suite covers:
- **Phase 2 Tests**: Bcrypt password hashing, Supabase storage rules, authentication guards, input validation.
- **Database Tests**: Profile creation, credentials storage, item queries, pagination, notifications.
- **Authentication & Integration**: Route protection, session cookies, and CSRF token enforcement.
- **Phase 4 Feature Tests**: Item edit/delete permissions, claim cascade rejections, duplicate claim prevention, admin user role management, and image upload validation.

---

## 🔒 Security Features
- **CSRF Protection**: All POST endpoints enforce session-backed CSRF tokens with automatic error handling.
- **Rate Limiting**: Brute-force protection on `/auth/login` and `/auth/register` using `express-rate-limit`.
- **Row-Level Security (RLS)**: Sensitive tables (`auth_credentials`, `user_sessions`, `password_reset_tokens`) are restricted to `service_role`.
- **Validation**: Strict email regex supporting modern TLDs, minimum 8-character passwords, and input sanitization.
- **Secure Image Uploads**: MIME-type verification and 5MB size limits before uploading to Supabase Storage.

---

## 📄 License
This project is licensed under the [ISC License](LICENSE).
