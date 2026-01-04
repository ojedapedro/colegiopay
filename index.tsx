
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Level, 
  Representative, 
  PaymentRecord, 
  DEFAULT_LEVEL_FEES, 
  LevelFees,
  PaymentMethod, 
  PaymentStatus, 
  User,
  UserRole,
  Student
} from './types';
import { ICONS } from './constants';
import { 
  ShieldCheck, 
  LayoutGrid, 
  ClipboardList, 
  Wallet, 
  FileBarChart, 
  Settings, 
  Users, 
  UserPlus, 
  RefreshCcw,
  ChevronUp, 
  History as HistoryIcon, 
  Receipt, 
  Info, 
  Check, 
  Calendar, 
  AlertCircle, 
  Clock, 
  XCircle, 
  CheckCircle2,
  PlusCircle, 
  UserCircle,
  Smartphone, 
  Landmark, 
  ReceiptText, 
  X,
  Globe,
  Building2,
  Zap,
  Search,
  Eye,
  EyeOff,
  Link as LinkIcon,
  Trash2
} from 'lucide-react';
import { initialRepresentatives, initialPayments, initialUsers } from './services/mockData';
import { sheetService } from './services/googleSheets';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

const INSTITUTION_LOGO = "https://i.ibb.co/FbHJbvVT/images.png";

// --- Sub-components moved to top and converted to function declarations ---

function NavItem({ active, onClick, icon, label, badge }: { active: boolean, onClick: () => void, icon: any, label: string, badge?: number }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all group ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20 font-black' : 'text-slate-400 hover:bg-slate-800/50 font-bold'}`}>
      <div className="flex items-center gap-4">
        <span className={`${active ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>{icon}</span>
        <span className="text-[10px] uppercase tracking-widest">{label}</span>
      </div>
      {/* Fix: Ensure badge rendering is strictly boolean-checked to avoid number 0 being rendered as string */}
      {!!badge ? <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${active ? 'bg-white text-blue-600' : 'bg-rose-500 text-white'}`}>{badge}</span> : null}
    </button>
  );
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

function DailyStatCard({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div className={`p-5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow`}>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">{label}</p>
      <p className={`text-xl font-black text-${color}-600`}>${value.toFixed(2)}</p>
    </div>
  );
}

function LocalSpinIcon({ className, size }: { className?: string, size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
      <path d="M3 3v5h5"></path>
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
      <path d="M16 16h5v5"></path>
    </svg>
  );
}

// --- Main Components ---

function Dashboard({ representatives, payments }: { representatives: Representative[]; payments: PaymentRecord[] }) {
  const verifiedPayments = useMemo(() => payments.filter(p => p.status === PaymentStatus.VERIFICADO), [payments]);
  const totalIncome = useMemo(() => verifiedPayments.reduce((sum, p) => sum + p.amount, 0), [verifiedPayments]);
  const pendingIncome = useMemo(() => payments.filter(p => p.status === PaymentStatus.PENDIENTE).reduce((sum, p) => sum + p.amount, 0), [payments]);
  
  const studentCount = useMemo(() => representatives.reduce((sum, r) => sum + r.students.length, 0), [representatives]);
  
  const levelData = useMemo(() => [
    { name: 'Maternal', value: representatives.reduce((sum, r) => sum + r.students.filter(s => s.level === Level.MATERNAL).length, 0) },
    { name: 'Pre-Escolar', value: representatives.reduce((sum, r) => sum + r.students.filter(s => s.level === Level.PRE_ESCOLAR).length, 0) },
    { name: 'Primaria', value: representatives.reduce((sum, r) => sum + r.students.filter(s => s.level === Level.PRIMARIA).length, 0) },
    { name: 'Secundaria', value: representatives.reduce((sum, r) => sum + r.students.filter(s => s.level === Level.SECUNDARIA).length, 0) },
  ], [representatives]);

  const methodData = useMemo(() => [
    { name: 'Efectivo', value: verifiedPayments.filter(p => p.method.includes('Efectivo')).reduce((sum, p) => sum + p.amount, 0) },
    { name: 'Electrónico', value: verifiedPayments.filter(p => !p.method.includes('Efectivo')).reduce((sum, p) => sum + p.amount, 0) },
  ], [verifiedPayments]);

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
          <div className="flex-1 w-full" style={{ minHeight: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%" minHeight={300}>
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
          <div className="flex-1 flex flex-col md:flex-row items-center w-full" style={{ minHeight: '300px' }}>
            <div className="flex-1 w-full h-full">
              <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                <PieChart>
                  <Pie 
                    data={methodData} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" 
                    cy="50%" 
                    outerRadius={100} 
                    fill="#8884d8" 
                    paddingAngle={5} 
                    label
                  >
                    {methodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#3b82f6'} />
                    ))}
                  </Pie>
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}