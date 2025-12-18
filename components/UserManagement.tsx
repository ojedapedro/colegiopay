
import React from 'react';
import { User, UserRole } from '../types';
import { ICONS } from '../constants';

interface Props {
  users: User[];
  onUpdateRole: (cedula: string, newRole: UserRole) => void;
  onDeleteUser: (cedula: string) => void;
}

const UserManagement: React.FC<Props> = ({ users, onUpdateRole, onDeleteUser }) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-fadeIn">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl">
            {ICONS.Users}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Gestión de Usuarios</h3>
            <p className="text-sm text-slate-500 font-medium">Control de acceso y roles del personal</p>
          </div>
        </div>
        <div className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border border-indigo-200">
          {users.length} Registrados
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 text-slate-500 text-[11px] font-bold uppercase tracking-[0.15em] border-b border-slate-100">
              <th className="px-8 py-5">Nombre / Cédula</th>
              <th className="px-8 py-5">Fecha Registro</th>
              <th className="px-8 py-5">Rol Actual</th>
              <th className="px-8 py-5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.cedula} className="hover:bg-slate-50/50 transition-all duration-200 group">
                <td className="px-8 py-6">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-800">{user.fullName}</span>
                    <span className="text-[10px] text-slate-400 font-mono mt-1">ID: {user.cedula}</span>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className="text-xs text-slate-500 font-medium">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${
                    user.role === UserRole.ADMIN 
                      ? 'bg-purple-50 text-purple-700 border-purple-100' 
                      : 'bg-blue-50 text-blue-700 border-blue-100'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center justify-end gap-2">
                    <select 
                      value={user.role}
                      onChange={(e) => onUpdateRole(user.cedula, e.target.value as UserRole)}
                      className="text-xs bg-slate-100 border-none rounded-lg p-1.5 outline-none font-bold text-slate-600 focus:ring-2 focus:ring-indigo-200"
                    >
                      <option value={UserRole.ADMIN}>Hacer Admin</option>
                      <option value={UserRole.BASIC}>Hacer Básico</option>
                    </select>
                    <button 
                      onClick={() => onDeleteUser(user.cedula)}
                      className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Eliminar Usuario"
                    >
                      <X size={16} />
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

const X = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
);

export default UserManagement;
