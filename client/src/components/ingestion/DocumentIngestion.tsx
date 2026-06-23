import React, { useState, useRef } from 'react';
import { AxiosError } from 'axios';
import { api } from '../../lib/api';
import { SubmitButton } from './SubmitButton';

interface DocumentIngestionProps {
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
  onReset: () => void;
}

const ACCEPTED_TYPES = '.pdf,.docx,.txt,.md,.csv';

export const DocumentIngestion = ({
  onSuccess,
  onError,
  onReset,
}: DocumentIngestionProps) => {
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFileChange = (file: File | null) => {
    setSelectedFile(file);
    onReset();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedFile) {
      onError('Please select a file to upload.');
      return;
    }

    onReset();
    setLoading(true);
    const form = new FormData();
    form.append('file', selectedFile);

    try {
      await api.post('/api/v1/memories/document', form);
      onSuccess(`Memory saved from "${selectedFile.name}"!`);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      onError(
        err instanceof AxiosError
          ? (err.response?.data?.message ?? 'Failed to upload document.')
          : 'Unexpected error.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">
        Upload a document
      </span>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0] ?? null;
          onFileChange(file);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl py-10 cursor-pointer transition
          ${dragOver ? 'border-sky-400 bg-sky-950/30' : 'border-neutral-700 hover:border-neutral-500 bg-neutral-800/40'}`}
      >
        <svg
          width="36"
          height="36"
          className={`transition ${dragOver ? 'text-sky-400' : 'text-neutral-500'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <div className="text-center px-4">
          <p className="text-sm font-medium text-slate-300">
            {selectedFile
              ? selectedFile.name
              : 'Drop file here or click to browse'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            PDF, DOCX, TXT, MD, CSV — max 10 MB
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          className="sr-only"
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
        />
      </div>

      {/* Selected file badge */}
      {selectedFile && (
        <div className="flex items-center justify-between bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2">
          <span className="text-xs text-slate-300 truncate">
            {selectedFile.name}
          </span>
          <button
            type="button"
            onClick={() => {
              setSelectedFile(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            className="text-slate-500 hover:text-red-400 transition ml-3 shrink-0"
            aria-label="Remove file"
          >
            <svg
              width="14"
              height="14"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      <SubmitButton loading={loading} label="Upload & Save" />
    </form>
  );
};
