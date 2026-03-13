import React, { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/Common/LoadingSpinner.jsx';

// Auth0 redirects here after login. useAuth0 automatically processes the
// code/state params from the URL, so we just wait and then redirect to dashboard.
export default function CallbackPage() {
  const { isAuthenticated, isLoading, error } = useAuth0();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate('/dashboard');
  }, [isAuthenticated, isLoading]);

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#ef4444', background: '#0f0f11' }}>
      Auth error: {error.message}
    </div>
  );

  return <LoadingSpinner />;
}
