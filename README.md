# Campus Lost & Found Web Application 🎓

A modern, full-stack campus recovery portal built to help students, staff, and campus security register, track, verify, and safely reunite lost and found items.

---

## 🌟 Tech Stack
- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL) + Multi-DB Layer (with MongoDB/Mongoose models preserved)
- **View Engine**: EJS (Embedded JavaScript) Templates
- **Styling**: Bootstrap 5.3 + Custom CSS Design System
- **Icons**: Bootstrap Icons
- **Client Scripting**: Vanilla JavaScript (Drag & drop preview, live duplicate check, modals, toasts)
- **Authentication & Security**: express-session, bcrypt password hashing
- **File Handling**: Multer for local uploads (Phase 3)

---

## 🏗️ MVC Project Structure
```text
lost-and-found-main/
├── config/
│   └── sampleData.js          # Realistic mock dataset for testing & preview
├── controllers/               # Controllers (Phase 2+)
├── middleware/                # Auth & validation middleware (Phase 2+)
├── models/                    # Mongoose schemas (User, Item, Claim, Notification)
├── routes/                    # Express route modules (Phase 2+)
├── public/
│   ├── css/
│   │   └── style.css          # Production campus design system (Navy/Blue theme)
│   ├── js/
│   │   └── main.js            # Client-side validation, duplicate check & modals
│   └── images/                # Static assets & icons
├── uploads/                   # Uploaded item photos (.gitkeep protected)
├── views/
│   ├── partials/              # Reusable components
│   │   ├── head.ejs           # SEO, fonts, Bootstrap & CSS includes
│   │   ├── navbar.ejs         # Responsive navbar with user dropdown & badges
│   │   ├── footer.ejs         # Campus desk info, links & toast container
│   │   ├── alerts.ejs         # Flash alerts & status banners
│   │   ├── item-card.ejs      # Item card with badges & quick actions
│   │   └── claim-modal.ejs    # Ownership claim modal with proof fields
│   └── pages/
│       ├── index.ejs          # Homepage with hero, stats, categories, recent feed
│       ├── items/
│       │   ├── index.ejs      # Item directory with search, filters & pagination
│       │   ├── show.ejs       # Item detail view with status stepper & matching alert
│       │   └── report.ejs     # Report Lost/Found form with live duplicate check
│       ├── auth/
│       │   ├── login.ejs      # Sign in with instant demo fill buttons
│       │   └── register.ejs   # Student registration form
│       ├── dashboard/
│       │   └── index.ejs      # Student dashboard for reports and claims
│       ├── admin/
│       │   └── index.ejs      # Campus security & admin moderation console
│       ├── notifications/
│       │   └── index.ejs      # Notification center for status changes
│       └── errors/
│           ├── 404.ejs        # Custom 404 Not Found page
│           └── 500.ejs        # Custom 500 Server Error page
├── .env.example               # Environment variables template
├── .gitignore                 # Node modules, env & uploads exclusions
├── package.json               # Project manifest & scripts
├── server.js                  # Express application entrypoint
└── README.md                  # Project documentation
```

---

## 🚀 Getting Started (Phase 1 Testing)

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
# Or start in watch mode:
npm run dev
```

### 3. Configure Supabase (Optional for Local Dev, Recommended for Cloud)
1. Go to [https://supabase.com](https://supabase.com) and create a free project.
2. In your Supabase Dashboard, open the **SQL Editor**, click **New Query**, and paste the contents of [`supabase/schema.sql`](file:///c:/Users/AKSHAY%20RYAKAWAR/Downloads/lost-and-found-main/supabase/schema.sql), then click **Run**.
3. In **Project Settings** -> **API**, copy your **Project URL** and **anon/service_role key**.
4. In your local `.env` file, set:
   ```env
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_KEY=your-supabase-key
   ```
*(Note: If you run without keys, the system automatically uses the local in-memory fallback so you can develop immediately!)*

### 4. Open in Browser
Visit **`http://localhost:3000`** in your browser.

---

## 🧪 Interactive Features in Phase 1
- **Homepage (`/`)**:
  - Live statistics, quick category grid, recent items feed, and campus security desk details.
- **Browse Items (`/items`)**:
  - Search by keywords, filter by type (Lost / Found), category, campus location, and status.
  - Responsive pagination and clean empty states.
- **Item Details (`/items/:id`)**:
  - Full item preview, metadata table, status lifecycle stepper (`Reported` → `Under Review` → `Claimed` → `Returned`), and potential duplicate match notice.
- **Ownership Claim Modal**:
  - Click **"Claim"** or **"This Is Mine"** on any found item to submit proof of ownership and a message.
- **Report Item Form (`/items/report`)**:
  - Toggle between **"I Lost an Item"** and **"I Found an Item"**.
  - Drag-and-drop or select an image to preview instantly with remove button.
  - **Live Duplicate Check**: Type "AirPods" or "Calculator" into the title field to see the real-time duplicate warning alert.
- **User Dashboard (`/dashboard`)**:
  - View "My Reported Items" and "My Claims" with status indicators.
- **Admin Console (`/admin`)**:
  - Moderation queue for pending claims (with one-click Approve/Reject).
  - Master inventory status editor (Open, Under Review, Claimed, Returned).
  - Registered user directory.
- **Quick Demo Switcher (`/auth/login`)**:
  - Click **"Student Demo"** or **"Admin Demo"** to autofill credentials and test student vs admin permissions.
- **Notifications (`/notifications`)**:
  - Unread badge counter in navbar and notification center.
- **Custom Error Pages (`/errors`)**:
  - Accessible on invalid URLs (`/non-existent-route`).
