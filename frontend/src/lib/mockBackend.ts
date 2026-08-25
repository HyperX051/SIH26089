import { InternalAxiosRequestConfig, AxiosResponse } from 'axios';

// --- MOCK REST API ---
export const mockRestAdapter = (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
  const url = config.url || '';
  const method = config.method?.toUpperCase() || 'GET';
  const data = config.data ? JSON.parse(config.data as string) : {};

  return new Promise((resolve, reject) => {
    console.log(`[MOCK API] ${method} ${url}`, data);
    
    setTimeout(() => {
      let mockData: any = {};

      if (url.includes('/auth/send-otp')) {
        mockData = { session_id: 'mock_session_999' };
      } 
      else if (url.includes('/auth/verify-otp')) {
        mockData = { 
          token: 'mock_jwt_token_frontend_only', 
          user: { 
            id: 'mock_user_1', 
            role: data.role || 'CUSTOMER', 
            phone: data.phone 
          } 
        };
      }
      else if (url.includes('/bookings') && method === 'POST') {
        mockData = { booking_id: 'mock_booking_001', status: 'SEARCHING' };
        
        // Trigger STOMP event asynchronously after a delay
        setTimeout(() => {
          simulateStompMessage(`/topic/booking/mock_booking_001`, {
            event: 'STATUS_CHANGED',
            payload: { status: 'ACCEPTED', worker_id: 'wrk_99', booking_id: 'mock_booking_001' }
          });
          
          // Also simulate notifying the worker radar if they are listening
          simulateStompMessage(`/topic/worker/mock_user_1`, {
            event: 'GIG_OFFERED',
            payload: { booking_id: 'mock_booking_001', timeout_seconds: 45 }
          });
        }, 3000);
      }
      else if (url.includes('/verify-otp-complete')) {
        mockData = { status: 'COMPLETED' };
      }
      else if (url.includes('/safety/sos')) {
        mockData = { status: 'ALERT_SENT' };
        
        // Simulate sending to Admin Desk
        setTimeout(() => {
          simulateStompMessage(`/topic/admin/sos`, {
            event: 'SOS_ALERT',
            payload: { booking_id: data.bookingId || 'mock_booking_001', latitude: data.latitude, longitude: data.longitude }
          });
        }, 500);
      }
      else if (url.includes('/ai/ocr-receipt')) {
        mockData = {
          items: [{ name: "PVC Pipe 1/2 inch", qty: 1, price: 120.00 }],
          total: 120.00,
          priceFlagged: false
        };
      }
      else if (url.includes('/admin/cooperative/dividend-ledger')) {
        mockData = {
          gross_turnover: 450000,
          commission_reserve: 22500,
          dividend_pool_balance: 18000
        };
      }
      else {
        return reject({ message: 'Mock Not Found', response: { status: 404 } });
      }

      resolve({
        data: mockData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: config as any,
      });
    }, 800); // Simulate network latency
  });
};

// --- MOCK STOMP WEBSOCKET ---
type SubscriptionCallback = (message: any) => void;
const subscribers: Record<string, SubscriptionCallback[]> = {};

export const simulateStompMessage = (destination: string, body: any) => {
  console.log(`[MOCK STOMP] Emitting to ${destination}`, body);
  if (subscribers[destination]) {
    subscribers[destination].forEach(cb => cb({ body: JSON.stringify(body) }));
  }
};

export class MockStompClient {
  onConnect: (frame: any) => void = () => {};
  onStompError: (frame: any) => void = () => {};
  onWebSocketClose: () => void = () => {};
  
  activate() {
    setTimeout(() => {
      this.onConnect('Mock STOMP Connected');
    }, 500);
  }

  deactivate() {
    this.onWebSocketClose();
  }

  subscribe(destination: string, callback: SubscriptionCallback) {
    if (!subscribers[destination]) {
      subscribers[destination] = [];
    }
    subscribers[destination].push(callback);
    console.log(`[MOCK STOMP] Subscribed to ${destination}`);

    return {
      unsubscribe: () => {
        subscribers[destination] = subscribers[destination].filter(cb => cb !== callback);
      }
    };
  }

  publish(params: { destination: string, body: string }) {
    console.log(`[MOCK STOMP] Published to ${params.destination}`, JSON.parse(params.body));
    
    // Simulate server processing the publish and broadcasting a state change
    if (params.destination === '/app/gig-response') {
      const data = JSON.parse(params.body);
      if (data.action === 'ACCEPT') {
        setTimeout(() => {
          simulateStompMessage(`/topic/booking/${data.booking_id}`, {
            event: 'STATUS_CHANGED',
            payload: { status: 'ACCEPTED', worker_id: 'mock_user_1' }
          });
        }, 1000);
      }
    }
  }
}
