import React, { useState } from 'react';
import { AxiosError } from 'axios';
import { api } from '../../lib/api';
import { SubmitButton } from './SubmitButton';

interface TextIngestionProps {
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
  onReset: () => void;
}

export const TextIngestion = ({
  onSuccess,
  onError,
  onReset,
}: TextIngestionProps) => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = (new FormData(e.currentTarget).get('text') as string).trim();
    if (!text) return;

    onReset();
    setLoading(true);
    try {
      await api.post('/api/v1/memories/text', { text });
      onSuccess('Memory saved from text!');
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      onError(
        err instanceof AxiosError
          ? (err.response?.data?.message ?? 'Failed to save text.')
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
          Paste or type your text
        </span>
        <textarea
          name="text"
          rows={7}
          required
          placeholder="Paste an article, note, meeting summary, research snippet…"
          className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none transition"
        />
      </label>
      <SubmitButton loading={loading} label="Save to Memory" />
    </form>
  );
};
