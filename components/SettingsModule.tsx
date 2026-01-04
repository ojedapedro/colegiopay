import React, { useState } from 'react';
import { Level, LevelFees } from '../types';
import { sheetService } from '../services/googleSheets';
import { Link, RefreshCcw, ShieldCheck, AlertCircle, Trash2, Search, CreditCard } from 'lucide-react';

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
    const defaultUrl = 'https://script.google.com/macros/s/AKfycbxNBy31uyMDtIQ0BhfMHISH4SyTA1w9_dtFO7DdfCFgnkniSXKlEPIB8AEFyQo7aoTvFw/exec';
    setScriptUrl(defaultUrl);
    sheetService.setScriptUrl(defaultUrl);
    setSaveStatus('saved');
    alert('URL Oficial restaurada correctamente.');
  };

  const handleClearLocal = () => {
    if (confirm('¿BORRAR TODO EL CACHE LOCAL?\n\nEsto cerrará su sesión y limpiará los datos guardados en este navegador. Los datos en Google Sheets no se verán afectados.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleSaveUrl = async () => {
    const cleanUrl = scriptUrl.trim();
    if (!cleanUrl.includes('/exec')) {
      setSaveStatus('error');
      alert('URL NO VALIDA. Verifique que termine en /exec');
      return;
    }

    setSaveStatus('testing');
    sheetService.setScriptUrl(cleanUrl);
    
    try {
      const data = await sheetService.fetchAll();
      if (data) {
        setSaveStatus('saved');
        alert('CONEXION EXITOSA. Se han sincronizado los datos maestros.');
      } else {
        setSaveStatus('error');
        alert('ERROR: El script respondió pero no devolvió datos. Revise los permisos en Apps Script (Anyone/Cualquiera).');
      }
    } catch (e) {
      setSaveStatus('error');
      alert('FALLO DE RED: No se pudo contactar con Google.');
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-[#0f172a] text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/20 text-blue-400 rounded-2xl border border-blue-500/30">
              <Link size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight">Parámetros de Enlace</h3>
              <p className="text-sm text-slate-400 font-medium">Sincronización en Tiempo Real (PNIQ Engine)</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-xl border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest">
            <ShieldCheck size={14} />
            Cloud: {sheetService.isValidConfig() ? 'Vinculado' : 'Desconectado'}
          </div>
        </div>
        
        <div className="p-10 space-y-8">
          <div className="p-6 bg-amber-50 border border-amber-100 rounded-3xl flex gap-4">
            <div className="text-amber-500 mt-1"><AlertCircle size={24} /></div>
            <div className="space-y-2">
              <h4 className="text-xs font-black text-amber-800 uppercase tracking-tighter">Guía de Publicación</h4>
              <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                Si ve el error de red, verifique la publicación del Apps Script:<br/>
                1. Ir a Implementar - Nueva implementación.<br/>
                2. Tipo: Aplicación Web.<br/>
                3. Ejecutar como: YO.<br/>
                4. Quien tiene acceso: CUALQUIERA (Anyone).
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">URL de Apps Script (Puente ColegioPay)</label>
              <div className="flex gap-4">
                <button 
                  onClick={handleClearLocal}
                  className="text-[9px] font-black text-rose-500 uppercase hover:underline flex items-center gap-1"
                >
                  <Trash2 size={10} /> Limpiar Caché
                </button>
                <button 
                  onClick={handleRestoreDefault}
                  className="text-[9px] font-black text-blue-600 uppercase hover:underline flex items-center gap-1"
                >
                  <RefreshCcw size={10} /> Restaurar Oficial
                </button>
              </div>
            </div>
            
            <div className="flex flex-col gap-5">
              <textarea 
                value={scriptUrl}
                onChange={(e) => setScriptUrl(e.target.value)}
                rows={2}
                placeholder="https://script.google.com/macros/s/.../exec"
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
                  {saveStatus === 'testing' ? 'Vinculando...' : 'Guardar y Sincronizar'}
                </button>
                
                <a 
                  href="https://docs.google.com/spreadsheets/d/12D-vuHFdm9ZEowT0cLR8QWYhzYgp40grsdmVHjfqiw/edit" 
                  target="_blank" 
                  rel="noreferrer"
                  className="p-5 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-3"
                >
                  <Search size={16} />
                  Ver Oficina Virtual
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-900 text-white rounded-2xl">
              <CreditCard size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Escala de Aranceles</h3>
              <p className="text-sm text-slate-500 font-medium">Montos base por nivel educativo</p>
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