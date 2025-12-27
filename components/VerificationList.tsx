
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
      
      if (externalPayments && externalPayments.length > 0 && onImportExternal) {
        // Huella digital simplificada para evitar bloqueos por tipos de datos
        const existingFingers = new Set(payments.map(p => 
          `${String(p.reference).trim().toLowerCase()}-${Number(p.amount)}`
        ));
        
        const news = externalPayments.filter((p: PaymentRecord) => {
          const finger = `${String(p.reference).trim().toLowerCase()}-${Number(p.amount)}`;
          return !existingFingers.has(finger);
        });
        
        if (news.length > 0) {
          onImportExternal(news);
          alert(`✅ OFICINA VIRTUAL: Se cargaron ${news.length} registros nuevos.`);
        } else {
          alert("ℹ️ No hay registros nuevos en la Oficina Virtual (Ya importados).");
        }
      } else {
        alert("ℹ️ No se detectaron pagos en la Oficina Virtual.");
      }
    } catch (e) {
      console.error(e);
      alert("❌ ERROR: Fallo al conectar. Verifique internet y URL de Apps Script.");
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
    doc.setFontSize(10);
    doc.text(`Fecha Emisión: ${new Date().toLocaleString()}`, 14, 28);
    doc.text('COLEGIO SAN FRANCISCO - GESTIÓN ADMINISTRATIVA', 14, 33);

    const tableColumn = ["Fecha", "Representante", "Referencia", "Monto", "Motivo"];
    const tableRows = rejected.map(p => {
      const rep = getRepresentativeInfo(p.cedulaRepresentative);
      return [
        p.paymentDate,
        rep ? `${rep.firstName} ${rep.lastName} (${p.cedulaRepresentative})` : `ID: ${p.cedulaRepresentative}`,
        p.reference,
        `$${p.amount.toFixed(2)}`,
        p.observations || 'Sin especificar'
      ];
    });

    (doc as any).autoTable({ 
      head: [tableColumn], 
      body: tableRows, 
      startY: 40, 
      theme: 'grid',
      headStyles: { fillColor: [225, 29, 72] }
    });

    doc.save(`Pagos_Rechazados_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const getMethodInfo = (method: string) => {
    const m = method.toLowerCase();
    if (m.includes('zelle')) return { color: 'bg-purple-100 text-purple-700 border-purple-200', icon: <Smartphone size={14} /> };
    if (m.includes('pago movil') || m.includes('móvil')) return { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: <Smartphone size={14} /> };
    if (m.includes('transferencia')) return { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Landmark size={14} /> };
    return { color: 'bg-slate-100 text-slate-700 border-slate-200', icon: <ReceiptText size={14} /> };
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Sincronización Superior */}
      <div className="bg-[#0c1221] p-6 rounded-3xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-800/40">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-[#1a233a] rounded-2xl border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Globe size={28} />
          </div>
          <div className="text-left">
            <h3 className="text-white font-bold text-xl tracking-tight">Sincronización Externa</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.15em] mt-1">OFICINA VIRTUAL (17slRl...)</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          {activeTab === 'rejected' && (
            <button 
              onClick={exportRejectedReport}
              className="flex items-center gap-3 px-6 py-3.5 bg-rose-600/10 text-rose-400 border border-rose-500/20 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all"
            >
              <FileDown size={18} />
              Exportar Rechazados
            </button>
          )}
          <button 
            onClick={handleSyncVirtualOffice}
            disabled={isSyncingExternal}
            className={`flex items-center gap-3 px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
              isSyncingExternal 
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20'
            }`}
          >
            <RefreshCcw size={18} className={isSyncingExternal ? 'animate-spin' : ''} />
            {isSyncingExternal ? 'IMPORTANDO...' : 'REVISAR OFICINA VIRTUAL'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filtros */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button 
                onClick={() => setActiveTab('pending')}
                className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'pending' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
              >
                Pendientes
              </button>
              <button 
                onClick={() => setActiveTab('rejected')}
                className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'rejected' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}
              >
                Rechazados
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Buscar (Cédula/Ref)</label>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500" 
                  placeholder="Ej. 1252..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha Pago</label>
                <input 
                  type="date" 
                  value={filterDate} 
                  onChange={(e) => setFilterDate(e.target.value)} 
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tabla Principal */}
        <div className="lg:col-span-3 bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-2xl ${activeTab === 'pending' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'}`}>
                {activeTab === 'pending' ? <ShieldAlert size={24} /> : <X size={24} />}
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">
                  {activeTab === 'pending' ? 'Conciliación de Pagos' : 'Historial de Rechazos'}
                </h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Registros cargados desde la Oficina Virtual
                </p>
              </div>
            </div>
            <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${activeTab === 'pending' ? 'bg-slate-900 text-white' : 'bg-rose-500 text-white'}`}>
              {list.length} Registros
            </span>
          </div>

          <div className="flex-1 overflow-x-auto">
            {list.length === 0 ? (
              <div className="p-24 flex flex-col items-center justify-center text-slate-400 text-center">
                <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center mb-4">
                  <ShieldCheck size={40} />
                </div>
                <p className="text-lg font-black text-slate-800 uppercase">Sin resultados</p>
                <p className="text-xs mt-1 text-slate-400 font-bold uppercase">No hay pagos {activeTab === 'pending' ? 'pendientes' : 'rechazados'}.</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                    <th className="px-8 py-5">Representante</th>
                    <th className="px-8 py-5">Instrumento</th>
                    <th className="px-8 py-5 text-center">Monto</th>
                    <th className="px-8 py-5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {list.map((p) => {
                    const methodInfo = getMethodInfo(p.method);
                    const rep = getRepresentativeInfo(p.cedulaRepresentative);
                    
                    return (
                      <tr key={p.id} className="group hover:bg-slate-50/60 transition-all">
                        <td className="px-8 py-6">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-black text-slate-800">
                              {rep ? `${rep.firstName} ${rep.lastName}` : 'ID NO VINCULADO'}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">C.I: {p.cedulaRepresentative}</span>
                            {rep && <span className="text-[9px] font-black text-blue-600 uppercase tracking-tighter">{rep.matricula}</span>}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col gap-1.5">
                            <div className={`flex items-center gap-2 px-2 py-1 rounded-lg border text-[9px] font-black uppercase w-fit ${methodInfo.color}`}>
                              {methodInfo.icon} {p.method}
                            </div>
                            <div className="text-[10px] font-mono font-bold text-slate-600 tracking-tighter">REF: {p.reference}</div>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span className="text-lg font-black text-slate-900 tracking-tighter">${p.amount.toFixed(2)}</span>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">{p.paymentDate}</p>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center justify-end gap-2">
                            {activeTab === 'pending' ? (
                              <>
                                <button 
                                  onClick={() => onVerify(p.id, PaymentStatus.VERIFICADO)}
                                  className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 shadow-lg shadow-emerald-100 transition-all active:scale-90"
                                  title="Aprobar Pago"
                                >
                                  <Check size={18} strokeWidth={3} />
                                </button>
                                <button 
                                  onClick={() => {
                                    const reason = prompt("Indique motivo del rechazo:");
                                    if (reason) {
                                      onVerify(p.id, PaymentStatus.RECHAZADO);
                                    }
                                  }}
                                  className="p-3 bg-white text-rose-500 border border-rose-100 rounded-xl hover:bg-rose-50 transition-all active:scale-90"
                                  title="Rechazar Pago"
                                >
                                  <X size={18} strokeWidth={3} />
                                </button>
                              </>
                            ) : (
                              <button 
                                onClick={() => onVerify(p.id, PaymentStatus.PENDIENTE)}
                                className="px-4 py-2 bg-slate-900 text-white text-[9px] font-black rounded-lg uppercase tracking-widest"
                              >
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
