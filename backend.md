# Backend Agent Specification: Cooperative Gig Services Platform
**Smart India Hackathon (PSID: 26089) — Ministry of Cooperation & NCCT**

---

## 1. Critical Directive: Strict API Contract Adherence
You MUST strictly implement the REST endpoints, payload schemas, database models, Exotel webhooks, and WebSocket events defined in `API_CONTRACTS.md`. Do NOT change route names or payload structures so the frontend agent can integrate seamlessly.

---

## 2. Role & Objective
You are a Principal Backend Systems Architect. Your mission is to build the high-concurrency backend API, database schema, spatial dispatch engines, Exotel DTMF IVR service, and Multimodal Vision AI pipelines.

---

## 3. Tech Stack
- **Runtime**: Node.js (Fastify/Express) with TypeScript OR Python (FastAPI).
- **Database**: PostgreSQL 15+ with **PostGIS** extension.
- **Cache & Message Broker**: Redis (Geo-hashing, 45-second gig timeouts, pub/sub).
- **Telephony Gateway**: Exotel Webhook handlers for DTMF IVR routing.
- **AI Integrations**: Multimodal Vision API (Before/After comparison, Receipt OCR) + Vector Store for NCCT Certificate RAG.

---

## 4. Key Implementation Modules

### 4.1. PostGIS Geo-Spatial Dispatch Engine
- Query nearby available workers using `ST_DWithin` bounded by worker-defined `service_radius_km`.
- Push `GIG_OFFERED` event over WebSocket with a 45-second Redis TTL. Automatically cascade to the next nearest worker if rejected or timed out.
- Implement compensated cancellation rules: credit 80% of fee to worker if customer cancels $\le 1$ hour before scheduled service.

### 4.2. Exotel IVR & Telecom Circle Routing
- Implement `POST /api/v1/telephony/exotel/incoming`: Query Indian Telecom Circle mapping $\to$ serve localized Bhashini audio greeting $\to$ prompt DTMF `<Gather>`.
- Implement `POST /api/v1/telephony/exotel/dtmf-handler`: Parse keypad digits (1=Plumber, 2=Electrician, etc.) and pincode input to automatically create a booking and trigger dispatch.

### 4.3. AI Verification Pipelines
- **Repair Proof Audit (`POST /api/v1/ai/verify-repair`)**: Compare before/after images using Multimodal Vision AI.
- **Receipt OCR & Price Guard (`POST /api/v1/ai/ocr-receipt`)**: Extract line items from receipts and flag items exceeding standard hardware price indexes by $>25\%$.
- **NCCT Certificate RAG (`POST /api/v1/ai/verify-ncct`)**: Validate certificate text against authorized NCCT databases.

### 4.4. Security, Mutual Closure & Dividends
- Hash 6-digit completion OTPs. Verify hash on `POST /api/v1/bookings/:id/verify-otp-complete` before unlocking settlement.
- Execute all **Federation Dividend Ledger** balance credits within serializable SQL transactions.

---

## 5. Acceptance Criteria
- [ ] Endpoints, schemas, and status codes exactly mirror `API_CONTRACTS.md`.
- [ ] PostGIS queries and migrations run without errors.
- [ ] Exotel webhooks return compliant XML/JSON responses for all DTMF branches.
- [ ] Socket.io server correctly broadcasts events (`GIG_OFFERED`, `STATUS_CHANGED`, `SOS_ALERT`).