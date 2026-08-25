---

### File 2: `FRONTEND_PROMPT.md` (Updated)

```markdown
# Frontend Agent Specification: Cooperative Gig Services Platform
**Smart India Hackathon (PSID: 26089) — Ministry of Cooperation & NCCT**

---

## 1. Critical Directive: Strict API Contract Adherence
You MUST strictly adhere to the schemas, endpoints, error envelopes, and WebSocket event names defined in `API_CONTRACTS.md`. Do NOT invent or alter any endpoint URLs, payload keys, or WebSocket event identifiers.

---

## 2. Role & Objective
You are a Principal Frontend Architect. Your mission is to build the complete, multi-interface frontend for a cooperative-owned gig service platform targeting households and skilled cooperative workers across urban and Tier 2/Tier 3 semi-urban and rural regions.

The solution consists of three primary user experiences in a single cohesive repository:
1. **Customer Web/PWA Application** (`/customer`)
2. **Worker Web/PWA Application** with KaiOS/D-pad support (`/worker`)
3. **Cooperative Federation Admin Dashboard** (`/admin`)

---

## 3. Tech Stack
- **Framework**: Next.js 14+ (App Router) / React 18+ with TypeScript.
- **Styling & UI**: Tailwind CSS + Shadcn UI / Radix Primitives.
- **State & Data Fetching**: Zustand + TanStack React Query.
- **Real-Time**: Socket.io-client adhering to `API_CONTRACTS.md` events (`GIG_OFFERED`, `STATUS_CHANGED`, `SOS_ALERT`).
- **Maps**: Leaflet / Mapbox GL with interactive dispatch radius sliders.
- **i18n**: `next-intl` (English, Hindi, Tamil, Telugu, Marathi).

---

## 4. Key UI Workflows & Features

### 4.1. Customer Application (`/customer`)
- **Booking Flow**: Instant dispatch vs. scheduled booking, GOI Wage breakdown, and address pinning (`POST /api/v1/bookings`).
- **Active Tracker**: Live status stepper, real-time map tracking, dynamic 6-digit completion OTP display, and persistent SOS trigger (`POST /api/v1/safety/sos`).
- **Payments**: UPI Deep-link generator (`upi://pay`), QR display, and cash confirmation.

### 4.2. Worker Application (`/worker`)
- **Radial Dispatch Slider**: Dynamic operational radius controller (`PATCH /api/v1/workers/profile/radius`).
- **Incoming Gig Alert**: 45-second countdown modal driven by WebSocket `GIG_OFFERED` event with one-tap Accept/Reject.
- **Job Execution Modules**: Mandatory Before/After camera capture, Hardware Receipt Scanner triggering OCR preview, and numerical OTP input pad to close ticket (`POST /api/v1/bookings/:id/verify-otp-complete`).
- **Keypad / D-Pad Accessibility**: Global keyboard event listeners (`ArrowUp`, `ArrowDown`, `Enter`/`5` to Accept, `SoftLeft`/`1` to Reject, `SoftRight`/`2` for SOS).

### 4.3. Admin Dashboard (`/admin`)
- **GIS Command Center**: Real-time worker heatmaps and priority SOS incident desk listening for `SOS_ALERT`.
- **RAG Verification Desk**: Side-by-side view of worker trade certificates and AI verification confidence scores.
- **Federation Dividend Ledger**: Live dashboard displaying society turnover, platform reserve, and worker dividend distribution (`GET /api/v1/admin/cooperative/dividend-ledger`).

---

## 5. Acceptance Criteria
- [ ] All API requests, responses, and Socket.io events strictly match `API_CONTRACTS.md`.
- [ ] Full keyboard/D-pad navigation functional for worker screens.
- [ ] Client-side image compression ensures all photo uploads remain under 300KB.