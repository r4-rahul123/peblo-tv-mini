import React, { useEffect, useState, useCallback } from 'react';
import { getStoredRole, setStoredRole } from '../api/client';

interface ValidationIssue {
  entity_type: string;
  entity_id: string;
  entity_title: string;
  severity: string;
  field: string;
  message: string;
  action_required: string;
}

interface ValidationReport {
  is_publishable: boolean;
  total_blockers: number;
  total_warnings: number;
  published_shows_count: number;
  published_episodes_count: number;
  issues_by_show: Record<string, ValidationIssue[]>;
  general_issues: ValidationIssue[];
}

interface PublishRun {
  run_id: string;
  triggered_by: string;
  status: string;
  shows_count: number;
  episodes_count: number;
  sections_count: number;
  catalogue_path?: string;
  error_message?: string;
  created_at: string;
}

interface PublishDashboardProps {
  onRoleChange?: () => void;
}

const safeJson = async (res: Response): Promise<any> => {
  try {
    const text = await res.text();
    if (!text || !text.trim()) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
};

export const PublishDashboard: React.FC<PublishDashboardProps> = ({ onRoleChange }) => {
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [runs, setRuns] = useState<PublishRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<'admin' | 'editor'>(getStoredRole());

  const isAdmin = currentRole === 'admin';

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = { 'X-User-Role': getStoredRole() };
      const [reportRes, runsRes] = await Promise.all([
        fetch('/api/v1/admin/validation/report', { headers }),
        fetch('/api/v1/admin/catalog/runs', { headers }),
      ]);

      if (!reportRes.ok) {
        throw new Error(`Validation API failed: ${reportRes.status} ${reportRes.statusText}`);
      }
      if (!runsRes.ok) {
        throw new Error(`Runs API failed: ${runsRes.status} ${runsRes.statusText}`);
      }

      const reportData = await safeJson(reportRes);
      const runsData = await safeJson(runsRes);

      setReport(reportData);
      setRuns(Array.isArray(runsData) ? runsData : []);
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Keep role synchronized
  useEffect(() => {
    setCurrentRole(getStoredRole());
  }, []);

  const handleSwitchToAdmin = () => {
    setStoredRole('admin');
    setCurrentRole(getStoredRole());
    if (onRoleChange) onRoleChange();
    setPublishMsg(null);
  };

  const handlePublish = async () => {
    const activeRole = getStoredRole();
    if (activeRole !== 'admin') {
      setPublishMsg('❌ Forbidden: Only Admin (Publisher) can publish the catalogue. Switch to Admin in the top-right header.');
      return;
    }

    setPublishing(true);
    setPublishMsg(null);
    try {
      const res = await fetch('/api/v1/admin/catalog/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': activeRole,
        },
      });
      const data = await safeJson(res);
      if (res.ok) {
        setPublishMsg(`✅ Published Successfully! Version: ${data?.run_id || 'latest'}, ${data?.shows_count || 0} shows, ${data?.episodes_count || 0} episodes.`);
        fetchData();
      } else {
        const errorDetail = data?.detail?.message || data?.detail || JSON.stringify(data);
        if (res.status === 403) {
          setPublishMsg(`❌ Forbidden: Only Admin can publish catalogue. Switch role to Admin.`);
        } else {
          setPublishMsg(`❌ Publish failed: ${typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail)}`);
        }
      }
    } catch (err: any) {
      setPublishMsg(`❌ Error: ${err.message}`);
    } finally {
      setPublishing(false);
    }
  };

  const handleRollback = async (runId: string) => {
    const activeRole = getStoredRole();
    if (activeRole !== 'admin') {
      setPublishMsg('❌ Forbidden: Only Admin (Publisher) can trigger catalogue rollbacks. Switch to Admin in the top-right header.');
      return;
    }

    if (!window.confirm(`Are you sure you want to rollback catalogue to run ${runId}?`)) return;

    try {
      const res = await fetch(`/api/v1/admin/catalog/rollback/${runId}`, {
        method: 'POST',
        headers: { 'X-User-Role': activeRole },
      });
      const data = await safeJson(res);
      if (res.ok) {
        setPublishMsg(`✅ Successfully rolled back catalogue to ${runId}!`);
        fetchData();
      } else {
        if (res.status === 403) {
          setPublishMsg(`❌ Forbidden: Only Admin can rollback catalogue.`);
        } else {
          setPublishMsg(`❌ Rollback failed: ${data?.detail || 'Unknown error'}`);
        }
      }
    } catch (err: any) {
      setPublishMsg(`❌ Error: ${err.message}`);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      let normalized = dateStr.trim();
      // If datetime string doesn't have timezone offset or Z, append Z (it's UTC from backend)
      if (!normalized.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(normalized)) {
        normalized = normalized.includes('T') ? `${normalized}Z` : `${normalized.replace(' ', 'T')}Z`;
      }
      const d = new Date(normalized);
      if (isNaN(d.getTime())) {
        return dateStr;
      }
      return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', color: '#f59e0b', marginBottom: '10px' }}>⏳ Loading Dashboard...</div>
        <div style={{ color: '#94a3b8', fontSize: '14px' }}>Fetching validation report and publish history</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', maxWidth: '500px', margin: '40px auto', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
        <h3 style={{ color: '#fff', marginBottom: '8px', fontSize: '16px' }}>Dashboard Connection Error</h3>
        <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '16px' }}>{error}</p>
        <button
          onClick={fetchData}
          style={{ background: '#f59e0b', color: '#000', fontWeight: 'bold', padding: '8px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '13px' }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 16px 60px' }}>
      {/* Title */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#fff', margin: 0 }}>Catalogue Publish Pipeline</h1>
        <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0' }}>Pre-publish validation engine, atomic JSON generator, and publish audit log</p>
      </div>

      {/* Role Notice Banner */}
      {!isAdmin ? (
        <div style={{
          background: 'rgba(30, 58, 138, 0.4)',
          border: '1px solid rgba(59, 130, 246, 0.5)',
          borderRadius: '12px',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div>
            <div style={{ fontWeight: 'bold', color: '#93c5fd', fontSize: '13px', marginBottom: '3px' }}>
              🛡️ Current Role: Content Editor
            </div>
            <div style={{ color: '#bfdbfe', fontSize: '12px' }}>
              You can review validation blockers and edit shows. <strong>Publishing &amp; rollback requires the Admin role.</strong>
            </div>
          </div>
          <button
            onClick={handleSwitchToAdmin}
            style={{
              background: '#9333ea',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            Switch to Admin Role
          </button>
        </div>
      ) : (
        <div style={{
          background: 'rgba(88, 28, 135, 0.25)',
          border: '1px solid rgba(168, 85, 247, 0.4)',
          borderRadius: '12px',
          padding: '10px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{ fontSize: '14px' }}>👑</span>
          <span style={{ color: '#d8b4fe', fontSize: '12px', fontWeight: '600' }}>
            Current Role: Admin (Publisher) — You have full authorization to publish and rollback catalogue.
          </span>
        </div>
      )}

      {/* Publish Status Card */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '24px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: report?.is_publishable ? '#22c55e' : '#ef4444', display: 'inline-block' }} />
            <span style={{ fontSize: '17px', fontWeight: 'bold', color: '#fff' }}>
              {report?.is_publishable ? 'Catalogue Ready to Publish' : 'Publication Blocked'}
            </span>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>
            {report?.is_publishable
              ? `All business rules satisfied (${report.published_shows_count} shows, ${report.published_episodes_count} episodes). Ready for atomic distribution.`
              : `${report?.total_blockers || 0} blocking issue(s) detected. Resolve blockers below to enable publishing.`}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
          <button
            onClick={handlePublish}
            disabled={publishing || !report?.is_publishable || !isAdmin}
            style={{
              background: !report?.is_publishable
                ? '#334155'
                : !isAdmin
                ? '#1e293b'
                : 'linear-gradient(135deg, #22c55e, #14b8a6)',
              color: report?.is_publishable && isAdmin ? '#000' : '#94a3b8',
              fontWeight: 'bold',
              padding: '12px 24px',
              borderRadius: '12px',
              border: !isAdmin ? '1px solid #475569' : 'none',
              cursor: publishing || !report?.is_publishable || !isAdmin ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              opacity: publishing ? 0.7 : 1,
            }}
          >
            {publishing
              ? '⏳ Publishing...'
              : !isAdmin
              ? 'Publish Disabled (Admin Only)'
              : '🚀 Publish Catalogue'}
          </button>
          {!isAdmin && (
            <span style={{ fontSize: '11px', color: '#93c5fd' }}>
              Switch to Admin role to publish
            </span>
          )}
        </div>
      </div>

      {/* Publish Message / Error Alert */}
      {publishMsg && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '10px',
          marginBottom: '20px',
          fontSize: '13px',
          background: publishMsg.startsWith('✅') ? '#052e16' : '#450a0a',
          color: publishMsg.startsWith('✅') ? '#86efac' : '#fca5a5',
          border: `1px solid ${publishMsg.startsWith('✅') ? '#166534' : '#991b1b'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>{publishMsg}</span>
          <button
            onClick={() => setPublishMsg(null)}
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '14px' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Validation Blockers */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff', margin: 0 }}>Pre-Publish Blocker Report</h3>
            <p style={{ color: '#94a3b8', fontSize: '11px', margin: '2px 0 0' }}>Actionable guidance for content editors</p>
          </div>
          <span style={{
            fontSize: '11px',
            fontWeight: 'bold',
            padding: '3px 10px',
            borderRadius: '999px',
            background: (report?.total_blockers || 0) === 0 ? '#052e16' : '#450a0a',
            color: (report?.total_blockers || 0) === 0 ? '#86efac' : '#fca5a5',
            border: `1px solid ${(report?.total_blockers || 0) === 0 ? '#166534' : '#991b1b'}`,
          }}>
            {report?.total_blockers || 0} Blockers
          </span>
        </div>

        {(report?.total_blockers || 0) === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: '#22c55e' }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>✅</div>
            <div style={{ fontWeight: '600', fontSize: '14px' }}>All Checks Passed Cleanly</div>
            <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>No missing artwork, duration errors, or duplicate content groups found.</div>
          </div>
        ) : (
          <div>
            {Object.entries(report?.issues_by_show || {}).map(([showTitle, issues]) => (
              <div key={showTitle} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '14px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontWeight: 'bold', color: '#e2e8f0', fontSize: '13px' }}>{showTitle}</span>
                  <span style={{ fontSize: '10px', background: '#450a0a', color: '#fca5a5', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>{issues.length} issue(s)</span>
                </div>
                {issues.map((issue, idx) => (
                  <div key={idx} style={{ background: '#1e293b', border: '1px solid #450a0a', borderRadius: '8px', padding: '10px', marginBottom: '6px', fontSize: '12px' }}>
                    <div style={{ marginBottom: '4px' }}>
                      <span style={{ background: '#7f1d1d', color: '#fca5a5', fontWeight: 'bold', padding: '1px 6px', borderRadius: '3px', fontSize: '10px', marginRight: '8px' }}>{issue.severity}</span>
                      <span style={{ color: '#e2e8f0', fontWeight: '600' }}>{issue.entity_title}</span>
                    </div>
                    <div style={{ color: '#cbd5e1' }}>{issue.message}</div>
                    <div style={{ color: '#fbbf24', fontWeight: '500', marginTop: '4px' }}>→ Action: {issue.action_required}</div>
                  </div>
                ))}
              </div>
            ))}
            {(report?.general_issues?.length || 0) > 0 && (
              <div style={{ background: '#450a0a33', padding: '12px', borderRadius: '8px', marginTop: '10px' }}>
                <h4 style={{ color: '#fca5a5', fontWeight: '600', marginBottom: '8px', fontSize: '13px' }}>General Issues</h4>
                {report?.general_issues?.map((issue, i) => (
                  <div key={i} style={{ color: '#fca5a5', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ fontFamily: 'monospace', marginRight: '8px' }}>[{issue.severity}]</span>
                    {issue.message} — <span style={{ color: '#94a3b8' }}>{issue.action_required}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Publish History */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff', borderBottom: '1px solid #334155', paddingBottom: '12px', marginTop: 0, marginBottom: '16px' }}>
          Publish Run Audit History
        </h3>

        {runs.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>No publish runs recorded yet.</p>
        ) : (
          <div>
            {runs.map((run, idx) => (
              <div key={run.run_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: idx < runs.length - 1 ? '1px solid #334155' : 'none', fontSize: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#e2e8f0' }}>{run.run_id}</span>
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                      background: run.status === 'SUCCESS' ? '#052e16' : '#450a0a',
                      color: run.status === 'SUCCESS' ? '#86efac' : '#fca5a5',
                    }}>
                      {run.status}
                    </span>
                    {idx === 0 && run.status === 'SUCCESS' && (
                      <span style={{ fontSize: '9px', background: '#f59e0b22', color: '#fbbf24', border: '1px solid #f59e0b44', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                        ACTIVE LIVE
                      </span>
                    )}
                  </div>
                  <div style={{ color: '#94a3b8' }}>
                    Triggered by <span style={{ color: '#cbd5e1', fontWeight: '600' }}>{run.triggered_by}</span> &bull;{' '}
                    <span style={{ color: '#f8fafc' }}>{formatDate(run.created_at)}</span>
                  </div>
                  {run.error_message && <div style={{ color: '#fca5a5', fontSize: '11px', marginTop: '2px' }}>{run.error_message}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ textAlign: 'right', color: '#94a3b8', fontFamily: 'monospace', fontSize: '11px' }}>
                    <div>{run.shows_count} shows / {run.episodes_count} ep</div>
                    <div style={{ color: '#64748b' }}>{run.sections_count} sections</div>
                  </div>
                  {run.status === 'SUCCESS' && idx !== 0 && (
                    <button
                      onClick={() => handleRollback(run.run_id)}
                      disabled={!isAdmin}
                      style={{
                        background: isAdmin ? '#334155' : '#1e293b',
                        color: isAdmin ? '#e2e8f0' : '#64748b',
                        border: '1px solid #475569',
                        padding: '5px 12px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: isAdmin ? 'pointer' : 'not-allowed',
                      }}
                      title={isAdmin ? `Rollback to ${run.run_id}` : 'Switch to Admin role to rollback'}
                    >
                      ↩ Rollback
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
