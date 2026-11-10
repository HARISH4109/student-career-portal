import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  CheckCircle,
  Compass,
  Layers,
  Plus,
  Save,
  Trash2,
  Video,
  Globe,
  FileText,
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
  Frame,
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

  // Catalogs
  const paths = useCareerOptions<CareerPathDto>('career-paths?status=all');
  const resources = useCareerOptions<LearningResourceDto>('resources?status=all');
  const skills = useCareerData<Array<{ id: string; name: string }>>('skills');

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

  // ── Existing & Category Resources Lookup ──────────────────────────────────
  const currentExistingIds = new Set(resourceItems.map((it) => it.existingId).filter(Boolean));
  const availableOtherResources = (resources.data?.data || []).filter(
    (r) => !currentExistingIds.has(r.id),
  );
  const matchingCategoryResources = sharedCategory.trim()
    ? (resources.data?.data || []).filter(
        (r) =>
          r.category.trim().toLowerCase() === sharedCategory.trim().toLowerCase() &&
          !currentExistingIds.has(r.id),
      )
    : [];

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

  const handleAddExistingResourceToEditor = (existingIdToAdd: string) => {
    if (!existingIdToAdd) return;
    const row = resources.data?.data.find((r) => r.id === existingIdToAdd);
    if (!row) return;
    if (resourceItems.some((it) => it.existingId === row.id)) return;

    setResourceItems((prev) => [
      ...prev,
      {
        id: `res-exist-${row.id}`,
        existingId: row.id,
        title: row.title,
        url: row.url,
        type: row.type,
        description: row.description || '',
      },
    ]);
    setSharedSkillIds((prev) => Array.from(new Set([...prev, ...(row.skillIds || [])])));
    setSharedCareerPathIds((prev) =>
      Array.from(new Set([...prev, ...(row.careerPathIds || [])])),
    );
    if (!selectedFormats.includes(row.type)) {
      setSelectedFormats((prev) => [...prev, row.type]);
    }
  };

  const handleLoadCategoryResources = () => {
    if (!sharedCategory.trim()) return;
    if (matchingCategoryResources.length === 0) return;

    const itemsToAdd: MultiResourceItem[] = matchingCategoryResources.map((r) => ({
      id: `res-exist-${r.id}`,
      existingId: r.id,
      title: r.title,
      url: r.url,
      type: r.type,
      description: r.description || '',
    }));

    setResourceItems((prev) => [...prev, ...itemsToAdd]);
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

  // ── Multi-Format Toggle ──────────────────────────────────────────────────
  const toggleFormat = (fmt: ResourceInput['type']) => {
    if (selectedFormats.includes(fmt)) {
      if (selectedFormats.length > 1) {
        setSelectedFormats(selectedFormats.filter((f) => f !== fmt));
      }
    } else {
      setSelectedFormats([...selectedFormats, fmt]);
    }
  };

  // ── Multi-Resource Item Handlers ─────────────────────────────────────────
  const updateResourceItem = (index: number, patch: Partial<MultiResourceItem>) => {
    setResourceItems(
      resourceItems.map((item, idx) => (idx === index ? { ...item, ...patch } : item)),
    );
  };

  const addResourceItem = (defaultType?: ResourceInput['type']) => {
    const typeToUse = defaultType ?? selectedFormats[0] ?? 'video';
    setResourceItems([...resourceItems, emptyResourceItem(typeToUse)]);
  };

  const removeResourceItem = (index: number) => {
    if (resourceItems.length > 1) {
      setResourceItems(resourceItems.filter((_, idx) => idx !== index));
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
    <Frame title="Manage career catalog">
      {/* ── Tab Switcher ── */}
      <div role="tablist" aria-label="Catalog editor" className="flex flex-wrap gap-2">
        <button
          id="paths-tab"
          role="tab"
          aria-selected={editor === 'paths'}
          aria-controls="paths-editor"
          className={editor === 'paths' ? button : secondaryButton}
          onClick={() => {
            setEditor('paths');
          }}
        >
          <Compass className="h-4 w-4" />
          <span>Career paths</span>
        </button>
        <button
          id="resources-tab"
          role="tab"
          aria-selected={editor === 'resources'}
          aria-controls="resources-editor"
          className={editor === 'resources' ? button : secondaryButton}
          onClick={() => {
            setEditor('resources');
          }}
        >
          <BookOpen className="h-4 w-4" />
          <span>Learning resources</span>
        </button>
      </div>

      {customActionMsg && (
        <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-3 text-xs font-semibold text-indigo-900 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-600" />
          <span>{customActionMsg}</span>
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
      {/* ── Career Path Editor ────────────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <section
        id="paths-editor"
        role="tabpanel"
        aria-labelledby="paths-tab"
        hidden={editor !== 'paths'}
        className={`${card} space-y-6`}
      >
        <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Career path editor</h2>
            <p className="text-xs text-slate-500 mt-0.5">Author and publish curriculum roadmaps</p>
          </div>
          <span className="rounded-full bg-indigo-50 text-indigo-700 px-3 py-1 text-xs font-semibold">
            {path.stages.length} stages configured
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Edit career">
            <select
              className={input}
              value={pathId}
              onChange={(e) => {
                const row = paths.data?.data.find((p) => p.id === e.target.value);
                setPathId(e.target.value);
                setPath(
                  row
                    ? {
                        title: row.title,
                        description: row.description,
                        isActive: row.isActive,
                        stages: row.stages,
                      }
                    : { title: '', description: '', isActive: false, stages: [] },
                );
              }}
            >
              <option value="">New career</option>
              {paths.data?.data.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                  {p.isActive ? '' : ' (inactive)'}
                </option>
              ))}
            </select>
          </Field>

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

        <label className="flex min-h-11 items-center gap-3 font-semibold text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            checked={path.isActive}
            onChange={(e) => {
              setPath({ ...path, isActive: e.target.checked });
            }}
          />
          <span>Published career</span>
        </label>

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
              <legend className="font-bold text-slate-800 text-sm px-2 bg-white rounded-lg border border-slate-200">
                Stage {i + 1}
              </legend>

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

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2.5 font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
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
                  className={input}
                  placeholder="Overview of this learning milestone..."
                  value={stage.description}
                  onChange={(e) => {
                    updateStage(i, { ...stage, description: e.target.value });
                  }}
                />
              </Field>

              {renderOptions(
                skills.data?.data,
                stage.skills.map((s) => s.skillId),
                (ids) => {
                  updateStage(i, {
                    ...stage,
                    skills: ids.map(
                      (skillId) =>
                        stage.skills.find((s) => s.skillId === skillId) ?? {
                          skillId,
                          proficiency: 'intermediate',
                        },
                    ),
                  });
                },
                'Required skills',
                {
                  placeholder: 'Add new custom skill to stage...',
                  value: customStageSkillName,
                  onChange: setCustomStageSkillName,
                  onAdd: () => void handleCreateCustomSkill('stage', i),
                  buttonText: 'Add to Stage',
                },
              )}

              {stage.skills.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2 pt-2">
                  {stage.skills.map((s) => (
                    <Field
                      key={s.skillId}
                      label={`Target proficiency: ${skills.data?.data.find((v) => v.id === s.skillId)?.name ?? 'skill'}`}
                    >
                      <select
                        className={input}
                        value={s.proficiency}
                        onChange={(e) => {
                          updateStage(i, {
                            ...stage,
                            skills: stage.skills.map((v) =>
                              v.skillId === s.skillId
                                ? { ...v, proficiency: e.target.value as typeof s.proficiency }
                                : v,
                            ),
                          });
                        }}
                      >
                        {CAREER_PROFICIENCIES.map((level) => (
                          <option key={level}>{level}</option>
                        ))}
                      </select>
                    </Field>
                  ))}
                </div>
              )}

              {renderOptions(
                resources.data?.data,
                stage.resourceIds,
                (resourceIds) => {
                  updateStage(i, { ...stage, resourceIds });
                },
                'Stage resources',
              )}

              {/* Stage Activities */}
              {stage.activities.length > 0 && (
                <div className="space-y-3 pt-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Hands-on Activities
                  </p>
                  {stage.activities.map((a, index) => (
                    <div
                      key={index}
                      className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2"
                    >
                      <Field label="Activity title">
                        <input
                          className={input}
                          placeholder="e.g. Build an accessible portfolio"
                          value={a.title}
                          onChange={(e) => {
                            updateStage(i, {
                              ...stage,
                              activities: stage.activities.map((v, n) =>
                                n === index ? { ...v, title: e.target.value } : v,
                              ),
                            });
                          }}
                        />
                      </Field>

                      <Field label="Activity type">
                        <select
                          className={input}
                          value={a.type}
                          onChange={(e) => {
                            updateStage(i, {
                              ...stage,
                              activities: stage.activities.map((v, n) =>
                                n === index
                                  ? { ...v, type: e.target.value as 'project' | 'practice' }
                                  : v,
                              ),
                            });
                          }}
                        >
                          <option>project</option>
                          <option>practice</option>
                        </select>
                      </Field>

                      <div className="sm:col-span-2">
                        <Field label="Activity instructions">
                          <textarea
                            className={input}
                            placeholder="Detailed requirements, user stories, deployment instructions..."
                            value={a.description}
                            onChange={(e) => {
                              updateStage(i, {
                                ...stage,
                                activities: stage.activities.map((v, n) =>
                                  n === index ? { ...v, description: e.target.value } : v,
                                ),
                              });
                            }}
                          />
                        </Field>
                      </div>

                      <div className="sm:col-span-2 flex justify-end">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-800 transition p-1"
                          onClick={() => {
                            updateStage(i, {
                              ...stage,
                              activities: stage.activities.filter((_, n) => n !== index),
                            });
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Remove activity</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Stage Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  className={secondaryButton}
                  onClick={() => {
                    updateStage(i, {
                      ...stage,
                      activities: [
                        ...stage.activities,
                        { title: '', description: '', type: 'project' },
                      ],
                    });
                  }}
                >
                  <Plus className="h-4 w-4" />
                  <span>Add activity</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className={secondaryButton}
                    disabled={i === 0}
                    onClick={() => {
                      const stages = [...path.stages];
                      stages.splice(i - 1, 0, ...stages.splice(i, 1));
                      setPath({ ...path, stages });
                    }}
                  >
                    <ArrowUp className="h-4 w-4" />
                    <span>Move up</span>
                  </button>
                  <button
                    type="button"
                    className={secondaryButton}
                    disabled={i === path.stages.length - 1}
                    onClick={() => {
                      const stages = [...path.stages];
                      stages.splice(i + 1, 0, ...stages.splice(i, 1));
                      setPath({ ...path, stages });
                    }}
                  >
                    <ArrowDown className="h-4 w-4" />
                    <span>Move down</span>
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 transition"
                    onClick={() => {
                      setPath({ ...path, stages: path.stages.filter((_, n) => n !== i) });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Remove stage</span>
                  </button>
                </div>
              </div>
            </fieldset>
          ))}

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200">
            <button
              type="button"
              className={secondaryButton}
              onClick={() => {
                setPath({ ...path, stages: [...path.stages, emptyStage()] });
              }}
            >
              <Plus className="h-4 w-4" />
              <span>Add stage</span>
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
                if (parsed.success)
                  savePath.mutate(
                    {
                      path: pathId ? `career-paths/${pathId}` : 'career-paths',
                      method: pathId ? 'put' : 'post',
                      body: parsed.data,
                    },
                    {
                      onSuccess: (row) => {
                        setPathId(row.id);
                      },
                    },
                  );
              }}
            >
              <Save className="h-4 w-4" />
              <span>Save career</span>
            </button>
          </div>
        </div>

        {savePath.isSuccess && (
          <div
            role="status"
            className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2"
          >
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <span>Career saved.</span>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── Learning Resources Editor ────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <section
        id="resources-editor"
        role="tabpanel"
        aria-labelledby="resources-tab"
        hidden={editor !== 'resources'}
        className={`${card} space-y-6`}
      >
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Resource editor</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Curate and edit learning resources & tag competencies
          </p>
        </div>

        {/* Existing Resource Selector */}
        <Field label="Edit resource">
          <select
            className={input}
            value={resourceId}
            onChange={(e) => {
              handleSelectResource(e.target.value);
            }}
          >
            <option value="">New resource</option>
            {resources.data?.data.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title} ({prettyLabel(r.type)})
              </option>
            ))}
          </select>
        </Field>

        <div className="space-y-6">
          {/* Format Selection Bar */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Resource format
            </span>
            <div className="flex flex-wrap gap-2">
              {RESOURCE_TYPES.map((fmt) => {
                const isSelected = selectedFormats.includes(fmt);
                return (
                  <button
                    type="button"
                    key={fmt}
                    onClick={() => {
                      toggleFormat(fmt);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    {fmt === 'video' ? (
                      <Video className="h-3.5 w-3.5" />
                    ) : fmt === 'documentation' || fmt === 'article' ? (
                      <Globe className="h-3.5 w-3.5" />
                    ) : (
                      <FileText className="h-3.5 w-3.5" />
                    )}
                    <span>{prettyLabel(fmt)}</span>
                  </button>
                );
              })}
            </div>

            {/* Accessible select to ensure automated form queries find Resource format */}
            <div className="sr-only">
              <Field label="Resource format">
                <select
                  multiple
                  className={input}
                  value={selectedFormats}
                  onChange={(e) => {
                    setSelectedFormats(
                      Array.from(
                        e.target.selectedOptions,
                        (o) => o.value as ResourceInput['type'],
                      ),
                    );
                  }}
                >
                  {RESOURCE_TYPES.map((v) => (
                    <option key={v} value={v}>
                      {prettyLabel(v)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          {/* Resource Links Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Resource Links
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 text-xs font-semibold transition"
                  onClick={() => {
                    addResourceItem('video');
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Add Video URL</span>
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 text-xs font-semibold transition"
                  onClick={() => {
                    addResourceItem('documentation');
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Add Website/Docs URL</span>
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 text-xs font-semibold transition"
                  onClick={() => {
                    addResourceItem('article');
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Add Article URL</span>
                </button>
              </div>
            </div>

            {/* Quick include another existing catalog resource */}
            {availableOtherResources.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-xs font-medium text-slate-600">
                  Include another existing catalog resource to edit together:
                </span>
                <select
                  className={`${input} text-xs py-1 h-8 max-w-sm`}
                  value=""
                  onChange={(e) => {
                    handleAddExistingResourceToEditor(e.target.value);
                  }}
                >
                  <option value="">+ Select another listed resource...</option>
                  {availableOtherResources.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title} ({prettyLabel(r.type)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Category match helper */}
            {matchingCategoryResources.length > 0 && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2">
                <span>
                  Found <strong>{matchingCategoryResources.length}</strong> other catalog
                  resource(s) in category &ldquo;{sharedCategory}&rdquo;.
                </span>
                <button
                  type="button"
                  onClick={handleLoadCategoryResources}
                  className="inline-flex items-center gap-1 font-bold text-indigo-700 hover:text-indigo-900 underline"
                >
                  <span>Load into editor</span>
                </button>
              </div>
            )}

            {resourceItems.map((item, idx) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-100">
                    Link #{idx + 1}
                  </span>
                  {resourceItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        removeResourceItem(idx);
                      }}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Remove link</span>
                    </button>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-12">
                  <div className="sm:col-span-3">
                    <Field label="Format">
                      <select
                        className={input}
                        aria-label={idx === 0 ? 'Resource format' : undefined}
                        value={item.type}
                        onChange={(e) => {
                          updateResourceItem(idx, {
                            type: e.target.value as ResourceInput['type'],
                          });
                        }}
                      >
                        {RESOURCE_TYPES.map((v) => (
                          <option key={v} value={v}>
                            {prettyLabel(v)}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <div className="sm:col-span-4">
                    <Field label="Resource title">
                      <input
                        className={input}
                        placeholder="e.g. Official Docs or YouTube Lecture"
                        value={item.title}
                        onChange={(e) => {
                          updateResourceItem(idx, { title: e.target.value });
                        }}
                      />
                    </Field>
                  </div>

                  <div className="sm:col-span-5">
                    <Field label="Resource url">
                      <input
                        className={input}
                        placeholder="https://..."
                        value={item.url}
                        onChange={(e) => {
                          updateResourceItem(idx, { url: e.target.value });
                        }}
                      />
                    </Field>
                  </div>
                </div>

                <Field label="Resource description">
                  <input
                    className={input}
                    placeholder="Brief summary or topic covered..."
                    value={item.description}
                    onChange={(e) => {
                      updateResourceItem(idx, { description: e.target.value });
                    }}
                  />
                </Field>
              </div>
            ))}

            <button
              type="button"
              className={secondaryButton}
              onClick={() => {
                addResourceItem();
              }}
            >
              <Plus className="h-4 w-4" />
              <span>+ Add another resource link</span>
            </button>
          </div>

          {/* Shared Metadata (Category, Difficulty, Skills, Careers) */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm">
              Shared Categorization &amp; Competencies
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Resource category">
                <input
                  className={input}
                  placeholder="e.g. Frontend Development, Databases, Cloud"
                  value={sharedCategory}
                  onChange={(e) => {
                    setSharedCategory(e.target.value);
                  }}
                />
              </Field>

              <Field label="Resource difficulty">
                <select
                  className={input}
                  value={sharedDifficulty}
                  onChange={(e) => {
                    setSharedDifficulty(e.target.value as ResourceInput['difficulty']);
                  }}
                >
                  {['beginner', 'intermediate', 'advanced'].map((v) => (
                    <option key={v} value={v}>
                      {prettyLabel(v)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <label className="flex min-h-11 items-center gap-3 font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                checked={sharedIsActive}
                onChange={(e) => {
                  setSharedIsActive(e.target.checked);
                }}
              />
              <span>Active resource</span>
            </label>

            {renderOptions(
              skills.data?.data,
              sharedSkillIds,
              setSharedSkillIds,
              'Resource skills',
              {
                placeholder: 'Add custom skill (e.g. GraphQL, Tailwind, Redis)...',
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
              'Resource careers',
              {
                placeholder: 'Add custom career (e.g. AI Engineer, SRE)...',
                value: customCareerTitle,
                onChange: setCustomCareerTitle,
                onAdd: () => void handleCreateCustomCareer(),
                buttonText: 'Add Custom Career',
              },
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200">
          <button
            type="button"
            className={button}
            disabled={isSavingResources}
            onClick={() => void handleSaveResources()}
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
    </Frame>
  );
}
