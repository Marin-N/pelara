import React, { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/Common/LoadingSpinner.jsx';

const styles = {
  page: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f0f11' },
  box: { background: '#18181c', border: '1px solid #2a2a2e', borderRadius: 16, padding: '48px 40px', width: 400, textAlign: 'center' },
  logo: { fontSize: 32, fontWeight: 800, color: '#6c63ff', marginBottom: 8 },
  tagline: { fontSize: 14, color: '#888', marginBottom: 40 },
  btn: { width: '100%', background: '#6c63ff', color: '#fff', border: 'none', padding: '13px 0', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.2px' },
  sub: { fontSize: 12, color: '#555', marginTop: 20 },
};

export default function LoginPage() {
  const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard');
  }, [isAuthenticated]);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div style={styles.page}>
      <div style={styles.box}>
        <div style={styles.logo}>Pelara</div>
        <div style={styles.tagline}>See further. Act faster.</div>
        <button style={styles.btn} onClick={() => loginWithRedirect()}>
          Log in with Auth0
        </button>
        <p style={styles.sub}>Analytics intelligence for local service businesses</p>
      </div>
    </div>
  );
}
