
import React from 'react';
import { Representative, PaymentRecord, LevelFees, PaymentStatus } from '../types';
import { ICONS } from '../constants';

interface Props {
  representatives: Representative[];
  payments: PaymentRecord[];
  fees: LevelFees;
}

const LedgerModule: React.FC<Props> = ({ representatives, payments, fees }) => {
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
      const totalDue = rep.students.reduce((sum, s) => sum + fees[s.level], 0);
      const totalPaid = payments
        .filter(p => p.cedulaRepresentative === rep.cedula && p.status === PaymentStatus.VERIFICADO)
        .reduce((sum, p) => sum + p.amount, 0);
      
      const lastPayment = payments
        .filter(p => p.cedulaRepresentative === rep.cedula && p.status === PaymentStatus.VERIFICADO)
        .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())[0];

      const balance = Math.max(0, totalDue - totalPaid);

      return {
        ...rep,
        totalDue,
        totalPaid,
        balance,
        lastDate: lastPayment ? lastPayment.paymentDate : 'Sin abonos',
        isCritical: balance > 0 && isUrgent
      };
    });
  };

  const ledger = getLedgerData();
  const globalDebt = ledger.reduce((sum, l) => sum + l.balance, 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Resumen Global con Alerta de Tiempo */}
      <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Total Cuentas por Cobrar (Institución)</p>
            <p className="text-5xl font-black text-emerald-400 tracking-tighter">${globalDebt.toFixed(2)}</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <div className={`p-5 rounded-2xl border flex items-center gap-4 ${isUrgent ? 'bg-rose-500/10 border-rose-500/30' : 'bg-slate-800 border-slate-700'}`}>
              <div className={`p-3 rounded-xl ${isUrgent ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-700 text-slate-400'}`}>
                {ICONS.Pending}
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase">Días para Cierre de Mes</p>
                <p className={`text-xl font-bold ${isUrgent ? 'text-rose-400' : 'text-white'}`}>
                  {daysLeft} {daysLeft === 1 ? 'día' : 'días'}
                </p>
              </div>
            </div>
            
            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 flex items-center gap-4">
              <div className="p-3 bg-slate-700 text-slate-400 rounded-xl">
                {ICONS.Users}
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase">Mora Activa</p>
                <p className="text-xl font-bold text-rose-400">
                  {ledger.filter(l => l.balance > 0).length} Padres
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {isUrgent && (
          <div className="mt-8 p-4 bg-rose-500/20 border border-rose-500/40 rounded-2xl flex items-center gap-3">
            <div className="text-rose-400">{ICONS.Alert}</div>
            <p className="text-sm font-bold text-rose-100">
              ALERTA: Se aproxima la fecha tope de pago. {ledger.filter(l => l.balance > 0).length} cuentas requieren atención inmediata.
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-800">Libro Maestro de Aranceles</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse"></div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Crítico (Próximo a Vencer)</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="px-8 py-5">Representante / Alumnos</th>
                <th className="px-8 py-5 text-center">Cuota Mensual</th>
                <th className="px-8 py-5 text-center">Total Abonado</th>
                <th className="px-8 py-5 text-center">Saldo Pendiente</th>
                <th className="px-8 py-5 text-right">Estatus / Último Abono</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ledger.map((item) => (
                <tr key={item.cedula} className={`transition-all hover:bg-slate-50/80 ${item.isCritical ? 'bg-rose-50/30' : ''}`}>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-800">{item.firstName} {item.lastName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">C.I. {item.cedula}</span>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.students.map((s, idx) => (
                          <span key={idx} className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold uppercase border border-blue-100">
                            {s.fullName.split(' ')[0]} ({s.level[0]})
                          </span>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center font-bold text-slate-600">
                    ${item.totalDue.toFixed(2)}
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-black border border-emerald-100">
                      ${item.totalPaid.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-black border ${
                        item.balance > 0 ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-slate-50 text-slate-400 border-slate-200'
                      }`}>
                        ${item.balance.toFixed(2)}
                      </span>
                      {item.isCritical && (
                        <span title="Cierre de mes cerca" className="text-rose-500 animate-bounce">
                          {ICONS.Alert}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-bold text-slate-500">{item.lastDate}</span>
                      {item.balance > 0 && (
                        <span className={`text-[9px] font-black uppercase mt-1 ${item.isCritical ? 'text-rose-600' : 'text-slate-400'}`}>
                          {item.isCritical ? '¡Vencimiento Cercano!' : 'Pago Pendiente'}
                        </span>
                      )}
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

export default LedgerModule;
