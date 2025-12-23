
import React, { useState } from 'react';
import { Representative, Level, Student, LevelFees, DEFAULT_LEVEL_FEES } from '../types';
import { ICONS } from '../constants';

interface Props {
  representatives: Representative[];
  onRegister: (rep: Representative) => void;
  fees?: LevelFees; // Recibir fees opcionalmente para cargo inicial
}

const StudentRegistration: React.FC<Props> = ({ representatives, onRegister, fees = DEFAULT_LEVEL_FEES }) => {
  const [cedula, setCedula] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  
  const [studentName, setStudentName] = useState('');
  const [level, setLevel] = useState<Level>(Level.PRIMARIA);
  const [section, setSection] = useState('A');
  
  const [addedStudents, setAddedStudents] = useState<Student[]>([]);

  const handleAddStudentToList = () => {
    if (!studentName || !level || !section) return;
    const newStudent: Student = {
      id: Math.random().toString(36).substr(2, 9),
      fullName: studentName,
      level,
      section
    };
    setAddedStudents([...addedStudents, newStudent]);
    setStudentName('');
  };

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cedula || !firstName || !lastName || !phone || addedStudents.length === 0) {
      alert("Por favor complete todos los campos y agregue al menos un alumno.");
      return;
    }

    const currentYear = new Date().getFullYear();
    const nextYearShort = (currentYear + 1).toString().slice(-2);
    const matricula = `mat-${currentYear}-${nextYearShort}-${cedula}`;

    // Cargo inicial del mes en curso
    const initialDebt = addedStudents.reduce((sum, s) => sum + (fees[s.level] || 0), 0);
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

    const newRep: Representative = {
      cedula,
      firstName,
      lastName,
      phone,
      matricula,
      students: addedStudents,
      totalAccruedDebt: initialDebt,
      lastAccrualMonth: currentMonthKey
    };

    onRegister(newRep);
    
    setCedula('');
    setFirstName('');
    setLastName('');
    setPhone('');
    setAddedStudents([]);
    alert(`Registro Exitoso. Matrícula: ${matricula}. Cargo inicial de $${initialDebt.toFixed(2)} aplicado.`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fadeIn">
      <div className="bg-white p-10 rounded-[2rem] border border-slate-200 shadow-sm space-y-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            {ICONS.Registration}
          </div>
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Nueva Matrícula</h3>
        </div>
        
        <form onSubmit={handleFinalSubmit} className="space-y-8">
          <div className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cédula del Representante</label>
              <input 
                type="text" 
                value={cedula} 
                onChange={(e) => setCedula(e.target.value)}
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-bold"
                placeholder="Ej. 12345678"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombres</label>
                <input 
                  type="text" 
                  value={firstName} 
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-bold"
                  placeholder="Ej. Juan Carlos"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Apellidos</label>
                <input 
                  type="text" 
                  value={lastName} 
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-bold"
                  placeholder="Ej. Pérez"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono de Contacto</label>
              <input 
                type="text" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-bold"
                placeholder="Ej. 0412-1234567"
                required
              />
            </div>
          </div>

          <div className="p-8 bg-slate-50 rounded-3xl space-y-6 border border-slate-200">
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Carga Familiar</h4>
            <div className="space-y-5">
              <input 
                type="text" 
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                placeholder="Nombre del Alumno"
              />
              <div className="grid grid-cols-2 gap-4">
                <select 
                  value={level} 
                  onChange={(e) => setLevel(e.target.value as Level)}
                  className="p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-600"
                >
                  {Object.values(Level).map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                </select>
                <input 
                  type="text" 
                  value={section} 
                  onChange={(e) => setSection(e.target.value)}
                  className="p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  placeholder="Sección"
                />
              </div>
              <button 
                type="button"
                onClick={handleAddStudentToList}
                className="w-full p-4 bg-white border-2 border-blue-600 text-blue-600 font-black rounded-2xl hover:bg-blue-600 hover:text-white transition-all uppercase tracking-widest text-[10px]"
              >
                + Añadir Estudiante
              </button>
            </div>
          </div>

          <button 
            type="submit"
            className="w-full p-5 bg-[#0f172a] text-white font-black rounded-2xl hover:bg-slate-800 transition-all shadow-xl uppercase tracking-widest text-sm"
          >
            Completar Registro
          </button>
        </form>
      </div>

      <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm h-full flex flex-col">
        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter mb-8">Alumnos en Proceso ({addedStudents.length})</h3>
        <div className="flex-1 space-y-4">
          {addedStudents.map((s, idx) => (
            <div key={idx} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
              <div>
                <p className="font-black text-slate-800">{s.fullName}</p>
                <p className="text-[10px] font-black text-blue-600 uppercase mt-1">{s.level} - Sec. {s.section}</p>
              </div>
              <button 
                onClick={() => setAddedStudents(prev => prev.filter((_, i) => i !== idx))}
                className="text-rose-400 hover:text-rose-600 p-2"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentRegistration;
