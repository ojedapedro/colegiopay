import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { ICONS } from '../constants';
import { X, Shield, User as UserIcon, Plus, UserPlus } from 'lucide-react';

interface Props {
  users: User[];
  onUpdateRole: (cedula: string, newRole: UserRole) => void;
  onDeleteUser: (cedula: string) => void;
  onAddUser: (user: User) => void;
}

const UserManagement: React.FC<Props> = ({ users, onUpdateRole, onDeleteUser, onAddUser }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCedula, setNewCedula] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>(UserRole.CAJERO);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length !== 6) {
      alert("La clave debe tener 6 dígitos.");
      return;
    }
    if (users.find(u => u.cedula === newCedula)) {
      alert("Este usuario ya existe.");
      return;
    }

    const newUser: User = {
      cedula: newCedula,
      fullName: newFullName,
      password: newPassword,
      role: newRole,
      createdAt: new Date().toISOString()
    };

    onAddUser(newUser);
    setShowAddForm(false);
    setNewCedula('');
    setNewFullName('');
    setNewPassword('');
    alert(`Usuario ${newFullName} creado exitosamente como ${newRole}`);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      {/* Botón para expandir formulario de creación */}
      <div className="flex justify-end">
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20"
        >
          {showAddForm ? <X size={16} /> : <UserPlus size={16} />}
          {showAddForm ? 'Cancelar' : 'Añadir Nuevo Personal'}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white p-8 rounded-[2rem] border-2 border-blue-500 shadow-2xl animate-slideDown">
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter mb-6 flex items-center gap-3">
            <Plus className="text-blue-500" /> Crear Cuenta de Personal
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cédula</label>
              <input 
                type="text" 
                value={newCedula} 
                onChange={(e) => setNewCedula(e.target.value.replace(/\D/g,''))}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-blue-500"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
              <input 
                type="text" 
                value={newFullName} 
                onChange={(e) => setNewFullName(e.target.value)}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-blue-500"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Clave (6 dígitos)</label>
              <input 
                type="password" 
                maxLength={6}
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value.replace(/\D/g,''))}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-black tracking-widest outline-none focus:border-blue-500"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rol de Usuario</label>
              <select 
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-black uppercase text-[10px] outline-none"
              >
                {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="lg:col-span-4">
              <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black rounded-xl uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all">
                Confirmar y Activar Usuario
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-700 rounded-2xl">
              <Shield size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Personal Registrado</h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Control de accesos y roles</p>
            </div>
          </div>
          <div className="bg-blue-600 text-white px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest">
            {users.length} Usuarios
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 text-[10px] font-black uppercase tracking-[0.15em] border-b border-slate-100">
                <th className="px-8 py-6">Usuario</th>
                <th className="px-8 py-6">Fecha Registro</th>
                <th className="px-8 py-6">Rol Actual</th>
                <th className="px-8 py-6 text-right">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.cedula} className="hover:bg-slate-50 transition-all group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 transition-colors">
                        <UserIcon size={20} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-800 uppercase">{user.fullName}</span>
                        <span className="text-[10px] text-slate-400 font-mono font-bold">C.I. {user.cedula}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-xs text-slate-500 font-bold">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border tracking-widest ${
                      user.role === UserRole.ADMINISTRADOR ? 'bg-purple-50 text-purple-700 border-purple-100' :
                      user.role === UserRole.SUPERVISOR ? 'bg-sky-50 text-sky-700 border-sky-100' :
                      'bg-slate-50 text-slate-600 border-slate-100'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center justify-end gap-3">
                      <select 
                        value={user.role}
                        onChange={(e) => onUpdateRole(user.cedula, e.target.value as UserRole)}
                        className="text-[10px] bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none font-black text-slate-600 appearance-none cursor-pointer hover:border-blue-300 transition-all uppercase"
                      >
                        {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <button 
                        onClick={() => {
                          if(confirm(`¿Desea eliminar a ${user.fullName}?`)) onDeleteUser(user.cedula);
                        }}
                        className="p-3 text-rose-400 hover:text-rose-600 transition-all"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;