
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
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error' | 'testing'>('idle');

  const handleChange = (lvl: Level, val: string) => {
    const numVal = parseFloat(val) || 0;
    onUpdateFees({ ...fees, [lvl]: numVal });
  };

  const handleSaveUrl = async () => {
    const cleanUrl = scriptUrl.trim();
    if (!cleanUrl.startsWith('https://script.google.com/macros/s/') || !cleanUrl.endsWith('/exec')) {
      setSaveStatus('error');
      alert('¡ERROR EN URL!\n\nLa URL debe empezar con "https://script.google.com..." y terminar en "/exec".');
      return;
    }

    setSaveStatus('testing');
    sheetService.setScriptUrl(cleanUrl);
    
    setTimeout(() => {
      setSaveStatus('saved');
      if (confirm('✅ ENLACE EXITOSO.\n\nLa aplicación se reiniciará para conectar con Google Sheets.')) {
        window.location.reload();
      }
    }, 1500);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center gap-4 bg-[#0f172a] text-white">
          <div className="p-3 bg-white/10 text-white rounded-2xl">
            {ICONS.Settings}
          </div>
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight">Configuración de Sincronización</h3>
            <p className="text-sm text-slate-400 font-medium">Motor de base de datos en la nube</p>
          </div>
        </div>
        
        <div className="p-10 space-y-8">
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block">URL de Implementación Web (Apps Script)</label>
            <div className="flex flex-col gap-4">
              <input 
                type="text" 
                value={scriptUrl}
                onChange={(e) => setScriptUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className={`w-full p-5 bg-slate-50 border-2 rounded-2xl outline-none focus:ring-4 focus:ring-blue-50 font-mono text-sm transition-all ${
                  saveStatus === 'error' ? 'border-rose-200 bg-rose-50' : 'border-slate-100 focus:border-blue-500'
                }`}
              />
              <button 
                onClick={handleSaveUrl}
                disabled={saveStatus === 'testing'}
                className="w-full p-5 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-lg uppercase tracking-widest text-sm"
              >
                {saveStatus === 'testing' ? 'Verificando...' : 'Vincular con Google Sheets'}
              </button>
            </div>

            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
               <h4 className="font-black text-slate-800 text-xs uppercase mb-3 flex items-center gap-2">
                 {ICONS.Alert} Instrucciones de Conexión:
               </h4>
               <ol className="text-xs text-slate-600 space-y-2 list-decimal ml-4 font-medium">
                 <li>En Google Sheets, vaya a <b>Extensiones &gt; Apps Script</b>.</li>
                 <li>Seleccione la función <b>INICIALIZAR_SISTEMA</b> y ejecútela.</li>
                 <li>Haga clic en <b>Implementar &gt; Nueva implementación</b> (Tipo: Aplicación Web).</li>
                 <li>Copie la URL generada y péguela en el campo superior.</li>
               </ol>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-800 text-white rounded-2xl">
              {ICONS.Payments}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Costos de Mensualidad</h3>
              <p className="text-sm text-slate-500 font-medium">Aranceles vigentes por nivel</p>
            </div>
          </div>
        </div>
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(Object.values(Level) as Level[]).map((lvl) => (
            <div key={lvl} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{lvl}</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-300">$</span>
                <input 
                  type="number" 
                  value={fees[lvl]}
                  onChange={(e) => handleChange(lvl, e.target.value)}
                  className="w-full pl-8 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-black text-slate-800"
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
