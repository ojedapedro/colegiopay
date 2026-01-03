import React from 'react';
import { User, UserRole } from '../types';
import { ICONS } from '../constants';
import { X, Shield, User as UserIcon, Eye } from 'lucide-react';

interface Props {
  users: User[];
  onUpdateRole: (cedula: string, newRole: UserRole) => void;
  onDeleteUser: (cedula: string) => void;
}

const UserManagement: React.FC<Props> = ({ users, onUpdateRole, onDeleteUser }) => {
  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden animate-fadeIn">
      <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-700 rounded-2xl">
            <Shield size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Control de Personal</h3>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Gestión de privilegios y accesos</p>
          </div>
        </div>
        <div className="bg-blue-600 text-white px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20">
          {users.length} Usuarios Activos
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 text-slate-500 text-[10px] font-black uppercase tracking-[0.15em] border-b border-slate-100">
              <th className="px-8 py-6">Nombre Completo / C.I.</th>
              <th className="px-8 py-6">Estatus / Clave</th>
              <th className="px-8 py-6">Privilegios</th>
              <th className="px-8 py-6 text-right">Gestión</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.cedula} className="hover:bg-slate-50 transition-all duration-200 group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                      <UserIcon size={20} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{user.fullName}</span>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5 font-bold">C.I. {user.cedula}</span>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-slate-500 font-bold">
                      Desde: {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-[9px] font-black text-blue-500 font-mono">PIN: ******</span>
                  </div>
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
                    <div className="relative">
                      <select 
                        value={user.role}
                        onChange={(e) => onUpdateRole(user.cedula, e.target.value as UserRole)}
                        className="text-[10px] bg-white border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 outline-none font-black text-slate-600 focus:ring-4 focus:ring-blue-100 appearance-none cursor-pointer hover:border-blue-300 transition-all uppercase tracking-widest"
                      >
                        <option value={UserRole.ADMINISTRADOR}>Administrador</option>
                        <option value={UserRole.SUPERVISOR}>Supervisor</option>
                        <option value={UserRole.CAJERO}>Cajero</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        {ICONS.Next}
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        if(confirm(`¿Desea dar de baja al usuario ${user.fullName}?`)) {
                          onDeleteUser(user.cedula);
                        }
                      }}
                      className="p-3 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      title="Eliminar Personal"
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
  );
};

export default UserManagement;