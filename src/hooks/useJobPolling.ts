import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { StatoJobDettaglio, StatoJobOutput } from '../types';

export function useJobPolling(mode: 'email' | 'file' = 'email') {
  const [job, setJob] = useState<StatoJobDettaglio | StatoJobOutput | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
     let interval: any;
     const checkStatus = async () => {
         try {
             const endpoint = mode === 'email' ? '/email/status/current' : '/output/status/current';
             const res = await apiClient.get<any>(endpoint);
             if (res.stato === 'nessun_job') {
                 // Ignore or clear
             } else {
                 setJob(res);
             }
         } catch(e: any) {
             console.error("Errore polling:", e);
             setError(e.message);
         }
     };

     checkStatus();
     interval = setInterval(checkStatus, 1000);
     return () => clearInterval(interval);
  }, [mode]);

  return { job, error };
}
