
import React, { useState } from 'react';
import { Level, LevelFees } from '../types';
import { ICONS } from '../constants';
import { sheetService } from '../services/googleSheets';

interface Props {
  fees: LevelFees;
  onUpdateFees: (newFees: LevelFees) => void;
}

const SettingsModule: React.FC<Props> = ({ fees, onUpdateFees }) => {
  const [scriptUrl, setScriptUrl] = useState(sheetService.getScriptUrl());
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

  const handleChange = (lvl: Level, val: string) => {
    const numVal = parseFloat(val) || 0;
    onUpdateFees({ ...fees, [lvl]: numVal });
  };

  const handleSaveUrl = () => {
    if (!scriptUrl.startsWith('https://script.google.com')) {
      alert('Por favor, introduce una URL válida de Google Apps Script (debe empezar con https://script.google.com)');
      return;
    }
    sheetService.setScriptUrl(scriptUrl);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 3000);
    if (confirm('URL de sincronización guardada. ¿Deseas recargar la aplicación para conectar con la nube ahora?')) {
      window.location.reload();
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Configuración de Nube */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-blue-50/30">
          <div className="p-3 bg-blue-600 text-white rounded-2xl">
            {ICONS.Next}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Conexión SistColPay (Google Sheets)</h3>
            <p className="text-sm text-slate-500 font-medium">Sincronización de base de datos en tiempo real</p>
          </div>
        </div>
        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">URL de la Aplicación Web (AppScript)</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input 
                type="text" 
                value={scriptUrl}
                onChange={(e) => setScriptUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycbzrZAlP8kdF3tjmrnZP6yio5zhzgVHCcrbSxgU2qBbhie93LCM9RL8Y9hrlPujI8uk/exec"
                className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs transition-all"
              />
              <button 
                onClick={handleSaveUrl}
                className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg ${
                  saveStatus === 'saved' ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200'
                }`}
              >
                {saveStatus === 'saved' ? '¡Enlace Guardado!' : 'Guardar Enlace'}
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 space-y-2">
              <p className="font-black text-amber-800 text-[10px] uppercase tracking-wider flex items-center gap-2">
                {ICONS.Alert} ¡Importante!
              </p>
              <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                Al implementar el script en Google, asegúrate de seleccionar <strong>"Cualquier persona"</strong> en el campo de "Quién tiene acceso", de lo contrario la app no podrá guardar los datos.
              </p>
            </div>
            <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100 space-y-2">
              <p className="font-black text-blue-800 text-[10px] uppercase tracking-wider flex items-center gap-2">
                {ICONS.Search} ID de la Hoja
              </p>
              <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
                La app está configurada para el archivo: <br/>
                <code className="bg-white px-1 rounded font-bold">12D-vuHFdm9ZEowT0cLR8QWYqhzYgp40grsdmVHjfqiw</code>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Costos de Mensualidad */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-800 text-white rounded-2xl">
              {ICONS.Settings}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Aranceles por Nivel</h3>
              <p className="text-sm text-slate-500 font-medium">Configuración de mensualidades (Maternal a Secundaria)</p>
            </div>
          </div>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(Object.values(Level) as Level[]).map((lvl) => (
            <div key={lvl} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 transition-transform hover:scale-[1.02]">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                {lvl}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-300">$</span>
                <input 
                  type="number" 
                  value={fees[lvl]}
                  onChange={(e) => handleChange(lvl, e.target.value)}
                  className="w-full pl-8 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-black text-slate-800 shadow-sm"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SettingsModule;
