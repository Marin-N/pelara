import React from 'react';
import { NavLink } from 'react-router-dom';

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/clients', label: 'Clients', icon: '🏢' },
  { to: '/calls', label: 'Calls', icon: '📞' },
  { to: '/competitors', label: 'Competitors', icon: '🔭' },
  { to: '/reviews', label: 'Reviews', icon: '⭐' },
  { to: '/action-plans', label: 'Action Plan', icon: '🎯' },
  { to: '/reports', label: 'Reports', icon: '📄' },
  { to: '/alerts', label: 'Alerts', icon: '🔔' },
  { to: '/billing', label: 'Billing', icon: '💳' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Sidebar({ isOpen, isMobile, onClose }) {
  const sidebarStyle = {
    width: 220,
    background: '#18181c',
    borderRight: '1px solid #2a2a2e',
    display: 'flex',
    flexDirection: 'column',
    padding: '0 0 24px',
    flexShrink: 0,
    // Mobile: slide in from left as fixed overlay
    ...(isMobile ? {
      position: 'fixed',
      top: 0,
      left: 0,
      height: '100vh',
      zIndex: 100,
      transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
      transition: 'transform 0.25s ease',
    } : {
      // Desktop: hide/show by width
      transform: 'none',
      overflow: 'hidden',
      maxWidth: isOpen ? 220 : 0,
      minWidth: isOpen ? 220 : 0,
      transition: 'max-width 0.25s ease, min-width 0.25s ease',
      borderRight: isOpen ? '1px solid #2a2a2e' : 'none',
    }),
  };

  return (
    <aside style={sidebarStyle}>
      <div style={{ padding: '20px 20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#6c63ff', letterSpacing: '-0.5px' }}>
          Pelara
          <span style={{ display: 'block', fontSize: 11, color: '#555', fontWeight: 400, letterSpacing: 0 }}>
            See further. Act faster.
          </span>
        </div>
        {isMobile && (
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#555', fontSize: 22, cursor: 'pointer', padding: 0 }}
          >×</button>
        )}
      </div>
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '0 8px' }}>
        {nav.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={isMobile ? onClose : undefined}
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
