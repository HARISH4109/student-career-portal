import type { ResumeAnalysisResponseDto, ResumeResponseDto } from '@career-portal/shared-types';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Check,
  Copy,
  Download,
  FileText,
  FileUp,
  Loader2,
  Plus,
  Sparkles,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router';

import {
  useAnalyzeResume,
  useDeleteResume,
  useDuplicateResume,
  useResumes,
  useSetPrimaryResume,
  useUploadResume,
} from '../api/resume-api';
import { ResumeAnalysisModal } from '../components/ResumeAnalysisModal';
import { downloadResumeJson, downloadResumePdf } from '../utils/resume-exporter';

export function ResumeListPage(): React.JSX.Element {
  const { data: resumes, isLoading } = useResumes();
  const duplicateMutation = useDuplicateResume();
  const setPrimaryMutation = useSetPrimaryResume();
  const deleteMutation = useDeleteResume();
  const analyzeMutation = useAnalyzeResume();
  const uploadMutation = useUploadResume();

  const [activeTab, setActiveTab] = useState<'all' | 'builder' | 'uploaded'>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeAnalysis, setActiveAnalysis] = useState<{
    modalOpen: boolean;
    analysis?: ResumeAnalysisResponseDto | undefined;
    resumeTitle?: string | undefined;
  }>({ modalOpen: false });

  const builderResumes = useMemo(
    () => (resumes ? resumes.filter((r) => !r.content.isUploaded) : []),
    [resumes],
  );
  const uploadedResumes = useMemo(
    () => (resumes ? resumes.filter((r) => Boolean(r.content.isUploaded)) : []),
    [resumes],
  );

  const displayedResumes = useMemo(() => {
    if (!resumes) return [];
    if (activeTab === 'builder') return builderResumes;
    if (activeTab === 'uploaded') return uploadedResumes;
    return resumes;
  }, [resumes, activeTab, builderResumes, uploadedResumes]);

  const handleAnalyze = async (resume: ResumeResponseDto) => {
    setAnalyzingId(resume.id);
    setErrorMessage(null);
    try {
      const analysis = await analyzeMutation.mutateAsync(resume.id);
      setActiveAnalysis({
        modalOpen: true,
        analysis,
        resumeTitle: resume.title,
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to analyze resume. Please ensure AI service is reachable.');
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleSetPrimary = async (resumeId: string) => {
    await setPrimaryMutation.mutateAsync(resumeId);
  };

  const handleDuplicate = async (resumeId: string) => {
    await duplicateMutation.mutateAsync(resumeId);
  };

  const handleDelete = async (resumeId: string) => {
    if (window.confirm('Are you sure you want to delete this resume? This cannot be undone.')) {
      await deleteMutation.mutateAsync(resumeId);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please select a file to upload.');
      return;
    }

    setUploadError(null);
    const fileName = uploadFile.name;
    const isPdf = uploadFile.type === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
    const isJson = uploadFile.type === 'application/json' || fileName.toLowerCase().endsWith('.json');
    const isTxt = uploadFile.type.startsWith('text/') || fileName.toLowerCase().endsWith('.txt');

    if (!isPdf && !isJson && !isTxt) {
      setUploadError('Unsupported format. Please upload a PDF, JSON, or TXT file.');
      return;
    }

    const reader = new FileReader();

    if (isPdf) {
      reader.readAsDataURL(uploadFile);
      reader.onload = async () => {
        try {
          const fileContent = reader.result as string;
          await uploadMutation.mutateAsync({
            fileName,
            fileContent,
            fileType: 'pdf',
            title: uploadTitle.trim() || undefined,
          });
          setShowUploadModal(false);
          setActiveTab('uploaded');
        } catch (err) {
          setUploadError(err instanceof Error ? err.message : 'Failed to parse and upload resume.');
        }
      };
      reader.onerror = () => {
        setUploadError('Failed to read the file.');
      };
    } else {
      reader.readAsText(uploadFile);
      reader.onload = async () => {
        try {
          const fileContent = reader.result as string;
          await uploadMutation.mutateAsync({
            fileName,
            fileContent,
            fileType: isJson ? 'json' : 'text',
            title: uploadTitle.trim() || undefined,
          });
          setShowUploadModal(false);
          setActiveTab('uploaded');
        } catch (err) {
          setUploadError(err instanceof Error ? err.message : 'Failed to parse and upload resume.');
        }
      };
      reader.onerror = () => {
        setUploadError('Failed to read the file.');
      };
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Resumes</h1>
          <p className="text-sm text-slate-500 mt-1">
            Build, upload, and optimize tailored resume versions with AI scoring for placement applications
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setUploadFile(null);
              setUploadTitle('');
              setUploadError(null);
              setShowUploadModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2.5 text-sm font-semibold text-purple-700 shadow-sm hover:bg-purple-100 transition"
          >
            <Upload className="h-4 w-4" />
            Upload Resume
          </button>

          <Link
            to="/dashboard/resumes/new"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
          >
            <Plus className="h-4 w-4" />
            Create Resume
          </Link>
        </div>
      </div>

      {/* ── Separation Filter Tabs ── */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
            activeTab === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All Resumes
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] ${
              activeTab === 'all' ? 'bg-slate-700 text-slate-200' : 'bg-white text-slate-600'
            }`}
          >
            {resumes?.length || 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('builder')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
            activeTab === 'builder'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-blue-50/60 text-blue-700 hover:bg-blue-100/70 border border-blue-100'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Builder Created
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] ${
              activeTab === 'builder' ? 'bg-blue-500 text-blue-100' : 'bg-white text-blue-700'
            }`}
          >
            {builderResumes.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('uploaded')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
            activeTab === 'uploaded'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-purple-50/60 text-purple-700 hover:bg-purple-100/70 border border-purple-100'
          }`}
        >
          <Upload className="h-3.5 w-3.5" />
          Uploaded Resumes
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] ${
              activeTab === 'uploaded' ? 'bg-purple-500 text-purple-100' : 'bg-white text-purple-700'
            }`}
          >
            {uploadedResumes.length}
          </span>
        </button>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="flex items-center justify-between rounded-xl bg-red-50 p-4 text-xs text-red-700 border border-red-200">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => { setErrorMessage(null); }}
            className="text-red-500 hover:text-red-700 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Resumes Grid ── */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm text-slate-500">Loading your resumes…</p>
          </div>
        </div>
      ) : displayedResumes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center bg-white space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-600">
            {activeTab === 'uploaded' ? <FileUp className="h-8 w-8 text-purple-600" /> : <FileText className="h-8 w-8 text-blue-600" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {activeTab === 'uploaded'
                ? 'No uploaded resumes yet'
                : activeTab === 'builder'
                  ? 'No builder resumes created yet'
                  : 'No resumes created yet'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {activeTab === 'uploaded'
                ? 'Upload an existing PDF, Word/TXT, or JSON resume to parse and edit directly.'
                : 'Start by creating a master resume with our structured resume builder and AI optimizer.'}
            </p>
          </div>
          <div className="flex justify-center gap-3">
            {activeTab === 'uploaded' ? (
              <button
                type="button"
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-purple-700"
              >
                <Upload className="h-4 w-4" />
                Upload Resume Now
              </button>
            ) : (
              <Link
                to="/dashboard/resumes/new"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Create First Resume
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedResumes.map((resume) => {
            const isUploaded = Boolean(resume.content.isUploaded);

            return (
              <motion.div
                key={resume.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl border bg-white p-6 shadow-sm flex flex-col justify-between transition-all duration-200 hover:shadow-md ${
                  resume.isPrimary
                    ? 'border-blue-400 ring-1 ring-blue-400/20'
                    : isUploaded
                      ? 'border-purple-200/80 hover:border-purple-300'
                      : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Header tags */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {resume.isPrimary && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200">
                          <Star className="h-3 w-3 fill-blue-600 text-blue-600" />
                          Primary Default
                        </span>
                      )}

                      {isUploaded ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 border border-purple-200">
                          <Upload className="h-3 w-3" />
                          Uploaded Resume
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200">
                          <Sparkles className="h-3 w-3" />
                          Builder Created
                        </span>
                      )}

                      <span className="text-[11px] text-slate-400 capitalize">
                        · {resume.templateId}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => { void handleDuplicate(resume.id); }}
                        disabled={duplicateMutation.isPending}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                        title="Duplicate Resume"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      {!resume.isPrimary && (
                        <button
                          type="button"
                          onClick={() => { void handleDelete(resume.id); }}
                          disabled={deleteMutation.isPending}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                          title="Delete Resume"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 tracking-tight">{resume.title}</h3>

                  {resume.content.uploadedFileName && (
                    <p className="text-[11px] text-purple-700 font-mono mt-0.5 truncate flex items-center gap-1">
                      <FileText className="h-3 w-3 shrink-0" />
                      {resume.content.uploadedFileName}
                    </p>
                  )}

                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {resume.content.summary || 'No summary entered yet.'}
                  </p>

                  {/* Resume highlights count */}
                  <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-500">
                    <span className="rounded-md bg-slate-50 px-2 py-1 border border-slate-100">
                      {resume.content.skills.length || 0} Skills
                    </span>
                    <span className="rounded-md bg-slate-50 px-2 py-1 border border-slate-100">
                      {resume.content.projects.length || 0} Projects
                    </span>
                    <span className="rounded-md bg-slate-50 px-2 py-1 border border-slate-100">
                      {resume.content.experience.length || 0} Experience
                    </span>
                    {resume.content.customSections && resume.content.customSections.length > 0 && (
                      <span className="rounded-md bg-purple-50 text-purple-700 px-2 py-1 border border-purple-100 font-medium">
                        {resume.content.customSections.length} Extra {resume.content.customSections.length === 1 ? 'Section' : 'Sections'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions - Full Editing & Analysis options for both */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => { void handleAnalyze(resume); }}
                    disabled={analyzingId === resume.id}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 border border-purple-200 hover:bg-purple-100 disabled:opacity-60 transition"
                  >
                    {analyzingId === resume.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                    )}
                    {analyzingId === resume.id ? 'Analyzing...' : 'AI Analyze'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => { downloadResumePdf(resume); }}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition"
                      title="Download / Print as PDF"
                    >
                      <Download className="h-3.5 w-3.5" />
                      PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => { downloadResumeJson(resume); }}
                      className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
                      title="Export structured JSON"
                    >
                      JSON
                    </button>
                    {!resume.isPrimary && (
                      <button
                        type="button"
                        onClick={() => { void handleSetPrimary(resume.id); }}
                        disabled={setPrimaryMutation.isPending}
                        className="text-xs font-medium text-slate-500 hover:text-blue-600 transition px-1"
                      >
                        Make Primary
                      </button>
                    )}
                    <Link
                      to={`/dashboard/resumes/${resume.id}/edit`}
                      className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Upload Resume Modal ── */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowUploadModal(false)}
          />
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Upload Existing Resume</h3>
                  <p className="text-xs text-slate-500">
                    Import existing PDF, TXT, or JSON resume into structured editor
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={(e) => void handleFileUpload(e)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Resume Title (Optional)
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Fullstack Engineer Resume"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Resume File (PDF, JSON, TXT)
                </label>
                <div className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-6 text-center hover:border-purple-400 transition bg-slate-50/50">
                  <input
                    type="file"
                    accept=".pdf,.json,.txt"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setUploadFile(e.target.files[0]);
                        setUploadError(null);
                      }
                    }}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                  {uploadFile ? (
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                        <Check className="h-5 w-5" />
                      </div>
                      <p className="text-xs font-bold text-slate-900">{uploadFile.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {(uploadFile.size / 1024).toFixed(1)} KB · Click to change file
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <FileUp className="h-8 w-8 text-purple-600" />
                      <div>
                        <p className="text-xs font-semibold text-slate-700">
                          Click to browse or drag and drop your file
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Supports PDF, JSON, and Plain Text (up to 15MB)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {uploadError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadMutation.isPending || !uploadFile}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-purple-700 disabled:opacity-50 transition"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Processing & Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" />
                      Upload & Save
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Analysis Breakdown Modal */}
      <ResumeAnalysisModal
        isOpen={activeAnalysis.modalOpen}
        onClose={() => { setActiveAnalysis({ modalOpen: false }); }}
        analysis={activeAnalysis.analysis}
        resumeTitle={activeAnalysis.resumeTitle}
      />
    </div>
  );
}
