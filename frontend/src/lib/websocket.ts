import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuthStore } from '../store/useAuthStore';

let WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8080/ws';
// SockJS requires http/https, not ws/wss
WS_URL = WS_URL.replace(/^ws:\/\//i, 'http://').replace(/^wss:\/\//i, 'https://');
export const createStompClient = (): Client => {
  const token = useAuthStore.getState().token;
  
  const client = new Client({
    webSocketFactory: () => new SockJS(WS_URL),
    connectHeaders: {
      Authorization: `Bearer ${token}`,
    },
    debug: function (str) {
      console.log('STOMP: ' + str);
    },
    reconnectDelay: 5000,
    heartbeatIncoming: 4000,
    heartbeatOutgoing: 4000,
  });
  
  return client;
};
