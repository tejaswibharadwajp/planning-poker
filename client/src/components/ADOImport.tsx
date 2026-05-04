import { useState } from 'react';
import { Loader2, ChevronRight, Check } from 'lucide-react';

interface WorkItem {
  id: number;
  title: string;
  type: string;
}

interface Iteration {
  id: string;
  name: string;
  attributes: { timeFrame?: string };
}

interface Props {
  onAdd: (title: string) => void;
  onClose: () => void;
}

type Step = 'config' | 'iterations' | 'items';

function normalizeOrg(input: string): string {
  const devAzure = input.match(/dev\.azure\.com\/([^/?#]+)/);
  if (devAzure) return devAzure[1];
  const vs = input.match(/^([^.]+)\.visualstudio\.com/);
  if (vs) return vs[1];
  return input.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
      <span className="font-semibold shrink-0">Error:</span>
      <span>{message}</span>
    </div>
  );
}

export default function ADOImport({ onAdd, onClose }: Props) {
  const [org, setOrg] = useState('');
  const [project, setProject] = useState('');
  const [team, setTeam] = useState('');
  const [pat, setPat] = useState('');
  const [step, setStep] = useState<Step>('config');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [iterations, setIterations] = useState<Iteration[]>([]);
  const [selectedIterationId, setSelectedIterationId] = useState('');
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const headers = () => ({
    Authorization: `Basic ${btoa(`:${pat}`)}`,
    'Content-Type': 'application/json',
  });

  const base = () => {
    const o = normalizeOrg(org);
    const p = encodeURIComponent(project.trim());
    const t = encodeURIComponent(team.trim() || project.trim());
    return { o, p, t };
  };

  const fetchIterations = async () => {
    setLoading(true);
    setError(null);
    try {
      const { o, p, t } = base();
      const res = await fetch(
        `https://dev.azure.com/${o}/${p}/${t}/_apis/work/iterations?api-version=7.1`,
        { headers: headers() }
      );
      if (!res.ok) throw new Error(`${res.status} — check org, project, team, and PAT`);
      const data = await res.json();
      const iters: Iteration[] = data.value ?? [];
      setIterations(iters);
      const current = iters.find((i) => i.attributes?.timeFrame === 'current');
      setSelectedIterationId(current?.id ?? iters[0]?.id ?? '');
      // Save ADO config so write-back can use it later
      sessionStorage.setItem('ado_config', JSON.stringify({ org: normalizeOrg(org), project: project.trim(), pat }));
      setStep('iterations');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const { o, p, t } = base();
      const wiRes = await fetch(
        `https://dev.azure.com/${o}/${p}/${t}/_apis/work/iterations/${selectedIterationId}/workitems?api-version=7.1`,
        { headers: headers() }
      );
      if (!wiRes.ok) throw new Error(`${wiRes.status} — failed to fetch iteration work items`);
      const wiData = await wiRes.json();

      const ids: number[] = (wiData.workItemRelations ?? [])
        .map((r: { target?: { id?: number } }) => r.target?.id)
        .filter(Boolean);

      if (ids.length === 0) {
        setWorkItems([]);
        setSelectedIds(new Set());
        setStep('items');
        return;
      }

      const detailRes = await fetch(
        `https://dev.azure.com/${o}/_apis/wit/workitems?ids=${ids.join(',')}&fields=System.Id,System.Title,System.WorkItemType&api-version=7.1`,
        { headers: headers() }
      );
      if (!detailRes.ok) throw new Error(`${detailRes.status} — failed to fetch work item details`);
      const detailData = await detailRes.json();

      const items: WorkItem[] = (detailData.value ?? []).map((item: {
        id: number;
        fields: { 'System.Title': string; 'System.WorkItemType': string };
      }) => ({
        id: item.id,
        title: item.fields['System.Title'],
        type: item.fields['System.WorkItemType'],
      }));

      setWorkItems(items);
      setSelectedIds(new Set(items.map((i) => i.id)));
      setStep('items');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load work items');
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (id: number) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleImport = () => {
    workItems
      .filter((i) => selectedIds.has(i.id))
      .forEach((i) => onAdd(`${i.type} #${i.id}: ${i.title}`));
    onClose();
  };

  if (step === 'config') {
    return (
      <div className="p-6 space-y-4">
        {error && <ErrorBanner message={error} />}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Organization URL</label>
          <input
            type="text"
            value={org}
            onChange={(e) => setOrg(e.target.value)}
            placeholder="https://dev.azure.com/myorg"
            autoFocus
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 placeholder-slate-400 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Project</label>
          <input
            type="text"
            value={project}
            onChange={(e) => setProject(e.target.value)}
            placeholder="MyProject"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 placeholder-slate-400 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Team <span className="text-slate-400 font-normal">(optional — defaults to project name)</span>
          </label>
          <input
            type="text"
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            placeholder="MyProject Team"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 placeholder-slate-400 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-0.5">Personal Access Token</label>
          <p className="text-xs text-slate-400 mb-1.5">
            Work Items (Read) scope · never leaves your browser
          </p>
          <input
            type="password"
            value={pat}
            onChange={(e) => setPat(e.target.value)}
            placeholder="••••••••••••••••••••••••••"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 placeholder-slate-400 text-sm font-mono"
          />
        </div>
        <button
          onClick={fetchIterations}
          disabled={loading || !org.trim() || !project.trim() || !pat.trim()}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-2 text-sm transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
          {loading ? 'Connecting…' : 'Connect & Fetch Sprints'}
        </button>
      </div>
    );
  }

  if (step === 'iterations') {
    return (
      <div className="p-6 space-y-4">
        {error && <ErrorBanner message={error} />}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Select Sprint</label>
          <select
            value={selectedIterationId}
            onChange={(e) => setSelectedIterationId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm bg-white"
          >
            {iterations.map((it) => (
              <option key={it.id} value={it.id}>
                {it.name}{it.attributes?.timeFrame === 'current' ? ' · Current' : ''}
              </option>
            ))}
          </select>
          {iterations.length === 0 && (
            <p className="text-xs text-slate-400 mt-1.5">No iterations found for this team.</p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setStep('config'); setError(null); }}
            className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-xl text-sm transition-colors"
          >
            Back
          </button>
          <button
            onClick={fetchWorkItems}
            disabled={loading || !selectedIterationId}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-2 text-sm transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
            {loading ? 'Loading…' : 'Load Work Items'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {error && <ErrorBanner message={error} />}
      {workItems.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-6">No work items in this sprint.</p>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-700">
              {workItems.length} work item{workItems.length !== 1 ? 's' : ''}
            </label>
            <button
              onClick={() =>
                setSelectedIds(
                  selectedIds.size === workItems.length
                    ? new Set()
                    : new Set(workItems.map((i) => i.id))
                )
              }
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              {selectedIds.size === workItems.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>
          <div className="max-h-52 overflow-y-auto space-y-1 scrollbar-thin -mx-2 px-2">
            {workItems.map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.id)}
                  onChange={() => toggleItem(item.id)}
                  className="w-4 h-4 accent-indigo-600 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-indigo-500 mr-1.5">
                    {item.type} #{item.id}
                  </span>
                  <span className="text-sm text-slate-800">{item.title}</span>
                </div>
              </label>
            ))}
          </div>
        </>
      )}
      <div className="flex gap-3">
        <button
          onClick={() => { setStep('iterations'); setError(null); }}
          className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-xl text-sm transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleImport}
          disabled={selectedIds.size === 0}
          className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-2 text-sm transition-colors"
        >
          <Check className="w-4 h-4" />
          Import {selectedIds.size > 0 ? selectedIds.size : ''}{' '}
          {selectedIds.size === 1 ? 'Item' : 'Items'}
        </button>
      </div>
    </div>
  );
}
