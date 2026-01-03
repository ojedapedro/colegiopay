import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { ICONS } from '../constants';
import { Lock, User as UserIcon, ShieldCheck, Eye, EyeOff } from 'lucide-react';

interface Props {
  users: User[];
  onLogin: (user: User) => void;
  onRegister: (user: User) => void;
}

const INSTITUTION_LOGO = "https://i.ibb.co/FbHJbvVT/images.png";

const Auth: React.FC<Props> = ({ users, onLogin, onRegister }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [cedula, setCedula] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const MASTER_ID = '10203040';

  const validateNumeric = (val: string) => /^\d*$/.test(val);

  const handleCedulaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (validateNumeric(val)) setCedula(val);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (validateNumeric(val) && val.length <= 6) setPassword(val);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanCedula = cedula.trim();

    // Acceso Maestro de Emergencia
    if (cleanCedula === MASTER_ID && password === '123456') {
      const adminUser: User = {
        cedula: MASTER_ID,
        fullName: "Administrador Maestro",
        role: UserRole.ADMINISTRADOR,
        password: password,
        createdAt: new Date().toISOString()
      };
      onLogin(adminUser);
      return;
    }

    const user = users.find(u => u.cedula === cleanCedula);
    if (user) {
      if (user.password === password) {
        onLogin(user);
      } else {
        setError('Contraseña incorrecta. Verifique sus 6 dígitos.');
      }
    } else {
      setError('Cédula no registrada. ¿Deseas crear una cuenta?');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanCedula = cedula.trim();
    
    if (password.length !== 6) {
      setError('La contraseña debe ser de exactamente 6 dígitos.');
      return;
    }

    if (users.some(u => u.cedula === cleanCedula) && cleanCedula !== MASTER_ID) {
      setError('Esta cédula ya existe en el sistema.');
      return;
    }
    
    // El primer usuario o el master son administradores automáticamente
    const shouldBeAdmin = cleanCedula === MASTER_ID || users.length === 0;
    
    const newUser: User = {
      cedula: cleanCedula,
      fullName: fullName.trim(),
      role: shouldBeAdmin ? UserRole.ADMINISTRADOR : UserRole.CAJERO,
      password: password,
      createdAt: new Date().toISOString()
    };
    
    onRegister(newUser);
    alert(`Registro institucional exitoso. Rol asignado: ${newUser.role}.`);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 animate-fadeIn">
        <div className="p-10 bg-gradient-to-b from-[#1e293b] to-[#0f172a] text-white text-center">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 p-2 shadow-xl ring-4 ring-white/10">
            <img src={INSTITUTION_LOGO} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tighter">Colegio<span className="text-blue-500">Pay</span></h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Acceso de Personal Autorizado</p>
        </div>

        <div className="p-10">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8">
            <button 
              onClick={() => { setIsRegistering(false); setError(''); }}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!isRegistering ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
            >
              Identificarse
            </button>
            <button 
              onClick={() => { setIsRegistering(true); setError(''); }}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isRegistering ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
            >
              Registrarse
            </button>
          </div>

          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-5">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Cédula de Identidad</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="text" 
                  inputMode="numeric"
                  value={cedula}
                  onChange={handleCedulaChange}
                  placeholder="Solo números"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-slate-700"
                  required
                />
              </div>
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

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Contraseña (6 Dígitos)</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type={showPassword ? "text" : "password"}
                  inputMode="numeric"
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="Ej: 123456"
                  className="w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-black tracking-[0.5em] text-slate-700"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-500"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 text-rose-600 text-[10px] font-black uppercase rounded-2xl border border-rose-100 flex items-center gap-2 animate-shake">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <button 
              type="submit"
              className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-200 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
            >
              {isRegistering ? 'Confirmar Registro' : 'Iniciar Sesión'}
              {ICONS.Next}
            </button>
          </form>

          <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-slate-100 border-dashed flex items-center gap-3">
             <ShieldCheck className="text-blue-500 shrink-0" size={20} />
             <p className="text-[9px] text-slate-500 font-bold uppercase leading-relaxed">
               Este sistema utiliza validación de identidad interna. Contacte a Soporte si olvidó su clave de acceso.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const AlertCircle = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
);

export default Auth;