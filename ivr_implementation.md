# Project Update: IVR Telephony Integration (Exotel Webhooks)

I have successfully built out the Exotel IVR flow for our application. The telecom network is now configured to send a POST request to our backend every time a customer books a service via phone.

Please update the backend to handle these incoming webhooks and update the worker application UI to display this specific data.

## 1. Webhook Endpoint Details
The backend is currently spinning up on `http://localhost:8080` and is exposed to the internet via Ngrok. 

*   **Base Ngrok URL:** `https://settling-friday-rewire.ngrok-free.dev`
*   **Endpoint Path:** `POST /api/v1/telephony/exotel/dtmf-handler`

## 2. Incoming Payload Structure
When Exotel hits our endpoint, it automatically passes call metadata along with the user's keypad inputs. Please extract these specific values to generate the booking:

*   **Phone Number:** Located in `req.body.From`
*   **Customer Pincode:** Located in `req.body.Digits` (This is the 6-digit pincode they entered).
*   **Service Type:** Located in the query parameter `req.query.service`

*List of active service query parameters you will receive:*
*   `electrical_general`
*   `ac_repair`
*   `tv_repair`
*   `plumbing_general`
*   `water_issues`
*   `carpentry_general`
*   `carpentry_heavy`

## 3. Worker Application UI Requirements
When rendering these specific bookings on the worker-facing dashboard, please implement the following UI updates:

*   **IVR Badge:** Add a distinct visual badge (e.g., a colored tag labeled "IVR Booking" or a phone icon) to the job card so workers immediately know this request was generated via a phone call rather than the web app.
*   **Customer Details:** Explicitly display the extracted **Phone Number** and the 6-digit **Pincode** prominently on the booking interface. The dispatched worker needs immediate access to this contact and location data.