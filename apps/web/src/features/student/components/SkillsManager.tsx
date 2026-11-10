import type { ProficiencyLevel, StudentSkillResponseDto } from '@career-portal/shared-types';
import { Loader2, Plus, X } from 'lucide-react';
import React, { useState } from 'react';

import {
  useAddStudentSkill,
  useRemoveStudentSkill,
  useSkillsCatalog,
} from '../api/student-api';

interface SkillsManagerProps {
  skills: StudentSkillResponseDto[];
  isLoading?: boolean | undefined;
}

const PROFICIENCY_COLORS: Record<ProficiencyLevel, { badge: string; dot: string; label: string }> = {
  beginner: { badge: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400', label: 'Beginner' },
  intermediate: { badge: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500', label: 'Intermediate' },
  advanced: { badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500', label: 'Advanced' },
  expert: { badge: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500', label: 'Expert' },
};

export function SkillsManager({ skills }: SkillsManagerProps): React.JSX.Element {
  const [search, setSearch] = useState('');
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [proficiency, setProficiency] = useState<ProficiencyLevel>('intermediate');
  const [showAddForm, setShowAddForm] = useState(false);

  const { data: catalogSkills } = useSkillsCatalog(search);
  const addSkillMutation = useAddStudentSkill();
  const removeSkillMutation = useRemoveStudentSkill();

  const existingSkillIds = new Set(skills.map((s) => s.skillId));
  const availableSkills = (catalogSkills || []).filter((s) => !existingSkillIds.has(s.id));

  const handleAddSkill = async () => {
    if (!selectedSkillId) return;
    await addSkillMutation.mutateAsync({
      skillId: selectedSkillId,
      proficiency,
    });
    setSelectedSkillId('');
    setShowAddForm(false);
    setSearch('');
  };

  const handleRemoveSkill = async (skillId: string) => {
    await removeSkillMutation.mutateAsync(skillId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Technical Skills & Proficiencies</h4>
          <p className="text-xs text-slate-500">Skills highlight your strengths for placement matching</p>
        </div>
        {!showAddForm && (
          <button
            type="button"
            onClick={() => { setShowAddForm(true); }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Skill
          </button>
        )}
      </div>

      {/* Add Skill Panel */}
      {showAddForm && (
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-900">Add Skill from Catalog</span>
            <button
              type="button"
              onClick={() => { setShowAddForm(false); }}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Search Skill
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); }}
                placeholder="e.g. React, Python, Docker"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Select from Results
              </label>
              <select
                value={selectedSkillId}
                onChange={(e) => { setSelectedSkillId(e.target.value); }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              >
                <option value="">-- Choose a skill --</option>
                {availableSkills.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.category})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-medium text-slate-700">Proficiency:</label>
              <div className="flex gap-1">
                {(['beginner', 'intermediate', 'advanced', 'expert'] as ProficiencyLevel[]).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => { setProficiency(level); }}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                      proficiency === level
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={!selectedSkillId || addSkillMutation.isPending}
              onClick={() => { void (handleAddSkill)(); }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
            >
              {addSkillMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Save Skill
            </button>
          </div>
        </div>
      )}

      {/* Skills Pills List */}
      {skills.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center">
          <p className="text-xs text-slate-500">No skills added yet. Add at least 4 skills to boost your placement score.</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {skills.map((s) => {
            const config = PROFICIENCY_COLORS[s.proficiency];
            return (
              <span
                key={s.skillId}
                className={`group inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium ${config.badge} shadow-xs`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
                <span>{s.name}</span>
                <span className="text-[10px] opacity-75 font-normal">({config.label})</span>
                <button
                  type="button"
                  onClick={() => { void (handleRemoveSkill(s.skillId)); }}
                  disabled={removeSkillMutation.isPending}
                  className="text-slate-400 hover:text-red-600 transition"
                  title="Remove skill"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
