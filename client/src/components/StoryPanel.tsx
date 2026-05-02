import { useState } from 'react';
import { Plus, Trash2, Play, CheckCircle2, Clock, ChevronRight, Download } from 'lucide-react';
import { Story, User } from '../types';
import AddStoryModal from './AddStoryModal';

interface Props {
  stories: Story[];
  activeStoryId: string | null;
  currentUser: User | null;
  roomName: string;
  onAdd: (title: string, description?: string) => void;
  onDelete: (storyId: string) => void;
  onSelect: (storyId: string) => void;
}

const STATUS_CONFIG = {
  pending: { label: 'Pending', icon: Clock, className: 'text-slate-500 bg-slate-100' },
  voting: { label: 'Voting', icon: Play, className: 'text-blue-600 bg-blue-50' },
  revealed: { label: 'Revealed', icon: Play, className: 'text-amber-600 bg-amber-50' },
  done: { label: 'Done', icon: CheckCircle2, className: 'text-emerald-600 bg-emerald-50' },
};

export default function StoryPanel({
  stories,
  activeStoryId,
  currentUser,
  roomName,
  onAdd,
  onDelete,
  onSelect,
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const isAdmin = currentUser?.isAdmin ?? false;

  const exportCSV = () => {
    const headers = ['Title', 'Description', 'Status', 'Final Estimate', 'Votes'];
    const rows = stories.map((s) => [
      `"${s.title.replace(/"/g, '""')}"`,
      `"${s.description.replace(/"/g, '""')}"`,
      s.status,
      s.finalEstimate ?? '',
      `"${Object.values(s.votes).map((v) => `${v.userName}: ${v.vote}`).join('; ')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${roomName.replace(/[^a-z0-9]/gi, '-')}-estimates.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pending = stories.filter((s) => s.status === 'pending');
  const active = stories.filter((s) => s.status === 'voting' || s.status === 'revealed');
  const done = stories.filter((s) => s.status === 'done');

  const renderStory = (story: Story) => {
    const isActive = story.id === activeStoryId;
    const cfg = STATUS_CONFIG[story.status];
    const StatusIcon = cfg.icon;

    return (
      <div
        key={story.id}
        onMouseEnter={() => setHoveredId(story.id)}
        onMouseLeave={() => setHoveredId(null)}
        className={`group relative px-3 py-2.5 rounded-xl border transition-all cursor-pointer ${
          isActive
            ? 'bg-indigo-50 border-indigo-200 shadow-sm'
            : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'
        }`}
        onClick={() => isAdmin && story.status !== 'done' && onSelect(story.id)}
      >
        <div className="flex items-start gap-2.5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-md ${cfg.className}`}
              >
                <StatusIcon className="w-2.5 h-2.5" />
                {story.status === 'done' && story.finalEstimate
                  ? story.finalEstimate
                  : cfg.label}
              </span>
              {isActive && (
                <span className="text-xs text-indigo-600 font-semibold flex items-center gap-1">
                  <ChevronRight className="w-3 h-3" /> Active
                </span>
              )}
            </div>
            <p className="text-sm text-slate-800 font-medium leading-snug line-clamp-2">
              {story.title}
            </p>
            {story.description && (
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                {story.description}
              </p>
            )}
          </div>
          {isAdmin && hoveredId === story.id && story.status !== 'voting' && story.status !== 'revealed' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(story.id);
              }}
              className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-red-500 text-slate-400 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  const totalDone = done.length;
  const totalStories = stories.length;

  return (
    <div className="flex flex-col h-full bg-slate-800 text-white">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">Backlog</h2>
          <div className="flex items-center gap-2">
            {done.length > 0 && (
              <button
                onClick={exportCSV}
                title="Export CSV"
                className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-emerald-400 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:block">Export</span>
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            )}
          </div>
        </div>

        {totalStories > 0 && (
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span>{totalDone} / {totalStories} estimated</span>
              <span>{totalStories > 0 ? Math.round((totalDone / totalStories) * 100) : 0}%</span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${totalStories > 0 ? (totalDone / totalStories) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Story lists */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3 space-y-4">
        {stories.length === 0 && (
          <div className="text-center py-12 px-4">
            <div className="text-3xl mb-2">📋</div>
            <p className="text-sm text-slate-400 font-medium">No stories yet</p>
            {isAdmin && (
              <p className="text-xs text-slate-500 mt-1">
                Click "Add" to add your first story
              </p>
            )}
          </div>
        )}

        {active.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
              Active
            </p>
            <div className="space-y-1.5">{active.map(renderStory)}</div>
          </div>
        )}

        {pending.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
              Pending · {pending.length}
            </p>
            <div className="space-y-1.5">{pending.map(renderStory)}</div>
          </div>
        )}

        {done.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
              Estimated · {done.length}
            </p>
            <div className="space-y-1.5 opacity-70">{done.map(renderStory)}</div>
          </div>
        )}
      </div>

      {showModal && (
        <AddStoryModal
          onAdd={onAdd}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
