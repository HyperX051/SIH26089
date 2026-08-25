================================================================================
SIH 2026: COOPERATIVE GIG SERVICES PLATFORM (PSID: 26089)
MASTER DOCUMENT: API CONTRACTS & AGENT PROMPTS
================================================================================


================================================================================
PART 1: API_CONTRACTS
Single Source of Truth for Frontend and Backend AI Agents
================================================================================

1. GLOBAL STANDARDS & CONVENTIONS
--------------------------------------------------------------------------------
- Base URL: /api/v1
- Auth Header: Authorization: Bearer <JWT_TOKEN>
- Standard Response Format:
  {
    "success": true,
    "data": {},
    "error": null,
    "timestamp": "2026-08-24T16:00:00.000Z"
  }
- Standard Error Format:
  {
    "success": false,
    "data": null,
    "error": {
      "code": "RESOURCE_NOT_FOUND",
      "message": "Detailed error description"
    },
    "timestamp": "2026-08-24T16:00:00.000Z"
  }


2. REST ENDPOINTS
--------------------------------------------------------------------------------

[ 2.1 Authentication (/auth) ]
* POST /auth/send-otp
  Request: { "phone": "+919876543210", "role": "CUSTOMER" | "WORKER" | "ADMIN" }
  Response: { "message": "OTP sent successfully", "session_id": "sess_12345" }

* POST /auth/verify-otp
  Request: { "phone": "+919876543210", "otp": "543210", "session_id": "sess_12345" }
  Response: { "token": "jwt_token", "user": { "id": "usr_1", "role": "WORKER", "name": "Ramesh" } }


[ 2.2 Worker Management (/workers) ]
* PATCH /workers/profile/radius
  Request: { "service_radius_km": 12.5 }
  Response: { "worker_id": "wrk_1", "service_radius_km": 12.5 }

* PATCH /workers/profile/availability
  Request: { "is_available": true }
  Response: { "worker_id": "wrk_1", "is_available": true }


[ 2.3 Bookings Lifecycle (/bookings) ]
* POST /bookings (Create Booking)
  Request: {
    "service_type": "PLUMBER",
    "category_type": "PREDEFINED",
    "custom_prompt_text": null,
    "booking_type": "INSTANT",
    "scheduled_for": null,
    "latitude": 13.0827,
    "longitude": 80.2707,
    "pincode": "600089",
    "address_text": "Door 4, Gandhi Road"
  }
  Response: {
    "booking_id": "bk_9981",
    "status": "SEARCHING",
    "base_wage": 450.00,
    "otp_code": "482910",
    "created_at": "2026-08-24T16:05:00.000Z"
  }

* GET /bookings/:id (Fetch Booking Details)
  Response: {
    "booking_id": "bk_9981",
    "status": "ACCEPTED",
    "service_type": "PLUMBER",
    "customer": { "name": "Ananya", "phone": "+919123456780" },
    "worker": { "name": "Ramesh", "phone": "+919876543210", "rating": 4.9, "ncct_certified": true },
    "pricing": { "base_wage": 450.00, "material_cost": 120.00, "total_amount": 570.00 },
    "otp_code": "482910"
  }

* POST /bookings/:id/cancel (Compensated Cancellation)
  Request: { "reason": "Worker delayed", "cancelled_by": "CUSTOMER" }
  Response: { "status": "CANCELLED_COMPENSATED", "cancellation_fee": 50.00, "worker_payout": 40.00 }

* POST /bookings/:id/verify-otp-complete (Mutual Ticket Closure)
  Request: { "entered_otp": "482910" }
  Response: { "status": "COMPLETED", "payment_pending": true, "total_amount": 570.00 }


[ 2.4 AI Verification & Auditing (/ai) ]
* POST /ai/verify-repair (Before/After Audit)
  Request: { "booking_id": "bk_9981", "before_image_url": "url", "after_image_url": "url" }
  Response: { "verified": true, "confidence_score": 0.94, "notes": "Pipe replaced and sealed." }

* POST /ai/ocr-receipt (Hardware Invoice Extraction)
  Request: { "booking_id": "bk_9981", "receipt_image_url": "url" }
  Response: {
    "extracted_items": [{ "item": "PVC Pipe 1/2 inch", "qty": 1, "price": 120.00 }],
    "total_receipt_amount": 120.00,
    "price_flagged": false
  }

