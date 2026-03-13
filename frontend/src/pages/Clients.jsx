import React from 'react';
import { useClients } from '../hooks/useClients.js';
import ClientList from '../components/Clients/ClientList.jsx';

const styles = {
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 700, color: '#fff' },
  addBtn: { background: '#6c63ff', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
};

export default function Clients() {
  const { clients, loading, error } = useClients();

  return (
    <div>
      <div style={styles.header}>
        <div style={styles.title}>Clients</div>
        <button style={styles.addBtn} onClick={() => alert('Client creation coming in Session 3')}>
          + Add Client
        </button>
      </div>
      <ClientList clients={clients} loading={loading} error={error} />
    </div>
  );
}
