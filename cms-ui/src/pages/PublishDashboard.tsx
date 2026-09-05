import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { getStoredRole } from '../api/client';
import { ValidationReport, PublishRun } from '../types';
import { UploadCloud, AlertCircle, CheckCircle2, ShieldAlert, RotateCcw } from 'lucide-react';

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '';
  const utcStr = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : `${dateStr}Z`;
  return new Date(utcStr).toLocaleString();
};

export const PublishDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const role = getStoredRole();
  const isAdmin = role === 'admin';

  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const { data: report } = useQuery<ValidationReport>({
    queryKey: ['validationReport'],
    queryFn: async () => {
      const res = await api.get('/admin/validation/report');
      return res.data;
    },
    staleTime: 60 * 1000,
  });

  const { data: runs = [] } = useQuery<PublishRun[]>({
    queryKey: ['publishRuns'],
    queryFn: async () => {
      const res = await api.get('/admin/catalog/runs');
      return res.data;
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/admin/catalog/publish');
      return res.data;
    },
    onSuccess: (data) => {
      setPublishMessage(
        `Catalogue successfully published! (Version: ${data.run_id}, ${data.shows_count} shows, ${data.episodes_count} episodes).`
      );
      setPublishError(null);
      queryClient.invalidateQueries({ queryKey: ['publishRuns'] });
      queryClient.invalidateQueries({ queryKey: ['validationReport'] });
    },
    onError: (err: any) => {
      if (err.response?.status === 403) {
        setPublishError('Forbidden: Only the Admin role can publish the catalogue. Switch to Admin in the top-right header.');
      } else if (err.response?.data?.detail?.message) {
        setPublishError(err.response.data.detail.message);
      } else {
        setPublishError(err.response?.data?.detail || 'Catalogue publish failed.');
      }
      setPublishMessage(null);
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: async (runId: string) => {
      const res = await api.post(`/admin/catalog/rollback/${runId}`);
      return res.data;
    },
    onSuccess: (data) => {
      setPublishMessage(`Successfully restored & rolled back catalogue to run ${data.restored_from}!`);
      setPublishError(null);
      queryClient.invalidateQueries({ queryKey: ['publishRuns'] });
      queryClient.invalidateQueries({ queryKey: ['validationReport'] });
    },
    onError: (err: any) => {
      if (err.response?.status === 403) {
        setPublishError('Forbidden: Only the Admin role can trigger catalogue rollbacks.');
      } else {
        setPublishError(err.response?.data?.detail || 'Catalogue rollback failed.');
      }
      setPublishMessage(null);
    },
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Catalogue Publish Pipeline</h1>
        <p className="text-sm text-slate-400">Pre-publish validation engine, atomic JSON generator, and publish audit log</p>
      </div>

      {!isAdmin && (
        <div className="bg-blue-950/40 border border-blue-800/80 rounded-xl p-4 text-xs text-blue-200 flex items-start space-x-3">
          <ShieldAlert className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="font-semibold text-blue-300 block">Current Role: Content Editor</strong>
            <span>
              You have permission to review validation blockers and edit shows. Publishing requires the <strong>Admin</strong> role (switchable in the top right).
            </span>
          </div>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start space-x-2">
            <span
              className={`w-3 h-3 rounded-full ${
                report?.is_publishable ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
              }`}
            />
            <h2 className="font-bold text-lg text-white">
              {report?.is_publishable ? 'Catalogue Ready to Publish' : 'Publication Blocked'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 max-w-lg leading-relaxed">
            {report?.is_publishable
              ? `All business rules satisfied (${report.published_shows_count} shows, ${report.published_episodes_count} episodes). Ready for atomic distribution.`
              : `${report?.total_blockers || 0} blocking issue(s) detected across seed data and shows. Resolve blockers below to enable publishing.`}
          </p>
        </div>

        <div className="flex flex-col items-center md:items-end space-y-2">
          <button
            onClick={() => publishMutation.mutate()}
            disabled={!report?.is_publishable || !isAdmin || publishMutation.isPending}
            className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center space-x-2 transition-all shadow-lg ${
              report?.is_publishable && isAdmin
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:from-emerald-400 hover:to-teal-400 shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
            }`}
          >
            <UploadCloud className="w-5 h-5" />
            <span>{publishMutation.isPending ? 'Publishing...' : 'Publish Catalogue Now'}</span>
          </button>

          {!isAdmin && report?.is_publishable && (
            <span className="text-[11px] text-amber-400">Switch to Admin role to publish</span>
          )}
        </div>
      </div>

      {publishMessage && (
        <div className="bg-emerald-950/60 border border-emerald-800 rounded-xl p-4 text-emerald-200 text-sm flex items-center space-x-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{publishMessage}</span>
        </div>
      )}

      {publishError && (
        <div className="bg-red-950/60 border border-red-800 rounded-xl p-4 text-red-200 text-sm flex items-start space-x-3">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span>{publishError}</span>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-base text-white">Pre-Publish Blocker Report</h3>
            <p className="text-xs text-slate-400">Actionable guidance for content editors</p>
          </div>
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full border ${
              report?.total_blockers === 0
                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                : 'bg-red-950 text-red-300 border-red-800'
            }`}
          >
            {report?.total_blockers || 0} Blockers
          </span>
        </div>

        {report?.total_blockers === 0 ? (
          <div className="py-8 text-center text-emerald-400 space-y-2">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
            <h4 className="font-semibold text-sm">All Checks Passed Cleanly</h4>
            <p className="text-xs text-slate-400">No missing artwork, duration errors, or duplicate content groups found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(report?.issues_by_show || {}).map(([showTitle, issues]) => (
              <div key={showTitle} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-200">{showTitle}</h4>
                  <span className="text-[10px] bg-red-950 text-red-400 border border-red-900 px-2 py-0.5 rounded font-mono">
                    {issues.length} issue(s)
                  </span>
                </div>

                <div className="space-y-2">
                  {issues.map((issue, idx) => (
                    <div key={idx} className="bg-slate-900/90 border border-red-950 rounded-lg p-3 text-xs space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="bg-red-900/60 text-red-300 font-bold px-1.5 py-0.2 rounded text-[10px]">
                          {issue.severity}
                        </span>
                        <span className="font-semibold text-slate-200">{issue.entity_title}</span>
                      </div>
                      <p className="text-slate-300">{issue.message}</p>
                      <p className="text-amber-400 font-medium pt-0.5">
                        &rarr; Action: {issue.action_required}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h3 className="font-bold text-base text-white border-b border-slate-800 pb-3">Publish Run Audit History</h3>

        {runs.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">No publish runs recorded yet.</p>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {runs.map((run, idx) => (
              <div key={run.run_id} className="py-3 flex items-center justify-between text-xs">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-slate-200">{run.run_id}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                        run.status === 'SUCCESS'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : 'bg-red-950 text-red-300 border-red-800'
                      }`}
                    >
                      {run.status}
                    </span>
                    {idx === 0 && run.status === 'SUCCESS' && (
                      <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded font-bold">
                        ACTIVE LIVE
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400">
                    Triggered by <span className="text-slate-300 font-medium">{run.triggered_by}</span> &bull;{' '}
                    {formatDateTime(run.created_at)}
                  </p>
                  {run.error_message && <p className="text-red-400 text-[11px]">{run.error_message}</p>}
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right text-slate-400 font-mono text-[11px]">
                    <div>
                      {run.shows_count} shows / {run.episodes_count} episodes
                    </div>
                    <div className="text-slate-500">{run.sections_count} sections</div>
                  </div>

                  {isAdmin && run.status === 'SUCCESS' && idx !== 0 && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to rollback catalogue to run ${run.run_id}?`)) {
                          rollbackMutation.mutate(run.run_id);
                        }
                      }}
                      disabled={rollbackMutation.isPending}
                      className="bg-slate-800 hover:bg-amber-600 hover:text-slate-950 text-slate-200 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm disabled:opacity-50"
                      title="Rollback catalogue to this exact snapshot"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Rollback</span>
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
