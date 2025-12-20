
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
    const user = users.find(u => u.cedula === cedula.trim());
    if (user) {
      onLogin(user);
    } else {
      setError('Cédula no encontrada. ¿Deseas registrarte?');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCedula = cedula.trim();
    if (users.some(u => u.cedula === cleanCedula)) {
      setError('Esta cédula ya está registrada.');
      return;
    }
    
    // Si el ID es el de emergencia o no hay administradores reales en la lista, asignar ADMIN
    const existingAdmins = users.filter(u => u.role === UserRole.ADMIN);
    const isEmergencyId = cleanCedula === '10203040';
    const shouldBeAdmin = existingAdmins.length === 0 || isEmergencyId;
    
    const newUser: User = {
      cedula: cleanCedula,
      fullName: fullName.trim(),
      role: shouldBeAdmin ? UserRole.ADMIN : UserRole.BASIC,
      createdAt: new Date().toISOString()
    };
    
    onRegister(newUser);
    alert(`Registro exitoso como ${shouldBeAdmin ? 'ADMINISTRADOR' : 'USUARIO BÁSICO'}`);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden animate-fadeIn">
        <div className="p-8 bg-blue-600 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            {ICONS.Lock}
          </div>
          <h2 className="text-2xl font-bold">ColegioPay</h2>
          <p className="text-blue-100 mt-1">Control de Acceso Institucional</p>
        </div>

        <div className="p-8">
          <div className="flex bg-slate-100 p-1 rounded-xl mb-8">
            <button 
              onClick={() => { setIsRegistering(false); setError(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${!isRegistering ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
            >
              Entrar
            </button>
            <button 
              onClick={() => { setIsRegistering(true); setError(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${isRegistering ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
            >
              Registrar
            </button>
          </div>

          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Número de Cédula</label>
              <input 
                type="text" 
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                placeholder="Ingresa tu ID"
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
                  placeholder="Ej. Pedro Pérez"
                  className="w-full mt-1 p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                  required
                />
              </div>
            )}

            {error && (
              <div className="p-3 bg-rose-50 text-rose-600 text-[11px] font-bold rounded-xl border border-rose-100 flex items-center gap-2">
                {ICONS.Alert} {error}
              </div>
            )}

            <button 
              type="submit"
              className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-200 transition-all flex items-center justify-center gap-2"
            >
              {isRegistering ? 'Crear Cuenta' : 'Acceder'}
              {ICONS.Next}
            </button>
          </form>

          {!isRegistering && (
            <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Llave Maestra (Admin)</p>
              <div className="flex items-center justify-between">
                <code className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">10203040</code>
                <span className="text-[9px] text-slate-400 italic">Usa este ID si no ves los módulos admin</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
