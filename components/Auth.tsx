
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { ICONS } from '../constants';

interface Props {
  users: User[];
  onLogin: (user: User) => void;
  onRegister: (user: User) => void;
}

const INSTITUTION_LOGO = "https://i.ibb.co/FbHJbvVT/images.png";

const Auth: React.FC<Props> = ({ users, onLogin, onRegister }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [cedula, setCedula] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');

  const MASTER_ID = '10203040';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCedula = cedula.trim();
    
    if (cleanCedula === MASTER_ID) {
      const adminUser: User = {
        cedula: MASTER_ID,
        fullName: "Administrador Maestro",
        role: UserRole.ADMIN,
        createdAt: new Date().toISOString()
      };
      onLogin(adminUser);
      return;
    }

    const user = users.find(u => u.cedula === cleanCedula);
    if (user) {
      onLogin(user);
    } else {
      setError('ID de personal no encontrado. ¿Deseas registrarte?');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCedula = cedula.trim();
    
    if (users.some(u => u.cedula === cleanCedula) && cleanCedula !== MASTER_ID) {
      setError('Esta cédula ya está registrada en el sistema.');
      return;
    }
    
    const shouldBeAdmin = cleanCedula === MASTER_ID || users.length === 0;
    
    const newUser: User = {
      cedula: cleanCedula,
      fullName: fullName.trim(),
      role: shouldBeAdmin ? UserRole.ADMIN : UserRole.BASIC,
      createdAt: new Date().toISOString()
    };
    
    onRegister(newUser);
    alert(`Registro institucional exitoso. Rol asignado: ${shouldBeAdmin ? 'ADMINISTRADOR' : 'OPERADOR'}.`);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 animate-fadeIn">
        <div className="p-10 bg-gradient-to-b from-[#1e293b] to-[#0f172a] text-white text-center">
          <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 p-2 shadow-xl ring-4 ring-white/10">
            <img src={INSTITUTION_LOGO} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tighter">Colegio<span className="text-blue-500">Pay</span></h2>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mt-2">Sistema de Gestión Administrativa</p>
        </div>

        <div className="p-10">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8">
            <button 
              onClick={() => { setIsRegistering(false); setError(''); }}
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${!isRegistering ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
            >
              Acceder
            </button>
            <button 
              onClick={() => { setIsRegistering(true); setError(''); }}
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isRegistering ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
            >
              Registrar
            </button>
          </div>

          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Identificación Personal (C.I.)</label>
              <input 
                type="text" 
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                placeholder="Ingrese Cédula"
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-slate-700"
                required
              />
            </div>

            {isRegistering && (
              <div className="animate-slideDown">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Nombre y Apellido</label>
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nombre Administrativo"
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-slate-700"
                  required
                />
              </div>
            )}

            {error && (
              <div className="p-4 bg-rose-50 text-rose-600 text-xs font-bold rounded-2xl border border-rose-100 flex items-center gap-2">
                {ICONS.Alert} {error}
              </div>
            )}

            <button 
              type="submit"
              className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-200 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
            >
              {isRegistering ? 'Finalizar Registro' : 'Entrar al Sistema'}
              {ICONS.Next}
            </button>
          </form>

          <div className="mt-10 p-5 bg-blue-50/50 rounded-2xl border border-blue-100 border-dashed">
             <p className="text-[10px] text-slate-500 mb-3 font-bold uppercase tracking-widest text-center">Acceso de Emergencia</p>
             <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-blue-200 shadow-sm">
              <code className="text-sm font-black text-blue-700 tracking-wider">{MASTER_ID}</code>
              <button 
                onClick={() => setCedula(MASTER_ID)}
                className="text-[9px] font-black bg-blue-600 text-white px-3 py-1.5 rounded-lg uppercase tracking-tighter"
              >
                Auto-completar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
