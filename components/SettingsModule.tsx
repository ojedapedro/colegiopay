
import React from 'react';
import { Level, LevelFees } from '../types';
import { ICONS } from '../constants';

interface Props {
  fees: LevelFees;
  onUpdateFees: (newFees: LevelFees) => void;
}

const SettingsModule: React.FC<Props> = ({ fees, onUpdateFees }) => {
  const handleChange = (lvl: Level, val: string) => {
    const numVal = parseFloat(val) || 0;
    onUpdateFees({ ...fees, [lvl]: numVal });
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-fadeIn">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-800 text-white rounded-2xl">
            {ICONS.Settings}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Costos de Mensualidad</h3>
            <p className="text-sm text-slate-500 font-medium">Configuración global de aranceles educativos</p>
          </div>
        </div>
      </div>

      <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.values(Level).map((lvl) => (
          <div key={lvl} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
              {lvl}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
              <input 
                type="number" 
                value={fees[lvl]}
                onChange={(e) => handleChange(lvl, e.target.value)}
                className="w-full pl-8 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
              />
            </div>
            <p className="text-[10px] text-slate-400 font-medium italic">Precio por alumno/mes</p>
          </div>
        ))}
      </div>

      <div className="px-8 pb-8">
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
          <div className="text-amber-500 mt-1">{ICONS.Alert}</div>
          <div className="text-xs text-amber-700 leading-relaxed font-medium">
            <strong>Nota Importante:</strong> Los cambios en los costos afectarán los cálculos de saldo pendiente de forma inmediata para todos los representantes registrados. Asegúrese de que los montos sean correctos antes de guardar.
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModule;
