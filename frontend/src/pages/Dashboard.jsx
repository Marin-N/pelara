import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useClients } from '../hooks/useClients.js';
import MetricCard from '../components/Dashboard/MetricCard.jsx';
import MetricChart from '../components/Dashboard/MetricChart.jsx';
import AlertBanner from '../components/Dashboard/AlertBanner.jsx';
import EmptyState from '../components/Common/EmptyState.jsx';
import api from '../services/api.js';
import { calcChange } from '../utils/chartHelpers.js';

const styles = {
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { fontSize: 24, fontWeight: 700, color: '#fff' },
  sub: { color: '#888', fontSize: 14, marginBottom: 28 },
  sectionTitle: { fontSize: 13, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12, marginTop: 28 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 16 },
  chartGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 },
  syncBtn: { background: 'none', border: '1px solid #6c63ff', color: '#6c63ff', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500 },
  syncBtnLoading: { opacity: 0.5, cursor: 'not-allowed' },
  noData: { background: '#18181c', border: '1px solid #2a2a2e', borderRadius: 12, padding: '24px', textAlign: 'center', color: '#555', fontSize: 13 },
  clientSelect: { background: '#18181c', border: '1px solid #333', color: '#fff', padding: '8px 12px', borderRadius: 8, fontSize: 14 },
  syncMsg: { background: '#1a1a2e', border: '1px solid #6c63ff33', color: '#a5a0ff', padding: '8px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 },
  connectionDots: { display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' },
  dot: (on) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: on ? '#22c55e' : '#555' }),
  postCard: { background: '#18181c', border: '1px solid #2a2a2e', borderRadius: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  postBadge: (status) => ({
    fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.5px',
    background: status === 'scheduled' ? '#1a1a2e' : status === 'published' ? '#052e16' : '#2d1b1b',
    color: status === 'scheduled' ? '#a5a0ff' : status === 'published' ? '#22c55e' : '#f87171',
  }),
  postInput: { background: '#18181c', border: '1px solid #333', color: '#fff', padding: '10px 12px', borderRadius: 8, fontSize: 13, width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: 80, fontFamily: 'inherit' },
  postInputSm: { background: '#18181c', border: '1px solid #333', color: '#fff', padding: '8px 12px', borderRadius: 8, fontSize: 13, width: '100%', boxSizing: 'border-box' },
  postSubmit: { background: '#6c63ff', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500 },
  postMsg: (ok) => ({ fontSize: 12, padding: '6px 12px', borderRadius: 6, background: ok ? '#052e16' : '#2d1b1b', color: ok ? '#22c55e' : '#f87171' }),
};

const sumTotal = (rows, key) => rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);
const halfTrend = (rows, key) => {
  const mid = Math.floor(rows.length / 2);
  return calcChange(
    sumTotal(rows.slice(mid), key),
    sumTotal(rows.slice(0, mid), key)
  );
};

