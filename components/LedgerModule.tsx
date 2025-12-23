
import React, { useState } from 'react';
import { Representative, PaymentRecord, LevelFees, PaymentStatus } from '../types';
import { ICONS } from '../constants';
// Added missing Check import
import { ChevronDown, ChevronUp, History, Receipt, Info, Check } from 'lucide-react';

interface Props {
  representatives: Representative[];
  payments: PaymentRecord[];
  fees: LevelFees;
}

const LedgerModule: React.FC<Props> = ({ representatives, payments, fees }) => {
  const [expandedRep, setExpandedRep] = useState<string | null>(null);

  const getDaysUntilEndOfMonth = () => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const diff = lastDay.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const daysLeft = getDaysUntilEndOfMonth();
  const isUrgent = daysLeft <= 5;

  const getLedgerData = () => {
    return representatives.map(rep => {
      const totalDue = rep.students.reduce((sum, s) => sum + (fees[s.level] || 0), 0);
      
      const verifiedPayments = payments.filter(p => p.cedulaRepresentative === rep.cedula && p.status === PaymentStatus.VERIFICADO);
      const pendingPayments = payments.filter(p => p.cedulaRepresentative === rep.cedula && p.status === PaymentStatus.PENDIENTE);
      
      const totalPaid = verifiedPayments.reduce((sum, p) => sum + p.amount, 0);
      const totalInTransit = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
      
      const balance = Math.max(0, totalDue - totalPaid);

      return {
        ...rep,
        totalDue,
        totalPaid,
        totalInTransit,
        balance,
        verifiedHistory: verifiedPayments,
        lastDate: verifiedPayments.length > 0 ? verifiedPayments.sort((a,b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())[0].paymentDate : 'Sin abonos',
        isCritical: balance > 0 && isUrgent
      };
    });
  };

  const ledger = getLedgerData();
  const globalDebt = ledger.reduce((sum, l) => sum + l.balance, 0);
  const globalInTransit = ledger.reduce((sum, l) => sum + l.totalInTransit, 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Resumen Global */}
      <div className="bg-slate-900 text-white p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-12">
          <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Capital Exigible Pendiente</p>
            <div className="flex items-baseline gap-4">
               <p className="text-6xl font-black text-white tracking-tighter">${globalDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
               <div className="flex flex-col">
                  <span className="text-emerald-400 font-bold text-xs">-${globalInTransit.toFixed(2)} Proyectado</span>
                  <span className="text-[9px] font-black text-slate-500 uppercase">Si se verifican pendientes</span>
               </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full lg:w-auto">
            <div className={`p-6 rounded-3xl border transition-all ${isUrgent ? 'bg-rose-500/10 border-rose-500/30 shadow-lg shadow-rose-900/20' : 'bg-slate-800/50 border-slate-700'}`}>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Vencimiento Mes</p>
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-xl ${isUrgent ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-700 text-slate-400'}`}>
                  {ICONS.Pending}
                </div>
                <p className={`text-2xl font-black ${isUrgent ? 'text-rose-400' : 'text-white'}`}>
                  {daysLeft} Días
                </p>
              </div>
            </div>
            
            <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700 flex flex-col justify-between">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">En Tránsito</p>
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl">
                  <RefreshCw className="animate-spin-slow" size={18} />
                </div>
                <p className="text-2xl font-black text-blue-400">${globalInTransit.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
             <div className="p-2.5 bg-slate-900 text-white rounded-2xl shadow-lg">
                <Receipt size={22} />
             </div>
             <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Libro Maestro Conciliado</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Saldos actualizados según verificación</p>
             </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                <th className="px-8 py-6">Representante / Grupo Familiar</th>
                <th className="px-8 py-6 text-center">Total Arancel</th>
                <th className="px-8 py-6 text-center">Abonos Verificados</th>
                <th className="px-8 py-6 text-center">Saldo Restante</th>
                <th className="px-8 py-6 text-right">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ledger.map((item) => (
                <React.Fragment key={item.cedula}>
                  <tr className={`transition-all hover:bg-slate-50/80 ${item.isCritical ? 'bg-rose-50/10' : ''} ${expandedRep === item.cedula ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-8 py-8">
                      <div className="flex flex-col">
                        <span className="text-base font-black text-slate-800 tracking-tight">{item.firstName} {item.lastName}</span>
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5">C.I. {item.cedula}</span>
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {item.students.map((s, idx) => (
                            <span key={idx} className="text-[9px] bg-white text-slate-500 px-2 py-1 rounded-lg font-black uppercase border border-slate-200 shadow-sm">
                              {s.fullName} ({s.level[0]})
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-8 text-center">
                      <p className="text-sm font-black text-slate-400">${item.totalDue.toFixed(2)}</p>
                    </td>
                    <td className="px-8 py-8 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-2xl text-xs font-black border border-emerald-100 shadow-sm">
                          ${item.totalPaid.toFixed(2)}
                        </span>
                        {item.totalInTransit > 0 && (
                          <span className="text-[9px] font-black text-blue-500 uppercase mt-1 animate-pulse">
                            +${item.totalInTransit.toFixed(2)} en revisión
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-8 text-center">
                      <span className={`px-5 py-2.5 rounded-2xl text-sm font-black border shadow-sm ${
                        item.balance > 0 ? 'bg-white text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                      }`}>
                        ${item.balance.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-8 py-8 text-right">
                      <button 
                        onClick={() => setExpandedRep(expandedRep === item.cedula ? null : item.cedula)}
                        className={`p-3 rounded-2xl transition-all ${expandedRep === item.cedula ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                      >
                        {expandedRep === item.cedula ? <ChevronUp size={20} /> : <History size={20} />}
                      </button>
                    </td>
                  </tr>
                  
                  {expandedRep === item.cedula && (
                    <tr className="bg-slate-50/50">
                      <td colSpan={5} className="px-12 py-8">
                        <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-inner space-y-6">
                           <div className="flex items-center gap-3">
                              <History size={18} className="text-blue-500" />
                              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Historial de Conciliación</h4>
                           </div>
                           
                           {item.verifiedHistory.length === 0 ? (
                             <div className="p-10 border-2 border-dashed border-slate-100 rounded-3xl text-center">
                               <p className="text-xs font-bold text-slate-400 uppercase italic">No se registran abonos verificados para este representante.</p>
                             </div>
                           ) : (
                             <div className="space-y-3">
                               {item.verifiedHistory.sort((a,b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()).map((p) => (
                                 <div key={p.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-emerald-200 hover:bg-emerald-50/30 transition-all">
                                   <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-500 border border-emerald-100 shadow-sm">
                                         <Check size={18} strokeWidth={3} />
                                      </div>
                                      <div>
                                         <p className="text-xs font-black text-slate-800">{p.paymentDate}</p>
                                         <p className="text-[10px] font-bold text-slate-400 uppercase">{p.method} • Ref: {p.reference}</p>
                                      </div>
                                   </div>
                                   <div className="text-right">
                                      <p className="text-sm font-black text-emerald-600">-${p.amount.toFixed(2)}</p>
                                      <p className="text-[9px] font-black text-emerald-400 uppercase tracking-tighter">Restado del Saldo</p>
                                   </div>
                                 </div>
                               ))}
                             </div>
                           )}
                           
                           <div className="pt-4 flex items-center gap-4 text-xs font-bold text-slate-400">
                              <Info size={14} />
                              <p>Solo los pagos con estado <span className="text-emerald-500">VERIFICADO</span> afectan el balance neto en este módulo.</p>
                           </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const RefreshCw = ({ className, size }: { className?: string, size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path><path d="M16 16h5v5"></path></svg>
);

export default LedgerModule;
