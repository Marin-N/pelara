import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import TopBar from './TopBar.jsx';

const styles = {
  root: { display: 'flex', height: '100vh', overflow: 'hidden', background: '#0f0f11' },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  content: { flex: 1, overflow: 'auto', padding: '24px 32px' },
};

export default function Layout() {
  return (
    <div style={styles.root}>
      <Sidebar />
      <div style={styles.main}>
        <TopBar />
        <main style={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
