import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import TopBar from './TopBar.jsx';
import { ToastProvider } from '../Common/Toast.jsx';
import { useClients } from '../../hooks/useClients.js';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

function LayoutInner() {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const navigate = useNavigate();
  const { clients, loading: clientsLoading } = useClients();

  // Close sidebar when switching to mobile
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
    else setSidebarOpen(true);
  }, [isMobile]);

  // Onboarding redirect — when user has 0 clients and hasn't dismissed onboarding
  useEffect(() => {
    if (!clientsLoading && clients.length === 0) {
      const dismissed = localStorage.getItem('onboarding_dismissed');
      if (!dismissed) navigate('/onboarding', { replace: true });
    }
  }, [clients, clientsLoading, navigate]);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0f0f11' }}>
      {/* Mobile overlay backdrop */}
      {isMobile && sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        isOpen={sidebarOpen}
        isMobile={isMobile}
        onClose={() => setSidebarOpen(false)}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar onMenuToggle={() => setSidebarOpen((o) => !o)} isMobile={isMobile} />
        <main style={{ flex: 1, overflow: 'auto', padding: isMobile ? '16px' : '24px 32px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function Layout() {
  return (
    <ToastProvider>
      <LayoutInner />
    </ToastProvider>
  );
}
