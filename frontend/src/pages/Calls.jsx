import React from 'react';

const styles = {
  title: { fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 8 },
  sub: { color: '#888', fontSize: 14 },
};

export default function Calls() {
  return (
    <div>
      <div style={styles.title}>Calls</div>
      <div style={styles.sub}>Coming in a future session.</div>
    </div>
  );
}
