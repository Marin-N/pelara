import React from 'react';
import { NavLink } from 'react-router-dom';

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/clients', label: 'Clients', icon: '🏢' },
  { to: '/calls', label: 'Calls', icon: '📞' },
  { to: '/competitors', label: 'Competitors', icon: '🔭' },
  { to: '/reports', label: 'Reports', icon: '📄' },
  { to: '/alerts', label: 'Alerts', icon: '🔔' },
  { to: '/billing', label: 'Billing', icon: '💳' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

const styles = {
  sidebar: { width: 220, background: '#18181c', borderRight: '1px solid #2a2a2e', display: 'flex', flexDirection: 'column', padding: '0 0 24px' },
  brand: { padding: '24px 20px 32px', fontSize: 20, fontWeight: 700, color: '#6c63ff', letterSpacing: '-0.5px' },
  tagline: { display: 'block', fontSize: 11, color: '#555', fontWeight: 400, letterSpacing: 0 },
  nav: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '0 8px' },
};

export default function Sidebar() {
  return (
    <aside style={styles.sidebar}>
      <div style={styles.brand}>
        Pelara
        <span style={styles.tagline}>See further. Act faster.</span>
      </div>
      <nav style={styles.nav}>
        {nav.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 8, textDecoration: 'none',
              fontSize: 14, color: isActive ? '#fff' : '#888',
              background: isActive ? '#6c63ff22' : 'transparent',
              fontWeight: isActive ? 600 : 400,
            })}
          >
            <span>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
