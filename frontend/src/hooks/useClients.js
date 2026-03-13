import { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import api from '../services/api.js';

export const useClients = () => {
  const { getAccessTokenSilently } = useAuth0();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const token = await getAccessTokenSilently();
        const res = await api.get('/api/clients', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setClients(res.data.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return { clients, loading, error };
};
