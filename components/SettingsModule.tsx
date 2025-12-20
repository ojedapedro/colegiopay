
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
      alert('¡URL INVÁLIDA!\n\nDebes copiar la URL de "Implementación Web".\nEjemplo: https://script.google.com/macros/s/ABC...XYZ/exec');
      return;
    }

    setSaveStatus('testing');
    sheetService.setScriptUrl(cleanUrl);
    
    // Pequeña pausa para feedback visual
    setTimeout(() => {
      setSaveStatus('saved');
      if (confirm('✅ Conexión configurada correctamente.\n\nLa aplicación se reiniciará para establecer el enlace con Google Sheets.')) {
        window.location.reload();
      }
    }, 1500);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <div className="bg-white rounded-3xl border-2 border-blue-100 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-blue-50 flex items-center gap-3 bg-blue-600 text-white">
          <div className="p-2 bg-white/20 rounded-xl">
            {ICONS.Settings}
          </div>
          <div>
            <h3 className="text-lg font-black uppercase tracking-tight">Enlace con Google Cloud</h3>
            <p className="text-xs text-blue-100 font-medium">Sincronización en tiempo real con Google Sheets</p>
          </div>
        </div>
        
        <div className="p-8 space-y-8">
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                URL DE IMPLEMENTACIÓN WEB (TERMINA EN /EXEC)
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="text" 
                  value={scriptUrl}
                  onChange={(e) => setScriptUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className={`flex-1 p-4 bg-slate-50 border-2 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 font-mono text-xs transition-all ${
                    saveStatus === 'error' ? 'border-rose-200 bg-rose-50' : 'border-slate-100'
                  }`}
                />
                <button 
                  onClick={handleSaveUrl}
                  disabled={saveStatus === 'testing'}
                  className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 ${
                    saveStatus === 'saved' 
                      ? 'bg-emerald-500 text-white' 
                      : saveStatus === 'testing'
                      ? 'bg-slate-400 text-white cursor-wait'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {saveStatus === 'testing' && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  {saveStatus === 'saved' ? '¡Vinculado!' : saveStatus === 'testing' ? 'Probando...' : 'Vincular Sistema'}
                </button>
              </div>
            </div>

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3 items-start">
              <div className="text-amber-500 mt-1">{ICONS.Alert}</div>
              <div className="text-[11px] text-amber-800 leading-relaxed">
                <p className="font-black uppercase mb-1">Nota Importante sobre el Script:</p>
                Si el sistema sigue sin registrar, abre tu Apps Script y haz clic en el botón <strong>"Ejecutar"</strong> sobre la función <code>doGet</code> una vez. Esto forzará a Google a pedirte los permisos de acceso a tu cuenta que el sistema necesita para escribir.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StepCard 
                step="1" 
                title="Google Sheets" 
                desc="Asegúrate que la hoja de cálculo con ID 12D... sea de tu propiedad." 
              />
              <StepCard 
                step="2" 
                title="Implementación" 
                desc='Haz clic en "Nueva Implementación" y selecciona "Aplicación Web".' 
              />
              <StepCard 
                step="3" 
                title="Acceso" 
                desc='Configura "Quién tiene acceso" como: "Cualquier persona".' 
              />
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
              <h3 className="text-lg font-bold text-slate-800">Parámetros de Costos</h3>
              <p className="text-sm text-slate-500 font-medium">Configuración de aranceles mensuales</p>
            </div>
          </div>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(Object.values(Level) as Level[]).map((lvl) => (
            <div key={lvl} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 hover:border-blue-200 transition-colors">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                {lvl}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-300">$</span>
                <input 
                  type="number" 
                  value={fees[lvl]}
                  onChange={(e) => handleChange(lvl, e.target.value)}
                  className="w-full pl-8 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-black text-slate-800 transition-all shadow-sm"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const StepCard = ({ step, title, desc }: { step: string, title: string, desc: string }) => (
  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl relative overflow-hidden group hover:bg-blue-50 transition-colors">
    <span className="absolute -right-2 -bottom-4 text-6xl font-black text-slate-200 group-hover:text-blue-100 transition-colors">{step}</span>
    <p className="text-[10px] font-black text-blue-600 uppercase mb-1">{title}</p>
    <p className="text-[11px] text-slate-600 leading-tight font-medium relative z-10">{desc}</p>
  </div>
);

export default SettingsModule;
