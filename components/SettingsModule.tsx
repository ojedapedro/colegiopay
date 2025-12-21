
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
      alert('¡ERROR EN URL!\n\nLa URL debe empezar con "https://script.google.com..." y terminar en "/exec".\n\nNo pegues el ID de la hoja aquí.');
      return;
    }

    setSaveStatus('testing');
    sheetService.setScriptUrl(cleanUrl);
    
    setTimeout(() => {
      setSaveStatus('saved');
      if (confirm('✅ ENLACE EXITOSO.\n\nLa aplicación se reiniciará ahora para conectar con tu Google Sheets.')) {
        window.location.reload();
      }
    }, 1500);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <div className="bg-white rounded-3xl border-4 border-blue-500 shadow-2xl overflow-hidden relative">
        <div className="p-8 border-b border-blue-50 flex items-center gap-4 bg-blue-600 text-white">
          <div className="p-3 bg-white text-blue-600 rounded-2xl shadow-lg">
            {ICONS.Settings}
          </div>
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight">Vinculación con Hoja: 13lZSsC...</h3>
            <p className="text-sm text-blue-100 font-medium">Configura el motor de datos en la nube</p>
          </div>
        </div>
        
        <div className="p-10 space-y-8 bg-blue-50/30">
          <div className="space-y-4">
            <div className="flex flex-col gap-3">
              <label className="text-xs font-black text-blue-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">1</span>
                URL DE IMPLEMENTACIÓN WEB (TERMINA EN /EXEC)
              </label>
              
              <div className="flex flex-col gap-4">
                <input 
                  type="text" 
                  value={scriptUrl}
                  onChange={(e) => setScriptUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/AKfycbyu65OIIAHcp7RA1Lhalj5msa-IkZqiWNhOUpmLOXaLX6Kb2iLi4HlL58Rogml8WOcH/exec"
                  className={`w-full p-6 bg-white border-4 rounded-3xl outline-none focus:ring-8 focus:ring-blue-100 font-mono text-sm transition-all shadow-inner ${
                    saveStatus === 'error' ? 'border-rose-400 bg-rose-50' : 'border-blue-200 focus:border-blue-500'
                  }`}
                />
                
                <button 
                  onClick={handleSaveUrl}
                  disabled={saveStatus === 'testing'}
                  className={`w-full p-6 rounded-3xl font-black text-lg uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-4 ${
                    saveStatus === 'saved' 
                      ? 'bg-emerald-500 text-white' 
                      : saveStatus === 'testing'
                      ? 'bg-slate-400 text-white cursor-wait'
                      : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-[1.02] active:scale-95'
                  }`}
                >
                  {saveStatus === 'testing' && <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>}
                  {saveStatus === 'saved' ? '¡SISTEMA VINCULADO!' : saveStatus === 'testing' ? 'VERIFICANDO...' : 'VINCULAR SISTEMA AHORA'}
                </button>
              </div>
            </div>

            <div className="p-6 bg-white rounded-2xl border-2 border-blue-100 shadow-sm">
               <h4 className="font-black text-blue-800 text-xs uppercase mb-3 flex items-center gap-2">
                 {ICONS.Alert} Pasos Críticos:
               </h4>
               <ol className="text-xs text-slate-600 space-y-2 list-decimal ml-4 font-medium">
                 <li>En Google Sheets, ve a <b>Extensiones > Apps Script</b>.</li>
                 <li>Selecciona la función <b>INICIALIZAR_SISTEMA</b> y dale a <b>Ejecutar</b>.</li>
                 <li>Dale a <b>Implementar > Nueva implementación</b> (Tipo: Aplicación Web, Acceso: Cualquier persona).</li>
                 <li>Copia esa URL y pégala arriba.</li>
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
              <p className="text-sm text-slate-500 font-medium">Aranceles por nivel</p>
            </div>
          </div>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(Object.values(Level) as Level[]).map((lvl) => (
            <div key={lvl} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                {lvl}
              </label>
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
