import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';

const StreamContext = createContext(null);

export const StreamProvider = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const [subscribers, setSubscribers] = useState([]);

  useEffect(() => {
    let eventSource = null;

    const connectSSE = () => {
      eventSource = new EventSource('/api/stream');

      eventSource.onopen = () => {
        setConnected(true);
      };

      eventSource.addEventListener('update', (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastEvent(data);

          if (data.type === 'TRANSFER_APPROVED') {
            // Trigger joyful confetti!
            confetti({
              particleCount: 120,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6']
            });
          }

          // Notify internal listeners
          subscribers.forEach((cb) => cb(data));
        } catch (e) {
          console.error('[SSE Error]', e);
        }
      });

      eventSource.onerror = () => {
        setConnected(false);
        eventSource.close();
        setTimeout(connectSSE, 4000);
      };
    };

    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [subscribers]);

  const subscribe = useCallback((callback) => {
    setSubscribers((prev) => [...prev, callback]);
    return () => {
      setSubscribers((prev) => prev.filter((cb) => cb !== callback));
    };
  }, []);

  return (
    <StreamContext.Provider value={{ connected, lastEvent, subscribe }}>
      {children}
    </StreamContext.Provider>
  );
};

export const useStream = () => useContext(StreamContext);
