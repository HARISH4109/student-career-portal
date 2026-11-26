import type {
  AcademicProgramWithStreamsDto,
  AcademicStreamDto,
  CreateAcademicProgramDto,
  CreateAcademicStreamDto,
} from '@career-portal/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Edit2,
  FolderTree,
  GraduationCap,
  Layers,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useState } from 'react';
import {
  createAcademicProgram,
  createAcademicStream,
  deleteAcademicProgram,
  deleteAcademicStream,
  getAcademicPrograms,
  updateAcademicProgram,
  updateAcademicStream,
} from '../services/academic-api';

const DEGREE_OPTIONS = ['B.Tech', 'M.Tech', 'MCA', 'B.Sc', 'M.Sc', 'BCA', 'Dual Degree', 'PhD'];

export function ProgramsManagePage(): React.JSX.Element {
  const queryClient = useQueryClient();

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ['academic', 'programs-manage'],
    queryFn: getAcademicPrograms,
  });

  // Program Modal state
  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);
  const [programToEdit, setProgramToEdit] = useState<AcademicProgramWithStreamsDto | null>(null);
  const [progName, setProgName] = useState('');
  const [progDegree, setProgDegree] = useState('B.Tech');
  const [progDuration, setProgDuration] = useState(4);
  const [progError, setProgError] = useState('');

  // Stream Modal state
  const [isStreamModalOpen, setIsStreamModalOpen] = useState(false);
  const [targetProgram, setTargetProgram] = useState<AcademicProgramWithStreamsDto | null>(null);
  const [streamToEdit, setStreamToEdit] = useState<AcademicStreamDto | null>(null);
  const [streamName, setStreamName] = useState('');
  const [streamCode, setStreamCode] = useState('');
  const [streamError, setStreamError] = useState('');

  // Mutations
  const createProgramMutation = useMutation({
    mutationFn: (payload: CreateAcademicProgramDto) => createAcademicProgram(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['academic'] });
      setIsProgramModalOpen(false);
      resetProgramForm();
    },
    onError: (err: Error) => {
      setProgError(err.message || 'Failed to create academic program');
    },
  });

  const updateProgramMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateAcademicProgramDto> }) =>
      updateAcademicProgram(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['academic'] });
      setIsProgramModalOpen(false);
      resetProgramForm();
    },
    onError: (err: Error) => {
      setProgError(err.message || 'Failed to update academic program');
    },
  });

  const deleteProgramMutation = useMutation({
    mutationFn: (id: string) => deleteAcademicProgram(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['academic'] });
    },
  });

  const createStreamMutation = useMutation({
    mutationFn: (payload: CreateAcademicStreamDto) => createAcademicStream(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['academic'] });
      setIsStreamModalOpen(false);
      resetStreamForm();
    },
    onError: (err: Error) => {
      setStreamError(err.message || 'Failed to create specialization stream');
    },
  });

  const updateStreamMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { name?: string; code?: string } }) =>
      updateAcademicStream(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['academic'] });
      setIsStreamModalOpen(false);
      resetStreamForm();
    },
    onError: (err: Error) => {
      setStreamError(err.message || 'Failed to update specialization stream');
    },
  });

  const deleteStreamMutation = useMutation({
    mutationFn: (id: string) => deleteAcademicStream(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['academic'] });
    },
  });

  // Helpers
  const resetProgramForm = () => {
    setProgramToEdit(null);
    setProgName('');
    setProgDegree('B.Tech');
    setProgDuration(4);
    setProgError('');
  };

  const openAddProgram = () => {
    resetProgramForm();
    setIsProgramModalOpen(true);
  };

  const openEditProgram = (prog: AcademicProgramWithStreamsDto) => {
    setProgramToEdit(prog);
    setProgName(prog.name);
    setProgDegree(prog.degreeLevel);
    setProgDuration(prog.durationYears);
    setProgError('');
    setIsProgramModalOpen(true);
  };

  const handleProgramSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!progName.trim()) {
      setProgError('Program name is required');
      return;
    }
    if (programToEdit) {
      updateProgramMutation.mutate({
        id: programToEdit.id,
        payload: { name: progName.trim(), degreeLevel: progDegree, durationYears: progDuration },
      });
    } else {
      createProgramMutation.mutate({
        name: progName.trim(),
        degreeLevel: progDegree,
        durationYears: progDuration,
      });
    }
  };

  const resetStreamForm = () => {
    setTargetProgram(null);
    setStreamToEdit(null);
    setStreamName('');
    setStreamCode('');
    setStreamError('');
  };

  const openAddStream = (prog: AcademicProgramWithStreamsDto) => {
    resetStreamForm();
    setTargetProgram(prog);
    setIsStreamModalOpen(true);
  };

  const openEditStream = (prog: AcademicProgramWithStreamsDto, stream: AcademicStreamDto) => {
    setTargetProgram(prog);
    setStreamToEdit(stream);
    setStreamName(stream.name);
    setStreamCode(stream.code);
    setStreamError('');
    setIsStreamModalOpen(true);
  };

  const handleStreamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!streamName.trim() || !streamCode.trim()) {
      setStreamError('Stream name and unique code are required');
      return;
    }
    if (streamToEdit) {
      updateStreamMutation.mutate({
        id: streamToEdit.id,
        payload: { name: streamName.trim(), code: streamCode.trim().toUpperCase() },
      });
    } else if (targetProgram) {
      createStreamMutation.mutate({
        programId: targetProgram.id,
        name: streamName.trim(),
        code: streamCode.trim().toUpperCase(),
      });
    }
  };

  return (
    <div className="space-y-6 w-full max-w-[1536px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" /> Academic Programs & Streams
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Administrator Console — Configure departmental degree programs (B.Tech, M.Tech, MCA,
            B.Sc, M.Sc) and specialization streams
          </p>
        </div>

        <button
          onClick={openAddProgram}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm rounded-lg shadow-sm transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Add Degree Program
        </button>
      </div>

      {/* Institutional Department Context Banner */}
      <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
        <div className="p-2.5 bg-primary/10 text-primary rounded-lg">
          <Layers className="h-5 w-5" />
        </div>
        <div>
          <span className="text-xs font-medium text-primary">
            Department Scope
          </span>
          <p className="text-sm font-bold text-foreground">
            Computer Science & Engineering (CSE)
          </p>
        </div>
      </div>

      {/* Program List */}
      {isLoading ? (
        <div className="p-16 text-center text-muted-foreground text-sm">
          Loading departmental programs…
        </div>
      ) : programs.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground stroke-[1.5]" />
          <h3 className="mt-3 text-base font-bold text-foreground">No programs configured</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add degree programs to start configuring academic tracks.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {programs.map((program) => (
            <div
              key={program.id}
              className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4"
            >
              {/* Program Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-primary/10 text-primary rounded-lg mt-0.5">
                    <FolderTree className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold text-foreground">{program.name}</h2>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/15 text-primary border border-primary/20">
                        {program.degreeLevel}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">
                        • {program.durationYears} Years Duration
                      </span>
                      {!program.isActive && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50">
                          Archived
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                      {program.streams?.length || 0} Specialization Streams Configured
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => { openAddStream(program); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted/30 hover:bg-muted text-xs font-semibold text-foreground transition cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 text-primary" /> Add Stream
                  </button>
                  <button
                    onClick={() => { openEditProgram(program); }}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-lg transition cursor-pointer"
                    title="Edit program"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          `Are you sure you want to drop program "${program.name}"? Active students will retain their records.`,
                        )
                      ) {
                        deleteProgramMutation.mutate(program.id);
                      }
                    }}
                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition cursor-pointer"
                    title="Drop program"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Streams List */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2.5">
                  Specialization Streams & Pathways
                </p>
                {(!program.streams || program.streams.length === 0) ? (
                  <p className="text-xs text-muted-foreground italic bg-muted/20 px-4 py-3 rounded-lg border border-dashed border-border">
                    No individual streams added yet. Students enrolling in this program will study the general core curriculum.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {program.streams.map((stream) => (
                      <div
                        key={stream.id}
                        className="rounded-lg border border-border bg-muted/20 p-3 flex items-center justify-between hover:bg-muted/30 transition"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-bold text-foreground truncate">{stream.name}</p>
                          <span className="inline-block mt-0.5 text-[10px] font-mono font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                            {stream.code}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => { openEditStream(program, stream); }}
                            className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded cursor-pointer"
                            title="Edit stream"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (
                                window.confirm(`Drop stream "${stream.name}" (${stream.code})?`)
                              ) {
                                deleteStreamMutation.mutate(stream.id);
                              }
                            }}
                            className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded cursor-pointer"
                            title="Drop stream"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Program Create/Edit Modal */}
      {isProgramModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-card border border-border p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">
                {programToEdit ? 'Edit Degree Program' : 'Add Degree Program'}
              </h3>
              <button
                onClick={() => { setIsProgramModalOpen(false); }}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {progError && (
              <div className="flex items-center gap-2 p-3 text-xs text-rose-700 dark:text-rose-300 bg-rose-500/10 rounded-lg border border-rose-500/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{progError}</span>
              </div>
            )}

            <form onSubmit={handleProgramSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Program Name <span className="text-rose-700 dark:text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={progName}
                  onChange={(e) => { setProgName(e.target.value); }}
                  placeholder="e.g. Master of Computer Applications (MCA)"
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Degree Level <span className="text-rose-700 dark:text-rose-400">*</span>
                  </label>
                  <select
                    value={progDegree}
                    onChange={(e) => { setProgDegree(e.target.value); }}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  >
                    {DEGREE_OPTIONS.map((deg) => (
                      <option key={deg} value={deg}>
                        {deg}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Duration (Years)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={progDuration}
                    onChange={(e) => { setProgDuration(parseInt(e.target.value, 10) || 4); }}
                    className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => { setIsProgramModalOpen(false); }}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/40 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createProgramMutation.isPending || updateProgramMutation.isPending}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-lg transition disabled:opacity-60 cursor-pointer"
                >
                  {createProgramMutation.isPending || updateProgramMutation.isPending
                    ? 'Saving…'
                    : programToEdit
                    ? 'Update Program'
                    : 'Create Program'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stream Create/Edit Modal */}
      {isStreamModalOpen && targetProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-card border border-border p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {streamToEdit ? 'Edit Specialization Stream' : 'Add Specialization Stream'}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{targetProgram.name}</p>
              </div>
              <button
                onClick={() => { setIsStreamModalOpen(false); }}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {streamError && (
              <div className="flex items-center gap-2 p-3 text-xs text-rose-700 dark:text-rose-300 bg-rose-500/10 rounded-lg border border-rose-500/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{streamError}</span>
              </div>
            )}

            <form onSubmit={handleStreamSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Stream / Specialization Name <span className="text-rose-700 dark:text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={streamName}
                  onChange={(e) => { setStreamName(e.target.value); }}
                  placeholder="e.g. Artificial Intelligence & Data Science"
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Stream Code / Abbreviation <span className="text-rose-700 dark:text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={streamCode}
                  onChange={(e) => { setStreamCode(e.target.value); }}
                  placeholder="e.g. AI-DS or DA"
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground uppercase focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => { setIsStreamModalOpen(false); }}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/40 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createStreamMutation.isPending || updateStreamMutation.isPending}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-lg transition disabled:opacity-60 cursor-pointer"
                >
                  {createStreamMutation.isPending || updateStreamMutation.isPending
                    ? 'Saving…'
                    : streamToEdit
                    ? 'Update Stream'
                    : 'Create Stream'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
