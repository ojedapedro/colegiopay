
import React, { useState, useMemo } from 'react';
import { PaymentRecord, PaymentStatus, PaymentMethod } from '../types';
import { ICONS } from '../constants';
import { CreditCard, Smartphone, Landmark, ReceiptText, Check, X, ShieldCheck, ShieldAlert, ExternalLink, Filter, Calendar, DollarSign, RefreshCw, Globe } from 'lucide-react';
import { sheetService } from '../services/googleSheets';

interface Props {
  payments: PaymentRecord[];
  onVerify: (id: string, status: PaymentStatus) => void;
  onImportExternal?: (newPayments: PaymentRecord[]) => void;
}

const VerificationList: React.FC<Props> = ({ payments, onVerify, onImportExternal }) => {
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
      // Filtrar los que ya existen para evitar duplicados por ID de referencia
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
        return { color: 'bg-purple-50 text-purple-700 border-purple-200', icon: <Smartphone size={14} /> };
      case PaymentMethod.PAGO_MOVIL:
        return { color: 'bg-orange-50 text-orange-700 border-orange-200', icon: <Smartphone size={14} /> };
      case PaymentMethod.TRANSFERENCIA:
        return { color: 'bg-blue-50 text-blue-700 border-blue-200', icon: <Landmark size={14} /> };
      case PaymentMethod.TDC:
      case PaymentMethod.TDD:
        return { color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: <CreditCard size={14} /> };
      default:
        return { color: 'bg-slate-50 text-slate-700 border-slate-200', icon: <ReceiptText size={14} /> };
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

  const ReferenceTag: React.FC<{ reference: string }> = ({ reference }) => {
    const isLink = isUrl(reference);
    const classes = "font-mono bg-slate-900 text-white px-2 py-0.5 rounded text-[10px] tracking-wider group-hover:bg-blue-600 transition-colors flex items-center gap-1.5";
    
    if (isLink) {
      return (
        <a 
          href={reference} 
          target="_blank" 
          rel="noopener noreferrer" 
          className={`${classes} hover:bg-blue-500 hover:scale-105 active:scale-95 cursor-pointer shadow-sm`}
        >
          {reference.length > 20 ? reference.substring(0, 17) + '...' : reference}
          <ExternalLink size={10} strokeWidth={3} />
        </a>
      );
    }

    return (
      <span className={classes}>
        {reference}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Cabecera de Sincronización Externa */}
      <div className="bg-[#0f172a] p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-blue-400">
            <Globe size={24} />
          </div>
          <div>
            <h3 className="text-white font-black text-lg tracking-tight">Oficina Virtual <span className="text-blue-500">Conectada</span></h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Base de datos externa: 17slRl7f...FGX1Eg</p>
          </div>
        </div>
        <button 
          onClick={handleSyncVirtualOffice}
          disabled={isSyncingExternal}
          className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isSyncingExternal ? 'bg-slate-800 text-slate-500' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20'}`}
        >
          <RefreshCw size={16} className={isSyncingExternal ? 'animate-spin' : ''} />
          {isSyncingExternal ? 'Sincronizando...' : 'Verificar Oficina Virtual'}
        </button>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
            <Filter size={18} />
          </div>
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Herramientas de Auditoría</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
              <Calendar size={10} /> Fecha
            </label>
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
              <DollarSign size={10} /> Monto Mín
            </label>
            <input 
              type="number" 
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
              <DollarSign size={10} /> Monto Máx
            </label>
            <input 
              type="number" 
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-bold"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Pagos Pendientes</h3>
              <p className="text-sm text-slate-500">Total a verificar: {pending.length}</p>
            </div>
          </div>
        </div>

        {pending.length === 0 ? (
          <div className="p-24 flex flex-col items-center justify-center text-slate-400 text-center">
            <ShieldCheck size={48} className="text-emerald-400 mb-4" />
            <p className="text-xl font-black text-slate-800">Sin pagos por verificar</p>
            <p className="text-sm mt-1">Haga clic en el botón superior para buscar nuevos pagos.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 text-[11px] font-bold uppercase tracking-widest border-b border-slate-100">
                  <th className="px-8 py-5">Registro</th>
                  <th className="px-8 py-5">Representante</th>
                  <th className="px-8 py-5">Detalle</th>
                  <th className="px-8 py-5">Monto</th>
                  <th className="px-8 py-5 text-right">Validación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pending.map((p) => {
                  const methodInfo = getMethodInfo(p.method);
                  return (
                    <tr key={p.id} className="group hover:bg-slate-50/50">
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700">{p.paymentDate}</span>
                          <span className={`text-[9px] font-black uppercase mt-1 px-1.5 py-0.5 rounded w-fit ${p.observations.includes('OFICINA VIRTUAL') ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                            {p.observations.includes('OFICINA VIRTUAL') ? 'EXTERNO' : 'INTERNO'}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-sm font-bold text-slate-800">C.I. {p.cedulaRepresentative}</span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-2">
                          <div className={`flex items-center gap-2 px-2 py-1 rounded-lg border text-[10px] font-black uppercase w-fit ${methodInfo.color}`}>
                            {methodInfo.icon} {p.method}
                          </div>
                          <ReferenceTag reference={p.reference} />
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-lg font-black text-slate-900">${p.amount.toFixed(2)}</span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => onVerify(p.id, PaymentStatus.VERIFICADO)}
                            className="bg-emerald-600 text-white p-2.5 rounded-xl hover:bg-emerald-500 transition-all shadow-md"
                          >
                            <Check size={18} strokeWidth={3} />
                          </button>
                          <button 
                            onClick={() => onVerify(p.id, PaymentStatus.RECHAZADO)}
                            className="bg-rose-50 text-rose-500 p-2.5 rounded-xl hover:bg-rose-100 transition-all"
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
