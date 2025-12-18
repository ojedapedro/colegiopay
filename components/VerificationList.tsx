
import React from 'react';
import { PaymentRecord, PaymentStatus, PaymentMethod } from '../types';
import { ICONS } from '../constants';
import { CreditCard, Smartphone, Landmark, ReceiptText, Check, X, ShieldCheck, ShieldAlert, ExternalLink } from 'lucide-react';

interface Props {
  payments: PaymentRecord[];
  onVerify: (id: string, status: PaymentStatus) => void;
}

const VerificationList: React.FC<Props> = ({ payments, onVerify }) => {
  const pending = payments.filter(p => p.status === PaymentStatus.PENDIENTE);

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
          title="Ver comprobante adjunto"
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
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-fadeIn">
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/30">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl shadow-sm">
            <ShieldAlert size={22} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Pagos por Verificar</h3>
            <p className="text-sm text-slate-500 font-medium">Revisión administrativa de transacciones electrónicas</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse"></span>
          <span className="bg-amber-100 text-amber-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border border-amber-200">
            {pending.length} Pendientes
          </span>
        </div>
      </div>

      {pending.length === 0 ? (
        <div className="p-24 flex flex-col items-center justify-center text-slate-400 text-center space-y-6">
          <div className="w-24 h-24 bg-emerald-50 text-emerald-400 rounded-full flex items-center justify-center border-4 border-white shadow-inner">
            <ShieldCheck size={48} />
          </div>
          <div className="space-y-2">
            <p className="text-2xl font-black text-slate-800 tracking-tight">¡Excelente trabajo!</p>
            <p className="text-slate-500 max-w-sm mx-auto leading-relaxed">
              No hay pagos electrónicos en espera. Todos los depósitos y transferencias han sido procesados.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 text-[11px] font-bold uppercase tracking-[0.15em] border-b border-slate-100">
                <th className="px-8 py-5">Fecha & Registro</th>
                <th className="px-8 py-5">Representante</th>
                <th className="px-8 py-5">Detalle de Pago</th>
                <th className="px-8 py-5">Monto</th>
                <th className="px-8 py-5 text-right">Validación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pending.map((p) => {
                const methodInfo = getMethodInfo(p.method);
                return (
                  <tr key={p.id} className="group relative hover:bg-slate-50/50 transition-all duration-300">
                    <td className="px-8 py-6 relative">
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1/2 bg-blue-500 rounded-r-full opacity-0 group-hover:opacity-100 transition-all"></div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700">{p.paymentDate}</span>
                        <span className="text-[10px] text-slate-400 font-mono mt-1 px-1.5 py-0.5 bg-slate-100 rounded w-fit">{p.id}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-slate-800">C.I. {p.cedulaRepresentative}</span>
                        <span className="text-[10px] text-blue-600 font-mono bg-blue-50/50 px-2 py-0.5 rounded border border-blue-100/50 w-fit group-hover:bg-white transition-colors">
                          {p.matricula}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-2.5">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase w-fit shadow-sm ${methodInfo.color}`}>
                          {methodInfo.icon}
                          {p.method}
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-slate-400 font-medium">REFERENCIA</span>
                          <ReferenceTag reference={p.reference} />
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1">
                        <span className="text-lg font-black text-slate-900 leading-none">${p.amount.toFixed(2)}</span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border w-fit ${p.type === 'TOTAL' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-sky-50 text-sky-600 border-sky-100'}`}>
                          {p.type}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center justify-end gap-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 translate-x-4 sm:group-hover:translate-x-0">
                        <button 
                          onClick={() => onVerify(p.id, PaymentStatus.VERIFICADO)}
                          className="bg-emerald-600 text-white px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider hover:bg-emerald-500 hover:shadow-xl hover:shadow-emerald-200 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center gap-2 border-b-4 border-emerald-800"
                        >
                          <Check size={14} strokeWidth={3} />
                          Aprobar
                        </button>
                        <button 
                          onClick={() => onVerify(p.id, PaymentStatus.RECHAZADO)}
                          className="bg-white text-rose-600 border-2 border-rose-100 px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider hover:bg-rose-50 hover:border-rose-300 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center gap-2"
                        >
                          <X size={14} strokeWidth={3} />
                          Rechazar
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
  );
};

export default VerificationList;
