import { useState } from 'react';
import { useNavigate } from 'react-router';
import { AxiosError } from 'axios';
import { api } from '../lib/api';

const Login = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    const data = new FormData(e.currentTarget);
    const email = data.get('email') as string;
    const password = data.get('password') as string;

    setError('');
    setLoading(true);

    try {
      await api.post('/api/v1/login', { email, password });
      navigate('/');
    } catch (err) {
      const message =
        err instanceof AxiosError
          ? (err.response?.data?.message ?? 'Login failed. Please try again.')
          : 'An unexpected error occurred.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-black px-4 py-12">
      <div className="w-full max-w-xl bg-neutral-900 rounded-3xl shadow-2xl border border-gray-800 p-10 flex flex-col gap-8 animate-fade-in">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-3xl font-extrabold text-white mb-1">Sign in to NeuraMemoryAI</h1>
          <p className="text-gray-400 text-base">Welcome back! Please enter your details.</p>
        </div>

        <form className="flex flex-col gap-6" onSubmit={handleLogin}>
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-gray-300 text-sm font-medium">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              className="bg-neutral-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
              required
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-gray-300 text-sm font-medium">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className="bg-neutral-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
              required
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 cursor-pointer text-white px-7 py-3 text-base font-bold rounded-xl transition shadow-lg mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in…' : 'Log In'}
          </button>
        </form>

        <div className="text-center text-gray-400 text-sm mt-2">
          Don&apos;t have an account?{' '}
          <button
            className="text-blue-400 hover:underline font-semibold transition"
            onClick={() => navigate('/signup')}
          >
            Sign up
          </button>
        </div>
      </div>
    </main>
  );
};

export default Login;