* POST /ai/verify-ncct (Certificate RAG Audit)
  Request: { "worker_id": "wrk_1", "certificate_image_url": "url" }
  Response: { "verified": true, "institute": "NCCT Regional Institute", "recommended_tier": "SKILLED" }


[ 2.5 Emergency & Safety (/safety) ]
* POST /safety/sos (Trigger Emergency Alert)
  Request: { "booking_id": "bk_9981", "latitude": 13.0827, "longitude": 80.2707, "telemetry": { "battery": 78 } }
  Response: { "sos_id": "sos_001", "status": "OPEN", "dispatched_authorities": true }


[ 2.6 Cooperative Federation & Ledger (/admin/cooperative) ]
* GET /admin/cooperative/dividend-ledger
  Response: {
    "society_id": "soc_chennai_01",
    "gross_turnover": 450000.00,
    "commission_reserve": 22500.00,
    "dividend_pool_balance": 18000.00,
    "eligible_worker_count": 84
  }


3. TELEPHONY WEBHOOKS (EXOTEL IVR)
--------------------------------------------------------------------------------
* POST /telephony/exotel/incoming
  - Payload from Exotel: From, CallSid, To
  - Backend Logic: Determine Telecom Circle -> Language -> Return Exotel Response playing Bhashini regional audio and prompting <Gather>.

* POST /telephony/exotel/dtmf-handler
  - Payload from Exotel: CallSid, Digits
  - Backend Logic: Parse pressed digit -> Transition IVR state machine -> Dispatch job to database.


4. WEBSOCKET EVENT CONTRACTS
--------------------------------------------------------------------------------
Connection URL: ws://localhost:4000/socket.io
Auth: { query: { token: "jwt_token_here" } }

[ GIG_OFFERED ]
Direction: Server -> Worker
Payload: { "booking_id": "bk_9981", "service_type": "PLUMBER", "distance_km": 2.4, "estimated_wage": 450.00, "timeout_seconds": 45 }
Purpose: Incoming job alert with countdown timer

[ GIG_RESPONSE ]
Direction: Worker -> Server
Payload: { "booking_id": "bk_9981", "action": "ACCEPT" | "REJECT", "reason": "Too far" }
Purpose: Worker acceptance or rejection

[ LOCATION_UPDATE ]
Direction: Worker -> Server
Payload: { "booking_id": "bk_9981", "latitude": 13.0827, "longitude": 80.2707 }
Purpose: Live telemetry for en-route tracking

[ STATUS_CHANGED ]
Direction: Server -> Both
Payload: { "booking_id": "bk_9981", "status": "ARRIVED" | "IN_PROGRESS" | "COMPLETED" }
Purpose: Synchronizes UI steppers in real time

[ SOS_ALERT ]
Direction: Server -> Admin
Payload: { "sos_id": "sos_001", "booking_id": "bk_9981", "user_id": "usr_1", "latitude": 13.0827, "longitude": 80.2707 }
Purpose: Immediate popup on Admin Command Center



================================================================================
PART 2: FRONTEND AGENT SPECIFICATION
================================================================================

1. CRITICAL DIRECTIVE: STRICT API CONTRACT ADHERENCE
You MUST strictly adhere to the schemas, endpoints, error envelopes, and WebSocket event names defined in the API_CONTRACTS. Do NOT invent or alter any endpoint URLs, payload keys, or WebSocket event identifiers.

2. ROLE & OBJECTIVE
You are a Principal Frontend Architect. Your mission is to build the complete, multi-interface frontend for a cooperative-owned gig service platform.
Interfaces required in the repository:
- Customer Web/PWA Application (/customer)
- Worker Web/PWA Application with KaiOS/D-pad support (/worker)
- Cooperative Federation Admin Dashboard (/admin)

3. TECH STACK
- Framework: Next.js 14+ (App Router) / React 18+ with TypeScript.
- Styling & UI: Tailwind CSS + Shadcn UI / Radix Primitives.
- State & Data Fetching: Zustand + TanStack React Query.
- Real-Time: Socket.io-client adhering to API_CONTRACTS events.
- Maps: Leaflet / Mapbox GL with interactive dispatch radius sliders.
- i18n: next-intl (English, Hindi, Tamil, Telugu, Marathi).

4. KEY UI WORKFLOWS & FEATURES

