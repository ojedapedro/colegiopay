
import React, { useState } from 'react';
import { Level, LevelFees } from '../types';
import { ICONS } from '../constants';
import { sheetService } from '../services/googleSheets';
import { Link, RefreshCcw, ShieldCheck, AlertTriangle } from 'lucide-react';

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

  const handleRestoreDefault = () => {
    const defaultUrl = 'https://script.google.com/macros/s/AKfycbzs9a_-0PIWvOPWwwzfgQdWBzUZMPwd7AV8NVTOHjsXZPKBEcFKP2X6nezc2O8EZBhA/exec';
    setScriptUrl(defaultUrl);
    sheetService.setScriptUrl(defaultUrl);
    setSaveStatus('saved');
  };

  const handleSaveUrl = async () => {
    const cleanUrl = scriptUrl.trim();
    if (!cleanUrl.startsWith('https://script.google.com/macros/s/') || !cleanUrl.endsWith('/exec')) {
      setSaveStatus('error');
      alert('¡URL INVÁLIDA!\n\nDebe ser una URL de implementación de Google Apps Script finalizada en /exec.');
      return;
    }

    setSaveStatus('testing');
    sheetService.setScriptUrl(cleanUrl);
    
    setTimeout(() => {
      setSaveStatus('saved');
      if (confirm('✅ CONEXIÓN ACTUALIZADA.\n\nEl sistema se reiniciará para validar los cambios.')) {
        window.location.reload();
      }
    }, 1200);
  };

  const isOfficialUrl = scriptUrl.includes('AKfycbzs9a_-0PIWvOPWwwzfgQdWBzUZMPwd7AV8NVTOHjsXZPKBEcFKP2X6nezc2O8EZBhA');

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-[#0f172a] text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/20 text-blue-400 rounded-2xl border border-blue-500/30">
              <Link size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight">Enlace de Datos</h3>
              <p className="text-sm text-slate-400 font-medium">Sincronización con Oficina Virtual</p>
            </div>
          </div>
          {isOfficialUrl && (
            <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-xl border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest">
              <ShieldCheck size={14} />
              URL Oficial Detectada
            </div>
          )}
        </div>
        
        <div className="p-10 space-y-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">URL del Motor de Base de Datos</label>
              <button 
                onClick={handleRestoreDefault}
                className="text-[9px] font-black text-blue-600 uppercase hover:underline flex items-center gap-1"
              >
                <RefreshCcw size={10} /> Restaurar oficial
              </button>
            </div>
            
            <div className="flex flex-col gap-5">
              <textarea 
                value={scriptUrl}
                onChange={(e) => setScriptUrl(e.target.value)}
                rows={2}
                placeholder="Pegue aquí la URL del Apps Script..."
                className={`w-full p-5 bg-slate-50 border-2 rounded-3xl outline-none focus:ring-8 focus:ring-blue-500/5 font-mono text-xs leading-relaxed transition-all ${
                  saveStatus === 'error' ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-slate-100 focus:border-blue-500'
                }`}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={handleSaveUrl}
                  disabled={saveStatus === 'testing'}
                  className="p-5 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 uppercase tracking-widest text-xs flex items-center justify-center gap-3"
                >
                  {saveStatus === 'testing' ? <RefreshCcw className="animate-spin" size={16} /> : null}
                  {saveStatus === 'testing' ? 'Probando Enlace...' : 'Actualizar Conexión'}
                </button>
                
                <a 
                  href="https://docs.google.com/spreadsheets/d/17slRl7f9AKQgCEGF5jDLMGfmOc-unp1gXSRpYFGX1Eg/edit" 
                  target="_blank" 
                  rel="noreferrer"
                  className="p-5 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-3"
                >
                  <ICONS.Search.type {...ICONS.Search.props} size={16} />
                  Abrir Hoja de Cálculo
                </a>
              </div>
            </div>

            <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 flex gap-4">
               <div className="text-amber-500 mt-1"><AlertTriangle size={24} /></div>
               <div>
                 <h4 className="font-black text-amber-800 text-xs uppercase mb-1">Nota Técnica de Integración</h4>
                 <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                   El ID de la Oficina Virtual (17slRl...FGX1Eg) está vinculado de forma permanente al motor de verificación. 
                   Asegúrese de que el Apps Script tenga permisos de edición sobre esa hoja para que la sincronización sea exitosa.
                 </p>
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-900 text-white rounded-2xl">
              <ICONS.Payments.type {...ICONS.Payments.props} size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Tabla de Aranceles</h3>
              <p className="text-sm text-slate-500 font-medium">Precios base para el año escolar actual</p>
            </div>
          </div>
        </div>
        <div className="p-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {(Object.values(Level) as Level[]).map((lvl) => (
            <div key={lvl} className="group p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:border-blue-500/30 hover:bg-white hover:shadow-lg transition-all space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block group-hover:text-blue-500 transition-colors">{lvl}</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-300">$</span>
                <input 
                  type="number" 
                  value={fees[lvl]}
                  onChange={(e) => handleChange(lvl, e.target.value)}
                  className="w-full pl-8 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-black text-slate-800 transition-all"
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
