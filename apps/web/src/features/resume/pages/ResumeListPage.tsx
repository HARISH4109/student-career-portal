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
import { Button, EmptyState, SkeletonCard } from '@/shared/components/ui';

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
    <div className="space-y-6 w-full max-w-[1536px] mx-auto pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" /> My Resumes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
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
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-accent transition cursor-pointer"
          >
            <Upload className="h-4 w-4 text-primary" />
            <span>Upload Resume</span>
          </button>

          <Link
            to="/dashboard/resumes/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create Resume</span>
          </Link>
        </div>
      </div>

      {/* ── Separation Filter Tabs ── */}
      <nav
        aria-label="Resume categories"
        className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card p-1.5 shadow-sm"
      >
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === 'all'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
        >
          <FileText className="h-4 w-4 shrink-0" />
          <span>All Resumes</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold font-mono tabular-nums ${
              activeTab === 'all' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-foreground'
            }`}
          >
            {resumes?.length || 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('builder')}
          className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === 'builder'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
        >
          <Sparkles className="h-4 w-4 shrink-0" />
          <span>Builder Created</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold font-mono tabular-nums ${
              activeTab === 'builder' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-foreground'
            }`}
          >
            {builderResumes.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('uploaded')}
          className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === 'uploaded'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
        >
          <Upload className="h-4 w-4 shrink-0" />
          <span>Uploaded Resumes</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold font-mono tabular-nums ${
              activeTab === 'uploaded' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-foreground'
            }`}
          >
            {uploadedResumes.length}
          </span>
        </button>
      </nav>

      {/* Error Alert */}
      {errorMessage && (
        <div className="flex items-center justify-between rounded-xl bg-destructive/10 p-4 text-xs text-destructive border border-destructive/20">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => { setErrorMessage(null); }}
            className="text-destructive/80 hover:text-destructive ml-2 p-1 rounded-md transition-colors"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Resumes Grid ── */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : displayedResumes.length === 0 ? (
        <EmptyState
          icon={activeTab === 'uploaded' ? FileUp : FileText}
          title={
            activeTab === 'uploaded'
              ? 'No uploaded resumes yet'
              : activeTab === 'builder'
                ? 'No builder resumes created yet'
                : 'No resumes created yet'
          }
          description={
            activeTab === 'uploaded'
              ? 'Upload an existing PDF, Word/TXT, or JSON resume to parse and edit directly.'
              : 'Start by creating a master resume with our structured resume builder and AI optimizer.'
          }
        >
          <div className="flex justify-center gap-3 mt-2">
            {activeTab === 'uploaded' ? (
              <Button
                type="button"
                size="sm"
                onClick={() => setShowUploadModal(true)}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload Resume Now
              </Button>
            ) : (
              <Button asChild size="sm" className="gap-2">
                <Link to="/dashboard/resumes/new">
                  <Plus className="h-4 w-4" />
                  Create First Resume
                </Link>
              </Button>
            )}
          </div>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedResumes.map((resume) => {
            const isUploaded = Boolean(resume.content.isUploaded);

            return (
              <motion.div
                key={resume.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl border bg-card p-6 shadow-sm flex flex-col justify-between transition-colors duration-150 hover:shadow-md ${
                  resume.isPrimary
                    ? 'border-primary ring-1 ring-primary/20'
                    : isUploaded
                      ? 'border-border hover:border-primary/40'
                      : 'border-border hover:border-primary/40'
                }`}
              >
                <div>
                  {/* Header tags */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {resume.isPrimary && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary border border-primary/20">
                          <Star className="h-3 w-3 fill-primary text-primary" />
                          Primary Default
                        </span>
                      )}

                      {isUploaded ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:text-indigo-400 border border-indigo-500/20">
                          <Upload className="h-3 w-3" />
                          Uploaded Resume
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary border border-primary/20">
                          <Sparkles className="h-3 w-3" />
                          Builder Created
                        </span>
                      )}

                      <span className="text-[11px] text-muted-foreground capitalize">
                        · {resume.templateId}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => { void handleDuplicate(resume.id); }}
                        disabled={duplicateMutation.isPending}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
                        title="Duplicate Resume"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      {!resume.isPrimary && (
                        <button
                          type="button"
                          onClick={() => { void handleDelete(resume.id); }}
                          disabled={deleteMutation.isPending}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition cursor-pointer"
                          title="Delete Resume"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-foreground tracking-tight">{resume.title}</h3>

                  {resume.content.uploadedFileName && (
                    <p className="text-[11px] text-primary font-mono mt-0.5 truncate flex items-center gap-1">
                      <FileText className="h-3 w-3 shrink-0" />
                      {resume.content.uploadedFileName}
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {resume.content.summary || 'No summary entered yet.'}
                  </p>

                  {/* Resume highlights count */}
                  <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-muted-foreground font-mono tabular-nums">
                    <span className="rounded-md bg-muted/40 px-2 py-1 border border-border/60">
                      {resume.content.skills.length || 0} Skills
                    </span>
                    <span className="rounded-md bg-muted/40 px-2 py-1 border border-border/60">
                      {resume.content.projects.length || 0} Projects
                    </span>
                    <span className="rounded-md bg-muted/40 px-2 py-1 border border-border/60">
                      {resume.content.experience.length || 0} Experience
                    </span>
                    {resume.content.customSections && resume.content.customSections.length > 0 && (
                      <span className="rounded-md bg-primary/10 text-primary px-2 py-1 border border-primary/20 font-medium">
                        {resume.content.customSections.length} Extra {resume.content.customSections.length === 1 ? 'Section' : 'Sections'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="mt-6 pt-4 border-t border-border flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => { void handleAnalyze(resume); }}
                    disabled={analyzingId === resume.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary border border-primary/20 hover:bg-primary/20 disabled:opacity-60 transition cursor-pointer"
                  >
                    {analyzingId === resume.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                    )}
                    {analyzingId === resume.id ? 'Analyzing...' : 'AI Analyze'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => { downloadResumePdf(resume); }}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition cursor-pointer"
                      title="Download / Print as PDF"
                    >
                      <Download className="h-3.5 w-3.5" />
                      PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => { downloadResumeJson(resume); }}
                      className="inline-flex items-center rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
                      title="Export structured JSON"
                    >
                      JSON
                    </button>
                    {!resume.isPrimary && (
                      <button
                        type="button"
                        onClick={() => { void handleSetPrimary(resume.id); }}
                        disabled={setPrimaryMutation.isPending}
                        className="text-xs font-medium text-muted-foreground hover:text-primary transition px-1 cursor-pointer"
                      >
                        Make Primary
                      </button>
                    )}
                    <Link
                      to={`/dashboard/resumes/${resume.id}/edit`}
                      className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition cursor-pointer"
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
          <div className="relative w-full max-w-lg rounded-xl bg-card border border-border p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Upload Existing Resume</h3>
                  <p className="text-xs text-muted-foreground">
                    Import existing PDF, TXT, or JSON resume into structured editor
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={(e) => void handleFileUpload(e)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Resume Title (Optional)
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Fullstack Engineer Resume"
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Resume File (PDF, JSON, TXT)
                </label>
                <div className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-6 text-center hover:border-primary/50 transition bg-muted/20">
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
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                        <Check className="h-5 w-5" />
                      </div>
                      <p className="text-xs font-bold text-foreground">{uploadFile.name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono tabular-nums">
                        {(uploadFile.size / 1024).toFixed(1)} KB · Click to change file
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <FileUp className="h-8 w-8 text-primary" />
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          Click to browse or drag and drop your file
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Supports PDF, JSON, and Plain Text (up to 15MB)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {uploadError && (
                <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive border border-destructive/20">
                  <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadMutation.isPending || !uploadFile}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50 transition cursor-pointer"
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
