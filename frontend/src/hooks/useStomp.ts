import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import { createStompClient } from '../lib/websocket';

export function useStomp() {
  const [connected, setConnected] = useState(false);
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    const client = createStompClient();
    clientRef.current = client;

    client.onConnect = (frame) => {
      console.log('STOMP Connected: ' + frame);
      setConnected(true);
    };

    client.onStompError = (frame) => {
      console.error('STOMP Error: ', frame.headers['message']);
      console.error('Details: ', frame.body);
    };

    client.onWebSocketClose = () => {
      setConnected(false);
    };

    client.activate();

    return () => {
      client.deactivate();
    };
  }, []);

  return { client: clientRef.current, connected };
}
