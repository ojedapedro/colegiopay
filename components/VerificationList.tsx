import React, { useState, useMemo } from 'react';
import { PaymentRecord, PaymentStatus, PaymentMethod, Representative, LevelFees } from '../types';
import { 
  Smartphone, 
  Landmark, 
  ReceiptText, 
  Check, 
  X, 
  ShieldCheck, 
  RefreshCcw, 
  Globe,
  Building2,
  Zap,
  Search
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
    // Filtrar por estado activo
    let filtered = payments.filter(p => 
      activeTab === 'pending' ? p.status === PaymentStatus.PENDIENTE : p.status === PaymentStatus.RECHAZADO
    );
    
    // Lista de métodos que REQUIEREN verificación (Electrónicos)
    const electronicMethods = [
      PaymentMethod.PAGO_MOVIL, 
      PaymentMethod.TRANSFERENCIA, 
      PaymentMethod.ZELLE, 
      PaymentMethod.TDC, 
      PaymentMethod.TDD
    ];
    
    // Filtrar solo los que son electrónicos
    filtered = filtered.filter(p => electronicMethods.includes(p.method));

    // Búsqueda textual
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.cedulaRepresentative.includes(q) || 
        p.reference.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
      );
    }

    // Ordenamiento: Primero los de Oficina Virtual, luego los más recientes
    return filtered.sort((a, b) => {
      const aIsOV = a.id.startsWith('OV-') ? 1 : 0;
      const bIsOV = b.id.startsWith('OV-') ? 1 : 0;
      if (aIsOV !== bIsOV) return bIsOV - aIsOV;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [payments, activeTab, searchQuery]);

  const handleSyncVirtualOffice = async () => {
    if (!sheetService.isValidConfig()) {
      alert("⚠️ Error: Por favor configure la URL del script en 'Parámetros'.");
      return;
    }

    setIsSyncingExternal(true);
    try {
      const externalPayments = await sheetService.fetchVirtualOfficePayments();
      
      if (externalPayments && externalPayments.length > 0 && onImportExternal) {
        // Evitar duplicados comparando IDs existentes
        const existingIds = new Set(payments.map(p => p.id));
        const news = externalPayments.filter((p: PaymentRecord) => !existingIds.has(p.id));
        
        if (news.length > 0) {
          onImportExternal(news);
          alert(`✅ ÉXITO: Se importaron ${news.length} registros nuevos desde la Oficina Virtual.`);
        } else {
          alert("ℹ️ La Oficina Virtual está al día. No hay registros nuevos.");
        }
      } else {
        alert("ℹ️ No se encontraron registros electrónicos externos.");
      }
    } catch (e) {
      alert("❌ Error de comunicación con Google Sheets.");
    } finally {
      setIsSyncingExternal(false);
    }
  };

  const getRepName = (cedula: string) => {
    const r = representatives.find(rep => rep.cedula.replace(/\D/g,'') === cedula.replace(/\D/g,''));
    return r ? `${r.firstName} ${r.lastName}` : "Representante no ubicado";
  };

  const getMethodIcon = (method: PaymentMethod) => {
    switch(method) {
      case PaymentMethod.ZELLE: return <Zap size={14} className="text-purple-500" />;
      case PaymentMethod.PAGO_MOVIL: return <Smartphone size={14} className="text-orange-500" />;
      case PaymentMethod.TRANSFERENCIA: return <Landmark size={14} className="text-blue-500" />;
      default: return <ReceiptText size={14} className="text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <div className="bg-[#0f172a] p-8 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-800">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-blue-500/10 rounded-2xl border border-blue-500/20 flex items-center justify-center text-blue-400">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h3 className="text-white font-black text-2xl tracking-tighter uppercase">Conciliación Bancaria</h3>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
              <RefreshCcw size={12} className={isSyncingExternal ? 'animate-spin' : ''} />
              Sincronizando Pagos Administrativos (PAY) y Virtuales (OV)
            </p>
          </div>
        </div>
        <button 
          onClick={handleSyncVirtualOffice}
          disabled={isSyncingExternal}
          className="flex items-center gap-3 px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50"
        >
          {isSyncingExternal ? <RefreshCcw className="animate-spin" /> : <RefreshCcw />}
          Sincronizar Oficina Virtual
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
            <div className="flex bg-slate-100 p-1.5 rounded-2xl">
              <button 
                onClick={() => setActiveTab('pending')}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'pending' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
              >
                Por Aprobar ({payments.filter(p => p.status === PaymentStatus.PENDIENTE).length})
              </button>
              <button 
                onClick={() => setActiveTab('rejected')}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'rejected' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}
              >
                Rechazados
              </button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cédula o Referencia..."
                className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
          {list.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-20 text-center">
              <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center mb-6">
                <ShieldCheck size={40} />
              </div>
              <p className="text-lg font-black text-slate-800 uppercase tracking-tighter">Bandeja Vacía</p>
              <p className="text-xs text-slate-400 font-bold uppercase mt-2">No hay pagos electrónicos que requieran atención inmediata.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-8 py-6">Origen / Ref</th>
                  <th className="px-8 py-6">Representante</th>
                  <th className="px-8 py-6 text-center">Monto</th>
                  <th className="px-8 py-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((p) => {
                  const isOV = p.id.startsWith('OV-');
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-all">
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-2">
                          <span className={`w-fit px-2.5 py-1 rounded-lg text-[8px] font-black uppercase flex items-center gap-1.5 border ${isOV ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                            {isOV ? <Globe size={10} /> : <Building2 size={10} />}
                            {isOV ? 'Oficina Virtual' : 'Administrativo'}
                          </span>
                          <span className="text-xs font-black text-slate-700">{p.id}</span>
                          <span className="text-[10px] font-mono text-slate-400">Ref: {p.reference}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{getRepName(p.cedulaRepresentative)}</span>
                          <span className="text-[10px] font-mono font-bold text-slate-400 mt-0.5">C.I. {p.cedulaRepresentative}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase">
                            {getMethodIcon(p.method)} {p.method}
                          </div>
                          <span className="text-lg font-black text-slate-900 tracking-tighter">${p.amount.toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center justify-end gap-3">
                          {activeTab === 'pending' ? (
                            <>
                              <button 
                                onClick={() => onVerify(p.id, PaymentStatus.VERIFICADO)}
                                className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 transition-all active:scale-90"
                              >
                                <Check size={18} strokeWidth={3} />
                              </button>
                              <button 
                                onClick={() => onVerify(p.id, PaymentStatus.RECHAZADO)}
                                className="p-3 bg-white text-rose-500 border border-rose-100 rounded-xl hover:bg-rose-50 transition-all active:scale-90"
                              >
                                <X size={18} strokeWidth={3} />
                              </button>
                            </>
                          ) : (
                            <button 
                              onClick={() => onVerify(p.id, PaymentStatus.PENDIENTE)}
                              className="px-4 py-2 bg-slate-900 text-white text-[9px] font-black rounded-lg uppercase tracking-widest"
                            >
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
  );
};

export default VerificationList;