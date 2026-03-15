import React from 'react';
import { useAuth } from '../../hooks/useAuth.js';

export default function TopBar({ onMenuToggle, isMobile }) {
  const { user, auth0User, logout } = useAuth();
  const displayName = user?.name || auth0User?.name || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header style={{
      height: 60,
      background: '#18181c',
      borderBottom: '1px solid #2a2a2e',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      gap: 12,
      flexShrink: 0,
    }}>
      {/* Hamburger on mobile */}
      {isMobile && (
        <button
          onClick={onMenuToggle}
          style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 22, padding: '0 4px', display: 'flex', alignItems: 'center' }}
          aria-label="Toggle menu"
        >
          ☰
        </button>
      )}

      <div style={{ flex: 1 }} />

      <span style={{ fontSize: 14, color: '#ccc' }}>{displayName}</span>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#6c63ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>
        {initial}
      </div>
      <button
        style={{ background: 'none', border: '1px solid #333', color: '#888', padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
        onClick={logout}
      >
        Log out
      </button>
    </header>
  );
}
