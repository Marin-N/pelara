import { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import api from '../services/api.js';

export const useMetrics = (clientId, type = 'summary') => {
  const { getAccessTokenSilently } = useAuth0();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!clientId) return;
    const fetch = async () => {
      try {
        const token = await getAccessTokenSilently();
        const res = await api.get(`/api/metrics/${clientId}/${type}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMetrics(res.data.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [clientId, type]);

  return { metrics, loading, error };
};
