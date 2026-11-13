# Pro Shop (DigiSub) — Digital Subscriptions & Automated API Commerce Platform

A full-stack, bilingual (**Persian RTL / English LTR**, user-selectable) e-commerce platform for selling digital subscriptions and accounts (**Telegram Premium, Telegram Stars & Channel Boosts, ChatGPT Plus, Claude Pro, Spotify Premium**) featuring **SMS OTP Authentication**, an **Iranian SMS Gateway Hub**, an **Automated Upstream Mother-Server API Fulfillment Engine**, a **Loyalty & Customer Club**, and a **360° CRM Admin Dashboard**.

---

## ✨ Key Features

### 🛍️ Bilingual Storefront (`FA` RTL / `EN` LTR)
- Switch seamlessly between **Persian (RTL)** and **English (LTR)** from the navigation bar, persisted via cookie & user profile.
- Adaptive **Light / Dark / System** theme using native CSS `color-scheme` and `light-dark()` tokens without flash of un-themed content.
- Live **USD-to-Toman FX rate auto-pricing** configurable in Admin Settings.
- Dynamic product configurator supporting custom service inputs (Telegram `@username`, channel boost links, personal emails).

### 📱 SMS OTP Authentication & Iranian SMS Gateway Hub
- Frictionless mobile sign-in (`09xxxxxxxxx`) with 6-digit OTP, rate-limiting, and progressive **WebOTP (`OTPCredential`)** + `autocomplete="one-time-code"` support.
- Modular **Adapter Pattern** supporting:
  - **MelliPayamak (ملی‌پیامک)**
  - **SMS.ir (v1 Verify & Bulk)**
  - **Kavenegar (کاوه‌نگار)**
  - **FarazSMS / IPPanel**
  - **Local Dev Sandbox** (logs & displays OTP safely for zero-cost testing)

### ⚡ Automated Fulfillment & Upstream Mother Server API Engine
- **Multiple Fulfillment Modes per Product/Plan:**
  1. **Digital Vault (`VAULT`)**: Atomically claims encrypted/stored credentials from inventory immediately upon payment.
  2. **Callinoo / Ozvinoo Virtual Numbers (`OZVINOO_CALLINOO`)**: Real-time virtual phone number purchase across 150+ countries for Telegram/WhatsApp, with live SMS OTP polling in user panel and 1-click cancellation with wallet refund.
  3. **Altivox AI Partner API (`ALTIVOX_AI`)**: Direct integration with Altivox AI internal source for automated provisioning of Google Gemini Pro 18M and AI licenses.
  4. **Mother Server SMM Panels (`SMM_PANEL`)**: Dispatches orders directly to external SMM and Fragment APIs with full request/response logging and one-click retry.
  5. **Concierge Manual (`MANUAL`)**: Queues personal-account upgrades for admin delivery with instant SMS + in-app notification.

### 🏆 Loyalty Club & 360° CRM
- **Customer Club**: Tier progression (**Bronze → Silver → Gold → Diamond VIP**) unlocking automatic checkout discounts and wallet cashback, referral rewards, and point-to-wallet redemption.
- **360° CRM**: Customer LTV tracking, custom tagging, internal agent notes, wallet adjustments, **7-day Subscription Expiry Watchlist** with one-click renewal SMS reminders, and segmented SMS/In-App campaigns.

---

## 🛠️ Tech Stack
- **Framework:** Next.js 16 (App Router) + TypeScript
- **Styling:** Tailwind CSS v4 + Lucide Icons
- **Database & ORM:** Prisma ORM + SQLite *(ready for PostgreSQL in production)*
- **Auth & Security:** `jose` HttpOnly JWT sessions + OTP rate limiting

---

## 🚀 Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env

# 3. Push database schema & seed realistic demo data
npx prisma db push
npm run seed

# 4. Run development server
npm run dev
```

Open `http://localhost:3000` in your browser.

### Demo Showcase Accounts
On `/auth`, you can test the real **SMS OTP** flow (Sandbox mode displays the generated 6-digit code) or use the 1-click showcase buttons:
- **Admin Dashboard (`/admin`):** `09120000001`
- **VIP Customer Panel (`/panel`):** `09121112233`

---

## 📁 Project Structure
```text
src/
├── app/
│   ├── api/           # Auth OTP, Checkout, User Panel & Admin REST endpoints
│   ├── admin/         # Full Admin Console (Analytics, Orders, Vault, Upstream API, CRM, SMS)
│   ├── auth/          # SMS OTP Login + WebOTP + Demo Access
│   ├── cart/          # Cart, Coupons, Tier Discounts & Automated Checkout
│   ├── panel/         # User Dashboard (Orders/Credentials, Wallet, Loyalty Club, Tickets)
│   ├── product/[slug]/# Dynamic Product & Plan Configurator
│   └── store/         # Searchable & Filterable Catalog
├── components/        # Bilingual Provider, Header, Footer, Product Cards & Admin Tabs
└── lib/               # Prisma client, JWT Auth, i18n, SMS Hub, Upstream API Engine
```
