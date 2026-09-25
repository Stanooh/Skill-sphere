import { Check, Circle, Clock } from 'lucide-react';
import type { Roadmap, RoadmapMilestone } from '@/types';
import { ProgressBar } from '@/components/ui';
import { Button } from '@/components/ui/Button';

export function RoadmapTimeline({
  roadmap,
  onToggleMilestone,
}: {
  roadmap: Roadmap;
  onToggleMilestone?: (milestoneId: string) => void;
}) {
  const completed = roadmap.milestones.filter((m) => m.completed).length;
  const percentage = roadmap.milestones.length > 0 ? Math.round((completed / roadmap.milestones.length) * 100) : 0;

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-ink">{roadmap.goal}</h3>
          <span className="text-sm font-semibold text-brand">{percentage}%</span>
        </div>
        <ProgressBar value={percentage} />
        <p className="text-sm text-ink-400 mt-2">
          {completed} of {roadmap.milestones.length} milestones completed
        </p>
      </div>

      <div className="space-y-1">
        {roadmap.milestones
          .sort((a, b) => a.order - b.order)
          .map((milestone, idx) => (
            <MilestoneItem
              key={milestone.id}
              milestone={milestone}
              isLast={idx === roadmap.milestones.length - 1}
              onToggle={onToggleMilestone}
            />
          ))}
      </div>
    </div>
  );
}

function MilestoneItem({
  milestone,
  isLast,
  onToggle,
}: {
  milestone: RoadmapMilestone;
  isLast: boolean;
  onToggle?: (milestoneId: string) => void;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <button
          onClick={() => onToggle?.(milestone.id)}
          disabled={!onToggle}
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
            milestone.completed
              ? 'bg-brand text-white'
              : 'bg-white border-2 border-ink-200 text-ink-300 hover:border-brand hover:text-brand'
          } ${onToggle ? 'cursor-pointer' : 'cursor-default'}`}
        >
          {milestone.completed ? <Check className="w-4 h-4" /> : <span className="text-xs font-semibold">{milestone.order}</span>}
        </button>
        {!isLast && (
          <div className={`w-0.5 h-12 ${milestone.completed ? 'bg-brand' : 'bg-ink-100'}`} />
        )}
      </div>
      <div className="pb-8 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h4 className={`font-medium ${milestone.completed ? 'text-ink-400 line-through' : 'text-ink'}`}>
            {milestone.title}
          </h4>
          {milestone.completed && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <Check className="w-3 h-3" /> Done
            </span>
          )}
        </div>
        <p className="text-sm text-ink-400">{milestone.description}</p>
        {milestone.completedAt && (
          <p className="text-xs text-ink-300 mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Completed {new Date(milestone.completedAt).toLocaleDateString()}
          </p>
        )}
        {onToggle && (
          <Button
            variant={milestone.completed ? 'ghost' : 'secondary'}
            size="sm"
            className="mt-3"
            onClick={() => onToggle(milestone.id)}
          >
            {milestone.completed ? 'Mark as Incomplete' : 'Mark as Complete'}
          </Button>
        )}
      </div>
    </div>
  );
}

export function RoadmapCard({ roadmap, onClick }: { roadmap: Roadmap; onClick?: () => void }) {
  const completed = roadmap.milestones.filter((m) => m.completed).length;
  const percentage = roadmap.milestones.length > 0 ? Math.round((completed / roadmap.milestones.length) * 100) : 0;

  return (
    <div className="card p-5 hover:shadow-card-hover transition-shadow cursor-pointer" onClick={onClick}>
      <h3 className="font-semibold text-ink mb-1">{roadmap.goal}</h3>
      <p className="text-sm text-ink-400 mb-4">{roadmap.timeframe} • {roadmap.milestones.length} milestones</p>
      <ProgressBar value={percentage} label="Progress" />
    </div>
  );
}
