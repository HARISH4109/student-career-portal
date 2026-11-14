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
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-blue-600" /> Academic Programs & Streams
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Administrator Console — Configure departmental degree programs (B.Tech, M.Tech, MCA,
            B.Sc, M.Sc) and specialization streams
          </p>
        </div>

        <button
          onClick={openAddProgram}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" /> Add Degree Program
        </button>
      </div>

      {/* Institutional Department Context Banner */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 flex items-center gap-3">
        <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
          <Layers className="h-5 w-5" />
        </div>
        <div>
          <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider">
            Department Scope
          </span>
          <p className="text-sm font-bold text-slate-900">
            Computer Science & Engineering (CSE)
          </p>
        </div>
      </div>

      {/* Program List */}
      {isLoading ? (
        <div className="p-16 text-center text-slate-400 text-sm">
          Loading departmental programs…
        </div>
      ) : programs.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <GraduationCap className="mx-auto h-12 w-12 text-slate-300 stroke-[1.5]" />
          <h3 className="mt-3 text-base font-bold text-slate-800">No programs configured</h3>
          <p className="mt-1 text-sm text-slate-500">
            Add degree programs to start configuring academic tracks.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {programs.map((program) => (
            <div
              key={program.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
            >
              {/* Program Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl mt-0.5">
                    <FolderTree className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold text-slate-900">{program.name}</h2>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                        {program.degreeLevel}
                      </span>
                      <span className="text-xs font-medium text-slate-500">
                        • {program.durationYears} Years Duration
                      </span>
                      {!program.isActive && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                          Archived
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {program.streams?.length || 0} Specialization Streams Configured
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => { openAddStream(program); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition"
                  >
                    <Plus className="h-3.5 w-3.5 text-blue-600" /> Add Stream
                  </button>
                  <button
                    onClick={() => { openEditProgram(program); }}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
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
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Drop program"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Streams List */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
                  Specialization Streams & Pathways
                </p>
                {(!program.streams || program.streams.length === 0) ? (
                  <p className="text-xs text-slate-400 italic bg-slate-50 px-4 py-3 rounded-xl border border-dashed border-slate-200">
                    No individual streams added yet. Students enrolling in this program will study the general core curriculum.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {program.streams.map((stream) => (
                      <div
                        key={stream.id}
                        className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 flex items-center justify-between hover:bg-slate-50 transition"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-bold text-slate-800 truncate">{stream.name}</p>
                          <span className="inline-block mt-0.5 text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                            {stream.code}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => { openEditStream(program, stream); }}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded"
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
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {programToEdit ? 'Edit Degree Program' : 'Add Degree Program'}
              </h3>
              <button
                onClick={() => { setIsProgramModalOpen(false); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {progError && (
              <div className="flex items-center gap-2 p-3 text-xs text-red-700 bg-red-50 rounded-xl border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{progError}</span>
              </div>
            )}

            <form onSubmit={handleProgramSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Program Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={progName}
                  onChange={(e) => { setProgName(e.target.value); }}
                  placeholder="e.g. Master of Computer Applications (MCA)"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Degree Level <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={progDegree}
                    onChange={(e) => { setProgDegree(e.target.value); }}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                  >
                    {DEGREE_OPTIONS.map((deg) => (
                      <option key={deg} value={deg}>
                        {deg}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Duration (Years)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={progDuration}
                    onChange={(e) => { setProgDuration(parseInt(e.target.value, 10) || 4); }}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsProgramModalOpen(false); }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createProgramMutation.isPending || updateProgramMutation.isPending}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition disabled:opacity-60"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {streamToEdit ? 'Edit Specialization Stream' : 'Add Specialization Stream'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{targetProgram.name}</p>
              </div>
              <button
                onClick={() => { setIsStreamModalOpen(false); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {streamError && (
              <div className="flex items-center gap-2 p-3 text-xs text-red-700 bg-red-50 rounded-xl border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{streamError}</span>
              </div>
            )}

            <form onSubmit={handleStreamSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Stream / Specialization Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={streamName}
                  onChange={(e) => { setStreamName(e.target.value); }}
                  placeholder="e.g. Artificial Intelligence & Data Science"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Stream Code / Abbreviation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={streamCode}
                  onChange={(e) => { setStreamCode(e.target.value); }}
                  placeholder="e.g. AI-DS or DA"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 uppercase focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsStreamModalOpen(false); }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createStreamMutation.isPending || updateStreamMutation.isPending}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition disabled:opacity-60"
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
