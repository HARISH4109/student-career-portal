import type {
  ExtractedOpportunityDto,
  OpportunityDraftResponseDto,
} from '@career-portal/shared-types';
import {
  AlertCircle,
  CheckCircle2,
  FileImage,
  FileText,
  Globe,
  ImageIcon,
  Loader2,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import {
  useExtractOpportunity,
  useIngestSource,
} from '@/features/opportunities/api/opportunities-api';

interface OpportunityExtractorProps {
  mode?: 'extract' | 'ingest';
  onExtracted?: (data: ExtractedOpportunityDto) => void;
  onIngested?: (draft: OpportunityDraftResponseDto) => void;
  onClose?: () => void;
  title?: string;
  description?: string;
}

type SourceTab = 'image' | 'url' | 'text';

export function OpportunityExtractor({
  mode = 'ingest',
  onExtracted,
  onIngested,
  onClose,
  title,
  description,
}: OpportunityExtractorProps): React.JSX.Element {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SourceTab>('image');
  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const extractMutation = useExtractOpportunity();
  const ingestMutation = useIngestSource();

  const isPending = mode === 'ingest' ? ingestMutation.isPending : extractMutation.isPending;
  const isError = mode === 'ingest' ? ingestMutation.isError : extractMutation.isError;
  const errorObj = mode === 'ingest' ? ingestMutation.error : extractMutation.error;

  // Helper to process an image or PDF File/Blob into base64
  const processFile = useCallback((file: File) => {
    setFileError(null);

    // Max 15MB
    const MAX_SIZE = 15 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setFileError('File exceeds 15MB limit. Please upload a smaller image or compressed PDF.');
      return;
    }

    const isValidType =
      file.type.startsWith('image/') ||
      file.type === 'application/pdf' ||
      /\.(png|jpe?g|webp|gif|bmp|pdf)$/i.test(file.name);

    if (!isValidType) {
      setFileError('Unsupported file type. Please paste or upload a PNG, JPG, WEBP, or PDF.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        setImagePreview(dataUrl);
        setImageFile(file);
        setActiveTab('image');
        return;
      }

      // Optimize image for vision AI (max 1200x1200px, JPEG 0.85) to prevent rate limits and token bloat
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1200;
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setImagePreview(compressedDataUrl);
          setImageFile(file);
          setActiveTab('image');
        } else {
          setImagePreview(dataUrl);
          setImageFile(file);
          setActiveTab('image');
        }
      };
      img.onerror = () => {
        setImagePreview(dataUrl);
        setImageFile(file);
        setActiveTab('image');
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      setFileError('Failed to read image file. Please try again.');
    };
    reader.readAsDataURL(file);
  }, []);

  // Global paste handler: intercepts image pastes from anywhere in the window
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            const namedFile = new File([file], `pasted-poster-${String(Date.now())}.png`, {
              type: file.type || 'image/png',
            });
            processFile(namedFile);
            return;
          }
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => {
      window.removeEventListener('paste', handleGlobalPaste);
    };
  }, [processFile]);

  // Container paste handler
  const handleContainerPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          const namedFile = new File([file], `pasted-poster-${String(Date.now())}.png`, {
            type: file.type || 'image/png',
          });
          processFile(namedFile);
          return;
        }
      }
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0]) {
      processFile(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && files[0]) {
      processFile(files[0]);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = () => {
    if (mode === 'ingest') {
      if (activeTab === 'url') {
        const content = urlInput.trim();
        if (!content) return;
        ingestMutation.mutate(
          { sourceType: 'url', content },
          {
            onSuccess: (draft) => {
              if (onIngested) {
                onIngested(draft);
              } else {
                void navigate(`/dashboard/opportunities/drafts/${draft.id}/review`);
              }
            },
          },
        );
      } else if (activeTab === 'text') {
        const content = textInput.trim();
        if (!content) return;
        ingestMutation.mutate(
          { sourceType: 'text', content },
          {
            onSuccess: (draft) => {
              if (onIngested) {
                onIngested(draft);
              } else {
                void navigate(`/dashboard/opportunities/drafts/${draft.id}/review`);
              }
            },
          },
        );
      } else {
        if (!imagePreview) return;
        const isPdf =
          imageFile?.type === 'application/pdf' ||
          imageFile?.name.toLowerCase().endsWith('.pdf');
        ingestMutation.mutate(
          {
            sourceType: isPdf ? 'pdf' : 'image',
            content: imagePreview,
            fileName: imageFile?.name || (isPdf ? 'circular.pdf' : 'flyer.png'),
            mimeType: imageFile?.type || (isPdf ? 'application/pdf' : 'image/png'),
          },
          {
            onSuccess: (draft) => {
              if (onIngested) {
                onIngested(draft);
              } else {
                void navigate(`/dashboard/opportunities/drafts/${draft.id}/review`);
              }
            },
          },
        );
      }
    } else {
      // mode === 'extract'
      if (activeTab === 'url') {
        const content = urlInput.trim();
        if (!content) return;
        extractMutation.mutate(
          { sourceType: 'url', content },
          {
            onSuccess: (data) => {
              onExtracted?.(data);
            },
          },
        );
      } else if (activeTab === 'text') {
        const content = textInput.trim();
        if (!content) return;
        extractMutation.mutate(
          { sourceType: 'text', content },
          {
            onSuccess: (data) => {
              onExtracted?.(data);
            },
          },
        );
      } else {
        if (!imagePreview) return;
        extractMutation.mutate(
          {
            sourceType: 'image',
            content: imagePreview,
            fileName: imageFile?.name || 'flyer.png',
            mimeType: imageFile?.type || 'image/png',
          },
          {
            onSuccess: (data) => {
              onExtracted?.(data);
            },
          },
        );
      }
    }
  };

  const canSubmit =
    !isPending &&
    (activeTab === 'url'
      ? urlInput.trim().length > 0
      : activeTab === 'text'
        ? textInput.trim().length > 0
        : imagePreview !== null);

  const tabs: { id: SourceTab; label: string; icon: React.ReactNode }[] = [
    { id: 'image', label: 'Poster / Image Flyer', icon: <ImageIcon className="h-3.5 w-3.5" /> },
    { id: 'url', label: 'Web URL', icon: <Globe className="h-3.5 w-3.5" /> },
    { id: 'text', label: 'Raw Text', icon: <FileText className="h-3.5 w-3.5" /> },
  ];

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${String(bytes)} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const displayTitle =
    title ??
    (mode === 'ingest'
      ? 'AI Agent Source Ingestion'
      : 'AI Smart Extract');

  const displayDescription =
    description ??
    (mode === 'ingest'
      ? 'Paste poster image flyer, web URL, or text notice — AI Agent extracts details into an approval draft'
      : 'Paste poster image flyer, web URL, or text notice — AI auto-fills everything');

  return (
    <div
      onPaste={handleContainerPaste}
      tabIndex={0}
      className="group outline-none rounded-xl border border-border bg-card p-5 transition-colors focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20 shadow-sm"
    >
      {/* Header */}
      <div className="mb-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              {displayTitle}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {displayDescription}
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-card/80 hover:text-slate-600 transition-colors"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-3 flex gap-1 rounded-lg bg-muted/40 p-1 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id);
              extractMutation.reset();
              ingestMutation.reset();
            }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${activeTab === tab.id
              ? 'bg-primary/15 text-primary border border-primary/25 shadow-sm'
              : 'text-muted-foreground hover:text-muted-foreground'
              }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Poster / Image Flyer Input */}
      {activeTab === 'image' && (
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,application/pdf"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {!imagePreview ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors ${isDragOver
                ? 'border-primary bg-primary/10'
                : 'border-border bg-background/50 hover:border-primary/40 hover:bg-background'
                }`}
            >
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary shadow-sm">
                <Upload className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold text-foreground">
                Click to browse or drag & drop placement poster / flyer
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Supports PNG, JPG, WEBP, or PDF (up to 15MB)
              </p>
              <div className="mt-3 flex items-center gap-1.5 rounded-full bg-muted/30 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                <span>Tip: You can also take a screenshot and paste with</span>
                <kbd className="rounded border border-border bg-muted px-1 text-foreground font-mono font-semibold">Ctrl + V</kbd>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
              {/* Thumbnail */}
              {imageFile?.type === 'application/pdf' ? (
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 border border-red-200">
                  <FileText className="h-8 w-8" />
                </div>
              ) : (
                <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-border bg-background">
                  <img
                    src={imagePreview}
                    alt="Poster preview"
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <FileImage className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  <span className="truncate text-xs font-semibold text-foreground">
                    {imageFile?.name || 'Pasted Image'}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {imageFile?.size ? formatFileSize(imageFile.size) : 'Ready for ingestion'}
                </p>
                <p className="text-[10px] text-emerald-600 font-medium mt-0.5 inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Source loaded — Click &quot;{mode === 'ingest' ? 'Extract & Ingest with AI Agent' : 'Extract with AI Agent'}&quot; below
                </p>
              </div>

              {/* Clear */}
              <button
                type="button"
                onClick={clearImage}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                title="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {fileError && (
            <p className="text-[11px] text-red-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {fileError}
            </p>
          )}
        </div>
      )}

      {/* Web URL Input */}
      {activeTab === 'url' && (
        <input
          type="url"
          value={urlInput}
          onChange={(e) => { setUrlInput(e.target.value); }}
          placeholder="Paste LinkedIn post, Unstop, Internshala, or any job page URL..."
          className="w-full rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
        />
      )}

      {/* Raw Text Input */}
      {activeTab === 'text' && (
        <textarea
          value={textInput}
          onChange={(e) => { setTextInput(e.target.value); }}
          rows={4}
          placeholder="Paste forwarded message, email snippet, WhatsApp notice, or any job description text..."
          className="w-full resize-none rounded-lg border border-border bg-card px-3.5 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
        />
      )}

      {/* Action Buttons */}
      <div className="mt-3 flex items-center gap-2">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg border border-border bg-card px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted/40 hover:text-foreground transition shadow-sm disabled:opacity-50"
          >
            Cancel
          </button>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary hover:bg-primary/90 px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-xs transition-colors disabled:opacity-50"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {mode === 'ingest'
                ? 'Extracting & Ingesting with AI Agent...'
                : 'Extracting with AI Agent...'}
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              {mode === 'ingest'
                ? 'Extract & Ingest with AI Agent'
                : 'Extract with AI Agent'}
            </>
          )}
        </button>
      </div>

      {/* Success message for extract mode */}
      {mode === 'extract' && extractMutation.isSuccess && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
          <div>
            <span className="font-semibold">Extraction complete</span> Fields have been
            auto-filled below. Please review and modify any details before publishing.
            {extractMutation.data.confidenceScore != null && (
              <span className="ml-1 text-emerald-600">
                (Confidence: {Math.round(extractMutation.data.confidenceScore)}%)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Error message */}
      {isError && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-500" />
          <div>
            <span className="font-semibold">Extraction failed: </span>
            {errorObj?.message ||
              'Could not reach the AI agent. Please try again or enter details manually.'}
          </div>
        </div>
      )}
    </div>
  );
}
