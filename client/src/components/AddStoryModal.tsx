import { useState, useEffect, useRef } from 'react';
import { X, Plus, List, Link, Trello } from 'lucide-react';
import ADOImport from './ADOImport';

interface Props {
  onAdd: (title: string, description?: string) => void;
  onClose: () => void;
}

type Tab = 'single' | 'bulk' | 'import' | 'ado';

function extractTicketId(line: string): string | null {
  // Jira: .../browse/PROJ-123
  const jira = line.match(/\/browse\/([A-Z]+-\d+)/i);
  if (jira) return jira[1].toUpperCase();
  // Linear: .../issue/PROJ-123/...
  const linear = line.match(/\/issue\/([A-Za-z]+-\d+)/i);
  if (linear) return linear[1].toUpperCase();
  return null;
}

function parseImportLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  // Try URL extraction first
  if (trimmed.startsWith('http')) {
    return extractTicketId(trimmed) ?? trimmed;
  }
  return trimmed;
}

export default function AddStoryModal({ onAdd, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('single');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [importText, setImportText] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tab === 'single') titleRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [tab, onClose]);

  const handleSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title.trim(), description.trim());
    onClose();
  };

  const handleBulk = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = bulkText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) return;
    lines.forEach((line) => onAdd(line));
    onClose();
  };

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = importText.split('\n').map(parseImportLine).filter(Boolean) as string[];
    if (!lines.length) return;
    lines.forEach((title) => onAdd(title));
    onClose();
  };

  const bulkCount = bulkText.split('\n').filter((l) => l.trim()).length;
  const importCount = importText.split('\n').map(parseImportLine).filter(Boolean).length;

  const tabs: { key: Tab; label: string; icon: typeof Plus }[] = [
    { key: 'single', label: 'Single', icon: Plus },
    { key: 'bulk', label: 'Bulk', icon: List },
    { key: 'import', label: 'Jira / Linear', icon: Link },
    { key: 'ado', label: 'Azure DevOps', icon: Trello },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Add Stories</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-all border-b-2 ${
                tab === key
                  ? 'text-indigo-600 border-indigo-600 bg-indigo-50/40'
                  : 'text-slate-500 border-transparent hover:text-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Single */}
        {tab === 'single' && (
          <form onSubmit={handleSingle} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Story title <span className="text-red-500">*</span>
              </label>
              <input
                ref={titleRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. User authentication with SSO"
                maxLength={120}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 placeholder-slate-400 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Description <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="As a user, I want to…"
                maxLength={500}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 placeholder-slate-400 text-sm resize-none"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-xl transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title.trim()}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Story
              </button>
            </div>
          </form>
        )}

        {/* Bulk */}
        {tab === 'bulk' && (
          <form onSubmit={handleBulk} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Story titles
              </label>
              <p className="text-xs text-slate-400 mb-2">One story per line</p>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={`User login with email\nPassword reset flow\nProfile page redesign\nSearch functionality`}
                rows={8}
                autoFocus
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 placeholder-slate-400 text-sm resize-none font-mono"
              />
              {bulkCount > 0 && (
                <p className="text-xs text-indigo-600 mt-1.5 font-medium">{bulkCount} {bulkCount === 1 ? 'story' : 'stories'} to add</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-xl transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={bulkCount === 0}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <List className="w-4 h-4" />
                Add {bulkCount > 0 ? bulkCount : ''} {bulkCount === 1 ? 'Story' : 'Stories'}
              </button>
            </div>
          </form>
        )}

        {/* Import */}
        {tab === 'import' && (
          <form onSubmit={handleImport} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Paste Jira or Linear URLs
              </label>
              <p className="text-xs text-slate-400 mb-2">
                One URL per line — ticket IDs are extracted automatically
              </p>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={`https://company.atlassian.net/browse/PROJ-123\nhttps://linear.app/team/issue/ENG-456/fix-login\nhttps://company.atlassian.net/browse/PROJ-789`}
                rows={7}
                autoFocus
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 placeholder-slate-400 text-xs resize-none font-mono"
              />
              {importCount > 0 && (
                <p className="text-xs text-indigo-600 mt-1.5 font-medium">{importCount} ticket{importCount !== 1 ? 's' : ''} parsed</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-xl transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={importCount === 0}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Link className="w-4 h-4" />
                Import {importCount > 0 ? importCount : ''} {importCount === 1 ? 'Ticket' : 'Tickets'}
              </button>
            </div>
          </form>
        )}

        {/* Azure DevOps */}
        {tab === 'ado' && (
          <ADOImport onAdd={(title) => onAdd(title)} onClose={onClose} />
        )}
      </div>
    </div>
  );
}
