import React from 'react';
import { Representative, PaymentRecord, PaymentStatus, Level } from '../types';
import { ICONS } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface DashboardProps {
  representatives: Representative[];
  payments: PaymentRecord[];
}

function StatCard({ title, value, icon, color }: { title: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`p-4 bg-${color}-50 text-${color}-600 rounded-2xl`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
        <p className="text-2xl font-black text-slate-800 tracking-tighter">{value}</p>
      </div>
    </div>
  );
}

export default function Dashboard({ representatives, payments }: DashboardProps) {
  const verifiedPayments = payments.filter(p => p.status === PaymentStatus.VERIFICADO);
  const totalIncome = verifiedPayments.reduce((sum, p) => sum + p.amount, 0);
  const pendingIncome = payments.filter(p => p.status === PaymentStatus.PENDIENTE).reduce((sum, p) => sum + p.amount, 0);
  
  const studentCount = representatives.reduce((sum, r) => sum + r.students.length, 0);
  
  const levelData = [
    { name: 'Maternal', value: representatives.reduce((sum, r) => sum + r.students.filter(s => s.level === Level.MATERNAL).length, 0) },
    { name: 'Pre-Escolar', value: representatives.reduce((sum, r) => sum + r.students.filter(s => s.level === Level.PRE_ESCOLAR).length, 0) },
    { name: 'Primaria', value: representatives.reduce((sum, r) => sum + r.students.filter(s => s.level === Level.PRIMARIA).length, 0) },
    { name: 'Secundaria', value: representatives.reduce((sum, r) => sum + r.students.filter(s => s.level === Level.SECUNDARIA).length, 0) },
  ];

  const methodData = [
    { name: 'Efectivo', value: verifiedPayments.filter(p => p.method.includes('Efectivo')).reduce((sum, p) => sum + p.amount, 0) },
    { name: 'Electrónico', value: verifiedPayments.filter(p => !p.method.includes('Efectivo')).reduce((sum, p) => sum + p.amount, 0) },
  ];

  return (
    <div className="space-y-6 animate-fadeIn min-h-screen">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Recaudación Total" value={`$${totalIncome.toFixed(2)}`} icon={ICONS.Payments} color="emerald" />
        <StatCard title="Pendiente Verificación" value={`$${pendingIncome.toFixed(2)}`} icon={ICONS.Pending} color="amber" />
        <StatCard title="Total Alumnos" value={studentCount.toString()} icon={ICONS.Registration} color="blue" />
        <StatCard title="Representantes" value={representatives.length.toString()} icon={ICONS.Search} color="slate" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[450px]">
          <h3 className="text-lg font-bold text-slate-800 mb-6 uppercase tracking-tighter">Distribución por Nivel</h3>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={levelData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                  {levelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : index === 1 ? '#f59e0b' : index === 2 ? '#3b82f6' : '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[450px]">
          <h3 className="text-lg font-bold text-slate-800 mb-6 uppercase tracking-tighter">Métodos de Pago (Verificados)</h3>
          <div className="flex-1 flex flex-col md:flex-row items-center w-full">
            <div className="flex-1 w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={methodData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    <Cell fill="#10b981" stroke="#fff" strokeWidth={2} />
                    <Cell fill="#3b82f6" stroke="#fff" strokeWidth={2} />
                  </Pie>
                  <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4 mt-2 md:mt-0 md:ml-4 w-full md:w-48">
              {methodData.map((d, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${i === 0 ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{d.name}</span>
                  </div>
                  <span className="font-black text-slate-800 text-lg tracking-tight">${d.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}