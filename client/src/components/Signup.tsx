import { useState } from 'react';
import { useNavigate } from 'react-router';
import { AxiosError } from 'axios';
import { api } from '../lib/api';

const Signup = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    const data = new FormData(e.currentTarget);
    const email = data.get('email') as string;
    const password = data.get('password') as string;
    const confirmPassword = data.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await api.post('/api/v1/register', { email, password });
      navigate('/');
    } catch (err) {
      const message =
        err instanceof AxiosError
          ? (err.response?.data?.message ?? 'Registration failed. Please try again.')
          : 'An unexpected error occurred.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen bg-black px-4 py-12 overflow-hidden">
      <div className="absolute inset-0 bg-linear-to-br from-neutral-900/80 to-neutral-800/60 pointer-events-none z-0" />
      <div className="relative w-full max-w-xl bg-neutral-900 rounded-3xl shadow-2xl border border-gray-800 p-10 flex flex-col gap-8 animate-fade-in z-10">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-xl font-extrabold text-white mb-1">Create account</h1>
          <p className="text-gray-400 text-sm">Sign up to get started with NeuraMemoryAI.</p>
        </div>

        <form className="flex flex-col gap-6" onSubmit={handleSignup}>
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-gray-300 text-xs font-medium">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              className="bg-neutral-800 border border-gray-700 px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition rounded-lg"
              required
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-gray-300 text-xs font-medium">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className="bg-neutral-800 border border-gray-700 px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition rounded-lg"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="confirmPassword" className="text-gray-300 text-xs font-medium">Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              className="bg-neutral-800 border border-gray-700 px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition rounded-lg"
              required
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-7 py-3 text-base font-bold transition shadow-lg mt-2 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl cursor-pointer"
          >
            {loading ? 'Signing up…' : 'Sign Up'}
          </button>
        </form>

        <div className="text-center text-gray-400 text-xs mt-2">
          Already have an account?{' '}
          <button
            className="text-blue-400 hover:underline font-semibold transition"
            onClick={() => navigate('/login')}
          >
            Login
          </button>
        </div>
      </div>
    </main >
  );
};

export default Signup;
