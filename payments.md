\# Feature Request: Peer-to-Peer Dynamic UPI Payment System



We are bypassing traditional payment gateways (like Razorpay) for our application. Instead, we are implementing a direct peer-to-peer UPI payment system using dynamic QR codes. 



Please build out the full stack logic for this payment flow across the frontend and backend.



\## 1. Worker Onboarding \& UPI Registration (Frontend \& Backend)

We need to capture the worker's UPI ID during registration with a frictionless UX.

\*   \*\*Frontend UI:\*\* Update the worker registration form to allow two options: 

&#x20;   1. A text input to manually type a UPI ID (e.g., `worker@ybl`).

&#x20;   2. A file upload button to upload a screenshot of their UPI QR code.

\*   \*\*Backend QR Parsing:\*\* If an image is uploaded, do NOT save it to cloud storage. Instead, use a library like `jsQR` (or a server-side equivalent) to decode the image in memory. 

\*   \*\*Extraction:\*\* Extract the UPI string, parse out the Payee Address (`pa=`), and save only that text string (e.g., `worker\_upi\_id: "9876543210@ybl"`) to the worker's database profile. Discard the image file immediately.



\## 2. Dynamic Invoice Generation (Backend)

When a job is completed and it is time for the customer to pay, the backend needs to generate a locked-amount UPI string.

\*   Fetch the assigned worker's `worker\_upi\_id` and the final calculated `invoiceAmount` for the job.

\*   Construct and return this exact string format to the frontend:

&#x20;   `upi://pay?pa={worker\_upi\_id}\&pn={worker\_name}\&am={invoiceAmount}\&tr={jobId}\&cu=INR`



\## 3. Customer Checkout UI (Frontend)

When the customer views their final bill, they must be presented with the payment details locked to the exact amount.

\*   \*\*Desktop View:\*\* Use a library like `qrcode.react` to render the dynamic string provided by the backend into a visible QR code on the screen. 

\*   \*\*Mobile View:\*\* Provide a "Pay via UPI App" button where the `href` is set directly to the dynamic `upi://pay...` string, acting as a deep link to force-open their installed payment apps. - Save this for future Mobile implementation.\*



\## 4. Mutual Confirmation Flow (Status Update)

Since this is a peer-to-peer transaction, we will not receive automated webhooks from a bank. We need a manual two-step verification to close the job.

\*   \*\*Step 1:\*\* Add an "I have paid" button on the customer's checkout screen. Clicking this updates the job status to `PAYMENT\_CLAIMED`.

\*   \*\*Step 2:\*\* When the status changes to `PAYMENT\_CLAIMED`, trigger a UI popup on the Worker's dashboard asking: \*"Did you receive ₹{invoiceAmount}?"\*

\*   \*\*Step 3:\*\* The worker must click "Confirm Receipt" to finalize the transaction, changing the job status in the database to `COMPLETED`.

