import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Verificar el código de invitación
      const { data: invitationData, error: invitationError } = await supabase
        .from('invitation_codes')
        .select('*')
        .eq('code', invitationCode)
        .eq('is_active', true)
        .single();

      if (invitationError || !invitationData) {
        throw new Error('Código de invitación inválido o expirado');
      }

      // Verificar si el código ha alcanzado su límite de usos
      if (invitationData.usage_limit && invitationData.usage_count >= invitationData.usage_limit) {
        throw new Error('El código de invitación ha alcanzado su límite de usos');
      }

      // Registrar el usuario
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            invitation_code: invitationCode
          }
        }
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Error al crear el usuario');
      }

      // Esperar un momento para asegurar que el usuario se cree en auth.users
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Obtener el ID del rol de usuario
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('id')
        .eq('name', 'user')
        .single();

      if (roleError || !roleData) {
        throw new Error('Error al obtener el rol de usuario');
      }

      // Verificar que el usuario existe en auth.users antes de crear el perfil
      const { error: userCheckError } = await supabase
        .from('users')
        .select('id')
        .eq('id', authData.user.id)
        .single();

      if (userCheckError && userCheckError.code !== 'PGRST116') {
        throw new Error('Error al verificar el usuario');
      }

      // Crear el perfil del usuario
      const { error: profileError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id,
            email,
            full_name: fullName,
            role_id: roleData.id,
            invitation_code: invitationCode
          },
        ]);

      if (profileError) {
        console.error('Error al crear el perfil:', profileError);
        throw new Error('Error al crear el perfil de usuario');
      }

      // Actualizar el contador de uso del código de invitación
      const { error: updateError } = await supabase
        .from('invitation_codes')
        .update({ usage_count: invitationData.usage_count + 1 })
        .eq('code', invitationCode);

      if (updateError) {
        console.error('Error al actualizar el código de invitación:', updateError);
      }

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
            Crear una cuenta
          </h2>
          <p className="mt-2 text-center text-sm text-[#b9d6ee]/70">
            Únete a la comunidad de inversores de Cretum Partners
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleRegister}>
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg relative" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="full-name" className="block text-sm font-medium text-[#b9d6ee]/70 mb-1">
                Nombre completo
              </label>
              <input
                id="full-name"
                name="full-name"
                type="text"
                required
                className="appearance-none relative block w-full px-4 py-3 border border-[#b9d6ee]/20 placeholder-[#b9d6ee]/50 text-white bg-[#b9d6ee]/5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#b9d6ee] focus:border-transparent transition-all duration-200"
                placeholder="Tu nombre completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
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
                autoComplete="new-password"
                required
                className="appearance-none relative block w-full px-4 py-3 border border-[#b9d6ee]/20 placeholder-[#b9d6ee]/50 text-white bg-[#b9d6ee]/5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#b9d6ee] focus:border-transparent transition-all duration-200"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="invitation-code" className="block text-sm font-medium text-[#b9d6ee]/70 mb-1">
                Código de invitación
              </label>
              <input
                id="invitation-code"
                name="invitation-code"
                type="text"
                required
                className="appearance-none relative block w-full px-4 py-3 border border-[#b9d6ee]/20 placeholder-[#b9d6ee]/50 text-white bg-[#b9d6ee]/5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#b9d6ee] focus:border-transparent transition-all duration-200"
                placeholder="Tu código de invitación"
                value={invitationCode}
                onChange={(e) => setInvitationCode(e.target.value)}
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
                'Registrarse'
              )}
            </button>
          </div>

          <div className="text-sm text-center">
            <a
              href="/login"
              className="font-medium text-[#b9d6ee] hover:text-[#b9d6ee]/80 transition-colors duration-200"
            >
              ¿Ya tienes una cuenta? Inicia sesión
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register; 