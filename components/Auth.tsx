import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { ICONS } from '../constants';
import { Lock, User as UserIcon, ShieldCheck, Eye, EyeOff, AlertCircle } from 'lucide-react';

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

  // Acceso Maestro configurado según solicitud
  const MASTER_ID = '12524553';
  const MASTER_PASS = '230274';

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

    // Acceso Maestro Prioritario
    if (cleanCedula === MASTER_ID && password === MASTER_PASS) {
      const superUser = users.find(u => u.cedula === MASTER_ID) || {
        cedula: MASTER_ID,
        fullName: "Super Usuario",
        role: UserRole.ADMINISTRADOR,
        password: MASTER_PASS,
        createdAt: new Date().toISOString()
      };
      onLogin(superUser);
      return;
    }

    const user = users.find(u => u.cedula === cleanCedula);
    if (user) {
      if (user.password === password) {
        onLogin(user);
      } else {
        setError('Contraseña incorrecta (6 dígitos).');
      }
    } else {
      setError('Usuario no encontrado. Verifique la cédula.');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanCedula = cedula.trim();
    
    if (password.length !== 6) {
      setError('La clave debe ser de 6 dígitos.');
      return;
    }

    if (users.some(u => u.cedula === cleanCedula)) {
      setError('Esta cédula ya está registrada.');
      return;
    }
    
    const shouldBeAdmin = cleanCedula === MASTER_ID || users.length === 0;
    
    const newUser: User = {
      cedula: cleanCedula,
      fullName: fullName.trim(),
      role: shouldBeAdmin ? UserRole.ADMINISTRADOR : UserRole.CAJERO,
      password: password,
      createdAt: new Date().toISOString()
    };
    
    onRegister(newUser);
    alert(`Bienvenido. Rol asignado: ${newUser.role}`);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 animate-fadeIn">
        <div className="p-10 bg-gradient-to-b from-[#1e293b] to-[#0f172a] text-white text-center">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 p-2 shadow-xl ring-4 ring-white/10">
            <img src={INSTITUTION_LOGO} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tighter">Colegio<span className="text-blue-500">Pay</span></h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Personal Administrativo</p>
        </div>

        <div className="p-10">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8">
            <button 
              onClick={() => { setIsRegistering(false); setError(''); }}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!isRegistering ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
            >
              Entrar
            </button>
            <button 
              onClick={() => { setIsRegistering(true); setError(''); }}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isRegistering ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
            >
              Registrar
            </button>
          </div>

          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-5">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Número de Cédula</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="text" 
                  inputMode="numeric"
                  value={cedula}
                  onChange={handleCedulaChange}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-slate-700"
                  required
                />
              </div>
            </div>

            {isRegistering && (
              <div className="animate-slideDown">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Nombre Completo</label>
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-slate-700"
                  required
                />
              </div>
            )}

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Clave de Seguridad (6 Dígitos)</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type={showPassword ? "text" : "password"}
                  inputMode="numeric"
                  value={password}
                  onChange={handlePasswordChange}
                  className="w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-black tracking-[0.5em] text-slate-700"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 text-rose-600 text-[10px] font-black uppercase rounded-2xl border border-rose-100 flex items-center gap-2">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <button type="submit" className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all uppercase tracking-widest text-xs">
              {isRegistering ? 'Confirmar Registro' : 'Acceder al Sistema'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;