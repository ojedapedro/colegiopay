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
  Filter, 
  RefreshCcw, 
  Globe,
  FileDown
} from 'lucide-react';
import { sheetService } from '../services/googleSheets';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

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
  const [filterDate, setFilterDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const list = useMemo(() => {
    let filtered = payments.filter(p => 
      activeTab === 'pending' ? p.status === PaymentStatus.PENDIENTE : p.status === PaymentStatus.RECHAZADO
    );
    if (filterDate) filtered = filtered.filter(p => p.paymentDate === filterDate);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.cedulaRepresentative.includes(q) || 
        p.reference.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [payments, activeTab, filterDate, searchQuery]);

  const handleSyncVirtualOffice = async () => {
    if (!sheetService.isValidConfig()) {
      alert("Error: Por favor configure la URL de Apps Script en Parámetros.");
      return;
    }

    setIsSyncingExternal(true);
    try {
      const externalPayments = await sheetService.fetchVirtualOfficePayments();
      console.log("Registros detectados en pestaña Oficina Virtual:", externalPayments.length);
      
      if (externalPayments && externalPayments.length > 0 && onImportExternal) {
        // Huella digital para evitar duplicados: ID de la hoja o Referencia + Monto
        const existingKeys = new Set(payments.map(p => 
          p.id.startsWith('OV-') ? p.id : `${String(p.reference).trim().toLowerCase()}_${parseFloat(String(p.amount)).toFixed(2)}`
        ));
        
        const news = externalPayments.filter((p: PaymentRecord) => {
          const keyByRef = `${String(p.reference).trim().toLowerCase()}_${parseFloat(String(p.amount)).toFixed(2)}`;
          const isNew = !existingKeys.has(p.id) && !existingKeys.has(keyByRef);
          return isNew;
        });
        
        if (news.length > 0) {
          onImportExternal(news);
          alert(`✅ OFICINA VIRTUAL: Se cargaron ${news.length} registros nuevos.`);
        } else {
          alert("ℹ️ Oficina Virtual revisada: Todos los registros ya están en el sistema.");
        }
      } else {
        alert("ℹ️ La Oficina Virtual está vacía en este momento.");
      }
    } catch (e) {
      console.error("Error sincronizando Oficina Virtual:", e);
      alert("❌ ERROR DE RED: No se pudo conectar con la base de datos.");
    } finally {
      setIsSyncingExternal(false);
    }
  };

  const getRepresentativeInfo = (cedula: string) => {
    const cleanSearch = String(cedula).replace(/[VEve\-\.\s]/g, '').trim();
    const rep = representatives.find(r => 
      String(r.cedula).replace(/[VEve\-\.\s]/g, '').trim() === cleanSearch
    );
    return rep || null;
  };

  const exportRejectedReport = () => {
    const rejected = payments.filter(p => p.status === PaymentStatus.RECHAZADO);
    if (rejected.length === 0) return alert("No hay pagos rechazados para reportar.");
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('REPORTE DE PAGOS RECHAZADOS', 14, 22);
    const tableColumn = ["Fecha", "Representante", "Referencia", "Monto", "Motivo"];
    const tableRows = rejected.map(p => {
      const rep = getRepresentativeInfo(p.cedulaRepresentative);
      return [p.paymentDate, rep ? `${rep.firstName} ${rep.lastName}` : p.cedulaRepresentative, p.reference, `$${p.amount.toFixed(2)}`, p.observations];
    });
    (doc as any).autoTable({ head: [tableColumn], body: tableRows, startY: 40, theme: 'grid' });
    doc.save(`Pagos_Rechazados.pdf`);
  };

  const getMethodInfo = (method: string) => {
    const m = String(method).toLowerCase();
    if (m.includes('zelle')) return { color: 'bg-purple-100 text-purple-700 border-purple-200', icon: <Smartphone size={14} /> };
    if (m.includes('pago movil') || m.includes('móvil')) return { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: <Smartphone size={14} /> };
    if (m.includes('transferencia')) return { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Landmark size={14} /> };
    return { color: 'bg-slate-100 text-slate-700 border-slate-200', icon: <ReceiptText size={14} /> };
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <div className="bg-[#0c1221] p-8 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-800/50">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-blue-500/10 rounded-2xl border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Globe size={32} />
          </div>
          <div>
            <h3 className="text-white font-black text-2xl tracking-tighter">Sincronización Cloud</h3>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">PESTAÑA: OFICINAVIRTUAL</p>
          </div>
        </div>
        <button 
          onClick={handleSyncVirtualOffice}
          disabled={isSyncingExternal}
          className={`flex items-center gap-3 px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.15em] transition-all active:scale-95 ${
            isSyncingExternal 
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-500/20'
          }`}
        >
          <RefreshCcw size={18} className={isSyncingExternal ? 'animate-spin' : ''} />
          {isSyncingExternal ? 'ESCANEANDO TABLA...' : 'IMPORTAR DE OFICINA VIRTUAL'}
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
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Filtro Rápido</label>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-blue-500" 
                  placeholder="Cédula o Referencia..."
                />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-2xl ${activeTab === 'pending' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'}`}>
                {activeTab === 'pending' ? <ShieldAlert size={24} /> : <X size={24} />}
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tighter uppercase">
                {activeTab === 'pending' ? 'Bandeja de Verificación' : 'Pagos Desestimados'}
              </h3>
            </div>
            {activeTab === 'rejected' && (
              <button onClick={exportRejectedReport} className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors">
                <FileDown size={20} />
              </button>
            )}
          </div>

          <div className="overflow-x-auto min-h-[400px]">
            {list.length === 0 ? (
              <div className="p-24 flex flex-col items-center justify-center text-slate-400 text-center">
                <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center mb-6">
                  <ShieldCheck size={40} />
                </div>
                <p className="text-lg font-black text-slate-800 uppercase tracking-tighter">Todo al día</p>
                <p className="text-xs mt-1 text-slate-400 font-bold uppercase tracking-widest">No hay registros para gestionar aquí.</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                    <th className="px-8 py-6">Representante</th>
                    <th className="px-8 py-6">Instrumento / Ref</th>
                    <th className="px-8 py-6 text-center">Monto</th>
                    <th className="px-8 py-6 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {list.map((p) => {
                    const methodInfo = getMethodInfo(p.method);
                    const rep = getRepresentativeInfo(p.cedulaRepresentative);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-all">
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-800 uppercase tracking-tight">
                              {rep ? `${rep.firstName} ${rep.lastName}` : 'ID NO IDENTIFICADO'}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-slate-400 mt-0.5">C.I. {p.cedulaRepresentative}</span>
                            {p.id.startsWith('OV-') && (
                              <span className="text-[8px] bg-blue-50 text-blue-500 px-1 py-0.5 rounded-md w-fit mt-1 font-black">ORIGEN: OFICINA VIRTUAL</span>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col gap-1.5">
                            <div className={`px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase w-fit ${methodInfo.color}`}>
                              {p.method}
                            </div>
                            <div className="text-[10px] font-mono font-bold text-slate-500 tracking-tighter">REF: {p.reference}</div>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span className="text-lg font-black text-slate-900 tracking-tighter">${p.amount.toFixed(2)}</span>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{p.paymentDate}</p>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center justify-end gap-3">
                            {activeTab === 'pending' ? (
                              <>
                                <button 
                                  onClick={() => onVerify(p.id, PaymentStatus.VERIFICADO)}
                                  className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 transition-all active:scale-90"
                                  title="Validar"
                                >
                                  <Check size={18} strokeWidth={3} />
                                </button>
                                <button 
                                  onClick={() => {
                                    const reason = prompt("¿Motivo del rechazo?");
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
                                Re-habilitar
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
