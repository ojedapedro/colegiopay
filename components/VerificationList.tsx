
import React, { useState, useMemo } from 'react';
import { PaymentRecord, PaymentStatus, PaymentMethod, Representative, LevelFees } from '../types';
import { ICONS } from '../constants';
import { 
  CreditCard, 
  Smartphone, 
  Landmark, 
  ReceiptText, 
  Check, 
  X, 
  ShieldCheck, 
  ShieldAlert, 
  ExternalLink, 
  Filter, 
  Calendar, 
  DollarSign, 
  RefreshCw, 
  Globe,
  Info,
  Hash,
  ArrowRight
} from 'lucide-react';
import { sheetService } from '../services/googleSheets';

interface Props {
  payments: PaymentRecord[];
  representatives: Representative[];
  fees: LevelFees;
  onVerify: (id: string, status: PaymentStatus) => void;
  onImportExternal?: (newPayments: PaymentRecord[]) => void;
}

const VerificationList: React.FC<Props> = ({ payments, representatives, fees, onVerify, onImportExternal }) => {
  const [isSyncingExternal, setIsSyncingExternal] = useState(false);
  
  // Filtros
  const [filterDate, setFilterDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  const pending = useMemo(() => {
    let filtered = payments.filter(p => p.status === PaymentStatus.PENDIENTE);
    
    if (filterDate) {
      filtered = filtered.filter(p => p.paymentDate === filterDate);
    }
    
    if (minAmount) {
      filtered = filtered.filter(p => p.amount >= parseFloat(minAmount));
    }
    
    if (maxAmount) {
      filtered = filtered.filter(p => p.amount <= parseFloat(maxAmount));
    }
    
    return filtered;
  }, [payments, filterDate, minAmount, maxAmount]);

  const handleSyncVirtualOffice = async () => {
    if (!sheetService.isValidConfig()) {
      alert("Por favor, configure primero la URL de Apps Script en Ajustes.");
      return;
    }

    setIsSyncingExternal(true);
    const externalPayments = await sheetService.fetchVirtualOfficePayments();
    
    if (externalPayments.length > 0 && onImportExternal) {
      const existingIds = new Set(payments.map(p => p.id));
      const news = externalPayments.filter((p: PaymentRecord) => !existingIds.has(p.id));
      
      if (news.length > 0) {
        onImportExternal(news);
        alert(`Se han importado ${news.length} nuevos pagos desde la Oficina Virtual.`);
      } else {
        alert("No hay nuevos pagos en la Oficina Virtual.");
      }
    } else if (externalPayments.length === 0) {
      alert("No se encontraron nuevos registros o hubo un error de conexión.");
    }
    setIsSyncingExternal(false);
  };

  const getMethodInfo = (method: PaymentMethod) => {
    switch (method) {
      case PaymentMethod.ZELLE:
        return { 
          color: 'bg-purple-100 text-purple-700 border-purple-200', 
          icon: <Smartphone size={14} strokeWidth={2.5} /> 
        };
      case PaymentMethod.PAGO_MOVIL:
        return { 
          color: 'bg-orange-100 text-orange-700 border-orange-200', 
          icon: <Smartphone size={14} strokeWidth={2.5} /> 
        };
      case PaymentMethod.TRANSFERENCIA:
        return { 
          color: 'bg-blue-100 text-blue-700 border-blue-200', 
          icon: <Landmark size={14} strokeWidth={2.5} /> 
        };
      case PaymentMethod.TDC:
      case PaymentMethod.TDD:
        return { 
          color: 'bg-indigo-100 text-indigo-700 border-indigo-200', 
          icon: <CreditCard size={14} strokeWidth={2.5} /> 
        };
      default:
        return { 
          color: 'bg-slate-100 text-slate-700 border-slate-200', 
          icon: <ReceiptText size={14} strokeWidth={2.5} /> 
        };
    }
  };

  const isUrl = (str: string) => {
    try {
      const url = new URL(str);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
      return false;
    }
  };

  const getRepresentativeStats = (cedula: string) => {
    const rep = representatives.find(r => r.cedula === cedula);
    if (!rep) return { currentBalance: 0, name: 'Desconocido' };

    const totalDue = rep.students.reduce((sum, s) => sum + (fees[s.level] || 0), 0);
    const totalPaid = payments
      .filter(p => p.cedulaRepresentative === cedula && p.status === PaymentStatus.VERIFICADO)
      .reduce((sum, p) => sum + p.amount, 0);
    
    return {
      currentBalance: Math.max(0, totalDue - totalPaid),
      name: `${rep.firstName} ${rep.lastName}`
    };
  };

  const ReferenceTag: React.FC<{ reference: string }> = ({ reference }) => {
    const isLink = isUrl(reference);
    
    if (isLink) {
      return (
        <a 
          href={reference} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="group/link inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-md hover:shadow-blue-200 hover:-translate-y-0.5 active:translate-y-0"
        >
          Ver Comprobante
          <ExternalLink size={12} className="group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
        </a>
      );
    }

    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-mono tracking-widest shadow-sm">
        <Hash size={10} className="text-slate-400" />
        {reference}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Cabecera de Sincronización Externa */}
      <div className="bg-[#0f172a] p-8 rounded-[2rem] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 border border-slate-800 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="flex items-center gap-5 relative z-10">
          <div className="p-4 bg-blue-500/10 rounded-3xl border border-blue-500/20 text-blue-400 shadow-inner">
            <Globe size={32} className="group-hover:rotate-12 transition-transform duration-500" />
          </div>
          <div>
            <h3 className="text-white font-black text-xl tracking-tight">Oficina Virtual <span className="text-blue-500">Master</span></h3>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Conexión activa: ID-17slRl7f...FGX1Eg</p>
          </div>
        </div>
        <button 
          onClick={handleSyncVirtualOffice}
          disabled={isSyncingExternal}
          className={`relative z-10 flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.15em] transition-all duration-300 ${isSyncingExternal ? 'bg-slate-800 text-slate-500' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-xl shadow-blue-600/20 hover:-translate-y-1'}`}
        >
          <RefreshCw size={18} className={isSyncingExternal ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
          {isSyncingExternal ? 'Importando Datos...' : 'Sincronizar Oficina'}
        </button>
      </div>

      <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 bg-slate-100 text-slate-600 rounded-2xl">
            <Filter size={20} />
          </div>
          <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Filtros de Verificación</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <Calendar size={12} className="text-blue-500" /> Fecha del Pago
            </label>
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all text-sm font-bold"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <DollarSign size={12} className="text-emerald-500" /> Monto Mínimo
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-300">$</span>
              <input 
                type="number" 
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all text-sm font-bold"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <DollarSign size={12} className="text-rose-500" /> Monto Máximo
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-300">$</span>
              <input 
                type="number" 
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                placeholder="Sin límite"
                className="w-full pl-8 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all text-sm font-bold"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between bg-slate-50/30 gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-amber-100 text-amber-600 rounded-3xl shadow-inner">
              <ShieldAlert size={28} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Cola de Auditoría</h3>
              <p className="text-xs font-medium text-slate-500">Validación manual de transacciones digitales</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-5 py-2.5 bg-amber-50 text-amber-700 rounded-2xl text-[11px] font-black uppercase tracking-widest border border-amber-200 shadow-sm">
              {pending.length} Pendientes
            </span>
          </div>
        </div>

        {pending.length === 0 ? (
          <div className="p-32 flex flex-col items-center justify-center text-slate-400 text-center">
            <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-8 shadow-inner border-4 border-white">
              <ShieldCheck size={52} />
            </div>
            <p className="text-2xl font-black text-slate-800 tracking-tight">Sistema Limpio</p>
            <p className="text-sm mt-2 font-medium max-w-xs mx-auto text-slate-500 leading-relaxed">No hay pagos pendientes por verificar en este momento.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 text-[11px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                  <th className="px-8 py-6">Datos del Pago</th>
                  <th className="px-8 py-6">Instrumento / Referencia</th>
                  <th className="px-8 py-6">Impacto en el Libro Maestro</th>
                  <th className="px-8 py-6 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pending.map((p) => {
                  const methodInfo = getMethodInfo(p.method);
                  const isExternal = p.observations.includes('OFICINA VIRTUAL');
                  const { currentBalance, name } = getRepresentativeStats(p.cedulaRepresentative);
                  const projectedBalance = Math.max(0, currentBalance - p.amount);
                  
                  return (
                    <tr key={p.id} className="group hover:bg-slate-50/80 transition-all duration-300">
                      <td className="px-8 py-7 relative">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 scale-y-0 group-hover:scale-y-100 transition-transform duration-300"></div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-800">{p.paymentDate}</span>
                          <span className="text-xs font-bold text-slate-500 mt-1 uppercase">{name}</span>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5">C.I. {p.cedulaRepresentative}</span>
                          <span className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase mt-3 px-2.5 py-1 rounded-full border w-fit ${isExternal ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                            {isExternal ? <Globe size={10} /> : <Info size={10} />}
                            {isExternal ? 'Oficina Virtual' : 'Caja Interna'}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-7">
                        <div className="flex flex-col gap-3">
                          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase w-fit shadow-sm ${methodInfo.color}`}>
                            {methodInfo.icon} {p.method}
                          </div>
                          <ReferenceTag reference={p.reference} />
                          <div className="mt-1">
                             <span className="text-2xl font-black text-slate-900 tracking-tight">${p.amount.toFixed(2)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-7">
                        <div className="p-4 bg-slate-100/50 rounded-2xl border border-slate-200/60 flex flex-col gap-3 max-w-[200px]">
                           <div>
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Saldo Actual</p>
                             <p className="text-sm font-black text-slate-600">${currentBalance.toFixed(2)}</p>
                           </div>
                           <div className="flex justify-center text-slate-300">
                             <ArrowRight size={14} className="rotate-90" />
                           </div>
                           <div>
                             <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Saldo Proyectado</p>
                             <p className="text-sm font-black text-emerald-600">${projectedBalance.toFixed(2)}</p>
                           </div>
                        </div>
                      </td>
                      <td className="px-8 py-7">
                        <div className="flex items-center justify-end gap-3 translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-500">
                          <button 
                            onClick={() => {
                              if(confirm(`¿Confirmar verificación de $${p.amount}? El saldo de ${name} se actualizará de $${currentBalance} a $${projectedBalance}.`)) {
                                onVerify(p.id, PaymentStatus.VERIFICADO);
                              }
                            }}
                            className="bg-emerald-600 text-white p-3.5 rounded-2xl hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-100 hover:-translate-y-1 active:translate-y-0"
                            title="Aprobar Pago"
                          >
                            <Check size={20} strokeWidth={3} />
                          </button>
                          <button 
                            onClick={() => onVerify(p.id, PaymentStatus.RECHAZADO)}
                            className="bg-white text-rose-500 border-2 border-rose-100 p-3.5 rounded-2xl hover:bg-rose-50 hover:border-rose-300 transition-all hover:-translate-y-1 active:translate-y-0"
                            title="Rechazar Pago"
                          >
                            <X size={20} strokeWidth={3} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerificationList;
