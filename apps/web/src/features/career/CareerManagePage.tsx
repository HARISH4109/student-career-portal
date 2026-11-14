import { useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ExternalLink,
  Eye,
  Pencil,
  Search,
  Settings2,
  BookOpen,
  CheckCircle,
  Compass,
  Layers,
  Plus,
  Save,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  careerPathInputSchema,
  resourceInputSchema,
  RESOURCE_TYPES,
  CAREER_PROFICIENCIES,
  type CareerPathDto,
  type CareerPathInput,
  type CareerStageInput,
  type LearningResourceDto,
  type ResourceInput,
} from '@career-portal/shared-types';
import { useAuth } from '@/features/auth/use-auth';
import { apiClient } from '@/shared/lib/api-client';
import { useCareerAction, useCareerData, useCareerOptions } from './career-api';
import {
  Field,
  ErrorMessage,
  input,
  button,
  secondaryButton,
  card,
  prettyLabel,
} from './components/CareerLayout';

const emptyStage = (): CareerStageInput => ({
  title: '',
  description: '',
  isActive: true,
  skills: [],
  resourceIds: [],
  activities: [],
});

interface MultiResourceItem {
  id: string;
  existingId?: string | undefined;
  title: string;
  url: string;
  type: ResourceInput['type'];
  description: string;
}

