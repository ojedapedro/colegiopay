
import React from 'react';
// Fix: Removed non-existent export LEVEL_FEES from imports as it is not used in this component.
import { Representative, PaymentRecord, PaymentStatus } from '../types';
import { ICONS, COLORS } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface Props {
  representatives: Representative[];
  payments: PaymentRecord[];
}

const Dashboard: React.FC<Props> = ({ representatives, payments }) => {
  const verifiedPayments = payments.filter(p => p.status === PaymentStatus.VERIFICADO);
  const totalIncome = verifiedPayments.reduce((sum, p) => sum + p.amount, 0);
  const pendingIncome = payments.filter(p => p.status === PaymentStatus.PENDIENTE).reduce((sum, p) => sum + p.amount, 0);
  
  const studentCount = representatives.reduce((sum, r) => sum + r.students.length, 0);
  
  const levelData = [
    { name: 'Maternal', value: representatives.reduce((sum, r) => sum + r.students.filter(s => s.level === 'Maternal').length, 0) },
    { name: 'Pre-Escolar', value: representatives.reduce((sum, r) => sum + r.students.filter(s => s.level === 'Pre-escolar').length, 0) },
    { name: 'Primaria', value: representatives.reduce((sum, r) => sum + r.students.filter(s => s.level === 'Primaria').length, 0) },
    { name: 'Secundaria', value: representatives.reduce((sum, r) => sum + r.students.filter(s => s.level === 'Secundaria').length, 0) },
  ];

  const methodData = [
    { name: 'Efectivo', value: verifiedPayments.filter(p => p.method.includes('Efectivo')).reduce((sum, p) => sum + p.amount, 0) },
    { name: 'Electrónico', value: verifiedPayments.filter(p => !p.method.includes('Efectivo')).reduce((sum, p) => sum + p.amount, 0) },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Recaudación Total" value={`$${totalIncome.toFixed(2)}`} icon={ICONS.Payments} color="emerald" />
        {/* Fix: Changed ICONS.Clock to ICONS.Pending */}
        <StatCard title="Pendiente Verificación" value={`$${pendingIncome.toFixed(2)}`} icon={ICONS.Pending} color="amber" />
        <StatCard title="Total Alumnos" value={studentCount.toString()} icon={ICONS.Registration} color="blue" />
        <StatCard title="Representantes" value={representatives.length.toString()} icon={ICONS.Search} color="slate" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Distribución por Nivel</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={levelData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {levelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : index === 1 ? '#f59e0b' : index === 2 ? '#3b82f6' : '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Métodos de Pago (Verificados)</h3>
          <div className="h-64 flex flex-col md:flex-row items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={methodData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#3b82f6" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-4 md:mt-0 md:ml-4 w-full">
              {methodData.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${i === 0 ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                    <span className="text-slate-500">{d.name}</span>
                  </div>
                  <span className="font-bold text-slate-700">${d.value.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
    <div className={`p-3 bg-${color}-50 text-${color}-600 rounded-xl`}>
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</p>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
    </div>
  </div>
);

export default Dashboard;
