
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
    
    if (filterDate) filtered = filtered.filter(p => p.paymentDate === filterDate);
    if (minAmount) filtered = filtered.filter(p => p.amount >= parseFloat(minAmount));
    if (maxAmount) filtered = filtered.filter(p => p.amount <= parseFloat(maxAmount));
    
    return filtered;
  }, [payments, filterDate, minAmount, maxAmount]);

  const handleSyncVirtualOffice = async () => {
    if (!sheetService.isValidConfig()) {
      alert("Por favor, configure la URL de Apps Script en Ajustes.");
      return;
    }

    setIsSyncingExternal(true);
    try {
      const externalPayments = await sheetService.fetchVirtualOfficePayments();
      
      if (externalPayments && externalPayments.length > 0 && onImportExternal) {
        // Filtrar solo los que NO existen por referencia o ID
        const existingRefs = new Set(payments.map(p => `${p.reference}-${p.amount}`));
        const news = externalPayments.filter((p: PaymentRecord) => !existingRefs.has(`${p.reference}-${p.amount}`));
        
        if (news.length > 0) {
          onImportExternal(news);
          alert(`✅ Éxito: Se importaron ${news.length} registros nuevos.`);
        } else {
          alert("ℹ️ La Oficina Virtual no tiene registros nuevos.");
        }
      } else {
        alert("ℹ️ No se encontraron pagos pendientes en la Oficina Virtual.");
      }
    } catch (e) {
      alert("❌ Error de Conexión: Verifique la URL del Script y su conexión a internet.");
    } finally {
      setIsSyncingExternal(false);
    }
  };

  const getMethodInfo = (method: PaymentMethod) => {
    switch (method) {
      case PaymentMethod.ZELLE: return { color: 'bg-purple-100 text-purple-700 border-purple-200', icon: <Smartphone size={14} /> };
      case PaymentMethod.PAGO_MOVIL: return { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: <Smartphone size={14} /> };
      case PaymentMethod.TRANSFERENCIA: return { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Landmark size={14} /> };
      case PaymentMethod.TDC:
      case PaymentMethod.TDD: return { color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: <CreditCard size={14} /> };
      default: return { color: 'bg-slate-100 text-slate-700 border-slate-200', icon: <ReceiptText size={14} /> };
    }
  };

  const getRepresentativeStats = (cedula: string) => {
    const rep = representatives.find(r => r.cedula === cedula);
    if (!rep) return { currentBalance: 0, name: 'Representante no registrado' };

    const totalDue = rep.totalAccruedDebt || 0;
    const totalPaid = payments
      .filter(p => p.cedulaRepresentative === cedula && p.status === PaymentStatus.VERIFICADO)
      .reduce((sum, p) => sum + p.amount, 0);
    
    return {
      currentBalance: Math.max(0, totalDue - totalPaid),
      name: `${rep.firstName} ${rep.lastName}`
    };
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Banner de Sincronización - Diseño según Fotografía */}
      <div className="bg-[#0c1221] p-6 rounded-[1.5rem] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-800/50">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-[#1a233a] rounded-2xl border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-inner">
            <Globe size={28} />
          </div>
          <div>
            <h3 className="text-white font-bold text-xl tracking-tight">Oficina Virtual <span className="text-blue-500">Master</span></h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.1em] mt-0.5">Conexión Activa: ID-17SLRL7F...FGX1EG</p>
          </div>
        </div>
        <button 
          onClick={handleSyncVirtualOffice}
          disabled={isSyncingExternal}
          className={`flex items-center gap-3 px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 ${
            isSyncingExternal 
              ? 'bg-slate-800 text-slate-500' 
              : 'bg-[#2563eb] text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20 active:scale-95'
          }`}
        >
          <RefreshCw size={18} className={isSyncingExternal ? 'animate-spin' : ''} />
          {isSyncingExternal ? 'Sincronizando...' : 'Sincronizar Oficina'}
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-slate-100 text-slate-600 rounded-xl"><Filter size={18} /></div>
          <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Panel de Filtrado</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha Pago</label>
            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-blue-500" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Monto Mínimo</label>
            <input type="number" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} placeholder="0.00" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-blue-500" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Monto Máximo</label>
            <input type="number" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} placeholder="Sin límite" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-blue-500" />
          </div>
        </div>
      </div>

      {/* Tabla de Resultados */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-amber-100 text-amber-600 rounded-2xl"><ShieldAlert size={24} /></div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Auditoría de Transacciones</h3>
              <p className="text-xs font-medium text-slate-500">Compare el comprobante con la base de datos externa</p>
            </div>
          </div>
          <span className="px-4 py-1.5 bg-amber-50 text-amber-700 rounded-xl text-[10px] font-black uppercase tracking-widest border border-amber-200">
            {pending.length} Pendientes
          </span>
        </div>

        {pending.length === 0 ? (
          <div className="p-32 flex flex-col items-center justify-center text-slate-400 text-center">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <ShieldCheck size={40} />
            </div>
            <p className="text-xl font-black text-slate-800">Todo verificado</p>
            <p className="text-xs mt-2 text-slate-500">No hay pagos pendientes de revisión.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                  <th className="px-8 py-5">Registro / Alumno</th>
                  <th className="px-8 py-5">Detalle Operación</th>
                  <th className="px-8 py-5">Impacto en Saldo</th>
                  <th className="px-8 py-5 text-right">Conciliación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pending.map((p) => {
                  const methodInfo = getMethodInfo(p.method);
                  const isExternal = p.observations.includes('OFICINA VIRTUAL');
                  const { currentBalance, name } = getRepresentativeStats(p.cedulaRepresentative);
                  const projectedBalance = Math.max(0, currentBalance - p.amount);
                  
                  return (
                    <tr key={p.id} className="group hover:bg-slate-50 transition-all">
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-800">{p.paymentDate}</span>
                          <span className="text-[11px] font-bold text-slate-500 uppercase">{name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">C.I. {p.cedulaRepresentative}</span>
                          {isExternal && (
                            <span className="inline-flex items-center gap-1.5 text-[8px] font-black uppercase mt-2 px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-100 w-fit">
                              <Globe size={8} /> Oficina Virtual
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-2">
                          <div className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase w-fit ${methodInfo.color}`}>
                            {methodInfo.icon} {p.method}
                          </div>
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-mono w-fit">
                            <Hash size={10} /> {p.reference}
                          </div>
                          <span className="text-lg font-black text-slate-900 tracking-tight">${p.amount.toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 flex flex-col gap-2 w-fit min-w-[140px]">
                           <div>
                             <p className="text-[8px] font-black text-slate-400 uppercase">Actual</p>
                             <p className="text-xs font-black text-slate-600">${currentBalance.toFixed(2)}</p>
                           </div>
                           <div className="h-px bg-slate-200"></div>
                           <div>
                             <p className="text-[8px] font-black text-emerald-500 uppercase">Proyectado</p>
                             <p className="text-xs font-black text-emerald-600">${projectedBalance.toFixed(2)}</p>
                           </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => onVerify(p.id, PaymentStatus.VERIFICADO)}
                            className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 shadow-lg shadow-emerald-100 transition-all"
                            title="Verificar"
                          >
                            <Check size={18} strokeWidth={3} />
                          </button>
                          <button 
                            onClick={() => onVerify(p.id, PaymentStatus.RECHAZADO)}
                            className="p-3 bg-white text-rose-500 border border-rose-100 rounded-xl hover:bg-rose-50 transition-all"
                            title="Rechazar"
                          >
                            <X size={18} strokeWidth={3} />
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
