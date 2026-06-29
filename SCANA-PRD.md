# Product Requirements Document
## Scana.in — After-Sales Intelligence Platform

**Version:** 1.0  
**Date:** June 2025  
**Status:** In Development  
**Prepared by:** Product Team, Scana.in

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Goals](#2-product-vision--goals)
3. [User Personas](#3-user-personas)
4. [System Architecture Overview](#4-system-architecture-overview)
5. [Module 1 — QR Code & Product Identification](#5-module-1--qr-code--product-identification)
6. [Module 2 — AI Support Chatbot](#6-module-2--ai-support-chatbot)
7. [Module 3 — Warranty Registration & Management](#7-module-3--warranty-registration--management)
8. [Module 4 — Claims Management](#8-module-4--claims-management)
9. [Module 5 — Repair Dispatch & Field Service](#9-module-5--repair-dispatch--field-service)
10. [Module 6 — Spare Parts Catalog & Ordering](#10-module-6--spare-parts-catalog--ordering)
11. [Module 7 — Analytics Dashboard](#11-module-7--analytics-dashboard)
12. [Module 8 — Multi-Tenant Business Management](#12-module-8--multi-tenant-business-management)
13. [Non-Functional Requirements](#13-non-functional-requirements)
14. [API Design Principles](#14-api-design-principles)
15. [Release Roadmap](#15-release-roadmap)
16. [Success Metrics](#16-success-metrics)
17. [Open Questions & Risks](#17-open-questions--risks)

---

## 1. Executive Summary

Scana.in is a white-label SaaS platform that transforms the after-sales service experience for appliance brands. By placing a QR code on every appliance at the point of manufacture, brands enable their customers to instantly access AI-powered support, register warranties, file claims, book repairs, and order spare parts — all without downloading an app.

The platform serves two primary audiences simultaneously:

- **Brand/Manufacturer** (B2B customer): Gets a white-labeled portal, AI chatbot trained on their product catalog, real-time analytics, and a unified view of their entire service operations.
- **End Customer** (B2C user): Gets instant product support and self-service workflows via a mobile-first web experience, accessible through a simple QR scan.

---

## 2. Product Vision & Goals

### Vision
_"Every appliance becomes a connected service touchpoint."_

### Business Goals
- Reduce brand support costs by automating Tier-1 and Tier-2 queries via AI.
- Increase warranty registration rates from an industry average of ~15% to 70%+.
- Compress claim-to-resolution time from 7+ days to under 2 days.
- Build a recurring SaaS revenue stream with high switching costs (data lock-in, training data).

### Product Goals
- Launch with 5 core modules (QR, Chatbot, Warranty, Claims, Analytics) in MVP.
- Support white-labeling: custom domain, logo, color scheme per brand tenant.
- Mobile-first responsive design with no app download required.
- API-first architecture to allow ERP/CRM integration by enterprise clients.

---

## 3. User Personas

### 3.1 Sanjay — After-Sales Head (Primary Buyer)
- Title: VP / Head of After-Sales, large Indian appliance brand
- Goals: Reduce service costs, improve CSAT, get visibility into field operations
- Pain points: Relies on spreadsheets, no real-time data, high call center volume
- Buys Scana.in for his team; reviews dashboards weekly

### 3.2 Rekha — Customer Service Manager (Daily User)
- Title: Customer Service Manager at the brand
- Goals: Process claims faster, track technician assignments, manage warranty records
- Pain points: Manual data entry, no single system, frequent escalations
- Uses the Scana.in brand portal daily for claims and repair tracking

### 3.3 Arjun — End Customer (Consumer)
- Age: 28–45, urban/semi-urban, smartphone user
- Goals: Fix his appliance problem quickly without being put on hold
- Pain points: Long IVR wait times, unclear warranty process, no visibility into repair status
- Accesses Scana.in by scanning QR on his appliance; expects instant resolution

### 3.4 Dinesh — Field Technician
- Title: Repair technician, employed by brand or authorized service center
- Goals: Receive jobs clearly, update status easily, close more jobs per day
- Pain points: Jobs assigned via WhatsApp, no digital job sheet, customer disputes
- Uses mobile-optimized technician view to accept, track, and close repair jobs

---

## 4. System Architecture Overview

### Tech Stack (Current)
- **Backend:** NestJS (Node.js), TypeORM, MySQL 8
- **Frontend (Brand Portal):** Next.js / React, TailwindCSS
- **Frontend (Consumer Widget):** React, embedded via QR-link
- **AI Layer:** LLM (GPT-4 / Claude) with RAG over product knowledge base
- **Infrastructure:** Railway (staging), target AWS/GCP for production
- **Auth:** JWT (access + refresh tokens), role-based (owner / admin / manager / agent)
- **Storage:** S3-compatible for documents, warranty certificates
- **Document Generation:** HTML templates served inline, browser print-to-PDF

### Multi-Tenancy Model
Each brand (`BusinessEntity`) is a fully isolated tenant. All data — appliances, warranties, claims, users — is scoped to `business_id`. No cross-tenant data leakage.

### Key Entities
`businesses` · `users` · `appliances` · `warranties` · `claims` · `repair_jobs` · `repair_agents` · `spare_parts` · `notifications` · `activities` · `chat_sessions` · `chat_messages`

---

## 5. Module 1 — QR Code & Product Identification

### Overview
Every appliance gets a unique QR code encoding a URL like `https://scana.in/scan/{applianceId}`. Scanning opens the consumer-facing support web app for that specific product.

### Functional Requirements

**FR-QR-01:** The system shall generate a unique, non-sequential UUID-based URL for each appliance record.  
**FR-QR-02:** The QR code URL shall resolve even if the product is not yet registered by the customer.  
**FR-QR-03:** On scan, the system shall display basic product info (model, category, image) to the customer before login.  
**FR-QR-04:** Brands shall be able to bulk-generate QR codes (CSV upload → QR ZIP export) for pre-labeling at the factory.  
**FR-QR-05:** Each QR scan event shall be logged with timestamp, approximate location (IP-based), and whether the user was authenticated.  
**FR-QR-06:** The QR URL shall support UTM parameters for campaign tracking.

### Data Model
```
appliances
  id            VARCHAR(36) PK
  business_id   VARCHAR(36) FK → businesses
  model_number  VARCHAR(255)
  serial_number VARCHAR(255) UNIQUE
  category      VARCHAR(100)   -- e.g. "Washing Machine"
  brand_name    VARCHAR(255)
  manufacture_date DATE
  color         VARCHAR(100)
  image_url     VARCHAR(500)
  qr_code_url   VARCHAR(500)
  metadata      JSON
  created_at    DATETIME
```

### API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/appliances/scan/:applianceId` | Public — resolve appliance for QR scan |
| POST | `/api/appliances` | Create appliance (brand admin) |
| POST | `/api/appliances/bulk` | Bulk import from CSV |
| GET | `/api/appliances/:id/qr` | Generate/download QR image |
| GET | `/api/appliances` | List appliances (paginated, with filters) |

---

## 6. Module 2 — AI Support Chatbot

### Overview
An AI-powered chat assistant embedded in the consumer QR-scan experience. Resolves Tier-1 and Tier-2 support queries using Retrieval-Augmented Generation (RAG) over the brand's product knowledge base.

### Functional Requirements

**FR-AI-01:** The chatbot shall identify the product context from the QR scan and personalize responses accordingly.  
**FR-AI-02:** The chatbot shall answer product FAQs, troubleshooting questions, and usage guidance using the brand's uploaded manuals and knowledge base.  
**FR-AI-03:** The chatbot shall detect when a user needs warranty, claims, or repair services and offer to initiate those flows directly within the chat.  
**FR-AI-04:** The chatbot shall support escalation to a human agent when confidence falls below threshold.  
**FR-AI-05:** The chatbot shall support at minimum English, Hindi, and Tamil. Language detection shall be automatic.  
**FR-AI-06:** All chat sessions and messages shall be persisted for brand review and AI fine-tuning.  
**FR-AI-07:** The brand admin shall be able to upload knowledge base documents (PDF, DOCX) and the system shall automatically chunk, embed, and index them.  
**FR-AI-08:** The chatbot shall display a typing indicator and respond within 3 seconds on average.  
**FR-AI-09:** A "satisfaction" prompt (thumbs up/down) shall be shown at session end.

### Data Model
```
chat_sessions
  id            VARCHAR(36) PK
  business_id   VARCHAR(36) FK
  appliance_id  VARCHAR(36) FK (nullable — pre-registration)
  user_id       VARCHAR(36) FK (nullable — anonymous)
  channel       ENUM('web','whatsapp','api')
  language      VARCHAR(10)
  started_at    DATETIME
  ended_at      DATETIME
  rating        TINYINT  -- 1 or -1, nullable
  metadata      JSON

chat_messages
  id            VARCHAR(36) PK
  session_id    VARCHAR(36) FK
  role          ENUM('user','assistant','system')
  content       TEXT
  tokens_used   INT
  latency_ms    INT
  created_at    DATETIME
```

### AI Architecture
- **Embedding model:** text-embedding-3-small (OpenAI) or equivalent
- **Vector store:** pgvector / Pinecone per tenant namespace
- **LLM:** GPT-4o (default), configurable per tenant
- **Context window:** Last 10 messages + top-5 retrieved chunks
- **System prompt:** Brand-specific, configured per tenant in admin panel

### API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chat/session` | Start a new chat session |
| POST | `/api/chat/message` | Send a message, get AI reply (streaming) |
| GET | `/api/chat/session/:id` | Get session history |
| POST | `/api/chat/session/:id/rate` | Submit satisfaction rating |
| POST | `/api/rag/upload` | Upload knowledge base document |
| GET | `/api/rag/status` | Check RAG index build status |

---

## 7. Module 3 — Warranty Registration & Management

### Overview
Customers register their appliance warranty in under 60 seconds by scanning the QR code, confirming purchase details, and uploading a receipt (optional). Brands get a digital registry replacing manual/paper processes.

### Functional Requirements

**FR-WA-01:** Customer shall be able to register a warranty by providing: purchase date, dealer/retailer name, and optional receipt photo.  
**FR-WA-02:** The system shall calculate and display the warranty expiry date based on product model's warranty terms.  
**FR-WA-03:** The system shall validate that the purchase date is not in the future and not older than the maximum registration window (configurable per brand, default 90 days).  
**FR-WA-04:** On successful registration, the customer shall receive a digital warranty certificate (branded HTML document, printable as PDF).  
**FR-WA-05:** The brand admin shall be able to configure warranty duration by product category (e.g., compressors: 5 years, parts: 1 year).  
**FR-WA-06:** The system shall send reminder notifications at 30 days before warranty expiry.  
**FR-WA-07:** Warranty status shall be visible on the appliance detail page without login (using QR token).  
**FR-WA-08:** The brand shall be able to extend warranty manually (goodwill extension).  
**FR-WA-09:** The brand shall be able to export warranty data as CSV.

### Data Model
```
warranties
  id               VARCHAR(36) PK
  business_id      VARCHAR(36) FK
  appliance_id     VARCHAR(36) FK
  user_id          VARCHAR(36) FK
  purchase_date    DATE
  registration_date DATE
  expiry_date      DATE
  dealer_name      VARCHAR(255)
  dealer_city      VARCHAR(100)
  receipt_url      VARCHAR(500)
  status           ENUM('active','expired','void','extended')
  extended_until   DATE
  notes            TEXT
  metadata         JSON
  created_at       DATETIME
```

### API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/warranties` | Register warranty |
| GET | `/api/warranties/:id` | Get warranty detail |
| GET | `/api/warranties/check/:applianceId` | Check warranty status (public) |
| PATCH | `/api/warranties/:id/extend` | Extend warranty (brand admin) |
| GET | `/api/pdf/warranty/:warrantyId` | Download warranty certificate (HTML) |

---

## 8. Module 4 — Claims Management

### Overview
End-to-end digital workflow for warranty and out-of-warranty service claims. Replaces email/phone-based claim filing with a structured, trackable process.

### Functional Requirements

**FR-CL-01:** Customers shall be able to file a claim by describing the issue, selecting issue type, and uploading supporting photos/videos.  
**FR-CL-02:** The system shall auto-check warranty status before allowing claim submission.  
**FR-CL-03:** Claims shall have a unique alphanumeric claim number (e.g., `CLM-2025-04821`).  
**FR-CL-04:** The brand agent shall be able to update claim status through: Pending → Under Review → Approved / Rejected → Resolved.  
**FR-CL-05:** On status change, the customer shall be notified via SMS or email.  
**FR-CL-06:** Brand agents shall be able to add internal notes visible only to the brand team.  
**FR-CL-07:** Approved claims shall automatically trigger a repair job creation (see Module 5).  
**FR-CL-08:** Rejected claims shall require a rejection reason which is communicated to the customer.  
**FR-CL-09:** A branded claim report (HTML document) shall be auto-generated and available at `/api/pdf/claim/:claimId`.  
**FR-CL-10:** The system shall enforce SLA timers — claims not reviewed within 48 hours shall escalate automatically.

### Data Model
```
claims
  id               VARCHAR(36) PK
  claim_number     VARCHAR(20) UNIQUE  -- CLM-2025-XXXXX
  business_id      VARCHAR(36) FK
  appliance_id     VARCHAR(36) FK
  warranty_id      VARCHAR(36) FK (nullable)
  user_id          VARCHAR(36) FK
  issue_type       ENUM('repair','replacement','refund','inspection')
  issue_description TEXT
  photos_urls      JSON   -- array of URLs
  status           ENUM('pending','under_review','approved','rejected','resolved','cancelled')
  priority         ENUM('low','medium','high','urgent')
  agent_id         VARCHAR(36) FK (nullable — assigned brand agent)
  internal_notes   TEXT
  rejection_reason TEXT
  resolved_at      DATETIME
  sla_due_at       DATETIME
  created_at       DATETIME
  updated_at       DATETIME
```

### API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/claims` | File a new claim |
| GET | `/api/claims` | List claims (brand dashboard, filterable) |
| GET | `/api/claims/:id` | Get claim detail |
| PATCH | `/api/claims/:id/status` | Update claim status |
| POST | `/api/claims/:id/notes` | Add internal note |
| GET | `/api/pdf/claim/:claimId` | Download claim report (HTML) |

---

## 9. Module 5 — Repair Dispatch & Field Service

### Overview
Manages the end-to-end lifecycle of in-home repair jobs — from technician assignment to completion and customer sign-off.

### Functional Requirements

**FR-RD-01:** Repair jobs shall be auto-created when a claim is approved, or manually created by brand agents.  
**FR-RD-02:** The system shall maintain a roster of repair agents with service areas and specializations.  
**FR-RD-03:** Brand agents shall be able to assign a job to a technician from the roster; future versions shall auto-assign based on availability and location.  
**FR-RD-04:** Technicians shall receive job details via app notification or SMS with: customer name, address, appliance details, reported issue.  
**FR-RD-05:** Technicians shall update job status: Assigned → En Route → On Site → Completed / Cannot Complete.  
**FR-RD-06:** On completion, the technician shall log: work performed, parts used, and resolution notes.  
**FR-RD-07:** Customers shall receive real-time SMS/notification updates at each status change.  
**FR-RD-08:** A post-service satisfaction survey (1–5 stars) shall be sent to the customer automatically.  
**FR-RD-09:** The system shall track repeat visits for the same appliance and flag chronic issues.

### Data Model
```
repair_agents
  id             VARCHAR(36) PK
  business_id    VARCHAR(36) FK
  name           VARCHAR(255)
  phone          VARCHAR(50)
  email          VARCHAR(255)
  specialization VARCHAR(255)  -- e.g. "AC, Refrigerator"
  service_areas  JSON          -- array of pin codes or cities
  is_active      BOOLEAN
  rating         DECIMAL(3,2)
  created_at     DATETIME

repair_jobs
  id               VARCHAR(36) PK
  business_id      VARCHAR(36) FK
  claim_id         VARCHAR(36) FK (nullable)
  appliance_id     VARCHAR(36) FK
  user_id          VARCHAR(36) FK
  agent_id         VARCHAR(36) FK (nullable)
  status           ENUM('pending','assigned','en_route','on_site','completed','cancelled','cannot_complete')
  scheduled_date   DATETIME
  completed_at     DATETIME
  work_performed   TEXT
  parts_used       JSON
  resolution_notes TEXT
  customer_rating  TINYINT
  customer_feedback TEXT
  created_at       DATETIME
  updated_at       DATETIME
```

### API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/repair/jobs` | List repair jobs |
| POST | `/api/repair/jobs` | Create repair job |
| PATCH | `/api/repair/jobs/:id/assign` | Assign technician |
| PATCH | `/api/repair/jobs/:id/status` | Update job status |
| POST | `/api/repair/jobs/:id/complete` | Mark complete with notes |
| GET | `/api/repair/agents` | List agents |
| POST | `/api/repair/agents` | Create agent |
| GET | `/api/pdf/booking/:jobId` | Download job sheet (HTML) |

---

## 10. Module 6 — Spare Parts Catalog & Ordering

### Overview
Customers and technicians can browse and order genuine spare parts for their specific appliance model. Brands manage inventory and fulfillment.

### Functional Requirements

**FR-SP-01:** The brand shall be able to create and manage a spare parts catalog with: part number, name, description, price, stock count, compatible models.  
**FR-SP-02:** When a customer scans their QR code, the parts catalog shall be pre-filtered to show only compatible parts.  
**FR-SP-03:** Customers shall be able to add parts to cart and place an order.  
**FR-SP-04:** Payment shall be handled via Razorpay/Stripe integration (configurable per brand).  
**FR-SP-05:** Order fulfillment status (Placed → Confirmed → Shipped → Delivered) shall be tracked and communicated.  
**FR-SP-06:** Stock levels shall be decremented on order confirmation; out-of-stock items shall show an estimated restock date.  
**FR-SP-07:** Technicians booking parts for a repair job shall be able to reserve parts and have them delivered to the customer's address.  
**FR-SP-08:** A low-stock alert shall be sent to the brand admin when stock falls below a configurable threshold.

### Data Model
```
spare_parts
  id                VARCHAR(36) PK
  business_id       VARCHAR(36) FK
  part_number       VARCHAR(100) UNIQUE
  name              VARCHAR(255)
  description       TEXT
  price             DECIMAL(10,2)
  stock_count       INT
  low_stock_alert   INT DEFAULT 10
  compatible_models JSON   -- array of model numbers
  image_url         VARCHAR(500)
  is_active         BOOLEAN
  created_at        DATETIME

part_orders
  id             VARCHAR(36) PK
  business_id    VARCHAR(36) FK
  user_id        VARCHAR(36) FK
  appliance_id   VARCHAR(36) FK (nullable)
  repair_job_id  VARCHAR(36) FK (nullable)
  items          JSON   -- [{part_id, qty, unit_price}]
  total_amount   DECIMAL(10,2)
  status         ENUM('pending','confirmed','shipped','delivered','cancelled')
  shipping_address JSON
  payment_id     VARCHAR(255)
  payment_status ENUM('pending','paid','refunded')
  created_at     DATETIME
```

---

## 11. Module 7 — Analytics Dashboard

### Overview
Real-time operational visibility for brand admins and managers. Surfaced as an interactive web dashboard with charts, KPI cards, and exportable reports.

### Functional Requirements

**FR-AN-01:** The dashboard shall display KPIs at a glance: total QR scans, active warranties, open claims, avg resolution time, CSAT score.  
**FR-AN-02:** Charts shall include: claims by month (bar), warranty registrations trend (line), top issue types (pie/donut), technician performance (leaderboard).  
**FR-AN-03:** All data shall be filterable by date range (last 7d / 30d / 90d / custom) and by product category.  
**FR-AN-04:** The system shall calculate and display CSAT from post-service ratings (Module 5) and chatbot ratings (Module 2).  
**FR-AN-05:** "Top failure patterns" report shall surface the most common issue types per model, updated daily.  
**FR-AN-06:** Data shall be exportable as CSV or PDF report for any dashboard view.  
**FR-AN-07:** The dashboard shall support role-based visibility — managers see their assigned region; admins see everything.  
**FR-AN-08:** An automated weekly digest email shall be sent to brand admins every Monday morning.

### Key Metrics Tracked
- Warranty registration rate (% of sold units registered)
- Claim volume by type and model
- Average days-to-resolution (claim filed → resolved)
- First-contact resolution rate (AI chatbot)
- Technician utilisation and avg jobs per day
- Spare parts order frequency by SKU
- Net Promoter Score (derived from post-service surveys)

---

## 12. Module 8 — Multi-Tenant Business Management

### Overview
The foundational module enabling Scana.in to serve multiple appliance brands as isolated tenants on a shared infrastructure.

### Functional Requirements

**FR-MT-01:** Each business tenant shall have: custom subdomain (brand.scana.in), logo, primary color, contact details.  
**FR-MT-02:** User roles within a tenant: `owner` (full access), `admin` (all except billing), `manager` (operational), `agent` (claims/repairs only).  
**FR-MT-03:** The owner shall be able to invite users by email; invites expire in 48 hours.  
**FR-MT-04:** The system shall enforce plan-based limits: QR scan volume, number of product SKUs, number of user seats.  
**FR-MT-05:** Billing and subscription management shall integrate with Stripe (or Razorpay for India).  
**FR-MT-06:** Each tenant's data shall be logically isolated — no cross-tenant queries possible through the API.  
**FR-MT-07:** Brand admins shall be able to configure: knowledge base, warranty terms, notification templates, chatbot system prompt.

### Subscription Plans

| Feature | Starter | Growth | Enterprise |
|---------|---------|--------|------------|
| QR scans / month | 5,000 | 25,000 | Unlimited |
| Product lines | 1 | Unlimited | Unlimited |
| User seats | 3 | 15 | Unlimited |
| AI chatbot | Basic | Full RAG | Custom tuning |
| Warranty + Claims | Yes | Yes | Yes |
| Repairs + Parts | No | Yes | Yes |
| Analytics | Basic | Advanced | Custom |
| Support | Email | Priority | Dedicated CSM |
| Price (₹/month) | 9,999 | 24,999 | Custom |

---

## 13. Non-Functional Requirements

### Performance
- API p95 response time ≤ 300ms for non-AI endpoints
- AI chatbot first token latency ≤ 2 seconds
- Dashboard data freshness ≤ 5 minutes (near real-time)
- Support 100 concurrent users per tenant at Growth plan

### Availability
- Target SLA: 99.5% uptime (Starter), 99.9% (Growth/Enterprise)
- Graceful degradation: if AI is unavailable, show static FAQ fallback
- Database backups every 6 hours; point-in-time recovery to 1 hour

### Security
- All data in transit encrypted via TLS 1.3
- Passwords hashed with bcrypt (cost factor 12)
- JWT access tokens expire in 1 hour; refresh tokens in 7 days
- PII fields (customer name, phone, email) encrypted at rest for Enterprise tenants
- OWASP Top-10 compliance verified before each release
- Rate limiting: 100 req/min per IP on public endpoints; 1,000 req/min per tenant on authenticated endpoints

### Scalability
- Stateless API — horizontal scaling via container replicas
- MySQL read replicas for analytics queries
- S3-compatible object storage for documents and uploads
- Vector store isolated per tenant namespace

### Mobile & Accessibility
- Consumer QR-scan experience: fully mobile-first, tested on iOS Safari and Android Chrome
- Minimum tap target: 44×44px
- No app download required; progressive web app capabilities
- WCAG 2.1 AA compliance target for consumer-facing pages

---

## 14. API Design Principles

- RESTful conventions with consistent naming (`/api/{resource}/{id}/{action}`)
- All list endpoints support: `?page=`, `?limit=`, `?sortBy=`, `?order=asc|desc`, and resource-specific filters
- Consistent error shape: `{ statusCode, message, error }` matching NestJS defaults
- All authenticated endpoints require `Authorization: Bearer {access_token}` header
- `business_id` is always extracted from the JWT, never from request body (prevents tenant escalation)
- Swagger/OpenAPI documentation auto-generated at `/api/docs`
- Versioning strategy: URL-based (`/api/v2/...`) when breaking changes required

---

## 15. Release Roadmap

### v1.0 — MVP (Target: Q3 2025)
- QR code scanning and appliance identification
- Basic AI chatbot (keyword-based fallback if LLM unavailable)
- Warranty registration and digital certificate
- Claims filing and status tracking
- Brand admin dashboard (basic KPIs)
- Single-tenant setup (one brand at a time)

### v1.1 — Multi-Tenant + Repairs (Q4 2025)
- Full multi-tenant architecture with subdomain routing
- Repair dispatch module (manual assignment)
- Technician mobile view
- Notification system (email + SMS)
- Starter and Growth plan gating

### v1.2 — Spare Parts + Advanced AI (Q1 2026)
- Spare parts catalog and ordering
- RAG-powered AI chatbot with custom knowledge base upload
- Multi-language support (Hindi, Tamil)
- Automated weekly analytics digest email

### v2.0 — Enterprise (Q2–Q3 2026)
- Auto-dispatch with location-based technician assignment
- ERP/SAP integration (REST webhook + middleware)
- Custom AI fine-tuning per brand
- White-label mobile app (iOS + Android wrapper)
- Advanced analytics: cohort analysis, model reliability scores

---

## 16. Success Metrics

### North Star Metric
**Monthly Active QR Scans** — the number of unique QR code scans per month across all tenants. This measures how embedded Scana.in is in the customer service journey.

### Acquisition Metrics
- Number of brand tenants (MoM growth target: 15%)
- Time to first QR scan (target: brand live within 3 days of signup)

### Engagement Metrics
- Warranty registration rate (target: >60% of scanned units)
- AI chatbot self-service resolution rate (target: >55% of sessions)
- Claim-to-resolution time (target: <48 hours median)

### Retention Metrics
- Monthly tenant churn rate (target: <2%)
- Expansion revenue (brands upgrading plan)

### Customer Experience Metrics
- Consumer CSAT (target: >4.2 / 5.0)
- Post-repair satisfaction (target: >4.0 / 5.0)

---

## 17. Open Questions & Risks

### Open Questions
1. **Payment integration:** Should Razorpay be the default for Indian brands, with Stripe as optional? Or abstract payment provider?
2. **WhatsApp channel:** Should the AI chatbot be accessible via WhatsApp Business API in addition to web? (High demand from brands)
3. **Data residency:** For enterprise clients, should data be stored in dedicated MySQL instances or can shared infrastructure with row-level isolation suffice?
4. **Technician app:** Should technicians use the mobile-responsive web UI or a dedicated React Native app?

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| LLM API downtime (OpenAI outage) | Medium | High | Implement fallback to rule-based chatbot and static FAQ |
| Brands unwilling to share product manuals | Medium | Medium | Offer structured FAQ builder as alternative to document upload |
| QR code not scannable (damaged label) | Low | Medium | Provide fallback search by serial number on landing page |
| MySQL schema drift across tenants | Low | High | Enforce migration-only schema changes; no `synchronize: true` in production |
| RAG hallucination giving wrong repair advice | Medium | High | Add confidence scoring; require human review for safety-critical responses |
| Railway infrastructure costs at scale | High | Medium | Plan migration to AWS ECS/RDS at 50+ tenants; architect for portability |

---

_Document maintained by the Scana.in Product Team. For questions, contact product@scana.in._
