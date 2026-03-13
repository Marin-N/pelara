import { useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import api from '../services/api.js';

export const useClients = () => {
  const { getAccessTokenSilently } = useAuth0();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAccessTokenSilently();
      const res = await api.get('/api/clients', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClients(res.data.data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [getAccessTokenSilently]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  return { clients, loading, error, refetch: fetchClients };
};
