import { useState } from 'react';
import { X, Plus, Check } from 'lucide-react';
import type { Skill, SkillLevel } from '@/types';
import { Badge } from '@/components/ui/Badge';

const levelLabels: Record<SkillLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert',
};

export function SkillSelector({
  skills,
  selectedIds,
  selectedLevels,
  onChange,
}: {
  skills: Skill[];
  selectedIds: string[];
  selectedLevels: Record<string, SkillLevel>;
  onChange: (ids: string[], levels: Record<string, SkillLevel>) => void;
}) {
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = ['All', ...Array.from(new Set(skills.map((s) => s.category)))];
  const filtered = activeCategory === 'All' ? skills : skills.filter((s) => s.category === activeCategory);

  const toggleSkill = (skillId: string) => {
    if (selectedIds.includes(skillId)) {
      const newIds = selectedIds.filter((id) => id !== skillId);
      const newLevels = { ...selectedLevels };
      delete newLevels[skillId];
      onChange(newIds, newLevels);
    } else {
      onChange([...selectedIds, skillId], { ...selectedLevels, [skillId]: 'beginner' });
    }
  };

  const setLevel = (skillId: string, level: SkillLevel) => {
    onChange(selectedIds, { ...selectedLevels, [skillId]: level });
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeCategory === cat ? 'bg-brand text-white' : 'bg-ink-50 text-ink-500 hover:bg-ink-100'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        {filtered.map((skill) => {
          const isSelected = selectedIds.includes(skill.id);
          return (
            <button
              key={skill.id}
              onClick={() => toggleSkill(skill.id)}
              className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-all text-left ${
                isSelected
                  ? 'border-brand bg-brand-50'
                  : 'border-ink-200 hover:border-ink-300 bg-white'
              }`}
            >
              <div>
                <span className={`text-sm font-medium ${isSelected ? 'text-brand-700' : 'text-ink'}`}>
                  {skill.name}
                </span>
                <span className="text-xs text-ink-400 ml-2">{skill.category}</span>
              </div>
              {isSelected ? (
                <Check className="w-4 h-4 text-brand" />
              ) : (
                <Plus className="w-4 h-4 text-ink-300" />
              )}
            </button>
          );
        })}
      </div>

      {selectedIds.length > 0 && (
        <div className="border-t border-ink-100 pt-4">
          <h4 className="text-sm font-semibold text-ink mb-3">Selected Skills & Levels</h4>
          <div className="space-y-2">
            {selectedIds.map((skillId) => {
              const skill = skills.find((s) => s.id === skillId);
              if (!skill) return null;
              return (
                <div key={skillId} className="flex items-center justify-between bg-ink-50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink">{skill.name}</span>
                    <button onClick={() => toggleSkill(skillId)} className="text-ink-300 hover:text-red-500">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex gap-1">
                    {(['beginner', 'intermediate', 'advanced', 'expert'] as SkillLevel[]).map((level) => (
                      <button
                        key={level}
                        onClick={() => setLevel(skillId, level)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                          selectedLevels[skillId] === level
                            ? 'bg-brand text-white'
                            : 'bg-white text-ink-400 hover:text-ink-600 border border-ink-200'
                        }`}
                      >
                        {levelLabels[level]}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function SkillBadge({ skillName, level }: { skillName: string; level?: SkillLevel }) {
  return (
    <div className="flex items-center gap-1.5">
      <Badge variant="gray">{skillName}</Badge>
      {level && <Badge variant="outline">{levelLabels[level]}</Badge>}
    </div>
  );
}
