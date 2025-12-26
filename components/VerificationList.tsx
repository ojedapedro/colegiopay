
import React, { useState, useMemo } from 'react';
import { PaymentRecord, PaymentStatus, PaymentMethod, Representative, LevelFees } from '../types';
import { 
  CreditCard, 
  Smartphone, 
  Landmark, 
  ReceiptText, 
  Check, 
  X, 
  ShieldCheck, 
  ShieldAlert, 
  Filter, 
  RefreshCw, 
  Globe,
  Hash
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
      alert("Error: No hay una URL de Script configurada.");
      return;
    }

    setIsSyncingExternal(true);
    try {
      const externalPayments = await sheetService.fetchVirtualOfficePayments();
      
      if (externalPayments && externalPayments.length > 0 && onImportExternal) {
        // Conciliación: Solo importamos los que no tengan la misma referencia y monto ya registrados
        const existingRefs = new Set(payments.map(p => `${p.reference}-${p.amount}-${p.cedulaRepresentative}`));
        const news = externalPayments.filter((p: PaymentRecord) => !existingRefs.has(`${p.reference}-${p.amount}-${p.cedulaRepresentative}`));
        
        if (news.length > 0) {
          onImportExternal(news);
          alert(`✅ OFICINA VIRTUAL: Se han cargado ${news.length} transacciones nuevas para verificación.`);
        } else {
          alert("ℹ️ No hay registros nuevos en la Oficina Virtual.");
        }
      } else if (externalPayments && externalPayments.length === 0) {
        alert("ℹ️ La Oficina Virtual no reporta pagos pendientes en este momento.");
      }
    } catch (e) {
      console.error(e);
      alert("❌ ERROR DE SINCRONIZACIÓN: Compruebe la conexión con Google Sheets.");
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
    if (!rep) return { currentBalance: 0, name: 'ID Desconocido / No registrado' };

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
      {/* Banner de Sincronización - Diseño Master solicitado */}
      <div className="bg-[#0c1221] p-6 rounded-[1.5rem] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-800/50">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-[#1a233a] rounded-2xl border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-inner">
            <Globe size={28} />
          </div>
          <div>
            <h3 className="text-white font-bold text-xl tracking-tight">Oficina Virtual <span className="text-blue-500">Master</span></h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.15em] mt-0.5">CONEXIÓN ACTIVA: ID-17SLRL7F...FGX1EG</p>
          </div>
        </div>
        <button 
          onClick={handleSyncVirtualOffice}
          disabled={isSyncingExternal}
          className={`flex items-center gap-3 px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 ${
            isSyncingExternal 
              ? 'bg-slate-800 text-slate-500' 
              : 'bg-[#2563eb] text-white hover:bg-blue-500 shadow-lg shadow-blue-600/30 active:scale-95'
          }`}
        >
          <RefreshCw size={18} className={isSyncingExternal ? 'animate-spin' : ''} />
          {isSyncingExternal ? 'Sincronizando...' : 'SINCRONIZAR OFICINA'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Panel de Filtros */}
        <div className="lg:col-span-1 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 text-slate-600 rounded-xl"><Filter size={18} /></div>
            <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Filtros de Auditoría</h4>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha Operación</label>
              <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-blue-500 transition-colors" />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rango Monto ($)</label>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" placeholder="Min" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500" />
                <input type="number" placeholder="Max" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500" />
              </div>
            </div>

            {(filterDate || minAmount || maxAmount) && (
              <button 
                onClick={() => {setFilterDate(''); setMinAmount(''); setMaxAmount('');}}
                className="w-full py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-500 transition-colors"
              >
                Limpiar Filtros
              </button>
            )}
          </div>
        </div>

        {/* Listado de Pagos a Verificar */}
        <div className="lg:col-span-3 bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-amber-100 text-amber-600 rounded-2xl shadow-sm"><ShieldAlert size={24} /></div>
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Verificación Cruzada</h3>
                <p className="text-xs font-medium text-slate-500">Conciliación de pagos Internos y Oficina Virtual</p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="px-4 py-1.5 bg-amber-50 text-amber-700 rounded-xl text-[10px] font-black uppercase tracking-widest border border-amber-200">
                {pending.length} OPERACIONES PENDIENTES
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto">
            {pending.length === 0 ? (
              <div className="p-32 flex flex-col items-center justify-center text-slate-400 text-center">
                <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <ShieldCheck size={40} />
                </div>
                <p className="text-xl font-black text-slate-800">Bandeja Vacía</p>
                <p className="text-xs mt-2 text-slate-500 font-medium">No hay transacciones pendientes de validación.</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                    <th className="px-8 py-5">Origen / Representante</th>
                    <th className="px-8 py-5">Instrumento y Ref.</th>
                    <th className="px-8 py-5 text-center">Impacto en Cuenta</th>
                    <th className="px-8 py-5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pending.map((p) => {
                    const methodInfo = getMethodInfo(p.method);
                    const isExternal = p.observations.includes('OFICINA VIRTUAL');
                    const { currentBalance, name } = getRepresentativeStats(p.cedulaRepresentative);
                    const projectedBalance = Math.max(0, currentBalance - p.amount);
                    
                    return (
                      <tr key={p.id} className="group hover:bg-slate-50/80 transition-all">
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-800">{p.paymentDate}</span>
                            <span className="text-[11px] font-bold text-slate-500 uppercase truncate max-w-[180px]">{name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">C.I. {p.cedulaRepresentative}</span>
                            <span className={`inline-flex items-center gap-1.5 text-[8px] font-black uppercase mt-2 px-2 py-0.5 rounded-md border w-fit ${
                              isExternal ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-500 border-slate-200'
                            }`}>
                              {isExternal ? <Globe size={8} /> : <Hash size={8} />}
                              {isExternal ? 'Oficina Virtual' : 'Caja Interna'}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col gap-2">
                            <div className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase w-fit ${methodInfo.color}`}>
                              {methodInfo.icon} {p.method}
                            </div>
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-mono w-fit shadow-sm">
                              {p.reference}
                            </div>
                            <span className="text-lg font-black text-slate-900 tracking-tighter">${p.amount.toFixed(2)}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col gap-2 w-fit mx-auto shadow-sm">
                             <div className="flex justify-between gap-4 items-center">
                               <p className="text-[8px] font-black text-slate-400 uppercase">Deuda Hoy</p>
                               <p className="text-xs font-black text-slate-600">${currentBalance.toFixed(2)}</p>
                             </div>
                             <div className="h-px bg-slate-100"></div>
                             <div className="flex justify-between gap-4 items-center">
                               <p className="text-[8px] font-black text-emerald-500 uppercase">Restante</p>
                               <p className="text-xs font-black text-emerald-600">${projectedBalance.toFixed(2)}</p>
                             </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => onVerify(p.id, PaymentStatus.VERIFICADO)}
                              className="p-3.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 shadow-lg shadow-emerald-100/50 transition-all active:scale-90"
                              title="Confirmar Abono"
                            >
                              <Check size={20} strokeWidth={3} />
                            </button>
                            <button 
                              onClick={() => onVerify(p.id, PaymentStatus.RECHAZADO)}
                              className="p-3.5 bg-white text-rose-500 border border-rose-100 rounded-xl hover:bg-rose-50 transition-all active:scale-90"
                              title="Rechazar Operación"
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
            )}
          </div>
          
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center gap-4 text-xs font-medium text-slate-500">
            <RefreshCw size={14} className="text-blue-500" />
            <p>Al confirmar, el monto se deducirá automáticamente de la deuda acumulada del representante en el Libro Maestro.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationList;
