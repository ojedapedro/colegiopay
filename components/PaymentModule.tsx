
import React, { useState, useMemo } from 'react';
import { 
  Representative, 
  PaymentRecord, 
  Level, 
  LevelFees, 
  PaymentMethod, 
  PaymentStatus 
} from '../types';
import { ICONS } from '../constants';

interface Props {
  representatives: Representative[];
  payments: PaymentRecord[];
  fees: LevelFees;
  onPay: (pay: PaymentRecord) => void;
}

const PaymentModule: React.FC<Props> = ({ representatives, payments, fees, onPay }) => {
  const [searchCedula, setSearchCedula] = useState('');
  const [selectedRep, setSelectedRep] = useState<Representative | null>(null);
  
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.EFECTIVO_USD);
  const [reference, setReference] = useState('');
  const [type, setType] = useState<'ABONO' | 'TOTAL'>('TOTAL');
  const [obs, setObs] = useState('');

  const filteredRep = useMemo(() => {
    if (!searchCedula) return null;
    return representatives.find(r => r.cedula === searchCedula);
  }, [searchCedula, representatives]);

  const handleSearch = () => {
    if (filteredRep) {
      setSelectedRep(filteredRep);
    } else {
      alert("Representante no encontrado.");
    }
  };

  const calculatePending = () => {
    if (!selectedRep) return 0;
    // Calculation: Total student fees - Total already paid verified payments
    const totalDue = selectedRep.students.reduce((sum, s) => sum + fees[s.level], 0);
    const paid = payments
      .filter(p => p.cedulaRepresentative === selectedRep.cedula && p.status === PaymentStatus.VERIFICADO)
      .reduce((sum, p) => sum + p.amount, 0);
    return Math.max(0, totalDue - paid);
  };

  const pendingAmount = calculatePending();

  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRep || !amount) return;

    const isElectronic = ![
      PaymentMethod.EFECTIVO_BS, 
      PaymentMethod.EFECTIVO_USD, 
      PaymentMethod.EFECTIVO_EUR
    ].includes(method);

    const payAmount = parseFloat(amount);
    const newRecord: PaymentRecord = {
      id: `PAY-${Date.now()}`,
      timestamp: new Date().toISOString(),
      paymentDate: new Date().toISOString().split('T')[0],
      cedulaRepresentative: selectedRep.cedula,
      matricula: selectedRep.matricula,
      level: selectedRep.students[0]?.level || Level.PRIMARIA,
      method,
      reference: reference || 'N/A',
      amount: payAmount,
      observations: obs,
      status: isElectronic ? PaymentStatus.PENDIENTE : PaymentStatus.VERIFICADO,
      type,
      pendingBalance: Math.max(0, pendingAmount - payAmount)
    };

    onPay(newRecord);
    alert(`Pago registrado satisfactoriamente. ${isElectronic ? 'Pendiente por verificación.' : 'Verificado automáticamente.'}`);
    
    // Reset
    setAmount('');
    setReference('');
    setObs('');
    setSelectedRep(null);
    setSearchCedula('');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row gap-6 items-end">
          <div className="flex-1 space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cédula del Representante</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{ICONS.Search}</span>
              <input 
                type="text" 
                value={searchCedula}
                onChange={(e) => setSearchCedula(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                placeholder="Ej. 12345678"
              />
            </div>
          </div>
          <button 
            onClick={handleSearch}
            className="px-10 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
          >
            Localizar Ficha
          </button>
        </div>
      </div>

      {selectedRep && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Ficha del Representante</h4>
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Nombre Completo</p>
                  <p className="font-black text-slate-800 text-xl tracking-tight">{selectedRep.firstName} {selectedRep.lastName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Matrícula Escolar</p>
                  <p className="font-mono text-blue-600 font-bold bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 break-all">{selectedRep.matricula}</p>
                </div>
              </div>

              <div className="mt-10">
                <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4">Carga Familiar</h4>
                <div className="space-y-3">
                  {selectedRep.students.map((s, i) => (
                    <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-1">
                      <p className="text-sm font-black text-slate-700">{s.fullName}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-blue-500 uppercase">{s.level}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Sección {s.section}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-emerald-600 p-8 rounded-3xl shadow-2xl shadow-emerald-200 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                {ICONS.Payments}
              </div>
              <p className="text-[10px] font-black opacity-80 uppercase tracking-widest">Saldo Pendiente a la Fecha</p>
              <p className="text-5xl font-black mt-3 tracking-tighter">${pendingAmount.toFixed(2)}</p>
              <div className="mt-6 flex items-center gap-2 text-xs font-medium bg-emerald-700/50 p-2 rounded-xl border border-emerald-500/30">
                <span className="text-emerald-300">{ICONS.Alert}</span>
                Calculado según cuotas vigentes.
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm h-full">
              <h3 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">{ICONS.Payments}</div>
                Procesar Cobro
              </h3>

              <form onSubmit={handleProcessPayment} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Monto de la Operación ($)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-300">$</span>
                    <input 
                      type="number" 
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-black text-lg"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Concepto de Pago</label>
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={() => setType('TOTAL')}
                      className={`flex-1 p-4 rounded-2xl border font-black transition-all ${type === 'TOTAL' ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}
                    >
                      Pago Total
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setType('ABONO')}
                      className={`flex-1 p-4 rounded-2xl border font-black transition-all ${type === 'ABONO' ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}
                    >
                      Abono
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Instrumento Financiero</label>
                  <select 
                    value={method}
                    onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 appearance-none cursor-pointer"
                  >
                    {Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Número de Referencia</label>
                  <input 
                    type="text" 
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                    placeholder="Ref. Bancaria / N/A"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observaciones Administrativas</label>
                  <textarea 
                    value={obs}
                    onChange={(e) => setObs(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 h-28 font-medium"
                    placeholder="Indique detalles adicionales si aplica..."
                  ></textarea>
                </div>

                <div className="md:col-span-2 pt-4">
                  <button 
                    type="submit"
                    className="w-full p-5 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-500 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-emerald-100 text-lg uppercase tracking-wider"
                  >
                    Finalizar y Emitir Comprobante
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {!selectedRep && (
        <div className="bg-white p-20 rounded-3xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 text-center animate-pulse">
          <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 text-slate-300">
            {ICONS.Search}
          </div>
          <p className="text-xl font-black text-slate-800">Módulo de Cobranza Inactivo</p>
          <p className="text-sm max-w-sm mt-3 font-medium text-slate-500">
            Utilice el buscador superior para cargar la información de un representante y habilitar el registro de transacciones.
          </p>
        </div>
      )}
    </div>
  );
};

export default PaymentModule;
