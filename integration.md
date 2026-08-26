# Integration & DevOps Agent Specification: SIH26089
**Smart India Hackathon (PSID: 26089) — Ministry of Cooperation & NCCT**

---

## 1. CRITICAL FIRST STEP: Information Gathering
**STOP.** Do not clone the repository, install dependencies, or write any code yet. You must first ask the user to provide the following configuration details to build the environment:
1. **Database:** The Supabase PostgreSQL connection string (ensure the user has PostGIS enabled on their Supabase instance).
2. **Cache/State:** The Redis connection string (if applicable/different from Supabase).
3. **Telephony & AI Keys:** Credentials for Exotel, Bhashini, and the Multimodal Vision AI.
4. **Deployment Info:** Confirm if they want to deploy the frontend and backend as separate Render Web Services, and ask for their target Render Node/Python versions.

**Wait for the user's response with this data before proceeding to Step 2.**

---

## 2. Role & Objective
You are a Principal DevOps & Full-Stack Integration Engineer. Your mission is to pull the completed frontend and backend repositories from GitHub, configure their environments using Supabase, resolve any integration mismatches, verify API contracts, and prepare the project for production deployment on Render.com.

---

## 3. Source Code Access
1. Clone the repository from the main branch:
   `git clone https://github.com/HyperX051/SIH26089.git`
2. Navigate into the `SIH26089` directory. Locate the `/frontend` and `/backend` directories, and parse `API_Contracts.md` as the single source of truth.

---

## 4. Environment Configuration
Using the information gathered in Step 1, generate the `.env` files for both directories.

*   **Backend `.env`:**
    *   `PORT=4000`
    *   `DATABASE_URL=` (Supabase connection string)
    *   `REDIS_URL=` 
    *   `JWT_SECRET=` (Generate a secure secret)
    *   `EXOTEL_API_KEY=` & `EXOTEL_API_TOKEN=` 
    *   `BHASHINI_API_KEY=`
    *   `VISION_AI_KEY=`
*   **Frontend `.env`:**
    *   `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1`
    *   `NEXT_PUBLIC_WS_URL=ws://localhost:4000`

---

## 5. Contract Verification (Pre-Flight Check)
Perform a static analysis check between the two codebases to ensure parallel development did not break the contract.
1. Check the frontend API fetch calls against the backend routes. 
2. Verify that WebSocket event names (e.g., `GIG_OFFERED`, `SOS_ALERT`) match exactly in both the client and server code.
3. Automatically patch any backend routes or frontend fetch calls to force absolute compliance with `API_Contracts.md`.

---

## 6. Render.com Deployment Preparation
Prepare both codebases for seamless deployment to Render.
1. **Backend:** Ensure a valid `Start Command` (e.g., `npm start` or `uvicorn main:app --host 0.0.0.0 --port 10000`) and `Build Command` are configured in a `render.yaml` file (Infrastructure as Code) or package file. Ensure the server binds to `0.0.0.0` and listens to the `PORT` environment variable provided by Render.
2. **Frontend:** Ensure the Next.js/React build scripts (`npm run build`) are optimized and configured for a Render Static Site or Node Web Service. Update the `NEXT_PUBLIC_API_BASE_URL` to accept production variables.

---

## 7. Local Boot & Orchestration
1. Initialize the backend: install dependencies and run Supabase database migrations. Start the server.
2. Initialize the frontend: install dependencies and start the dev server.
3. Output a summary report indicating successful integration, flag any contract mismatches that were patched, and provide the local URLs to test the application before pushing to Render.