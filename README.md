# 🩸 BloodFlow — Next-Generation Blood Donation & Emergency Coordination Platform

> **Modern, high-trust healthcare SaaS platform designed for real-time blood inventory tracking, automated multi-hospital emergency dispatch, and digital donor coordination.**

---

## 📌 Executive Summary

BloodFlow bridges the critical gap between blood donors, hospitals, and emergency medical response teams. Traditional blood coordination relies on slow manual phone trees and fragmented spreadsheets. BloodFlow transforms this into a unified, clinical-grade platform with:
- **Real-Time Visual Blood Inventory** across all 8 blood groups with immediate low-stock indicators.
- **Automated Emergency Dispatch** that broadcasts urgent requests across partner hospitals with loud push alerts and one-tap calling.
- **100% Free Telegram Emergency Alerts** turning personal phones into emergency pagers at zero carrier cost.
- **Donor Engagement Portal** with digital appointment scheduling and downloadable official Certificates of Honor.
- **Platform Admin Triage** for verifying medical facilities and donor credentials.
- **Full Bilingual Localization** in English and Hindi (`हिंदी`).

---

## 🌟 Key Features

### 1. 🏥 Hospital Blood Bank Hub (Centerpiece Inventory)
- **8 Dedicated Blood Group Cards** (`A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`) displaying real-time unit counts.
- **Visual Capacity Progress Meters** (0–100%) indicating current stock health at a glance.
- **Accessibility Status Badges**: Explicit icon + text labels for `AVAILABLE` (green check), `LOW STOCK` (amber alert), and `CRITICAL` (crimson warning).
- **Instant Stepper Controls**: Rapid `+` and `-` adjustments with optimistic UI updates.
- **Incoming Donor Queue**: Live feed of scheduled appointments with donor blood group, phone click-to-call, and "Mark Donated" contribution verification.

### 2. 🚨 Multi-Hospital Emergency Broadcast & Free Telephony
- **One-Click Multi-Hospital Broadcast**: Select required blood group, units, urgency level (`Critical`, `Urgent`, `Moderate`), and broadcast to multiple hospitals simultaneously.
- **100% Free Telegram Emergency System**: Rings hospital staff's phones with sound alerts detailing blood type and units, plus an interactive `[📞 Click to Call Hospital]` button.
- **Universal Cloud Telephony Edge Function**: Built-in backend supporting **Telegram (Free)**, **Plivo**, **Exotel (+91 India)**, **Twilio**, and **Simulation Demo Mode**.
- **Live Dispatch Tracker**: Real-time status badges (`calling`, `ringing`, `answered`, `completed`) showing response states across all recipient hospitals.

### 3. 🩸 Donor Experience Portal
- **KPI Metrics Dashboard**: Registered blood type, total verified donations, scheduled visits, and earned certificates.
- **Appointment Scheduling**: Interactive booking modal with hospital selection, calendar date picker, and preferred time slots.
- **Downloadable Certificates of Honor**: Instant official HTML certificate generation with security ribbon and verification numbers.
- **Donor Verification Status**: Green verified donor badge or pending review status banner.

### 4. 🛡️ Platform Admin Dashboard
- **Pending Verifications Triage**: Review unverified donors and toggle verification status.
- **Hospital Approvals**: Approve or revoke hospital management accounts using the secure `approve_hospital_v4` RPC.
- **Platform Audit Logs**: Searchable directories for donors, hospitals, appointments, certificates, and emergency requests.

### 5. 🌐 Clinical Healthcare Design System & Localization
- **Healthcare Typography**: Google Font **Inter** (weights 300 to 800) with strict typographic hierarchy.
- **Purposeful Color System**: Clinical royal blue (`#0284c7`) primary, medical teal accents, and calm slate canvas. Medical red is strictly reserved for blood groups, emergencies, and low-stock alerts.
- **Bilingual Support**: Instant switching between **English** and **Hindi (`हिंदी`)** across all navigation, forms, and status badges.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 18, TypeScript, Vite |
| **Styling & UI** | Tailwind CSS, Lucide React Icons, Custom Healthcare Design Tokens |
| **Backend & Database** | Supabase (PostgreSQL, Row Level Security, Realtime Listeners, Auth) |
| **Edge Functions & API** | Deno, Supabase Edge Functions |
| **Emergency Alerts** | Telegram Bot API, Plivo, Exotel, Twilio |
| **Internationalization** | Custom Bilingual i18n Context (`en` / `hi`) |