const emptyResourceItem = (
  defaultType: ResourceInput['type'] = 'video',
  existingId?: string | undefined,
): MultiResourceItem => ({
  id: existingId ? `res-exist-${existingId}` : `res-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  existingId,
  title: '',
  url: '',
  type: defaultType,
  description: '',
});

export function CareerManagePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editor, setEditor] = useState<'paths' | 'resources'>('paths');
  const [viewMode, setViewMode] = useState<'list' | 'editor'>('list');
  const [searchQuery, setSearchQuery] = useState('');

  // Catalogs
  const paths = useCareerOptions<CareerPathDto>('career-paths?status=all');
  const resources = useCareerOptions<LearningResourceDto>('resources?status=all');
  const skills = useCareerData<Array<{ id: string; name: string }>>('skills');

  const filteredPaths = (paths.data?.data || []).filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return p.title.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
  });

  const filteredResources = (resources.data?.data || []).filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      r.title.toLowerCase().includes(q) ||
      (r.category || '').toLowerCase().includes(q) ||
      (r.type || '').toLowerCase().includes(q)
    );
  });

  // Career Path state
  const [pathId, setPathId] = useState('');
  const [path, setPath] = useState<CareerPathInput>({
    title: '',
    description: '',
    isActive: false,
    stages: [],
  });

  // Resource state
  const [resourceId, setResourceId] = useState('');
  const [sharedCategory, setSharedCategory] = useState('');
  const [sharedDifficulty, setSharedDifficulty] =
    useState<ResourceInput['difficulty']>('beginner');
  const [sharedIsActive, setSharedIsActive] = useState(true);
  const [sharedSkillIds, setSharedSkillIds] = useState<string[]>([]);
  const [sharedCareerPathIds, setSharedCareerPathIds] = useState<string[]>([]);

  // Multi-format selection & Multi-resource items
  const [selectedFormats, setSelectedFormats] = useState<ResourceInput['type'][]>([
    'video',
    'documentation',
  ]);
  const [resourceItems, setResourceItems] = useState<MultiResourceItem[]>([
    emptyResourceItem('video'),
  ]);

  // Custom add state
  const [customSkillName, setCustomSkillName] = useState('');
  const [customCareerTitle, setCustomCareerTitle] = useState('');
  const [customStageSkillName, setCustomStageSkillName] = useState('');
  const [customActionMsg, setCustomActionMsg] = useState('');

  const [validation, setValidation] = useState('');
  const [savedCount, setSavedCount] = useState(0);
  const [isSavingResources, setIsSavingResources] = useState(false);
  const savePath = useCareerAction<CareerPathDto>();

  const updateStage = (index: number, next: CareerStageInput) => {
    setPath({ ...path, stages: path.stages.map((s, i) => (i === index ? next : s)) });
  };


  const handleSelectResource = (val: string) => {
    setResourceId(val);
    setValidation('');
    setSavedCount(0);
    const row = resources.data?.data.find((r) => r.id === val);
    if (row) {
      setSharedCategory(row.category);
      setSharedDifficulty(row.difficulty);
      setSharedIsActive(row.isActive);
      setSharedSkillIds(row.skillIds || []);
      setSharedCareerPathIds(row.careerPathIds || []);
      if (!selectedFormats.includes(row.type)) {
        setSelectedFormats((prev) => [...prev, row.type]);
      }
      setResourceItems([
        {
          id: `res-exist-${row.id}`,
          existingId: row.id,
          title: row.title,
          url: row.url,
          type: row.type,
          description: row.description || '',
        },
      ]);
    } else {
      setSharedCategory('');
      setSharedDifficulty('beginner');
      setSharedIsActive(true);
      setSharedSkillIds([]);
      setSharedCareerPathIds([]);
      setResourceItems([emptyResourceItem(selectedFormats[0] ?? 'video')]);
    }
  };

  // ── Custom Skill / Career Creation ───────────────────────────────────────
  const handleCreateCustomSkill = async (target: 'resource' | 'stage', stageIndex?: number) => {
    const rawName = target === 'resource' ? customSkillName : customStageSkillName;
    const name = rawName.trim();
    if (!name) return;

    try {
      const res = await apiClient.post<{ data: { id: string; name: string } }>('/api/v1/skills', {
        name,
        category: 'technical',
      });
      const newSkill = res.data.data;

      // Invalidate queries to refresh skills list
      await queryClient.invalidateQueries({ queryKey: ['career', user?.id, 'skills'] });
      await queryClient.invalidateQueries({ queryKey: ['career', user?.id, 'options', 'skills'] });

      if (target === 'resource') {
        if (!sharedSkillIds.includes(newSkill.id)) {
          setSharedSkillIds([...sharedSkillIds, newSkill.id]);
        }
        setCustomSkillName('');
        setCustomActionMsg(`Custom skill "${newSkill.name}" created and added!`);
      } else if (stageIndex !== undefined) {
        const stage = path.stages[stageIndex];
        if (stage && !stage.skills.some((s) => s.skillId === newSkill.id)) {
          updateStage(stageIndex, {
            ...stage,
            skills: [...stage.skills, { skillId: newSkill.id, proficiency: 'intermediate' }],
          });
        }
        setCustomStageSkillName('');
        setCustomActionMsg(`Custom skill "${newSkill.name}" added to stage!`);
      }
      setTimeout(() => {
        setCustomActionMsg('');
      }, 4000);
    } catch (err) {
      setValidation(err instanceof Error ? err.message : 'Failed to create custom skill');
    }
  };

  const handleCreateCustomCareer = async () => {
    const title = customCareerTitle.trim();
    if (!title) return;

    try {
      const res = await apiClient.post<{ data: CareerPathDto }>('/api/v1/career-paths', {
        title,
        description: `${title} career track`,
        isActive: false,
        stages: [],
      });
      const newCareer = res.data.data;

      await queryClient.invalidateQueries({ queryKey: ['career', user?.id, 'career-paths'] });
      await queryClient.invalidateQueries({
        queryKey: ['career', user?.id, 'options', 'career-paths'],
      });

      if (!sharedCareerPathIds.includes(newCareer.id)) {
        setSharedCareerPathIds([...sharedCareerPathIds, newCareer.id]);
      }
      setCustomCareerTitle('');
      setCustomActionMsg(`Custom career "${newCareer.title}" created and added!`);
      setTimeout(() => {
        setCustomActionMsg('');
      }, 4000);
    } catch (err) {
      setValidation(err instanceof Error ? err.message : 'Failed to create custom career');
    }
  };

  // ── Save Handler for Resources (Unified Single & Multi, New & Existing) ──
  const handleSaveResources = async () => {
    setValidation('');
    setSavedCount(0);
    setIsSavingResources(true);

    const validatedItems: Array<{
      existingId?: string | undefined;
      data: ResourceInput;
    }> = [];

    for (let i = 0; i < resourceItems.length; i++) {
      const item = resourceItems[i];
      if (!item) continue;
      const parsed = resourceInputSchema.safeParse({
        title: item.title.trim(),
        url: item.url.trim(),
        type: item.type,
        description: item.description.trim(),
        category: sharedCategory.trim() || 'General',
        difficulty: sharedDifficulty,
        isActive: sharedIsActive,
        skillIds: sharedSkillIds,
        careerPathIds: sharedCareerPathIds,
      });

      if (!parsed.success) {
        setValidation(
          `Resource Link #${i + 1} (${item.title || 'Untitled'}): ` +
            parsed.error.issues.map((issue) => issue.message).join('. '),
        );
        setIsSavingResources(false);
        return;
      }
      validatedItems.push({
        existingId: item.existingId,
        data: parsed.data,
      });
    }

    if (validatedItems.length === 0) {
      setValidation('Please add at least one resource link with valid title and URL.');
      setIsSavingResources(false);
      return;
    }

    try {
      const existingToUpdate = validatedItems.filter((it) => Boolean(it.existingId));
      const newToCreate = validatedItems.filter((it) => !it.existingId);

      // 1. Update existing resources via PUT
      const updatePromises = existingToUpdate.map((it) =>
        apiClient.put<{ data: LearningResourceDto }>(
          `/api/v1/resources/${it.existingId!}`,
          it.data,
        ),
      );

      // 2. Create new resources via POST
      let createdResults: LearningResourceDto[] = [];
      if (newToCreate.length === 1 && newToCreate[0]) {
        const res = await apiClient.post<{ data: LearningResourceDto }>(
          '/api/v1/resources',
          newToCreate[0].data,
        );
        createdResults = [res.data.data];
      } else if (newToCreate.length > 1) {
        const res = await apiClient.post<{ data: LearningResourceDto[] }>(
          '/api/v1/resources',
          newToCreate.map((it) => it.data),
        );
        createdResults = Array.isArray(res.data.data) ? res.data.data : [];
      }

      const updateResponses = await Promise.all(updatePromises);
      const updatedResults = updateResponses.map((r) => r.data.data);

      await queryClient.invalidateQueries({ queryKey: ['career', user?.id, 'resources'] });
      await queryClient.invalidateQueries({
        queryKey: ['career', user?.id, 'options', 'resources'],
      });

      const totalCount = updatedResults.length + createdResults.length;
      setSavedCount(totalCount);

      // Re-map items in editor to reflect saved state
      const nextItems: MultiResourceItem[] = [];
      existingToUpdate.forEach((it, idx) => {
        const updatedRow = updatedResults[idx];
        nextItems.push({
          id: it.existingId!,
          existingId: it.existingId,
          title: updatedRow?.title ?? it.data.title,
          url: updatedRow?.url ?? it.data.url,
          type: updatedRow?.type ?? it.data.type,
          description: updatedRow?.description ?? it.data.description,
        });
      });
      createdResults.forEach((createdRow) => {
        nextItems.push({
          id: `res-exist-${createdRow.id}`,
          existingId: createdRow.id,
          title: createdRow.title,
          url: createdRow.url,
          type: createdRow.type,
          description: createdRow.description || '',
        });
      });

      if (nextItems.length > 0) {
        setResourceItems(nextItems);
        if (nextItems[0]?.existingId) {
          setResourceId(nextItems[0].existingId);
        }
      }

      let successMsg = '';
      if (existingToUpdate.length > 0 && newToCreate.length > 0) {
        successMsg = `Saved: ${existingToUpdate.length} existing resource(s) updated, ${newToCreate.length} new resource(s) added!`;
      } else if (existingToUpdate.length > 0) {
        successMsg = `${existingToUpdate.length} resource(s) updated successfully.`;
      } else {
        successMsg = `${newToCreate.length} resource(s) created successfully.`;
      }
      setCustomActionMsg(successMsg);
      setTimeout(() => {
        setCustomActionMsg('');
      }, 5000);
    } catch (err) {
      setValidation(err instanceof Error ? err.message : 'Failed to save resources');
    } finally {
      setIsSavingResources(false);
    }
  };

  // ── Reusable Options with Custom Add ──────────────────────────────────────
  const renderOptions = (
    values: Array<{ id: string; name?: string; title?: string }> | undefined,
    selected: string[],
    change: (ids: string[]) => void,
    label: string,
    customAddConfig?: {
      placeholder: string;
      value: string;
      onChange: (val: string) => void;
      onAdd: () => void;
      buttonText: string;
    },
  ) => (
    <Field label={label}>
      <div className="space-y-2.5 mt-1">
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 max-h-32 overflow-y-auto">
            {selected.map((selId) => {
              const item = values?.find((v) => v.id === selId);
              return (
                <span
                  key={selId}
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-xs font-semibold text-indigo-700"
                >
                  <span>{item?.name ?? item?.title ?? 'Selected'}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      change(selected.filter((id) => id !== selId));
                    }}
                    className="hover:text-indigo-950 font-bold ml-1 text-slate-400 hover:text-slate-700"
                    aria-label={`Remove ${item?.name ?? item?.title}`}
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        )}

        <select
          multiple
          aria-label={label}
          className={`${input} min-h-28`}
          value={selected}
          onChange={(e) => {
            change(Array.from(e.target.selectedOptions, (option) => option.value));
          }}
        >
          {values?.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name ?? v.title}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-500 block">
          Use Ctrl or Command to select multiple items.
        </span>

        {/* ── Custom Add Section ── */}
        {customAddConfig && (
          <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 space-y-1.5">
            <span className="text-xs font-semibold text-slate-700 block">
              Not in list? Add custom:
            </span>
            <div className="flex gap-2">
              <input
                className={`${input} min-h-9 py-1 text-xs`}
                placeholder={customAddConfig.placeholder}
                value={customAddConfig.value}
                onChange={(e) => {
                  customAddConfig.onChange(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    customAddConfig.onAdd();
                  }
                }}
              />
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-xs font-semibold shrink-0 shadow-sm transition"
                onClick={customAddConfig.onAdd}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{customAddConfig.buttonText}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Field>
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* ── Page Header (Isolated from Career Paths & Learning Resources explorer) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings2 className="h-6 w-6 text-indigo-600" /> Career Catalog Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Author and configure degree career paths, curriculum milestones, and curated learning resources.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {viewMode === 'list' ? (
            editor === 'paths' ? (
              <button
                type="button"
                onClick={() => {
                  setPathId('');
                  setPath({
                    title: '',
                    description: '',
                    isActive: true,
                    stages: [emptyStage()],
                  });
                  setValidation('');
                  setViewMode('editor');
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition"
              >
                <Plus className="h-4 w-4" /> Create Career Path
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setResourceId('');
                  setSharedCategory('');
                  setSharedDifficulty('beginner');
                  setSharedIsActive(true);
                  setSharedSkillIds([]);
                  setSharedCareerPathIds([]);
                  setResourceItems([emptyResourceItem('video')]);
                  setValidation('');
                  setViewMode('editor');
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition"
              >
                <Plus className="h-4 w-4" /> Add Learning Resource
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={() => {
                setViewMode('list');
                setValidation('');
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Catalog List
            </button>
          )}
        </div>
      </div>

      {customActionMsg && (
        <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-3 text-xs font-semibold text-indigo-900 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <span>{customActionMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setCustomActionMsg('')}
            className="text-indigo-400 hover:text-indigo-700 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      <ErrorMessage
        error={
          paths.error ??
          resources.error ??
          skills.error ??
          savePath.error ??
          (validation || null)
        }
      />

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── 1. LIST VIEW (Like Manage Opportunities with edit options beside) ─ */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {/* ── Sub Navigation Tabs & Search Bar ── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <nav
              aria-label="Catalog editor"
              className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-sm"
            >
              <button
                id="paths-tab"
                type="button"
                className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
                  editor === 'paths'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
                onClick={() => {
                  setEditor('paths');
                  setSearchQuery('');
                }}
              >
                <Compass className="h-4 w-4 shrink-0" />
                <span>Career Paths ({paths.data?.data?.length ?? 0})</span>
              </button>
              <button
                id="resources-tab"
                type="button"
                className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
                  editor === 'resources'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
                onClick={() => {
                  setEditor('resources');
                  setSearchQuery('');
                }}
              >
                <BookOpen className="h-4 w-4 shrink-0" />
                <span>Learning Resources ({resources.data?.data?.length ?? 0})</span>
              </button>
            </nav>

            {/* Filter Input */}
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={editor === 'paths' ? 'Filter career paths...' : 'Filter resources...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-xs"
              />
            </div>
          </div>

          {/* ── Table: Career Paths ── */}
          {editor === 'paths' && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Career Path
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Curriculum Stages
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paths.isLoading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-500">
                        Loading career paths...
                      </td>
                    </tr>
                  ) : filteredPaths.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-500">
                        No career paths found. Click &quot;+ Create Career Path&quot; to author one.
                      </td>
                    </tr>
                  ) : (
                    filteredPaths.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{p.title}</p>
                            <p className="text-xs text-slate-500 line-clamp-1 max-w-md mt-0.5">
                              {p.description || 'No description provided.'}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                            <Layers className="h-3 w-3" />
                            {p.stages.length} Stages
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              p.isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {p.isActive ? 'Published' : 'Draft'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setPathId(p.id);
                                setPath({
                                  title: p.title,
                                  description: p.description,
                                  isActive: p.isActive,
                                  stages: p.stages,
                                });
                                setValidation('');
                                setViewMode('editor');
                              }}
                              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition"
                              title="Edit Career Path"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span>Edit</span>
                            </button>
                            <Link
                              to={`/dashboard/careers/${p.id}`}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                              title="Preview Curriculum"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Table: Learning Resources ── */}
          {editor === 'resources' && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Resource Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Type & Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Difficulty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resources.isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">
                        Loading resources...
                      </td>
                    </tr>
                  ) : filteredResources.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">
                        No learning resources found. Click &quot;+ Add Learning Resource&quot; to author one.
                      </td>
                    </tr>
                  ) : (
                    filteredResources.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{r.title}</p>
                            <a
                              href={r.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-indigo-600 hover:text-indigo-800 line-clamp-1 max-w-sm flex items-center gap-1 mt-0.5"
                            >
                              {r.url} <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 capitalize">
                              {r.type}
                            </span>
                            <p className="text-xs text-slate-500">{r.category}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-medium text-slate-700 capitalize">
                            {r.difficulty}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              r.isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {r.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectResource(r.id);
                                setViewMode('editor');
                              }}
                              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition"
                              title="Edit Resource"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span>Edit</span>
                            </button>
                            <a
                              href={r.url}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                              title="Open External Resource"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── 2. EDITOR VIEW (When creating new or editing beside item) ───────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'editor' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {editor === 'paths'
                  ? pathId
                    ? `Editing Career Path: ${path.title || 'Untitled'}`
                    : 'Create New Career Path'
                  : resourceId
                    ? 'Editing Learning Resource'
                    : 'Add Learning Resources'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {editor === 'paths'
                  ? 'Configure career path identity, published state, and milestone learning stages.'
                  : 'Link high-quality learning resources, videos, documentation, and skill associations.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setViewMode('list');
                setValidation('');
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Table
            </button>
          </div>

          {/* ── Career Path Editor Section ── */}
          {editor === 'paths' && (
            <section
              id="paths-editor"
              className={`${card} space-y-6`}
            >
              <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold tracking-tight text-slate-900">Career Path Details</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Author and publish curriculum roadmaps</p>
                </div>
                <span className="rounded-full bg-indigo-50 text-indigo-700 px-3 py-1 text-xs font-semibold">
                  {path.stages.length} stages configured
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Career title">
                  <input
                    className={input}
                    placeholder="e.g. Frontend Developer"
                    value={path.title}
                    onChange={(e) => {
                      setPath({ ...path, title: e.target.value });
                    }}
                  />
                </Field>

                <div className="flex flex-col justify-end">
                  <label className="flex min-h-11 items-center gap-3 font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      checked={path.isActive}
                      onChange={(e) => {
                        setPath({ ...path, isActive: e.target.checked });
                      }}
                    />
                    <span>Publish career path (visible to students)</span>
                  </label>
                </div>
              </div>

              <Field label="Career description">
                <textarea
                  className={`${input} min-h-24`}
                  placeholder="Comprehensive description of the target career role..."
                  value={path.description}
                  onChange={(e) => {
                    setPath({ ...path, description: e.target.value });
                  }}
                />
              </Field>

              <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
                Changes apply to new roadmaps. Existing student progress is preserved.
              </p>

              {/* ── Stages Configuration ── */}
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="h-5 w-5 text-indigo-600" />
                    <span>Stages Breakdown</span>
                  </h3>
                </div>

                {path.stages.map((stage, i) => (
                  <fieldset
                    className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-5"
                    key={i}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                      <legend className="text-sm font-bold text-slate-900">
                        Stage {i + 1}: {stage.title || 'Untitled stage'}
                      </legend>
                      <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-auto">
                        <button
                          type="button"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800 disabled:opacity-30"
                          disabled={i === 0}
                          onClick={() => {
                            const stages = [...path.stages];
                            const current = stages[i];
                            const prev = stages[i - 1];
                            if (current && prev) {
                              stages[i - 1] = current;
                              stages[i] = prev;
                              setPath({ ...path, stages });
                            }
                          }}
                          aria-label="Move stage up"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800 disabled:opacity-30"
                          disabled={i === path.stages.length - 1}
                          onClick={() => {
                            const stages = [...path.stages];
                            const current = stages[i];
                            const next = stages[i + 1];
                            if (current && next) {
                              stages[i + 1] = current;
                              stages[i] = next;
                              setPath({ ...path, stages });
                            }
                          }}
                          aria-label="Move stage down"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
                          onClick={() => {
                            setPath({ ...path, stages: path.stages.filter((_, idx) => idx !== i) });
                          }}
                          aria-label="Delete stage"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Stage title">
                        <input
                          className={input}
                          placeholder="e.g. Core Foundations"
                          value={stage.title}
                          onChange={(e) => {
                            updateStage(i, { ...stage, title: e.target.value });
                          }}
                        />
                      </Field>
                      <div className="flex items-center min-h-11">
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                            checked={stage.isActive}
                            onChange={(e) => {
                              updateStage(i, { ...stage, isActive: e.target.checked });
                            }}
                          />
                          <span>Active stage</span>
                        </label>
                      </div>
                    </div>

                    <Field label="Stage description">
                      <textarea
                        className={`${input} min-h-20`}
                        placeholder="What skills and objectives are covered in this stage?"
                        value={stage.description}
                        onChange={(e) => {
                          updateStage(i, { ...stage, description: e.target.value });
                        }}
                      />
                    </Field>

                    {/* Stage Skills Builder */}
                    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <span className="text-xs font-bold text-slate-800">
                          Required Skills for Stage {i + 1}
                        </span>
                        <div className="flex gap-2">
                          <input
                            className={`${input} min-h-8 py-0.5 text-xs w-48`}
                            placeholder="Add custom skill..."
                            value={customStageSkillName}
                            onChange={(e) => setCustomStageSkillName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                void handleCreateCustomSkill('stage', i);
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 text-indigo-700 px-2.5 py-1 text-xs font-semibold hover:bg-indigo-100"
                            onClick={() => void handleCreateCustomSkill('stage', i)}
                          >
                            <Plus className="h-3 w-3" /> Add
                          </button>
                        </div>
                      </div>

                      {stage.skills.map((stSkill, sIdx) => (
                        <div key={sIdx} className="flex flex-wrap items-center gap-2 pt-1">
                          <select
                            className={`${input} max-w-xs text-xs py-1.5`}
                            value={stSkill.skillId}
                            onChange={(e) => {
                              const updated = [...stage.skills];
                              const targetSkill = updated[sIdx];
                              if (targetSkill) {
                                targetSkill.skillId = e.target.value;
                                updateStage(i, { ...stage, skills: updated });
                              }
                            }}
                          >
                            <option value="">Select skill...</option>
                            {skills.data?.data.map((sk) => (
                              <option key={sk.id} value={sk.id}>
                                {sk.name}
                              </option>
                            ))}
                          </select>

                          <select
                            className={`${input} max-w-xs text-xs py-1.5 capitalize`}
                            value={stSkill.proficiency}
                            onChange={(e) => {
                              const updated = [...stage.skills];
                              const targetSkill = updated[sIdx];
                              if (targetSkill) {
                                targetSkill.proficiency = e.target.value as CareerStageInput['skills'][number]['proficiency'];
                                updateStage(i, { ...stage, skills: updated });
                              }
                            }}
                          >
                            {CAREER_PROFICIENCIES.map((prof) => (
                              <option key={prof} value={prof}>
                                {prettyLabel(prof)}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50"
                            onClick={() => {
                              updateStage(i, {
                                ...stage,
                                skills: stage.skills.filter((_, idx) => idx !== sIdx),
                              });
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 pt-1"
                        onClick={() => {
                          const firstSkill = skills.data?.data[0]?.id || '';
                          updateStage(i, {
                            ...stage,
                            skills: [...stage.skills, { skillId: firstSkill, proficiency: 'beginner' }],
                          });
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Required Skill
                      </button>
                    </div>

                    {/* Resources linked to this stage */}
                    {renderOptions(
                      resources.data?.data,
                      stage.resourceIds,
                      (ids) => {
                        updateStage(i, { ...stage, resourceIds: ids });
                      },
                      `Linked Learning Resources for Stage ${i + 1}`,
                    )}

                    {/* Activities */}
                    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                      <span className="text-xs font-bold text-slate-800 block border-b border-slate-100 pb-2">
                        Stage Activities & Hands-on Deliverables
                      </span>

                      {stage.activities.map((act, aIdx) => (
                        <div key={aIdx} className="space-y-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700">Activity {aIdx + 1}</span>
                            <button
                              type="button"
                              className="text-rose-600 hover:bg-rose-100 p-1 rounded-md"
                              onClick={() => {
                                updateStage(i, {
                                  ...stage,
                                  activities: stage.activities.filter((_, idx) => idx !== aIdx),
                                });
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <input
                            className={`${input} py-1 text-xs`}
                            placeholder="Activity title..."
                            value={act.title}
                            onChange={(e) => {
                              const acts = [...stage.activities];
                              const currentAct = acts[aIdx];
                              if (currentAct) {
                                currentAct.title = e.target.value;
                                updateStage(i, { ...stage, activities: acts });
                              }
                            }}
                          />
                          <textarea
                            className={`${input} min-h-16 py-1 text-xs`}
                            placeholder="Activity instructions or project brief..."
                            value={act.description}
                            onChange={(e) => {
                              const acts = [...stage.activities];
                              const currentAct = acts[aIdx];
                              if (currentAct) {
                                currentAct.description = e.target.value;
                                updateStage(i, { ...stage, activities: acts });
                              }
                            }}
                          />
                        </div>
                      ))}

                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                        onClick={() => {
                          updateStage(i, {
                            ...stage,
                            activities: [...stage.activities, { title: '', description: '', type: 'project' }],
                          });
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Activity
                      </button>
                    </div>
                  </fieldset>
                ))}

                <button
                  type="button"
                  className={secondaryButton}
                  onClick={() => {
                    setPath({ ...path, stages: [...path.stages, emptyStage()] });
                  }}
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Next Stage</span>
                </button>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('list');
                    setValidation('');
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Cancel & Return to List
                </button>

                <button
                  type="button"
                  className={button}
                  disabled={savePath.isPending}
                  onClick={() => {
                    const parsed = careerPathInputSchema.safeParse(path);
                    setValidation(
                      parsed.success ? '' : parsed.error.issues.map((issue) => issue.message).join('. '),
                    );
                    if (parsed.success) {
                      savePath.mutate(
                        {
                          path: pathId ? `career-paths/${pathId}` : 'career-paths',
                          method: pathId ? 'put' : 'post',
                          body: parsed.data,
                        },
                        {
                          onSuccess: (row) => {
                            setPathId(row.id);
                            setCustomActionMsg(`Career path "${row.title}" saved successfully.`);
                            void queryClient.invalidateQueries({ queryKey: ['career', user?.id, 'options', 'career-paths'] });
                            setViewMode('list');
                          },
                        },
                      );
                    }
                  }}
                >
                  <Save className="h-4 w-4" />
                  <span>{savePath.isPending ? 'Saving...' : 'Save Career Path'}</span>
                </button>
              </div>

              {savePath.isSuccess && (
                <div
                  role="status"
                  className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <span>Career path saved.</span>
                </div>
              )}
            </section>
          )}

          {/* ── Learning Resources Editor Section ── */}
          {editor === 'resources' && (
            <section
              id="resources-editor"
              className={`${card} space-y-6`}
            >
              <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold tracking-tight text-slate-900">
                    {resourceId ? 'Edit Learning Resource' : 'Add Learning Resources'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure resource metadata, content links, and associated skills.
                  </p>
                </div>
              </div>

              {/* Shared Metadata */}
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-5 space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 block">
                  Shared Resource Metadata
                </span>

                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Category / Topic">
                    <input
                      className={input}
                      placeholder="e.g. Frontend Engineering, Databases"
                      value={sharedCategory}
                      onChange={(e) => setSharedCategory(e.target.value)}
                    />
                  </Field>

                  <Field label="Target Difficulty">
                    <select
                      className={input}
                      value={sharedDifficulty}
                      onChange={(e) =>
                        setSharedDifficulty(e.target.value as ResourceInput['difficulty'])
                      }
                    >
                      {['beginner', 'intermediate', 'advanced'].map((d) => (
                        <option key={d} value={d}>
                          {prettyLabel(d)}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <div className="flex items-center min-h-11">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                        checked={sharedIsActive}
                        onChange={(e) => setSharedIsActive(e.target.checked)}
                      />
                      <span>Active resource (published)</span>
                    </label>
                  </div>
                </div>

                {/* Shared Skills & Career Paths */}
                <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-indigo-100">
                  {renderOptions(
                    skills.data?.data,
                    sharedSkillIds,
                    setSharedSkillIds,
                    'Covered Skills',
                    {
                      placeholder: 'Add custom skill...',
                      value: customSkillName,
                      onChange: setCustomSkillName,
                      onAdd: () => void handleCreateCustomSkill('resource'),
                      buttonText: 'Add Custom Skill',
                    },
                  )}

                  {renderOptions(
                    paths.data?.data,
                    sharedCareerPathIds,
                    setSharedCareerPathIds,
                    'Associated Career Paths',
                    {
                      placeholder: 'Add custom career...',
                      value: customCareerTitle,
                      onChange: setCustomCareerTitle,
                      onAdd: () => void handleCreateCustomCareer(),
                      buttonText: 'Add Custom Career',
                    },
                  )}
                </div>
              </div>

              {/* Resource Items */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-800">Resource Links & Content</span>
                  <button
                    type="button"
                    onClick={() => {
                      setResourceItems((prev) => [...prev, emptyResourceItem('video')]);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Another Link
                  </button>
                </div>

                {resourceItems.map((item, idx) => (
                  <div key={item.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Link #{idx + 1}</span>
                      {resourceItems.length > 1 && (
                        <button
                          type="button"
                          className="text-rose-500 hover:text-rose-700 p-1"
                          onClick={() => {
                            setResourceItems((prev) => prev.filter((_, i) => i !== idx));
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="sm:col-span-2">
                        <Field label="Title">
                          <input
                            className={input}
                            placeholder="Resource title..."
                            value={item.title}
                            onChange={(e) => {
                              const updated = [...resourceItems];
                              const cur = updated[idx];
                              if (cur) {
                                cur.title = e.target.value;
                                setResourceItems(updated);
                              }
                            }}
                          />
                        </Field>
                      </div>

                      <Field label="Format / Type">
                        <select
                          className={input}
                          value={item.type}
                          onChange={(e) => {
                            const updated = [...resourceItems];
                            const cur = updated[idx];
                            if (cur) {
                              cur.type = e.target.value as ResourceInput['type'];
                              setResourceItems(updated);
                            }
                          }}
                        >
                          {RESOURCE_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {prettyLabel(t)}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>

                    <Field label="URL (https://...)">
                      <input
                        className={input}
                        placeholder="https://..."
                        value={item.url}
                        onChange={(e) => {
                          const updated = [...resourceItems];
                          const cur = updated[idx];
                          if (cur) {
                            cur.url = e.target.value;
                            setResourceItems(updated);
                          }
                        }}
                      />
                    </Field>

                    <Field label="Description (optional)">
                      <textarea
                        className={`${input} min-h-16`}
                        placeholder="Brief overview of content..."
                        value={item.description}
                        onChange={(e) => {
                          const updated = [...resourceItems];
                          const cur = updated[idx];
                          if (cur) {
                            cur.description = e.target.value;
                            setResourceItems(updated);
                          }
                        }}
                      />
                    </Field>
                  </div>
                ))}
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('list');
                    setValidation('');
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Cancel & Return to List
                </button>

                <button
                  type="button"
                  className={button}
                  disabled={isSavingResources}
                  onClick={async () => {
                    await handleSaveResources();
                    setViewMode('list');
                  }}
                >
                  <Save className="h-4 w-4" />
                  <span>
                    {isSavingResources
                      ? 'Saving...'
                      : resourceItems.length > 1
                        ? `Save ${resourceItems.length} resources`
                        : 'Save resource'}
                  </span>
                </button>
              </div>

              {savedCount > 0 && (
                <div
                  role="status"
                  className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <span>{savedCount > 1 ? `${savedCount} resources saved.` : 'Resource saved.'}</span>
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
