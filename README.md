# FixNow 🛠️

FixNow is a hyper-local, cooperative gig services platform designed to connect citizens with verified local service professionals (plumbers, electricians, carpenters, etc.) in real-time. Built specifically for Tier 2 and Tier 3 cities, it provides transparent pricing, real-time location tracking, and an intuitive experience for customers, workers, and administrators alike.

## 🌟 Key Features

### For Customers
* **Instant Booking:** Request a service professional with a single click.
* **Transparent Pricing:** Get instant estimates consisting of a standard base wage + material cost limits.
* **Live Tracking:** Track your assigned worker on a live map as they approach your location.
* **Verified Workers:** All professionals are vetted and carry digital credentials.

### For Workers
* **Dispatch Radar (Bulletin Board):** A map-based radar to discover available gigs in your vicinity.
* **Execution Workflow:** Seamlessly manage active jobs, update statuses (Accepted, Arrived, In Progress), and navigate to the job site using built-in Google Maps integration.
* **Automated Billing (OCR):** Upload receipts for material costs and let our OCR extract the amounts instantly.
* **Safety First:** Dedicated Emergency SOS button for immediate assistance.

### For Administrators
* **City-Wide Dispatch Map:** A centralized map showing all active gigs, workers, and customer requests in real-time.
* **Cooperative Ledger:** Transparent tracking of platform revenue, worker payouts, and cooperative savings.
* **Dispute Management:** Integrated dashboard to oversee and resolve ticketing issues.

## 💻 Tech Stack

### Frontend
* **Framework:** Next.js (React)
* **Styling:** Tailwind CSS (with custom creme and charcoal aesthetic)
* **Mapping:** Leaflet.js (`MapPicker` component for hyper-local selection)
* **State Management:** React Hooks & LocalStorage persistence

### Backend
* **Framework:** Java Spring Boot
* **Database:** PostgreSQL (with JPA / Hibernate)
* **Real-time:** WebSockets for live status updates and broadcasting
* **Security:** Spring Security + JWT Authentication
* **AI/OCR Integrations:** Integrated endpoints for receipt scanning

## 🚀 Getting Started

### Prerequisites
* Node.js (v18+)
* Java 21
* Maven
* PostgreSQL

### 1. Start the Backend
```bash
cd backend
mvn clean spring-boot:run
```
*The backend server will start on `http://localhost:8080`*

### 2. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```
*The frontend application will start on `http://localhost:3000`*

## 📁 Project Structure

* `/frontend` - The Next.js application containing the Customer, Worker, and Admin portals.
* `/backend` - The Spring Boot application handling business logic, authentication, and WebSocket broadcasting.

## 🎨 Design Philosophy
FixNow utilizes a premium, minimalistic design featuring a distinctive creme background, sharp dark text, and vibrant teal accents to ensure maximum readability and user engagement, especially for on-the-go workers.

---
*Built for the Smart India Hackathon (SIH).*
