
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
      alert("Error: Por favor configure la URL de Apps Script en Parámetros.");
      return;
    }

    setIsSyncingExternal(true);
    try {
      const externalPayments = await sheetService.fetchVirtualOfficePayments();
      
      if (externalPayments && externalPayments.length > 0 && onImportExternal) {
        // Lógica de No-Duplicación: Referencia + Monto + Cédula
        const existingFingerprints = new Set(payments.map(p => 
          `${String(p.reference).trim()}-${p.amount}-${String(p.cedulaRepresentative).trim()}`
        ));
        
        const news = externalPayments.filter((p: PaymentRecord) => {
          const finger = `${String(p.reference).trim()}-${p.amount}-${String(p.cedulaRepresentative).trim()}`;
          return !existingFingerprints.has(finger);
        });
        
        if (news.length > 0) {
          onImportExternal(news);
          alert(`✅ OFICINA VIRTUAL: Se cargaron ${news.length} nuevos pagos registrados por padres.`);
        } else {
          alert("ℹ️ La Oficina Virtual no tiene registros nuevos o todos ya están en Verificación.");
        }
      } else {
        alert("ℹ️ No se detectaron pagos nuevos en la Oficina Virtual (Hoja 'consolidado').");
      }
    } catch (e) {
      console.error(e);
      alert("❌ ERROR: No se pudo conectar con la Oficina Virtual. Verifique los permisos del Script.");
    } finally {
      setIsSyncingExternal(false);
    }
  };

  const getMethodInfo = (method: string) => {
    const m = method.toLowerCase();
    if (m.includes('zelle')) return { color: 'bg-purple-100 text-purple-700 border-purple-200', icon: <Smartphone size={14} /> };
    if (m.includes('pago movil') || m.includes('móvil')) return { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: <Smartphone size={14} /> };
    if (m.includes('transferencia')) return { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Landmark size={14} /> };
    if (m.includes('efectivo')) return { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <ReceiptText size={14} /> };
    return { color: 'bg-slate-100 text-slate-700 border-slate-200', icon: <ReceiptText size={14} /> };
  };

  const getRepresentativeStats = (cedula: string) => {
    const rep = representatives.find(r => r.cedula === cedula);
    if (!rep) return { currentBalance: 0, name: 'Representante No Registrado' };

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
      {/* Banner Master - Estilo según fotografía del usuario */}
      <div className="bg-[#0c1221] p-7 rounded-[2rem] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-800/60">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-[#1a233a] rounded-2xl border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-inner">
            <Globe size={32} />
          </div>
          <div>
            <h3 className="text-white font-black text-2xl tracking-tighter">Oficina Virtual <span className="text-blue-500 font-bold">Master</span></h3>
            <div className="flex items-center gap-3 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Conexión Activa: ID-17SLRL7F...FGX1EG</p>
            </div>
          </div>
        </div>
        <button 
          onClick={handleSyncVirtualOffice}
          disabled={isSyncingExternal}
          className={`group flex items-center gap-3 px-12 py-4.5 rounded-[1.2rem] font-black text-xs uppercase tracking-widest transition-all duration-500 ${
            isSyncingExternal 
              ? 'bg-slate-800 text-slate-500' 
              : 'bg-[#2563eb] text-white hover:bg-blue-500 shadow-[0_10px_40px_-10px_rgba(37,99,235,0.5)] active:scale-95'
          }`}
        >
          <RefreshCw size={18} className={isSyncingExternal ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'} />
          {isSyncingExternal ? 'PROCESANDO...' : 'SINCRONIZAR OFICINA'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Panel lateral de filtros */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-8">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-md"><Filter size={18} /></div>
              <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Panel de Auditoría</h4>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Filtrar Fecha</label>
                <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-blue-500 transition-all" />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Monto Mínimo ($)</label>
                <input type="number" placeholder="0.00" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-blue-500" />
              </div>

              {(filterDate || minAmount || maxAmount) && (
                <button 
                  onClick={() => {setFilterDate(''); setMinAmount(''); setMaxAmount('');}}
                  className="w-full py-4 text-[10px] font-black text-rose-500 uppercase tracking-widest hover:bg-rose-50 rounded-2xl transition-colors border border-dashed border-rose-100"
                >
                  Limpiar Filtros
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Listado de Pagos */}
        <div className="lg:col-span-3 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
            <div className="flex items-center gap-5">
              <div className="p-4 bg-amber-100 text-amber-600 rounded-2xl shadow-inner"><ShieldAlert size={28} /></div>
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Verificación Cruzada</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Conciliando Base ColegioPay + Oficina Virtual</p>
              </div>
            </div>
            <span className="px-5 py-2 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl">
              {pending.length} OPERACIONES EN COLA
            </span>
          </div>

          <div className="flex-1 overflow-x-auto">
            {pending.length === 0 ? (
              <div className="p-40 flex flex-col items-center justify-center text-slate-300 text-center space-y-6">
                <div className="w-24 h-24 bg-emerald-50 text-emerald-400 rounded-full flex items-center justify-center shadow-inner">
                  <ShieldCheck size={48} />
                </div>
                <div>
                  <p className="text-xl font-black text-slate-800 uppercase tracking-tighter">Buzón Conciliado</p>
                  <p className="text-xs mt-2 text-slate-400 font-bold uppercase tracking-widest">No hay transacciones por verificar.</p>
                </div>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                    <th className="px-8 py-6">Procedencia / Datos Representante</th>
                    <th className="px-8 py-6">Detalles Transacción</th>
                    <th className="px-8 py-6 text-center">Impacto Saldo</th>
                    <th className="px-8 py-6 text-right">Validación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pending.map((p) => {
                    const methodInfo = getMethodInfo(p.method);
                    const isExternal = p.observations.includes('OFICINA VIRTUAL');
                    const { currentBalance, name } = getRepresentativeStats(p.cedulaRepresentative);
                    const projectedBalance = Math.max(0, currentBalance - p.amount);
                    
                    return (
                      <tr key={p.id} className="group hover:bg-slate-50/60 transition-all">
                        <td className="px-8 py-7">
                          <div className="flex flex-col gap-1.5">
                            <span className="text-sm font-black text-slate-800">{p.paymentDate}</span>
                            <span className="text-[11px] font-bold text-slate-500 uppercase truncate max-w-[200px]">{name}</span>
                            <span className="text-[10px] text-slate-400 font-mono tracking-wider">C.I. {p.cedulaRepresentative}</span>
                            <span className={`inline-flex items-center gap-1.5 text-[8px] font-black uppercase mt-1 px-2.5 py-1 rounded-lg border w-fit ${
                              isExternal ? 'bg-blue-600 text-white border-blue-500 shadow-md' : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                              {isExternal ? <Globe size={10} /> : <Hash size={10} />}
                              {isExternal ? 'OFICINA VIRTUAL' : 'SISTEMA CAJA'}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-7">
                          <div className="flex flex-col gap-2.5">
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase w-fit shadow-sm ${methodInfo.color}`}>
                              {methodInfo.icon} {p.method}
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0f172a] text-blue-400 rounded-xl text-[10px] font-mono w-fit border border-slate-800 shadow-xl">
                              REF: {p.reference}
                            </div>
                            <span className="text-2xl font-black text-slate-900 tracking-tighter">${p.amount.toFixed(2)}</span>
                          </div>
                        </td>
                        <td className="px-8 py-7">
                          <div className="p-4 bg-white rounded-2xl border border-slate-200 flex flex-col gap-3 w-fit mx-auto shadow-sm">
                             <div className="flex justify-between gap-6 items-center">
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Saldo Hoy</p>
                               <p className="text-xs font-black text-slate-700">${currentBalance.toFixed(2)}</p>
                             </div>
                             <div className="h-px bg-slate-100"></div>
                             <div className="flex justify-between gap-6 items-center">
                               <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Restante</p>
                               <p className="text-xs font-black text-emerald-600">${projectedBalance.toFixed(2)}</p>
                             </div>
                          </div>
                        </td>
                        <td className="px-8 py-7">
                          <div className="flex items-center justify-end gap-3">
                            <button 
                              onClick={() => onVerify(p.id, PaymentStatus.VERIFICADO)}
                              className="p-4 bg-emerald-600 text-white rounded-[1.2rem] hover:bg-emerald-500 shadow-lg shadow-emerald-100/50 transition-all active:scale-90"
                              title="Aprobar Pago"
                            >
                              <Check size={22} strokeWidth={3} />
                            </button>
                            <button 
                              onClick={() => onVerify(p.id, PaymentStatus.RECHAZADO)}
                              className="p-4 bg-white text-rose-500 border border-rose-100 rounded-[1.2rem] hover:bg-rose-50 transition-all active:scale-90 shadow-sm"
                              title="Rechazar Pago"
                            >
                              <X size={22} strokeWidth={3} />
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
          
          <div className="p-6 bg-[#f8fafc] border-t border-slate-100 flex items-center gap-5">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <RefreshCw size={16} />
            </div>
            <p className="text-[11px] font-bold text-slate-500 leading-relaxed max-w-2xl">
              Al confirmar la verificación, el sistema ColegioPay emitirá el recibo oficial y descontará automáticamente el monto del <span className="text-slate-900 font-black">Libro Maestro de Cuentas por Cobrar</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationList;