---

## 🚀 Quickstart Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher)
- npm or yarn

### 1. Clone & Install Dependencies
```bash
# Navigate to project directory
cd bloodflow-project-updated

# Install packages
npm install
```

### 2. Environment Configuration
Check the `.env` file in the project root:

```env
# Supabase Backend Connection
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# 100% Free Telegram Emergency Alerts (Pre-configured)
VITE_TELEGRAM_BOT_TOKEN=8919565784:AAFpjmkDADuWYDINdCuWbFG8SDFvPytJmpw
VITE_TELEGRAM_CHAT_ID=5310795640
```

### 3. Run Development Server
```bash
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

### 4. Production Build & Verification
```bash
# Run TypeScript verification
npm run typecheck

# Build optimized production bundle
npm run build
```

---

## 📱 100% Free Telegram Emergency Alert Setup

BloodFlow includes a built-in Telegram alert system that turns your mobile phone into an emergency blood pager with zero carrier fees:

1. **Create Bot**: Open Telegram, search for **`@BotFather`**, send `/newbot`, and copy your **Bot Token**.
2. **Get Chat ID**: Search for **`@userinfobot`** on Telegram and tap **Start** to view your numeric **Chat ID**.
3. **Connect**: Put your token and chat ID in `.env` as `VITE_TELEGRAM_BOT_TOKEN` and `VITE_TELEGRAM_CHAT_ID`.
4. **Test**: Open BloodFlow, navigate to **Hospital Settings**, and click **"Send Test Telegram Alert"** — your phone will ring instantly!

---

## 👥 User Roles & Access

| Role | Target Users | Available Features |
| :--- | :--- | :--- |
| **Donor** | Blood donors | Overview, appointment booking, certificate gallery, profile settings. |
| **Hospital Admin** | Hospital & blood bank staff | Blood inventory hub, emergency broadcast dispatcher, incoming donor queue, hospital settings. |
| **Platform Admin** | Platform administrators | Full system oversight, donor verifications, hospital approvals, audit directories. |

---

## 📁 Project Directory Map

```
bloodflow-project-updated/
├── src/
│   ├── components/
│   │   ├── DashboardLayout.tsx   # Sidebar, mobile drawer, metric cards, page headers
│   │   └── ui.tsx                # Reusable buttons, inputs, selects, cards, badges, modals
│   ├── pages/
│   │   ├── AuthPage.tsx          # Dual-panel healthcare login and role registration
│   │   ├── DonorDashboard.tsx    # Appointment scheduling, certificate viewer, profile
│   │   ├── HospitalDashboard.tsx # Blood inventory hub, emergency broadcast, live tracker
│   │   └── AdminDashboard.tsx    # Triage queues, approvals, directories, audit logs
│   ├── lib/
│   │   ├── auth.tsx              # Supabase authentication provider & session handling
│   │   ├── supabase.ts           # Supabase client and database TypeScript models
│   │   ├── i18n.tsx              # Bilingual English & Hindi translation provider
│   │   └── certificateTemplate.ts# Official donation certificate HTML generator
│   ├── App.tsx                   # Role-based router with ErrorBoundary recovery
│   └── main.tsx                  # React DOM entry point
├── supabase/
│   ├── functions/
│   │   └── emergency-call/       # Multi-provider telephony & Telegram Edge Function
│   └── migrations/               # SQL database schema and RLS policies
├── .env                          # Local environment variables
└── package.json                  # Project configuration and dependencies
```

---

## 📄 License & Attribution
Developed for healthcare coordination, hackathons, and real-world blood donation management. Built with modern web technologies to maximize reliability, accessibility, and speed during life-saving emergency workflows.
