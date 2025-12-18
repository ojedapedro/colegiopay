
import React, { useState, useMemo } from 'react';
import { PaymentRecord, Representative, PaymentStatus, PaymentMethod } from '../types';
import { ICONS } from '../constants';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface Props {
  payments: PaymentRecord[];
  representatives: Representative[];
}

const ReportsModule: React.FC<Props> = ({ payments, representatives }) => {
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'daily'>('general');
  
  // Filtros General
  const [filterCedula, setFilterCedula] = useState('');
  const [filterStatus, setFilterStatus] = useState<PaymentStatus | 'ALL'>('ALL');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');

  // Filtros Diario
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().split('T')[0]);

  const dailyPayments = useMemo(() => {
    return payments.filter(p => p.paymentDate === dailyDate && p.status === PaymentStatus.VERIFICADO);
  }, [payments, dailyDate]);

  const dailyTotals = useMemo(() => {
    const totals = {
      usd: 0,
      bs: 0,
      zelle: 0,
      others: 0,
      grandTotal: 0
    };

    dailyPayments.forEach(p => {
      totals.grandTotal += p.amount;
      if (p.method === PaymentMethod.EFECTIVO_USD) totals.usd += p.amount;
      else if (p.method === PaymentMethod.EFECTIVO_BS || p.method === PaymentMethod.PAGO_MOVIL) totals.bs += p.amount;
      else if (p.method === PaymentMethod.ZELLE) totals.zelle += p.amount;
      else totals.others += p.amount;
    });

    return totals;
  }, [dailyPayments]);

  const generateGeneralPDF = () => {
    let filtered = [...payments];
    if (filterCedula) filtered = filtered.filter(p => p.cedulaRepresentative.includes(filterCedula));
    if (filterStatus !== 'ALL') filtered = filtered.filter(p => p.status === filterStatus);
    if (filterDateStart && filterDateEnd) filtered = filtered.filter(p => p.paymentDate >= filterDateStart && p.paymentDate <= filterDateEnd);

    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('ColegioPay - Historial General', 14, 22);
    doc.setFontSize(10);
    doc.text(`Fecha Emisión: ${new Date().toLocaleDateString()}`, 14, 28);
    const tableColumn = ["Fecha", "Representante", "Método", "Monto", "Status"];
    const tableRows = filtered.map(p => [p.paymentDate, p.cedulaRepresentative, p.method, `$${p.amount.toFixed(2)}`, p.status]);
    (doc as any).autoTable({ head: [tableColumn], body: tableRows, startY: 40, theme: 'grid' });
    doc.save(`Reporte_General_${dailyDate}.pdf`);
  };

  const generateDailyPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Cierre de Caja Diario', 14, 22);
    doc.setFontSize(11);
    doc.text(`Fecha de Caja: ${dailyDate}`, 14, 30);
    doc.text(`Generado por Sistema ColegioPay`, 14, 35);

    doc.text('RESUMEN DE INGRESOS:', 14, 45);
    doc.text(`Efectivo USD: $${dailyTotals.usd.toFixed(2)}`, 20, 52);
    doc.text(`Efectivo/Pago Móvil BS: $${dailyTotals.bs.toFixed(2)}`, 20, 58);
    doc.text(`Zelle: $${dailyTotals.zelle.toFixed(2)}`, 20, 64);
    doc.text(`Otros Métodos: $${dailyTotals.others.toFixed(2)}`, 20, 70);
    doc.setFont(undefined, 'bold');
    doc.text(`TOTAL GENERAL DEL DÍA: $${dailyTotals.grandTotal.toFixed(2)}`, 14, 80);

    const tableColumn = ["Hora", "Cédula", "Método", "Ref", "Monto"];
    const tableRows = dailyPayments.map(p => [
      new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      p.cedulaRepresentative,
      p.method,
      p.reference,
      `$${p.amount.toFixed(2)}`
    ]);

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 85,
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] }
    });

    doc.save(`Cierre_Caja_${dailyDate}.pdf`);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Tab Switcher */}
      <div className="flex bg-white p-1 rounded-2xl border border-slate-200 w-fit">
        <button 
          onClick={() => setActiveSubTab('general')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeSubTab === 'general' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          {ICONS.Reports} Historial General
        </button>
        <button 
          onClick={() => setActiveSubTab('daily')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeSubTab === 'daily' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          {ICONS.Payments} Cierre de Caja Diario
        </button>
      </div>

      {activeSubTab === 'general' ? (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Representante</label>
              <input type="text" value={filterCedula} onChange={(e) => setFilterCedula(e.target.value)} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="Cédula" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estado</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none">
                <option value="ALL">Todos</option>
                <option value={PaymentStatus.VERIFICADO}>Verificados</option>
                <option value={PaymentStatus.PENDIENTE}>Pendientes</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Desde</label>
              <input type="date" value={filterDateStart} onChange={(e) => setFilterDateStart(e.target.value)} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hasta</label>
              <input type="date" value={filterDateEnd} onChange={(e) => setFilterDateEnd(e.target.value)} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
            </div>
          </div>
          <button onClick={generateGeneralPDF} className="w-full p-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-100 uppercase tracking-widest text-xs">
            {ICONS.Download} Descargar Reporte Filtrado
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-end gap-6">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Seleccionar Fecha de Auditoría</label>
              <input type="date" value={dailyDate} onChange={(e) => setDailyDate(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <button onClick={generateDailyPDF} className="px-8 py-4 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-500 transition-all flex items-center gap-2 shadow-xl shadow-emerald-100 uppercase tracking-widest text-xs">
              {ICONS.Download} Exportar Cierre de Caja
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <DailyStatCard label="Efectivo $" value={dailyTotals.usd} color="emerald" />
            <DailyStatCard label="Bs / Pago Móvil" value={dailyTotals.bs} color="sky" />
            <DailyStatCard label="Zelle" value={dailyTotals.zelle} color="purple" />
            <DailyStatCard label="Otros" value={dailyTotals.others} color="slate" />
            <div className="p-5 bg-slate-900 rounded-2xl text-white shadow-xl lg:scale-105 transform transition-transform">
              <p className="text-[10px] font-black opacity-60 uppercase tracking-tighter">Total Ingresos</p>
              <p className="text-2xl font-black">${dailyTotals.grandTotal.toFixed(2)}</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest">Desglose de Operaciones</h4>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                {dailyPayments.length} Transacciones Verificadas
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <th className="px-6 py-4">Hora</th>
                    <th className="px-6 py-4">Representante</th>
                    <th className="px-6 py-4">Método</th>
                    <th className="px-6 py-4">Referencia</th>
                    <th className="px-6 py-4 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {dailyPayments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center text-slate-400 font-medium italic">
                        No se encontraron pagos verificados para esta fecha.
                      </td>
                    </tr>
                  ) : (
                    dailyPayments.map(p => (
                      <tr key={p.id} className="text-sm hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-mono text-[11px] text-slate-400">
                          {new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-700">{p.cedulaRepresentative}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 rounded-lg bg-slate-100 text-[10px] font-black text-slate-600 uppercase">
                            {p.method}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-[10px] text-slate-500">{p.reference}</td>
                        <td className="px-6 py-4 text-right font-black text-slate-900">${p.amount.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DailyStatCard = ({ label, value, color }: { label: string, value: number, color: string }) => (
  <div className={`p-5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow`}>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">{label}</p>
    <p className={`text-xl font-black text-${color}-600`}>${value.toFixed(2)}</p>
  </div>
);

export default ReportsModule;
