
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
        // Evitar duplicados por Fingerprint (Referencia + Monto + Cédula)
        const existingFingerprints = new Set(payments.map(p => 
          `${String(p.reference).trim()}-${p.amount}-${String(p.cedulaRepresentative).trim()}`
        ));
        
        const news = externalPayments.filter((p: PaymentRecord) => {
          const finger = `${String(p.reference).trim()}-${p.amount}-${String(p.cedulaRepresentative).trim()}`;
          return !existingFingerprints.has(finger);
        });
        
        if (news.length > 0) {
          onImportExternal(news);
          alert(`✅ OFICINA VIRTUAL: Se cargaron ${news.length} registros nuevos para verificar.`);
        } else {
          alert("ℹ️ No hay registros nuevos en la Oficina Virtual.");
        }
      } else {
        alert("ℹ️ La Oficina Virtual no reporta pagos nuevos en este momento.");
      }
    } catch (e) {
      console.error(e);
      alert("❌ ERROR: No se pudo conectar con la base de datos externa.");
    } finally {
      setIsSyncingExternal(false);
    }
  };

  const getMethodInfo = (method: string) => {
    const m = method.toLowerCase();
    if (m.includes('zelle')) return { color: 'bg-purple-100 text-purple-700 border-purple-200', icon: <Smartphone size={14} /> };
    if (m.includes('pago movil') || m.includes('móvil')) return { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: <Smartphone size={14} /> };
    if (m.includes('transferencia')) return { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Landmark size={14} /> };
    return { color: 'bg-slate-100 text-slate-700 border-slate-200', icon: <ReceiptText size={14} /> };
  };

  const getRepresentativeStats = (cedula: string) => {
    const rep = representatives.find(r => r.cedula === cedula);
    if (!rep) return { currentBalance: 0, name: 'ID No Registrado' };

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
      {/* Banner de Oficina Virtual Master - Diseño fiel a la imagen del usuario */}
      <div className="bg-[#0c1221] p-6 rounded-3xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-800/40">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-[#1a233a] rounded-2xl border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Globe size={28} />
          </div>
          <div className="text-left">
            <h3 className="text-white font-bold text-xl tracking-tight leading-none">
              Oficina Virtual <span className="text-blue-500">Master</span>
            </h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.15em] mt-1.5 opacity-80">
              CONEXIÓN ACTIVA: ID-17SLRL7F...FGX1EG
            </p>
          </div>
        </div>
        
        <button 
          onClick={handleSyncVirtualOffice}
          disabled={isSyncingExternal}
          className={`flex items-center gap-3 px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 ${
            isSyncingExternal 
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
              : 'bg-[#2563eb] text-white hover:bg-blue-600 shadow-lg shadow-blue-700/20 active:scale-95'
          }`}
        >
          <RefreshCw size={18} className={isSyncingExternal ? 'animate-spin' : ''} />
          {isSyncingExternal ? 'SINCRONIZANDO...' : 'SINCRONIZAR OFICINA'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Panel lateral de filtros */}
        <div className="lg:col-span-1 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-md"><Filter size={18} /></div>
            <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Auditoría</h4>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha</label>
              <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-blue-500" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Monto Mínimo</label>
              <input type="number" placeholder="0.00" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-blue-500" />
            </div>
          </div>
        </div>

        {/* Listado de Pagos Unificado */}
        <div className="lg:col-span-3 bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-amber-100 text-amber-600 rounded-2xl"><ShieldAlert size={24} /></div>
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Cola de Verificación</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Conciliación de ambas bases de datos</p>
              </div>
            </div>
            <span className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">
              {pending.length} Pendientes
            </span>
          </div>

          <div className="flex-1 overflow-x-auto">
            {pending.length === 0 ? (
              <div className="p-32 flex flex-col items-center justify-center text-slate-400 text-center">
                <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <ShieldCheck size={40} />
                </div>
                <p className="text-xl font-black text-slate-800">SIN PENDIENTES</p>
                <p className="text-xs mt-2 text-slate-500 font-bold uppercase tracking-widest">Todo ha sido conciliado.</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                    <th className="px-8 py-5">Origen / Datos</th>
                    <th className="px-8 py-5">Transacción</th>
                    <th className="px-8 py-5 text-center">Impacto Saldo</th>
                    <th className="px-8 py-5 text-right">Conciliar</th>
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
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-black text-slate-800">{p.paymentDate}</span>
                            <span className="text-[11px] font-bold text-slate-500 uppercase truncate max-w-[150px]">{name}</span>
                            <span className={`inline-flex items-center gap-1.5 text-[8px] font-black uppercase mt-1 px-2 py-0.5 rounded-md border w-fit ${
                              isExternal ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}>
                              {isExternal ? <Globe size={8} /> : <Hash size={8} />}
                              {isExternal ? 'OFICINA VIRTUAL' : 'SISTEMA INTERNO'}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-7">
                          <div className="flex flex-col gap-2">
                            <div className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase w-fit ${methodInfo.color}`}>
                              {methodInfo.icon} {p.method}
                            </div>
                            <div className="text-[10px] font-mono font-bold text-slate-600">
                              REF: {p.reference}
                            </div>
                            <span className="text-xl font-black text-slate-900 tracking-tighter">${p.amount.toFixed(2)}</span>
                          </div>
                        </td>
                        <td className="px-8 py-7">
                          <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col gap-1.5 w-fit mx-auto shadow-sm">
                             <div className="flex justify-between gap-4 items-center">
                               <p className="text-[8px] font-black text-slate-400 uppercase">Actual</p>
                               <p className="text-xs font-black text-slate-600">${currentBalance.toFixed(2)}</p>
                             </div>
                             <div className="h-px bg-slate-100"></div>
                             <div className="flex justify-between gap-4 items-center">
                               <p className="text-[8px] font-black text-emerald-500 uppercase">Abonando</p>
                               <p className="text-xs font-black text-emerald-600">${projectedBalance.toFixed(2)}</p>
                             </div>
                          </div>
                        </td>
                        <td className="px-8 py-7">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => onVerify(p.id, PaymentStatus.VERIFICADO)}
                              className="p-3.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 shadow-lg shadow-emerald-100/50 transition-all active:scale-90"
                            >
                              <Check size={20} strokeWidth={3} />
                            </button>
                            <button 
                              onClick={() => onVerify(p.id, PaymentStatus.RECHAZADO)}
                              className="p-3.5 bg-white text-rose-500 border border-rose-100 rounded-xl hover:bg-rose-50 transition-all active:scale-90 shadow-sm"
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
          
          <div className="p-6 bg-slate-50 border-t border-slate-100 text-[11px] font-bold text-slate-500">
            * Al verificar, el pago impactará inmediatamente el saldo histórico en el Libro Maestro de Cuentas por Cobrar.
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationList;
