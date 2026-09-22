import React, { useEffect, useState, useCallback } from 'react';
import { getStoredRole, setStoredRole, BACKEND_URL } from '../api/client';

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
        fetch(`${BACKEND_URL}/api/v1/admin/validation/report`, { headers }),
        fetch(`${BACKEND_URL}/api/v1/admin/catalog/runs`, { headers }),
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
      const res = await fetch(`${BACKEND_URL}/api/v1/admin/catalog/publish`, {
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
      const res = await fetch(`${BACKEND_URL}/api/v1/admin/catalog/rollback/${runId}`, {
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
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-2 sm:py-6 space-y-5">
      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Catalogue Publish Pipeline</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">Pre-publish validation engine, atomic JSON generator, and publish audit log</p>
      </div>

      {/* Role Notice Banner */}
      {!isAdmin ? (
        <div className="bg-blue-950/40 border border-blue-600/40 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="font-bold text-blue-300 text-xs sm:text-sm mb-1">
              🛡️ Current Role: Content Editor
            </div>
            <div className="text-blue-200/80 text-xs leading-relaxed">
              You can review validation blockers and edit shows. <strong>Publishing &amp; rollback requires the Admin role.</strong>
            </div>
          </div>
          <button
            onClick={handleSwitchToAdmin}
            className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md transition-all shrink-0"
          >
            Switch to Admin Role
          </button>
        </div>
      ) : (
        <div className="bg-purple-950/30 border border-purple-600/30 rounded-2xl p-3 sm:p-4 flex items-center gap-2.5">
          <span className="text-base">👑</span>
          <span className="text-purple-200 text-xs sm:text-sm font-semibold">
            Current Role: Admin (Publisher) — Full authorization to publish and rollback catalogue.
          </span>
        </div>
      )}

      {/* Publish Status Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 shadow-lg">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className={`w-3 h-3 rounded-full ${report?.is_publishable ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            <h2 className="text-base sm:text-lg font-bold text-white">
              {report?.is_publishable ? 'Catalogue Ready to Publish' : 'Publication Blocked'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
            {report?.is_publishable
              ? `All business rules satisfied (${report.published_shows_count} shows, ${report.published_episodes_count} episodes). Ready for atomic distribution.`
              : `${report?.total_blockers || 0} blocking issue(s) detected. Resolve blockers below to enable publishing.`}
          </p>
        </div>
        <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
          <button
            onClick={handlePublish}
            disabled={publishing || !report?.is_publishable || !isAdmin}
            className={`w-full sm:w-auto font-black px-6 py-3 rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center space-x-2 shadow-lg ${
              !report?.is_publishable
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : !isAdmin
                ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                : 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 hover:from-emerald-400 hover:to-teal-300 shadow-emerald-500/20'
            }`}
          >
            <span>
              {publishing
                ? '⏳ Publishing...'
                : !isAdmin
                ? 'Publish Disabled (Admin Only)'
                : '🚀 Publish Catalogue'}
            </span>
          </button>
          {!isAdmin && (
            <span className="text-[11px] text-blue-400 text-center sm:text-right">
              Switch to Admin role to publish
            </span>
          )}
        </div>
      </div>

      {/* Publish Message / Error Alert */}
      {publishMsg && (
        <div className={`p-3.5 rounded-xl text-xs flex justify-between items-center border ${
          publishMsg.startsWith('✅')
            ? 'bg-emerald-950/80 text-emerald-200 border-emerald-800'
            : 'bg-red-950/80 text-red-200 border-red-800'
        }`}>
          <span className="leading-relaxed">{publishMsg}</span>
          <button
            onClick={() => setPublishMsg(null)}
            className="text-white hover:text-slate-300 ml-3 font-bold text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* Validation Blockers */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-lg">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">Pre-Publish Blocker Report</h3>
            <p className="text-[11px] text-slate-400">Actionable guidance for content editors</p>
          </div>
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
            (report?.total_blockers || 0) === 0
              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
              : 'bg-red-950 text-red-300 border-red-800'
          }`}>
            {report?.total_blockers || 0} Blockers
          </span>
        </div>

        {(report?.total_blockers || 0) === 0 ? (
          <div className="text-center py-6 text-emerald-400">
            <div className="text-3xl mb-2">✅</div>
            <div className="font-bold text-sm">All Checks Passed Cleanly</div>
            <div className="text-slate-400 text-xs mt-1">No missing artwork, duration errors, or duplicate content groups found.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(report?.issues_by_show || {}).map(([showTitle, issues]) => (
              <div key={showTitle} className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-200 text-xs sm:text-sm truncate">{showTitle}</span>
                  <span className="text-[10px] bg-red-950 text-red-300 border border-red-900 px-2 py-0.5 rounded font-mono shrink-0 ml-2">{issues.length} issue(s)</span>
                </div>
                {issues.map((issue, idx) => (
                  <div key={idx} className="bg-slate-900 border border-red-950 rounded-lg p-2.5 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="bg-red-900/80 text-red-200 font-bold px-1.5 py-0.2 rounded text-[10px]">{issue.severity}</span>
                      <span className="text-slate-200 font-semibold">{issue.entity_title}</span>
                    </div>
                    <div className="text-slate-300 text-[11px]">{issue.message}</div>
                    <div className="text-amber-400 font-medium text-[11px]">→ Action: {issue.action_required}</div>
                  </div>
                ))}
              </div>
            ))}
            {(report?.general_issues?.length || 0) > 0 && (
              <div className="bg-red-950/20 border border-red-900/40 p-3 rounded-xl">
                <h4 className="text-red-300 font-bold text-xs mb-2">General Issues</h4>
                {report?.general_issues?.map((issue, i) => (
                  <div key={i} className="text-red-300 text-xs mb-1">
                    <span className="font-mono mr-1.5">[{issue.severity}]</span>
                    {issue.message} — <span className="text-slate-400">{issue.action_required}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Publish History */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-lg">
        <h3 className="text-sm sm:text-base font-bold text-white border-b border-slate-800 pb-3 mb-4">
          Publish Run Audit History
        </h3>

        {runs.length === 0 ? (
          <p className="text-slate-500 text-xs sm:text-sm text-center py-6">No publish runs recorded yet.</p>
        ) : (
          <div className="divide-y divide-slate-800">
            {runs.map((run, idx) => (
              <div key={run.run_id} className="py-3.5 space-y-2.5">
                {/* Top Row: Run ID, Badges, and Stats */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-xs text-slate-200 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {run.run_id}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      run.status === 'SUCCESS' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-red-950 text-red-300 border border-red-800'
                    }`}>
                      {run.status}
                    </span>
                    {idx === 0 && run.status === 'SUCCESS' && (
                      <span className="text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-black tracking-wide">
                        ACTIVE LIVE
                      </span>
                    )}
                  </div>
                  <div className="text-slate-400 font-mono text-[11px] sm:text-right">
                    <span>{run.shows_count} shows • {run.episodes_count} episodes • {run.sections_count} sections</span>
                  </div>
                </div>

                {/* Bottom Row: Metadata & Responsive Rollback Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="text-slate-400 text-[11px]">
                    Triggered by <span className="text-slate-200 font-semibold">{run.triggered_by}</span> &bull;{' '}
                    <span className="text-slate-300">{formatDate(run.created_at)}</span>
                  </div>
                  {run.status === 'SUCCESS' && idx !== 0 && (
                    <div className="pt-1 sm:pt-0">
                      <button
                        onClick={() => handleRollback(run.run_id)}
                        disabled={!isAdmin}
                        className={`w-full sm:w-auto px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center space-x-1.5 ${
                          isAdmin
                            ? 'bg-slate-800 hover:bg-purple-600 text-slate-200 hover:text-white border border-slate-700 cursor-pointer shadow-sm'
                            : 'bg-slate-950 text-slate-600 border border-slate-800 cursor-not-allowed'
                        }`}
                        title={isAdmin ? `Rollback to ${run.run_id}` : 'Switch to Admin role to rollback'}
                      >
                        <span>↩ Rollback to this version</span>
                      </button>
                    </div>
                  )}
                </div>
                {run.error_message && <div className="text-red-400 text-[11px] mt-1">{run.error_message}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