[ Customer Application (/customer) ]
- Booking Flow: Instant dispatch vs. scheduled booking, GOI Wage breakdown, and address pinning.
- Active Tracker: Live status stepper, real-time map tracking, dynamic 6-digit completion OTP display, and persistent SOS trigger.
- Payments: UPI Deep-link generator (upi://pay), QR display, and cash confirmation.

[ Worker Application (/worker) ]
- Radial Dispatch Slider: Dynamic operational radius controller.
- Incoming Gig Alert: 45-second countdown modal driven by WebSocket GIG_OFFERED event.
- Job Execution Modules: Mandatory Before/After camera capture, Hardware Receipt Scanner, and numerical OTP input pad to close ticket.
- Keypad / D-Pad Accessibility: Global keyboard event listeners (ArrowUp, ArrowDown, Enter/5 to Accept, SoftLeft/1 to Reject, SoftRight/2 for SOS).

[ Admin Dashboard (/admin) ]
- GIS Command Center: Real-time worker heatmaps and priority SOS incident desk listening for SOS_ALERT.
- RAG Verification Desk: Side-by-side view of worker trade certificates and AI verification confidence scores.
- Federation Dividend Ledger: Live dashboard displaying society turnover, platform reserve, and worker dividend distribution.

5. ACCEPTANCE CRITERIA
- All API requests, responses, and Socket.io events strictly match API_CONTRACTS.
- Full keyboard/D-pad navigation functional for worker screens.
- Client-side image compression ensures all photo uploads remain under 300KB.



================================================================================
PART 3: BACKEND AGENT SPECIFICATION
================================================================================

1. CRITICAL DIRECTIVE: STRICT API CONTRACT ADHERENCE
You MUST strictly implement the REST endpoints, payload schemas, database models, Exotel webhooks, and WebSocket events defined in the API_CONTRACTS. Do NOT change route names or payload structures so the frontend agent can integrate seamlessly.

2. ROLE & OBJECTIVE
You are a Principal Backend Systems Architect. Your mission is to build the high-concurrency backend API, database schema, spatial dispatch engines, Exotel DTMF IVR service, and Multimodal Vision AI pipelines.

3. TECH STACK
- Runtime: Node.js (Fastify/Express) with TypeScript OR Python (FastAPI).
- Database: PostgreSQL 15+ with PostGIS extension.
- Cache & Message Broker: Redis (Geo-hashing, 45-second gig timeouts, pub/sub).
- Telephony Gateway: Exotel Webhook handlers for DTMF IVR routing.
- AI Integrations: Multimodal Vision API + Vector Store for NCCT Certificate RAG.

4. KEY IMPLEMENTATION MODULES

[ PostGIS Geo-Spatial Dispatch Engine ]
- Query nearby available workers using ST_DWithin bounded by worker-defined service_radius_km.
- Push GIG_OFFERED event over WebSocket with a 45-second Redis TTL. Automatically cascade to the next nearest worker if rejected or timed out.
- Implement compensated cancellation rules: credit 80% of fee to worker if customer cancels 1 hour or less before scheduled service.

[ Exotel IVR & Telecom Circle Routing ]
- Implement incoming webhook: Query Indian Telecom Circle mapping -> serve localized Bhashini audio greeting -> prompt DTMF <Gather>.
- Implement DTMF handler: Parse keypad digits (1=Plumber, 2=Electrician, etc.) and pincode input to automatically create a booking and trigger dispatch.

[ AI Verification Pipelines ]
- Repair Proof Audit: Compare before/after images using Multimodal Vision AI.
- Receipt OCR & Price Guard: Extract line items from receipts and flag items exceeding standard hardware price indexes by > 25%.
- NCCT Certificate RAG: Validate certificate text against authorized NCCT databases.

[ Security, Mutual Closure & Dividends ]
- Hash 6-digit completion OTPs. Verify hash on mutual ticket closure before unlocking settlement.
- Execute all Federation Dividend Ledger balance credits within serializable SQL transactions.

5. ACCEPTANCE CRITERIA
- Endpoints, schemas, and status codes exactly mirror API_CONTRACTS.
- PostGIS queries and migrations run without errors.
- Exotel webhooks return compliant XML/JSON responses for all DTMF branches.
- Socket.io server correctly broadcasts events (GIG_OFFERED, STATUS_CHANGED, SOS_ALERT).