export default function Dashboard() {
  const [params] = useSearchParams();
  const clientId = params.get('client');
  const { clients, loading: clientsLoading } = useClients();
  const { getAccessTokenSilently } = useAuth0();

  const [selectedId, setSelectedId] = useState(clientId || '');
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [posts, setPosts] = useState([]);
  const [postForm, setPostForm] = useState({ content: '', image_url: '', scheduled_for: '' });
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [postMsg, setPostMsg] = useState('');

  useEffect(() => {
    if (!selectedId && clients.length) setSelectedId(clients[0].id);
  }, [clients, selectedId]);

  useEffect(() => {
    if (clientId) setSelectedId(clientId);
  }, [clientId]);

  const fetchMetrics = useCallback(async () => {
    if (!selectedId) return;
    setMetricsLoading(true);
    try {
      const token = await getAccessTokenSilently();
      const res = await api.get(`/api/metrics/${selectedId}/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMetrics(res.data.data);
    } catch {
      setMetrics(null);
    } finally {
      setMetricsLoading(false);
    }
  }, [selectedId, getAccessTokenSilently]);

  const fetchAlerts = useCallback(async () => {
    if (!selectedId) return;
    try {
      const token = await getAccessTokenSilently();
      const res = await api.get(`/api/alerts/${selectedId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAlerts(res.data.data || []);
    } catch {
      setAlerts([]);
    }
  }, [selectedId, getAccessTokenSilently]);

  const fetchPosts = useCallback(async () => {
    if (!selectedId) return;
    try {
      const token = await getAccessTokenSilently();
      const res = await api.get(`/api/posts/${selectedId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPosts(res.data.data || []);
    } catch {
      setPosts([]);
    }
  }, [selectedId, getAccessTokenSilently]);

  useEffect(() => { fetchMetrics(); fetchAlerts(); fetchPosts(); }, [fetchMetrics, fetchAlerts, fetchPosts]);

  const handleSync = async () => {
    if (!selectedId || syncing) return;
    setSyncing(true);
    setSyncMsg('');
    try {
      const token = await getAccessTokenSilently();
      const res = await api.post(`/api/metrics/${selectedId}/sync`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = res.data.data;
      const ok = [];
      const errors = [];
      const check = (key, label) => {
        if (d[key] == null) return;
        if (String(d[key]).startsWith('error')) errors.push(`${label}: ${String(d[key]).replace('error: ', '')}`);
        else ok.push(`${label}: ${d[key]}d`);
      };
      check('gbp', 'GBP');
      check('ga4', 'GA4');
      check('gsc', 'GSC');
      check('facebook', 'FB');
      const parts = [];
      if (ok.length) parts.push(`Synced — ${ok.join(', ')}`);
      if (errors.length) parts.push(`Errors: ${errors.join(' | ')}`);
      setSyncMsg(parts.join(' · ') || 'Sync complete');
      await fetchMetrics();
      await fetchAlerts();
    } catch (err) {
      setSyncMsg(err.response?.data?.error || 'Sync failed — check Google is connected');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(''), 6000);
    }
  };

  const handleDismissAlert = async (alertId) => {
    try {
      const token = await getAccessTokenSilently();
      await api.put(`/api/alerts/${alertId}/read`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch { /* silent */ }
  };

  const handleSchedulePost = async (e) => {
    e.preventDefault();
    if (!postForm.content || !postForm.scheduled_for) return;
    setPostSubmitting(true);
    setPostMsg('');
    try {
      const token = await getAccessTokenSilently();
      await api.post(`/api/posts/${selectedId}/schedule`, {
        content: postForm.content,
        image_url: postForm.image_url || undefined,
        scheduled_for: postForm.scheduled_for,
        platform: 'gbp',
      }, { headers: { Authorization: `Bearer ${token}` } });
      setPostForm({ content: '', image_url: '', scheduled_for: '' });
      setPostMsg('Post scheduled successfully');
      await fetchPosts();
      setTimeout(() => setPostMsg(''), 4000);
    } catch (err) {
      setPostMsg(err.response?.data?.error || 'Failed to schedule post');
    } finally {
      setPostSubmitting(false);
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      const token = await getAccessTokenSilently();
      await api.delete(`/api/posts/${postId}`, { headers: { Authorization: `Bearer ${token}` } });
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch { /* silent */ }
  };

  const handleDismissAllAlerts = async () => {
    try {
      const token = await getAccessTokenSilently();
      await api.put(`/api/alerts/${selectedId}/read-all`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setAlerts([]);
    } catch { /* silent */ }
  };

  const selectedClient = clients.find((c) => c.id === selectedId);
  const gbp = metrics?.gbp || [];
  const ga4 = metrics?.ga4 || [];
  const gsc = metrics?.gsc || [];
  const fb = metrics?.facebook || [];
  const clientInfo = metrics?.client || {};

  const gbpChartData = gbp.map((r) => ({
    date: r.date,
    views: (r.views_search || 0) + (r.views_maps || 0),
    calls: r.clicks_phone || 0,
    website: r.clicks_website || 0,
  }));

  const ga4ChartData = ga4.map((r) => ({
    date: r.date,
    sessions: r.sessions || 0,
    organic: r.organic_sessions || 0,
  }));

  const gscChartData = gsc.map((r) => ({
    date: r.date,
    impressions: r.impressions || 0,
    clicks: r.clicks || 0,
  }));

  const fbChartData = fb.map((r) => ({
    date: r.date,
    reach: r.page_reach || 0,
    engagements: r.post_engagements || 0,
  }));

  const avgPosition = gsc.length
    ? (gsc.reduce((s, r) => s + (Number(r.average_position) || 0), 0) / gsc.length).toFixed(1)
    : 0;

  if (!clientsLoading && !clients.length) {
    return <EmptyState title="No clients yet" message="Go to Clients to add your first client." />;
  }

  return (
    <div>
      <div style={styles.header}>
        <div style={styles.title}>{selectedClient?.name || 'Dashboard'}</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {clients.length > 1 && (
            <select style={styles.clientSelect} value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <button
            style={{ ...styles.syncBtn, ...(syncing ? styles.syncBtnLoading : {}) }}
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? 'Syncing...' : '↻ Sync Now'}
          </button>
        </div>
      </div>

      {selectedClient && (
        <div style={styles.sub}>
          {selectedClient.city ? `${selectedClient.city} · ` : ''}
          {selectedClient.business_type || 'Local Business'}
        </div>
      )}

      {/* Connection status indicators */}
      {metrics && (
        <div style={styles.connectionDots}>
          <span style={styles.dot(clientInfo.has_google_connected)}>
            {clientInfo.has_google_connected ? '●' : '○'} Google Auth
          </span>
          <span style={styles.dot(clientInfo.has_gbp)}>
            {clientInfo.has_gbp ? '●' : '○'} GBP
          </span>
          <span style={styles.dot(clientInfo.has_ga4)}>
            {clientInfo.has_ga4 ? '●' : '○'} GA4
          </span>
          <span style={styles.dot(clientInfo.has_gsc)}>
            {clientInfo.has_gsc ? '●' : '○'} Search Console
          </span>
          <span style={styles.dot(clientInfo.has_facebook_connected)}>
            {clientInfo.has_facebook_connected ? '●' : '○'} Facebook
          </span>
        </div>
      )}

      {syncMsg && <div style={styles.syncMsg}>{syncMsg}</div>}

      <AlertBanner
        alerts={alerts}
        onDismiss={handleDismissAlert}
        onDismissAll={handleDismissAllAlerts}
      />

      {metricsLoading && <div style={styles.noData}>Loading metrics...</div>}

      {!metricsLoading && (
        <>
          {/* ── GBP Section ────────────────────────────────── */}
          {gbp.length > 0 ? (
            <>
              <div style={styles.sectionTitle}>Google Business Profile</div>
              <div style={styles.grid}>
                <MetricCard label="GBP Views (30d)" value={sumTotal(gbp, 'views_search') + sumTotal(gbp, 'views_maps')} change={halfTrend(gbp, 'views_search')} />
                <MetricCard label="Website Clicks" value={sumTotal(gbp, 'clicks_website')} change={halfTrend(gbp, 'clicks_website')} />
                <MetricCard label="Direction Requests" value={sumTotal(gbp, 'clicks_directions')} change={halfTrend(gbp, 'clicks_directions')} />
                <MetricCard label="Phone Clicks" value={sumTotal(gbp, 'clicks_phone')} change={halfTrend(gbp, 'clicks_phone')} />
              </div>
              <div style={styles.chartGrid}>
                <MetricChart data={gbpChartData} dataKey="views" label="GBP Views — last 30 days" color="#6c63ff" />
                <MetricChart data={gbpChartData} dataKey="calls" label="Phone Clicks — last 30 days" color="#22c55e" />
              </div>
            </>
          ) : clientInfo.has_gbp ? (
            <>
              <div style={styles.sectionTitle}>Google Business Profile</div>
              <div style={styles.noData}>No GBP data yet — click "Sync Now" to fetch</div>
            </>
          ) : null}

          {/* ── GA4 Section ────────────────────────────────── */}
          {ga4.length > 0 ? (
            <>
              <div style={styles.sectionTitle}>Google Analytics 4</div>
              <div style={styles.grid}>
                <MetricCard label="Sessions (30d)" value={sumTotal(ga4, 'sessions')} change={halfTrend(ga4, 'sessions')} />
                <MetricCard label="Users" value={sumTotal(ga4, 'users')} change={halfTrend(ga4, 'users')} />
                <MetricCard label="Organic Sessions" value={sumTotal(ga4, 'organic_sessions')} change={halfTrend(ga4, 'organic_sessions')} />
                <MetricCard label="Direct Sessions" value={sumTotal(ga4, 'direct_sessions')} change={halfTrend(ga4, 'direct_sessions')} />
              </div>
              <div style={styles.chartGrid}>
                <MetricChart data={ga4ChartData} dataKey="sessions" label="Sessions — last 30 days" color="#f59e0b" />
                <MetricChart data={ga4ChartData} dataKey="organic" label="Organic Sessions — last 30 days" color="#06b6d4" />
              </div>
            </>
          ) : clientInfo.has_ga4 ? (
            <>
              <div style={styles.sectionTitle}>Google Analytics 4</div>
              <div style={styles.noData}>No GA4 data yet — click "Sync Now" to fetch</div>
            </>
          ) : null}

          {/* ── GSC Section ────────────────────────────────── */}
          {gsc.length > 0 ? (
            <>
              <div style={styles.sectionTitle}>Google Search Console</div>
              <div style={styles.grid}>
                <MetricCard label="Impressions (30d)" value={sumTotal(gsc, 'impressions')} change={halfTrend(gsc, 'impressions')} />
                <MetricCard label="Search Clicks" value={sumTotal(gsc, 'clicks')} change={halfTrend(gsc, 'clicks')} />
                <MetricCard label="Avg. Position" value={avgPosition} change={null} />
                <MetricCard label="Click-Through Rate" value={`${(sumTotal(gsc, 'clicks') / Math.max(sumTotal(gsc, 'impressions'), 1) * 100).toFixed(1)}%`} change={null} />
              </div>
              <div style={styles.chartGrid}>
                <MetricChart data={gscChartData} dataKey="impressions" label="Impressions — last 30 days" color="#ec4899" />
                <MetricChart data={gscChartData} dataKey="clicks" label="Search Clicks — last 30 days" color="#8b5cf6" />
              </div>
            </>
          ) : clientInfo.has_gsc ? (
            <>
              <div style={styles.sectionTitle}>Google Search Console</div>
              <div style={styles.noData}>No GSC data yet — click "Sync Now" to fetch</div>
            </>
          ) : null}

          {/* ── Facebook Section ───────────────────────────── */}
          {fb.length > 0 ? (
            <>
              <div style={styles.sectionTitle}>Facebook Page</div>
              <div style={styles.grid}>
                <MetricCard label="Page Reach (30d)" value={sumTotal(fb, 'page_reach')} change={halfTrend(fb, 'page_reach')} />
                <MetricCard label="Post Engagements" value={sumTotal(fb, 'post_engagements')} change={halfTrend(fb, 'post_engagements')} />
                <MetricCard label="New Followers" value={sumTotal(fb, 'new_followers')} change={halfTrend(fb, 'new_followers')} />
                <MetricCard label="Total Followers" value={fb[fb.length - 1]?.followers_count || 0} change={null} />
              </div>
              <div style={styles.chartGrid}>
                <MetricChart data={fbChartData} dataKey="reach" label="Page Reach — last 30 days" color="#3b82f6" />
                <MetricChart data={fbChartData} dataKey="engagements" label="Post Engagements — last 30 days" color="#f97316" />
              </div>
            </>
          ) : clientInfo.has_facebook_connected ? (
            <>
              <div style={styles.sectionTitle}>Facebook Page</div>
              <div style={styles.noData}>No Facebook data yet — click "Sync Now" to fetch</div>
            </>
          ) : null}

          {/* No data at all */}
          {!gbp.length && !ga4.length && !gsc.length && !fb.length && !clientInfo.has_gbp && !clientInfo.has_ga4 && !clientInfo.has_gsc && !clientInfo.has_facebook_connected && (
            <div style={styles.noData}>
              {clientInfo.has_google_connected
                ? 'Add GA4 Property ID, GSC Site URL, or GBP Location ID to this client to start seeing metrics'
                : 'Connect Google on the Clients page, then set up GBP, GA4, and GSC IDs to start seeing metrics here'}
            </div>
          )}

          {/* ── GBP Posts Section ──────────────────────────── */}
          {selectedId && (
            <>
              <div style={styles.sectionTitle}>GBP Post Scheduler</div>

              {/* Schedule form */}
              <form onSubmit={handleSchedulePost} style={{ background: '#18181c', border: '1px solid #2a2a2e', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                <div style={{ marginBottom: 10 }}>
                  <textarea
                    style={styles.postInput}
                    placeholder="Post content — what do you want to publish to Google Business Profile?"
                    value={postForm.content}
                    onChange={(e) => setPostForm((p) => ({ ...p, content: e.target.value }))}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <input
                    style={styles.postInputSm}
                    type="text"
                    placeholder="Image URL (optional)"
                    value={postForm.image_url}
                    onChange={(e) => setPostForm((p) => ({ ...p, image_url: e.target.value }))}
                  />
                  <input
                    style={styles.postInputSm}
                    type="datetime-local"
                    value={postForm.scheduled_for}
                    onChange={(e) => setPostForm((p) => ({ ...p, scheduled_for: e.target.value }))}
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button type="submit" style={{ ...styles.postSubmit, opacity: postSubmitting ? 0.5 : 1 }} disabled={postSubmitting}>
                    {postSubmitting ? 'Scheduling...' : 'Schedule Post'}
                  </button>
                  {postMsg && (
                    <span style={styles.postMsg(postMsg.includes('success'))}>{postMsg}</span>
                  )}
                </div>
              </form>

              {/* Scheduled posts list */}
              {posts.length === 0 ? (
                <div style={styles.noData}>No posts scheduled yet — use the form above to schedule a GBP post</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                  {posts.map((post) => (
                    <div key={post.id} style={styles.postCard}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                          <span style={styles.postBadge(post.status)}>{post.status}</span>
                          <span style={{ fontSize: 12, color: '#555' }}>
                            {post.status === 'scheduled'
                              ? `Scheduled: ${new Date(post.scheduled_for).toLocaleString()}`
                              : post.published_at
                              ? `Published: ${new Date(post.published_at).toLocaleString()}`
                              : new Date(post.scheduled_for).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: '#ccc', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{post.content}</div>
                        {post.image_url && (
                          <div style={{ marginTop: 6, fontSize: 12, color: '#6c63ff' }}>
                            <a href={post.image_url} target="_blank" rel="noreferrer" style={{ color: '#6c63ff' }}>Image link</a>
                          </div>
                        )}
                      </div>
                      {post.status === 'scheduled' && (
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          style={{ background: 'none', border: '1px solid #3a2a2a', color: '#f87171', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, flexShrink: 0 }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
