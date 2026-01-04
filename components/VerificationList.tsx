import React, { useState, useMemo } from 'react';
import { PaymentRecord, PaymentStatus, PaymentMethod, Representative, LevelFees } from '../types';
import { 
  Smartphone, 
  Landmark, 
  ReceiptText, 
  Check, 
  X, 
  ShieldCheck, 
  ShieldAlert, 
  RefreshCcw, 
  Globe,
  Building2,
  Zap
} from 'lucide-react';
import { sheetService } from '../services/googleSheets';

interface Props {
  payments: PaymentRecord[];
  representatives: Representative[];
  fees: LevelFees;
  onVerify: (id: string, status: PaymentStatus) => void;
  onImportExternal?: (newPayments: PaymentRecord[]) => void;
}

const VerificationList: React.FC<Props> = ({ payments, representatives, onVerify, onImportExternal }) => {
  const [isSyncingExternal, setIsSyncingExternal] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  const list = useMemo(() => {
    let filtered = payments.filter(p => 
      activeTab === 'pending' ? p.status === PaymentStatus.PENDIENTE : p.status === PaymentStatus.RECHAZADO
    );
    
    // Solo mostrar pagos electrónicos para aprobar (Zelle, Pago Movil, Transferencia, etc)
    const electronicMethods = [
      PaymentMethod.PAGO_MOVIL, 
      PaymentMethod.TRANSFERENCIA, 
      PaymentMethod.ZELLE, 
      PaymentMethod.TDC, 
      PaymentMethod.TDD
    ];
    
    filtered = filtered.filter(p => electronicMethods.includes(p.method));

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.cedulaRepresentative.includes(q) || 
        p.reference.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
      );
    }

    // Ordenar: Priorizar Oficina Virtual y luego por fecha
    return filtered.sort((a, b) => {
      const aIsOV = a.id.startsWith('OV-') ? 1 : 0;
      const bIsOV = b.id.startsWith('OV-') ? 1 : 0;
      if (aIsOV !== bIsOV) return bIsOV - aIsOV;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [payments, activeTab, searchQuery]);

  const handleSyncVirtualOffice = async () => {
    if (!sheetService.isValidConfig()) {
      alert("Error: Por favor configure la URL de Apps Script en Parámetros.");
      return;
    }

    setIsSyncingExternal(true);
    try {
      const externalPayments = await sheetService.fetchVirtualOfficePayments();
      
      if (externalPayments && externalPayments.length > 0 && onImportExternal) {
        const existingIds = new Set(payments.map(p => p.id));
        const news = externalPayments.filter((p: PaymentRecord) => 
          !existingIds.has(p.id) && p.status === PaymentStatus.PENDIENTE
        );
        
        if (news.length > 0) {
          onImportExternal(news);
          alert(`✅ OFICINA VIRTUAL: ${news.length} nuevos pagos importados.`);
        } else {
          alert("ℹ️ No hay nuevos pagos electrónicos pendientes en la Oficina Virtual.");
        }
      } else {
        alert("ℹ️ No se detectaron pagos pendientes externos.");
      }
    } catch (e) {
      console.error("Error al sincronizar:", e);
      alert("❌ Error de Conexión con el servidor de Google.");
    } finally {
      setIsSyncingExternal(false);
    }
  };

  const getRepresentativeInfo = (cedula: string) => {
    const cleanSearch = String(cedula).replace(/[VEve\-\.\s]/g, '').trim();
    return representatives.find(r => 
      String(r.cedula).replace(/[VEve\-\.\s]/g, '').trim() === cleanSearch
    ) || null;
  };

  const getMethodIcon = (method: string) => {
    const m = String(method).toLowerCase();
    if (m.includes('zelle')) return <Zap size={14} className="text-purple-500" />;
    if (m.includes('movil') || m.includes('móvil')) return <Smartphone size={14} className="text-orange-500" />;
    if (m.includes('transferencia')) return <Landmark size={14} className="text-blue-500" />;
    return <ReceiptText size={14} className="text-slate-500" />;
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      {/* Header con Sincronización */}
      <div className="bg-[#0f172a] p-8 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-16 h-16 bg-blue-500/10 rounded-2xl border border-blue-500/20 flex items-center justify-center text-blue-400">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h3 className="text-white font-black text-2xl tracking-tighter">Bandeja de Conciliación</h3>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
              <Zap size={12} className="text-blue-500" /> Procesando Pagos Electrónicos (PAY & OV)
            </p>
          </div>
        </div>
        <button 
          onClick={handleSyncVirtualOffice}
          disabled={isSyncingExternal}
          className={`flex items-center gap-3 px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.15em] transition-all active:scale-95 shadow-xl ${
            isSyncingExternal 
              ? 'bg-slate-800 text-slate-500' 
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'
          }`}
        >
          <RefreshCcw size={18} className={isSyncingExternal ? 'animate-spin' : ''} />
          {isSyncingExternal ? 'Sincronizando...' : 'Sincronizar Oficina Virtual'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Panel de Filtros */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
            <div className="flex bg-slate-100 p-1.5 rounded-2xl">
              <button 
                onClick={() => setActiveTab('pending')}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'pending' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
              >
                Pendientes
              </button>
              <button 
                onClick={() => setActiveTab('rejected')}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'rejected' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}
              >
                Rechazados
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Buscar por C.I. o Ref.</label>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-blue-500" 
                  placeholder="Ej. 12524553"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de Resultados */}
        <div className="lg:col-span-3 bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto min-h-[500px]">
            {list.length === 0 ? (
              <div className="p-24 flex flex-col items-center justify-center text-slate-400 text-center">
                <div className="w-24 h-24 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center mb-6">
                  <ShieldCheck size={48} />
                </div>
                <p className="text-lg font-black text-slate-800 uppercase tracking-tighter">Sin Pagos por Verificar</p>
                <p className="text-xs mt-1 text-slate-400 font-bold uppercase tracking-widest">No hay transacciones electrónicas en espera.</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                    <th className="px-8 py-6">Origen / ID</th>
                    <th className="px-8 py-6">Representante</th>
                    <th className="px-8 py-6">Transacción</th>
                    <th className="px-8 py-6 text-center">Monto</th>
                    <th className="px-8 py-6 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {list.map((p) => {
                    const rep = getRepresentativeInfo(p.cedulaRepresentative);
                    const isOV = p.id.startsWith('OV-');
                    return (
                      <tr key={p.id} className={`hover:bg-slate-50/80 transition-all ${isOV ? 'bg-indigo-50/5' : ''}`}>
                        <td className="px-8 py-6">
                          <div className="flex flex-col gap-1.5">
                            <span className={`w-fit px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1 ${isOV ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                              {isOV ? <Globe size={10} /> : <Building2 size={10} />}
                              {isOV ? 'Oficina Virtual' : 'Caja Administrativa'}
                            </span>
                            <span className="text-[10px] font-mono font-black text-slate-400">{p.id}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-800 uppercase tracking-tight">
                              {rep ? `${rep.firstName} ${rep.lastName}` : 'N/A'}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-slate-400">C.I. {p.cedulaRepresentative}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase">
                              {getMethodIcon(p.method)} {p.method}
                            </div>
                            <span className="text-[10px] font-mono font-bold text-slate-500 tracking-tighter">REF: {p.reference}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span className="text-lg font-black text-slate-900 tracking-tighter">${p.amount.toFixed(2)}</span>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">{p.paymentDate}</p>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center justify-end gap-3">
                            {activeTab === 'pending' ? (
                              <>
                                <button 
                                  onClick={() => onVerify(p.id, PaymentStatus.VERIFICADO)}
                                  className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 transition-all active:scale-90"
                                  title="Aprobar Pago"
                                >
                                  <Check size={18} strokeWidth={3} />
                                </button>
                                <button 
                                  onClick={() => {
                                    const reason = prompt("Indique el motivo de rechazo:");
                                    if (reason) onVerify(p.id, PaymentStatus.RECHAZADO);
                                  }}
                                  className="p-3 bg-white text-rose-500 border border-rose-100 rounded-xl hover:bg-rose-50 transition-all active:scale-90"
                                  title="Rechazar"
                                >
                                  <X size={18} strokeWidth={3} />
                                </button>
                              </>
                            ) : (
                              <button onClick={() => onVerify(p.id, PaymentStatus.PENDIENTE)} className="px-4 py-2 bg-slate-900 text-white text-[9px] font-black rounded-xl uppercase tracking-widest">
                                Re-activar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationList;