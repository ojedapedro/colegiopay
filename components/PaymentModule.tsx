import React, { useState, useMemo, useRef } from 'react';
import { 
  Representative, 
  PaymentRecord, 
  Level, 
  LevelFees, 
  PaymentMethod, 
  PaymentStatus 
} from '../types';
import { ICONS } from '../constants';
import { CheckCircle2, PlusCircle, UserCircle, Receipt, Printer, X, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

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
  
  // Estado para el modal de recibo
  const [showReceipt, setShowReceipt] = useState<PaymentRecord | null>(null);
  
  const amountInputRef = useRef<HTMLInputElement>(null);

  const filteredRep = useMemo(() => {
    if (!searchCedula) return null;
    return representatives.find(r => r.cedula === searchCedula || r.matricula === searchCedula);
  }, [searchCedula, representatives]);

  const handleSearch = () => {
    if (filteredRep) {
      setSelectedRep(filteredRep);
      const totalAccrued = filteredRep.totalAccruedDebt || 0;
      const verifiedPaid = payments
        .filter(p => p.cedulaRepresentative === filteredRep.cedula && p.status === PaymentStatus.VERIFICADO)
        .reduce((sum, p) => sum + p.amount, 0);
      const pending = Math.max(0, totalAccrued - verifiedPaid);
      
      setType('TOTAL');
      setAmount(pending.toString());
    } else {
      alert("No se encontró ningún representante con esa identificación.");
    }
  };

  const pendingAmount = useMemo(() => {
    if (!selectedRep) return 0;
    const totalAccrued = selectedRep.totalAccruedDebt || 0;
    const verifiedPaid = payments
      .filter(p => p.cedulaRepresentative === selectedRep.cedula && p.status === PaymentStatus.VERIFICADO)
      .reduce((sum, p) => sum + p.amount, 0);
    return Math.max(0, totalAccrued - verifiedPaid);
  }, [selectedRep, payments]);

  const handleTypeChange = (newType: 'ABONO' | 'TOTAL') => {
    setType(newType);
    if (newType === 'TOTAL') {
      setAmount(pendingAmount.toString());
    } else {
      setAmount('');
      setTimeout(() => amountInputRef.current?.focus(), 50);
    }
  };

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
      id: `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
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
    setShowReceipt(newRecord); // Mostrar modal de recibo
    
    // Limpiar formulario
    setAmount('');
    setReference('');
    setObs('');
    setSelectedRep(null);
    setSearchCedula('');
  };

  const downloadReceiptPDF = (pay: PaymentRecord) => {
    const rep = representatives.find(r => r.cedula === pay.cedulaRepresentative);
    const doc = new jsPDF({ format: 'a5' });
    
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 148, 25, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text('COLEGIO SAN FRANCISCO', 10, 15);
    doc.setFontSize(8);
    doc.text('COMPROBANTE DE PAGO', 10, 20);
    
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    doc.text(`ID Recibo: ${pay.id}`, 10, 35);
    doc.text(`Fecha: ${pay.paymentDate}`, 10, 40);
    
    doc.text(`Representante: ${rep?.firstName} ${rep?.lastName}`, 10, 55);
    doc.text(`Cédula: ${pay.cedulaRepresentative}`, 10, 60);
    doc.text(`Matrícula: ${pay.matricula}`, 10, 65);
    
    (doc as any).autoTable({
      startY: 75,
      head: [['Descripción', 'Método', 'Monto']],
      body: [
        [pay.type === 'TOTAL' ? 'Liquidación Mensual' : 'Abono Parcial', pay.method, `$${pay.amount.toFixed(2)}`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text(`SALDO PENDIENTE: $${pay.pendingBalance.toFixed(2)}`, 10, finalY);
    
    doc.setFontSize(8);
    doc.text('Este documento es un comprobante administrativo válido.', 10, 180);
    doc.save(`Recibo_${pay.id}.pdf`);
  };

  return (
    <div className="space-y-6 animate-fadeIn relative">
      {/* Modal de Recibo */}
      {showReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-scaleIn">
            <div className="p-8 bg-blue-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Receipt size={24} />
                <h3 className="text-xl font-black uppercase tracking-tight">Recibo Generado</h3>
              </div>
              <button onClick={() => setShowReceipt(null)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                  <CheckCircle2 size={32} />
                </div>
                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Pago Exitoso</p>
                <h4 className="text-3xl font-black text-slate-900 tracking-tighter">${showReceipt.amount.toFixed(2)}</h4>
              </div>
              
              <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-400 uppercase">Referencia</span>
                  <span className="font-mono font-black text-slate-700">{showReceipt.reference}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-400 uppercase">Método</span>
                  <span className="font-black text-slate-700">{showReceipt.method}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-400 uppercase">Matrícula</span>
                  <span className="font-black text-slate-700">{showReceipt.matricula}</span>
                </div>
                <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Saldo Pendiente</span>
                  <span className="text-lg font-black text-rose-500 tracking-tight">${showReceipt.pendingBalance.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => downloadReceiptPDF(showReceipt)}
                  className="p-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                >
                  <Download size={14} /> Descargar PDF
                </button>
                <button 
                  onClick={() => window.print()}
                  className="p-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
                >
                  <Printer size={14} /> Imprimir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row gap-6 items-end">
          <div className="flex-1 space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Búsqueda por Cédula o Matrícula</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{ICONS.Search}</span>
              <input 
                type="text" 
                value={searchCedula}
                onChange={(e) => setSearchCedula(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                placeholder="Ej. 12345678"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
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
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-125 transition-transform">
                <UserCircle size={100} />
              </div>
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
                <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4">Grupo Familiar Vinculado</h4>
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
              <p className="text-[10px] font-black opacity-80 uppercase tracking-widest">Saldo Deudor Acumulado</p>
              <p className="text-5xl font-black mt-3 tracking-tighter">${pendingAmount.toFixed(2)}</p>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm h-full">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">{ICONS.Payments}</div>
                  Procesar Cobro
                </h3>
              </div>

              <form onSubmit={handleProcessPayment} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Concepto de la Operación</label>
                  <div className="flex gap-4">
                    <button 
                      type="button" 
                      onClick={() => handleTypeChange('TOTAL')}
                      className={`flex-1 p-5 rounded-2xl border-2 font-black transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-wider ${type === 'TOTAL' ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100' : 'bg-white text-slate-400 border-slate-100 hover:border-blue-200 shadow-sm'}`}
                    >
                      <CheckCircle2 size={20} />
                      Liquidación Total
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleTypeChange('ABONO')}
                      className={`flex-1 p-5 rounded-2xl border-2 font-black transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-wider ${type === 'ABONO' ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100' : 'bg-white text-slate-400 border-slate-100 hover:border-blue-200 shadow-sm'}`}
                    >
                      <PlusCircle size={20} />
                      Abono Parcial
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Monto de la Operación ($)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-300">$</span>
                    <input 
                      ref={amountInputRef}
                      type="number" 
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-black text-lg transition-all"
                      placeholder="0.00"
                      required
                    />
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
        <div className="bg-white p-20 rounded-3xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 text-slate-300">
            {ICONS.Search}
          </div>
          <p className="text-xl font-black text-slate-800">Módulo de Cobranza en Espera</p>
        </div>
      )}
    </div>
  );
};

export default PaymentModule;