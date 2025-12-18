
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { ICONS } from '../constants';

interface Props {
  users: User[];
  onLogin: (user: User) => void;
  onRegister: (user: User) => void;
}

const Auth: React.FC<Props> = ({ users, onLogin, onRegister }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [cedula, setCedula] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.cedula === cedula);
    if (user) {
      onLogin(user);
    } else {
      setError('Cédula no encontrada. ¿Deseas registrarte?');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (users.some(u => u.cedula === cedula)) {
      setError('Esta cédula ya está registrada.');
      return;
    }
    const newUser: User = {
      cedula,
      fullName,
      role: UserRole.BASIC, // Por defecto registro básico
      createdAt: new Date().toISOString()
    };
    onRegister(newUser);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden animate-fadeIn">
        <div className="p-8 bg-blue-600 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            {ICONS.Lock}
          </div>
          <h2 className="text-2xl font-bold">ColegioPay</h2>
          <p className="text-blue-100 mt-1">Sistema de Gestión Administrativa</p>
        </div>

        <div className="p-8">
          <div className="flex bg-slate-100 p-1 rounded-xl mb-8">
            <button 
              onClick={() => { setIsRegistering(false); setError(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${!isRegistering ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
            >
              Ingresar
            </button>
            <button 
              onClick={() => { setIsRegistering(true); setError(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${isRegistering ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
            >
              Registrarse
            </button>
          </div>

          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Número de Cédula</label>
              <input 
                type="text" 
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                placeholder="Ej. 25123456"
                className="w-full mt-1 p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                required
              />
            </div>

            {isRegistering && (
              <div className="animate-slideDown">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Juan Pérez"
                  className="w-full mt-1 p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                  required
                />
              </div>
            )}

            {error && (
              <div className="p-3 bg-rose-50 text-rose-600 text-xs font-bold rounded-xl border border-rose-100 flex items-center gap-2">
                {ICONS.Alert} {error}
              </div>
            )}

            <button 
              type="submit"
              className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-200 transition-all flex items-center justify-center gap-2"
            >
              {isRegistering ? 'Crear Cuenta' : 'Acceder al Sistema'}
              {ICONS.Next}
            </button>
          </form>

          <p className="mt-8 text-center text-slate-400 text-xs font-medium">
            Control de Acceso Escolar © 2025
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
