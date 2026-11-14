import type {
  AcademicProgramWithStreamsDto,
  AcademicStreamDto,
  CreateAcademicProgramDto,
  CreateAcademicStreamDto,
  CreateBatchDto,
  UpdateAcademicProgramDto,
  UpdateAcademicStreamDto,
} from '@career-portal/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckCircle2,
  Edit2,
  GraduationCap,
  Layers,
  Loader2,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import {
  createBatch,
  createCourse,
  createStream,
  deleteBatch,
  deleteCourse,
  deleteStream,
  getBatches,
  getCourses,
  getStreams,
  updateCourse,
  updateStream,
} from '../api/admin-api';

export function AcademicConfigTab(): React.JSX.Element {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<'courses' | 'streams' | 'batches'>('courses');

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Course Modal State
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [courseToEdit, setCourseToEdit] = useState<AcademicProgramWithStreamsDto | null>(null);
  const [courseName, setCourseName] = useState('');
  const [courseDegreeLevel, setCourseDegreeLevel] = useState('Bachelors');
  const [courseDuration, setCourseDuration] = useState<number>(4);

  // Stream Modal State
  const [isStreamModalOpen, setIsStreamModalOpen] = useState(false);
  const [streamToEdit, setStreamToEdit] = useState<AcademicStreamDto | null>(null);
  const [streamProgramId, setStreamProgramId] = useState('');
  const [streamName, setStreamName] = useState('');
  const [streamCode, setStreamCode] = useState('');
  const [streamCourseFilter, setStreamCourseFilter] = useState('');

  // Batch Modal State
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchYear, setBatchYear] = useState<number>(new Date().getFullYear() + 1);

  const clearMessages = () => {
    setErrorMessage('');
    setSuccessMessage('');
  };

  // Queries
  const { data: courses = [], isLoading: isLoadingCourses } = useQuery({
    queryKey: ['admin', 'academic', 'courses'],
    queryFn: () => getCourses(),
  });

  const { data: streams = [], isLoading: isLoadingStreams } = useQuery({
    queryKey: ['admin', 'academic', 'streams', streamCourseFilter],
    queryFn: () => getStreams(streamCourseFilter || undefined),
  });

  const { data: batches = [], isLoading: isLoadingBatches } = useQuery({
    queryKey: ['admin', 'academic', 'batches'],
    queryFn: getBatches,
  });

  // Course Mutations
  const createCourseMutation = useMutation({
    mutationFn: (payload: CreateAcademicProgramDto) => createCourse(payload),
    onSuccess: async () => {
      clearMessages();
      setSuccessMessage('Course / Academic Program created successfully');
      setIsCourseModalOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'academic', 'courses'] });
    },
    onError: (err: Error) => {
      clearMessages();
      setErrorMessage(err.message || 'Failed to create course');
    },
  });

  const updateCourseMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAcademicProgramDto }) =>
      updateCourse(id, payload),
    onSuccess: async () => {
      clearMessages();
      setSuccessMessage('Course / Academic Program updated successfully');
      setIsCourseModalOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'academic', 'courses'] });
    },
    onError: (err: Error) => {
      clearMessages();
      setErrorMessage(err.message || 'Failed to update course');
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: deleteCourse,
    onSuccess: async () => {
      clearMessages();
      setSuccessMessage('Course deactivated successfully');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'academic', 'courses'] });
    },
    onError: (err: Error) => {
      clearMessages();
      setErrorMessage(err.message || 'Failed to deactivate course');
    },
  });

  // Stream Mutations
  const createStreamMutation = useMutation({
    mutationFn: (payload: CreateAcademicStreamDto) => createStream(payload),
    onSuccess: async () => {
      clearMessages();
      setSuccessMessage('Specialization Stream created successfully');
      setIsStreamModalOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'academic', 'streams'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'academic', 'courses'] });
    },
    onError: (err: Error) => {
      clearMessages();
      setErrorMessage(err.message || 'Failed to create stream');
    },
  });

  const updateStreamMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAcademicStreamDto }) =>
      updateStream(id, payload),
    onSuccess: async () => {
      clearMessages();
      setSuccessMessage('Specialization Stream updated successfully');
      setIsStreamModalOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'academic', 'streams'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'academic', 'courses'] });
    },
    onError: (err: Error) => {
      clearMessages();
      setErrorMessage(err.message || 'Failed to update stream');
    },
  });

  const deleteStreamMutation = useMutation({
    mutationFn: deleteStream,
    onSuccess: async () => {
      clearMessages();
      setSuccessMessage('Stream deactivated successfully');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'academic', 'streams'] });
    },
    onError: (err: Error) => {
      clearMessages();
      setErrorMessage(err.message || 'Failed to deactivate stream');
    },
  });

  // Batch Mutations
  const createBatchMutation = useMutation({
    mutationFn: (payload: CreateBatchDto) => createBatch(payload),
    onSuccess: async () => {
      clearMessages();
      setSuccessMessage('Graduation batch created successfully');
      setIsBatchModalOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'academic', 'batches'] });
    },
    onError: (err: Error) => {
      clearMessages();
      setErrorMessage(err.message || 'Failed to create batch');
    },
  });

  const deleteBatchMutation = useMutation({
    mutationFn: deleteBatch,
    onSuccess: async () => {
      clearMessages();
      setSuccessMessage('Batch deactivated');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'academic', 'batches'] });
    },
    onError: (err: Error) => {
      clearMessages();
      setErrorMessage(err.message || 'Failed to deactivate batch');
    },
  });

  const openCreateCourseModal = () => {
    setCourseToEdit(null);
    setCourseName('');
    setCourseDegreeLevel('Bachelors');
    setCourseDuration(4);
    setIsCourseModalOpen(true);
  };

  const openEditCourseModal = (course: AcademicProgramWithStreamsDto) => {
    setCourseToEdit(course);
    setCourseName(course.name);
    setCourseDegreeLevel(course.degreeLevel);
    setCourseDuration(course.durationYears);
    setIsCourseModalOpen(true);
  };

  const openCreateStreamModal = () => {
    setStreamToEdit(null);
    setStreamProgramId(streamCourseFilter || (courses[0]?.id ?? ''));
    setStreamName('');
    setStreamCode('');
    setIsStreamModalOpen(true);
  };

  const openEditStreamModal = (stream: AcademicStreamDto) => {
    setStreamToEdit(stream);
    setStreamProgramId(stream.programId);
    setStreamName(stream.name);
    setStreamCode(stream.code);
    setIsStreamModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Alert Banners */}
      {errorMessage && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-red-500 hover:text-red-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-emerald-500 hover:text-emerald-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Sub-navigation bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveSection('courses')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              activeSection === 'courses'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <GraduationCap className="h-4 w-4" /> Degree Courses ({courses.length})
          </button>
          <button
            onClick={() => setActiveSection('streams')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              activeSection === 'streams'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Layers className="h-4 w-4" /> Specialization Streams ({streams.length})
          </button>
          <button
            onClick={() => setActiveSection('batches')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              activeSection === 'batches'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Calendar className="h-4 w-4" /> Graduation Batches ({batches.length})
          </button>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/dashboard/programs"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 underline"
          >
            <BookOpen className="h-4 w-4" /> Full Programs Manager →
          </Link>
          {activeSection === 'courses' && (
            <button
              onClick={openCreateCourseModal}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" /> Add Course / Program
            </button>
          )}
          {activeSection === 'streams' && (
            <button
              onClick={openCreateStreamModal}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" /> Add Stream
            </button>
          )}
          {activeSection === 'batches' && (
            <button
              onClick={() => {
                setBatchYear(new Date().getFullYear() + 1);
                setIsBatchModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" /> Add Batch
            </button>
          )}
        </div>
      </div>

      {/* Courses / Programs Section */}
      {activeSection === 'courses' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Course / Degree Program
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Degree Level
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Duration
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Streams
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {isLoadingCourses ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
                    </td>
                  </tr>
                ) : courses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-slate-500">
                      No degree courses registered yet. Click &quot;Add Course / Program&quot; to define your curriculum.
                    </td>
                  </tr>
                ) : (
                  courses.map((course) => (
                    <tr key={course.id} className="transition-colors hover:bg-slate-50/70">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-900">{course.name}</span>
                          <span className="font-mono text-[11px] text-slate-400">ID: {course.id.slice(0, 8)}...</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-100">
                          {course.degreeLevel}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-slate-700">
                        {course.durationYears} {course.durationYears === 1 ? 'Year' : 'Years'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                        {course.streams?.length ?? 0} {course.streams?.length === 1 ? 'stream' : 'streams'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            course.isActive
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {course.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditCourseModal(course)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                            title="Edit course"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteCourseMutation.mutate(course.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                            title="Deactivate course"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Streams Section */}
      {activeSection === 'streams' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Filter by Degree Course:</span>
              <select
                value={streamCourseFilter}
                onChange={(e) => setStreamCourseFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
              >
                <option value="">All Degree Courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.degreeLevel})
                  </option>
                ))}
              </select>
            </div>
            <span className="text-xs text-slate-400">
              Showing {streams.length} stream{streams.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Code
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Stream Name
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Parent Degree Program
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {isLoadingStreams ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
                      </td>
                    </tr>
                  ) : streams.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-sm text-slate-500">
                        No specialization streams found. Click &quot;Add Stream&quot; to create one.
                      </td>
                    </tr>
                  ) : (
                    streams.map((stream) => {
                      const parentCourse = courses.find((c) => c.id === stream.programId);
                      return (
                        <tr key={stream.id} className="transition-colors hover:bg-slate-50/70">
                          <td className="px-6 py-4 font-mono text-xs font-bold text-slate-700">{stream.code}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-slate-900">{stream.name}</td>
                          <td className="px-6 py-4 text-xs text-slate-600">
                            {parentCourse ? `${parentCourse.name} (${parentCourse.degreeLevel})` : stream.programId.slice(0, 8)}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                stream.isActive
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {stream.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEditStreamModal(stream)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                title="Edit stream"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => deleteStreamMutation.mutate(stream.id)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                title="Deactivate stream"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Batches Section */}
      {activeSection === 'batches' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Graduation Year
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {isLoadingBatches ? (
                  <tr>
                    <td colSpan={3} className="py-12 text-center text-slate-500">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
                    </td>
                  </tr>
                ) : batches.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-12 text-center text-sm text-slate-500">
                      No graduation batches registered yet.
                    </td>
                  </tr>
                ) : (
                  batches.map((b) => (
                    <tr key={b.id} className="transition-colors hover:bg-slate-50/70">
                      <td className="px-6 py-4 font-bold text-sm text-slate-900">
                        Class of {b.graduationYear}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            b.isActive
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {b.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => deleteBatchMutation.mutate(b.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="Deactivate batch"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Course Modal */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900">
                {courseToEdit ? 'Edit Degree Course' : 'Create Degree Course / Program'}
              </h3>
              <button
                onClick={() => setIsCourseModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Course / Program Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. B.Tech Computer Science and Engineering"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Degree Level *
                </label>
                <select
                  value={courseDegreeLevel}
                  onChange={(e) => setCourseDegreeLevel(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                >
                  <option value="Bachelors">Bachelors (e.g. B.Tech, B.E., B.Sc)</option>
                  <option value="Masters">Masters (e.g. M.Tech, M.S., MCA)</option>
                  <option value="Doctoral">Doctoral (e.g. Ph.D)</option>
                  <option value="Diploma">Diploma / Post-Graduate Diploma</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Duration (Years) *
                </label>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={courseDuration}
                  onChange={(e) => setCourseDuration(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                onClick={() => setIsCourseModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (courseToEdit) {
                    updateCourseMutation.mutate({
                      id: courseToEdit.id,
                      payload: {
                        name: courseName,
                        degreeLevel: courseDegreeLevel,
                        durationYears: courseDuration,
                      },
                    });
                  } else {
                    createCourseMutation.mutate({
                      name: courseName,
                      degreeLevel: courseDegreeLevel,
                      durationYears: courseDuration,
                    });
                  }
                }}
                disabled={!courseName.trim() || createCourseMutation.isPending || updateCourseMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {(createCourseMutation.isPending || updateCourseMutation.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {courseToEdit ? 'Save Changes' : 'Create Course'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stream Modal */}
      {isStreamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900">
                {streamToEdit ? 'Edit Specialization Stream' : 'Create Specialization Stream'}
              </h3>
              <button
                onClick={() => setIsStreamModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {!streamToEdit && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Parent Degree Course *
                  </label>
                  <select
                    value={streamProgramId}
                    onChange={(e) => setStreamProgramId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.degreeLevel})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Stream Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Artificial Intelligence & Machine Learning"
                  value={streamName}
                  onChange={(e) => setStreamName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Stream Code *
                </label>
                <input
                  type="text"
                  placeholder="e.g. CSE-AIML"
                  value={streamCode}
                  onChange={(e) => setStreamCode(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                onClick={() => setIsStreamModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (streamToEdit) {
                    updateStreamMutation.mutate({
                      id: streamToEdit.id,
                      payload: {
                        name: streamName,
                        code: streamCode,
                      },
                    });
                  } else {
                    createStreamMutation.mutate({
                      programId: streamProgramId,
                      name: streamName,
                      code: streamCode,
                    });
                  }
                }}
                disabled={!streamName.trim() || !streamCode.trim() || createStreamMutation.isPending || updateStreamMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {(createStreamMutation.isPending || updateStreamMutation.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {streamToEdit ? 'Save Changes' : 'Create Stream'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Modal */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900">Add Graduation Batch</h3>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Graduation Year *
                </label>
                <input
                  type="number"
                  min={2020}
                  max={2100}
                  value={batchYear}
                  onChange={(e) => setBatchYear(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => createBatchMutation.mutate({ graduationYear: batchYear })}
                disabled={!batchYear || createBatchMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {createBatchMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Add Batch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
