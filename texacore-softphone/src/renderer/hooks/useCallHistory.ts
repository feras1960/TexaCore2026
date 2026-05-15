import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

export interface CallRecord {
  id: string;
  number: string;
  direction: 'inbound' | 'outbound' | 'missed';
  timestamp: string;
  duration: number;
}

export function useCallHistory() {
  const [history, setHistory] = useState<CallRecord[]>([]);

  useEffect(() => {
    const loadHistory = () => {
      const stored = localStorage.getItem('pbx_call_history');
      if (stored) {
        try {
          setHistory(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse call history', e);
        }
      }
    };
    loadHistory();
    // Listen for cross-tab or same-app updates
    window.addEventListener('storage', loadHistory);
    return () => window.removeEventListener('storage', loadHistory);
  }, []);

  const addCallRecord = useCallback((record: Omit<CallRecord, 'id' | 'timestamp'>) => {
    setHistory(prev => {
      const newRecord: CallRecord = {
        ...record,
        id: uuidv4(),
        timestamp: new Date().toISOString()
      };
      const updated = [newRecord, ...prev].slice(0, 200); // Keep last 200
      localStorage.setItem('pbx_call_history', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    localStorage.removeItem('pbx_call_history');
    setHistory([]);
  }, []);

  const deleteRecord = useCallback((id: string) => {
    setHistory(prev => {
      const updated = prev.filter(r => r.id !== id);
      localStorage.setItem('pbx_call_history', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return {
    history,
    addCallRecord,
    clearHistory,
    deleteRecord
  };
}
