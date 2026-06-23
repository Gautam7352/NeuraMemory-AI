import React, { useState } from 'react';
import { AxiosError } from 'axios';
import { api } from '../../lib/api';
import { SubmitButton } from './SubmitButton';

interface LinkIngestionProps {
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
  onReset: () => void;
}

export const LinkIngestion = ({
  onSuccess,
  onError,
  onReset,
}: LinkIngestionProps) => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const url = (new FormData(e.currentTarget).get('url') as string).trim();
    if (!url) return;

    onReset();
    setLoading(true);
    try {
      await api.post('/api/v1/memories/link', { url });
      onSuccess('Memory saved from link!');
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      onError(
        err instanceof AxiosError
          ? (err.response?.data?.message ?? 'Failed to process link.')
          : 'Unexpected error.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">
          Enter a URL
        </span>
        <div className="flex items-center gap-2 bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-sky-500 transition">
          <svg
            width="16"
            height="16"
            className="text-slate-500 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.828 10.172a4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5M10.172 13.828a4 4 0 015.656 0l3-3a4 4 0 10-5.656-5.656l-1.5 1.5"
            />
          </svg>
          <input
            name="url"
            type="url"
            required
            placeholder="https://example.com/article"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-neutral-500 outline-none"
          />
        </div>
        <p className="text-xs text-slate-500">
          NeuraMemoryAI will fetch and extract insights from the page.
        </p>
      </label>
      <SubmitButton loading={loading} label="Fetch & Save" />
    </form>
  );
};
