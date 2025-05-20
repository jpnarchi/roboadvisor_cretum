import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      navigate('/dashboard');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black/40 to-[#b9d6ee]/5 backdrop-blur-xl">
      <div className="max-w-md w-full space-y-8 p-8 glass-panel rounded-xl border border-[#b9d6ee]/10">
        <div className="flex flex-col items-center">
          <img src="/menlog.svg" alt="Cretum Logo" className="h-16 mb-4" />
          <h2 className="text-center text-3xl font-extrabold text-white">
            Iniciar Sesión
          </h2>
          <p className="mt-2 text-center text-sm text-[#b9d6ee]/70">
            Accede a tu cuenta de Cretum Partners
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg relative" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-[#b9d6ee]/70 mb-1">
                Correo electrónico
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none relative block w-full px-4 py-3 border border-[#b9d6ee]/20 placeholder-[#b9d6ee]/50 text-white bg-[#b9d6ee]/5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#b9d6ee] focus:border-transparent transition-all duration-200"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#b9d6ee]/70 mb-1">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none relative block w-full px-4 py-3 border border-[#b9d6ee]/20 placeholder-[#b9d6ee]/50 text-white bg-[#b9d6ee]/5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#b9d6ee] focus:border-transparent transition-all duration-200"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-[#b9d6ee]/10 hover:bg-[#b9d6ee]/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#b9d6ee] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-[#b9d6ee]"></div>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </div>

          <div className="text-sm text-center">
            <a
              href="/register"
              className="font-medium text-[#b9d6ee] hover:text-[#b9d6ee]/80 transition-colors duration-200"
            >
              ¿No tienes una cuenta? Regístrate
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login; 