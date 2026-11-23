
'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

type Modo = 'login' | 'registro' | 'recuperar' | 'nueva-password';

export default function LoginPage() {
  const router = useRouter();

  const [modo, setModo] = useState<Modo>('login');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setModo('nueva-password');
          setMensaje('');
          setError('');
        }
      });

    return () => subscription.unsubscribe();
  }, []);

  function cambiarModo(nuevoModo: Modo) {
    setModo(nuevoModo);
    setMensaje('');
    setError('');
    setPassword('');
    setConfirmarPassword('');
  }

  async function iniciarSesion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMensaje('');
    setCargando(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setError('Correo o contraseña incorrectos, o debes confirmar tu correo.');
      setCargando(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  async function crearCuenta(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMensaje('');

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmarPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setCargando(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: nombre.trim(),
        },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    if (error) {
      setError(error.message);
      setCargando(false);
      return;
    }

    if (data.session) {
      router.push('/dashboard');
      router.refresh();
      return;
    }

    setMensaje(
      '¡Cuenta creada! Revisa tu correo electrónico y confirma tu dirección para poder iniciar sesión.'
    );
    setModo('login');
    setPassword('');
    setConfirmarPassword('');
    setCargando(false);
  }

  async function recuperarPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMensaje('');
    setCargando(true);

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${window.location.origin}/login?modo=restablecer`,
      }
    );

    if (error) {
      setError(error.message);
    } else {
      setMensaje(
        'Si el correo está registrado, recibirás un enlace para recuperar tu contraseña.'
      );
    }

    setCargando(false);
  }

  async function actualizarPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMensaje('');

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmarPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setCargando(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setError(error.message);
      setCargando(false);
      return;
    }

    setMensaje('Tu contraseña fue actualizada correctamente.');
    setModo('login');
    setPassword('');
    setConfirmarPassword('');
    setCargando(false);
  }

  const titulo = {
    login: 'Bienvenido a SPING',
    registro: 'Únete a SPING',
    recuperar: 'Recuperar contraseña',
    'nueva-password': 'Nueva contraseña',
  }[modo];

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#041d22] px-4 py-10 text-[#fff7dc]">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-[#8bbec6]/25 bg-[#10364b] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.3)]">

          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold tracking-tight text-[#fff7dc]">
              SPING
            </h1>

            <p className="mt-2 text-[#8bbec6]">
              {titulo}
            </p>
          </div>

          <form
            onSubmit={
              modo === 'login'
                ? iniciarSesion
                : modo === 'registro'
                  ? crearCuenta
                  : modo === 'recuperar'
                    ? recuperarPassword
                    : actualizarPassword
            }
            className="space-y-5"
          >
            {modo === 'registro' && (
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Nombre completo
                </label>

                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tu nombre"
                  required
                  className="w-full rounded-xl border border-[#8bbec6]/20 bg-[#041d22] px-4 py-3 text-[#fff7dc] outline-none focus:border-[#8bbec6] focus:ring-2 focus:ring-[#8bbec6]/30"
                />
              </div>
            )}

            {modo !== 'nueva-password' && (
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Correo electrónico
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  required
                  className="w-full rounded-xl border border-[#8bbec6]/20 bg-[#041d22] px-4 py-3 text-[#fff7dc] outline-none focus:border-[#8bbec6] focus:ring-2 focus:ring-[#8bbec6]/30"
                />
              </div>
            )}

            {modo !== 'recuperar' && (
              <div>
                <label className="mb-2 block text-sm font-medium">
                  {modo === 'nueva-password'
                    ? 'Nueva contraseña'
                    : 'Contraseña'}
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-[#8bbec6]/20 bg-[#041d22] px-4 py-3 text-[#fff7dc] outline-none focus:border-[#8bbec6] focus:ring-2 focus:ring-[#8bbec6]/30"
                />
              </div>
            )}

            {(modo === 'registro' || modo === 'nueva-password') && (
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Confirmar contraseña
                </label>

                <input
                  type="password"
                  value={confirmarPassword}
                  onChange={(e) => setConfirmarPassword(e.target.value)}
                  placeholder="Repite tu contraseña"
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-[#8bbec6]/20 bg-[#041d22] px-4 py-3 text-[#fff7dc] outline-none focus:border-[#8bbec6] focus:ring-2 focus:ring-[#8bbec6]/30"
                />
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-400/30 bg-red-950/40 p-3 text-sm text-red-200">
                {error}
              </div>
            )}

            {mensaje && (
              <div className="rounded-xl border border-[#8bbec6]/30 bg-[#0b2a3c] p-3 text-sm text-[#b7d2d6]">
                {mensaje}
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="w-full rounded-xl bg-[#1d5550] px-4 py-3 font-semibold text-white transition-colors hover:bg-[#246b63] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cargando
                ? 'Procesando...'
                : modo === 'login'
                  ? 'Iniciar sesión'
                  : modo === 'registro'
                    ? 'Crear mi cuenta'
                    : modo === 'recuperar'
                      ? 'Enviar enlace de recuperación'
                      : 'Actualizar contraseña'}
            </button>
          </form>

          <div className="mt-6 space-y-3 text-center text-sm">
            {modo === 'login' && (
              <>
                <button
                  type="button"
                  onClick={() => cambiarModo('recuperar')}
                  className="block w-full text-[#8bbec6] hover:text-white"
                >
                  ¿Olvidaste tu contraseña?
                </button>

                <p className="text-[#b7d2d6]">
                  ¿Todavía no tienes cuenta?
                </p>

                <button
                  type="button"
                  onClick={() => cambiarModo('registro')}
                  className="font-semibold text-[#8bbec6] hover:text-white"
                >
                  Crear una cuenta SPING
                </button>
              </>
            )}

            {modo !== 'login' && (
              <button
                type="button"
                onClick={() => cambiarModo('login')}
                className="font-semibold text-[#8bbec6] hover:text-white"
              >
                Volver a iniciar sesión
              </button>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-[#8bbec6]/70">
          SPING · Sistema inteligente para la gestión y clasificación de residuos
        </p>
      </div>
    </main>
  );
}
