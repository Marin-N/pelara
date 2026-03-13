import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';
import api from '../services/api.js';

// Wraps Auth0 and adds our DB user (the record from the users table)
export const useAuth = () => {
  const { isAuthenticated, isLoading, user: auth0User, loginWithRedirect, logout, getAccessTokenSilently } = useAuth0();
  const [dbUser, setDbUser] = useState(null);
  const [userLoading, setUserLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !auth0User) return;
    // Fetch the user record from our database — creates it if first login
    const fetchDbUser = async () => {
      setUserLoading(true);
      try {
        const token = await getAccessTokenSilently();
        const res = await api.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setDbUser(res.data.data);
      } catch (err) {
        console.error('Failed to fetch user from DB', err);
      } finally {
        setUserLoading(false);
      }
    };
    fetchDbUser();
  }, [isAuthenticated, auth0User]);

  const handleLogout = () => {
    logout({ logoutParams: { returnTo: window.location.origin } });
  };

  return {
    isAuthenticated,
    isLoading: isLoading || userLoading,
    auth0User,
    user: dbUser,
    login: loginWithRedirect,
    logout: handleLogout,
    getToken: getAccessTokenSilently,
  };
};
