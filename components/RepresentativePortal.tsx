import React, { useState } from 'react';
import { Representative, PaymentRecord, PaymentStatus, PaymentMethod, LevelFees, Level } from '../types.ts';
import { LogOut, CreditCard, History, User, CheckCircle2, Clock, AlertCircle, Plus, Landmark, Smartphone } from 'lucide-react';

interface Props {
  representative: Representative;
  payments: PaymentRecord[];
  fees: LevelFees;
  onRegisterPayment: (p: PaymentRecord) => void;
  onLogout: () => void;
}

const RepresentativePortal: React.FC<Props> = ({ representative, payments, fees, onRegisterPayment, onLogout }) => {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.PAGO_MOVIL);
  const [reference, setReference] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const verifiedPaid = payments
    .filter(p => p.status === PaymentStatus.VERIFICADO)
    .reduce((sum, p) => sum + p.amount, 0);
  
  const pendingInReview = payments
    .filter(p => p.status === PaymentStatus.PENDIENTE)
    .reduce((sum, p) => sum + p.amount, 0);

  const balance = Math.max(0, representative.totalAccruedDebt - verifiedPaid);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !reference) return;

    const newPayment: PaymentRecord = {
      id: `WEB-${Date.now()}`,
      timestamp: new Date().toISOString(),
      paymentDate: date,
      cedulaRepresentative: representative.cedula,
      matricula: representative.matricula,
      level: representative.students[0]?.level || Level.PRIMARIA,
      method,
      reference,
      amount: parseFloat(amount),
      observations: `Registro desde Oficina Virtual.`,
      status: PaymentStatus.PENDIENTE,
      type: parseFloat(amount) >= balance ? 'TOTAL' : 'ABONO',
      pendingBalance: Math.max(0, balance - parseFloat(amount))
    };

    onRegisterPayment(newPayment);
    alert("Pago registrado correctamente. Ahora se encuentra en cola para verificación administrativa.");
    setShowPaymentForm(false);
    setAmount('');
    setReference('');
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-[#0f172a] text-white p-6 sticky top-0 z-10 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-blue-600 shadow-xl">
              {representative.firstName[0]}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Bienvenido,</p>
              <h2 className="text-sm font-black tracking-tight">{representative.firstName} {representative.lastName}</h2>
            </div>
          </div>
          <button onClick={onLogout} className="p-3 bg-white/10 hover:bg-rose-500 transition-all rounded-xl">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Resumen Card */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-blue-900/5 border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 text-blue-600">
            <Landmark size={120} />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Saldo Pendiente al Día</p>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black text-slate-900 tracking-tighter">${balance.toFixed(2)}</span>
            {pendingInReview > 0 && (
              <span className="text-xs font-bold text-blue-600 animate-pulse">
                (-${pendingInReview.toFixed(2)} en revisión)
              </span>
            )}
          </div>
          
          <div className="mt-8 flex flex-wrap gap-2">
            {representative.students.map((s, i) => (
              <span key={i} className="px-3 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-wider rounded-lg border border-blue-100">
                {s.fullName} ({s.level[0]})
              </span>
            ))}
          </div>
        </div>

        {/* Action Button */}
        {!showPaymentForm && (
          <button 
            onClick={() => setShowPaymentForm(true)}
            className="w-full p-6 bg-blue-600 text-white rounded-[2rem] shadow-2xl shadow-blue-500/20 flex items-center justify-center gap-4 font-black uppercase tracking-widest hover:bg-blue-700 active:scale-95 transition-all"
          >
            <Plus size={24} />
            Reportar Nuevo Pago
          </button>
        )}

        {/* Formulario de Pago */}
        {showPaymentForm && (
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-blue-500 shadow-2xl animate-slideDown">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Registro de Pago</h3>
              <button onClick={() => setShowPaymentForm(false)} className="text-slate-400 font-bold">Cancelar</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha de Operación</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-blue-500 font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Monto ($)</label>
                  <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-blue-500 font-black" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Método</label>
                  <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none font-bold">
                    {Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Referencia / Comprobante</label>
                  <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Últimos 6 dígitos" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none font-bold" required />
                </div>
              </div>
              <button type="submit" className="w-full p-5 bg-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-100 uppercase tracking-widest">Enviar para Verificación</button>
            </form>
          </div>
        )}

        {/* Historial Reciente */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <History size={16} className="text-slate-400" />
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mis Movimientos Recientes</h4>
          </div>

          <div className="space-y-3">
            {payments.length === 0 ? (
              <div className="p-10 bg-white rounded-3xl border border-slate-200 text-center text-slate-400 font-medium italic text-sm">
                No has reportado pagos aún.
              </div>
            ) : (
              payments.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(p => (
                <div key={p.id} className="bg-white p-5 rounded-3xl border border-slate-100 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${
                      p.status === PaymentStatus.VERIFICADO ? 'bg-emerald-50 text-emerald-600' :
                      p.status === PaymentStatus.RECHAZADO ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {p.status === PaymentStatus.VERIFICADO ? <CheckCircle2 size={20} /> : 
                       p.status === PaymentStatus.RECHAZADO ? <AlertCircle size={20} /> : <Clock size={20} />}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800">{p.paymentDate}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{p.method} • Ref: {p.reference}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-slate-900">${p.amount.toFixed(2)}</p>
                    <p className={`text-[9px] font-black uppercase ${
                      p.status === PaymentStatus.VERIFICADO ? 'text-emerald-500' :
                      p.status === PaymentStatus.RECHAZADO ? 'text-rose-500' : 'text-amber-500'
                    }`}>{p.status}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="text-center py-10 opacity-30">
        <p className="text-[10px] font-black uppercase tracking-[0.4em]">Colegio San Francisco • ColegioPay</p>
      </footer>
    </div>
  );
};

export default RepresentativePortal;