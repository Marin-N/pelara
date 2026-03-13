import React from 'react';
import { useAuth } from '../../hooks/useAuth.js';

const styles = {
  bar: { height: 60, background: '#18181c', borderBottom: '1px solid #2a2a2e', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 32px', gap: 12 },
  avatar: { width: 32, height: 32, borderRadius: '50%', background: '#6c63ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' },
  name: { fontSize: 14, color: '#ccc' },
  logoutBtn: { background: 'none', border: '1px solid #333', color: '#888', padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
};

export default function TopBar() {
  const { user, auth0User, logout } = useAuth();
  const displayName = user?.name || auth0User?.name || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header style={styles.bar}>
      <span style={styles.name}>{displayName}</span>
      <div style={styles.avatar}>{initial}</div>
      <button style={styles.logoutBtn} onClick={logout}>Log out</button>
    </header>
  );
}
