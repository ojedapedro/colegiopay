
import React, { useState } from 'react';
import { Representative, Level, Student } from '../types';
import { ICONS, COLORS } from '../constants';

interface Props {
  representatives: Representative[];
  onRegister: (rep: Representative) => void;
}

const StudentRegistration: React.FC<Props> = ({ representatives, onRegister }) => {
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
      alert("Por favor complete todos los campos (incluyendo el teléfono) y agregue al menos un alumno.");
      return;
    }

    const currentYear = new Date().getFullYear();
    const nextYearShort = (currentYear + 1).toString().slice(-2);
    const matricula = `mat-${currentYear}-${nextYearShort}-${cedula}`;

    const newRep: Representative = {
      cedula,
      firstName,
      lastName,
      phone,
      matricula,
      students: addedStudents
    };

    onRegister(newRep);
    
    // Reset form
    setCedula('');
    setFirstName('');
    setLastName('');
    setPhone('');
    setAddedStudents([]);
    alert(`Registro Exitoso. Matrícula Generada: ${matricula}`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fadeIn">
      {/* Form Section */}
      <div className="bg-white p-10 rounded-[2rem] border border-slate-200 shadow-sm space-y-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            {ICONS.Registration}
          </div>
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">
            Nueva Matrícula Escolar
          </h3>
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
                  placeholder="Ej. Pérez García"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono de Contacto Móvil</label>
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
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              Añadir Alumnos a Cargo
            </h4>
            <div className="space-y-5">
              <input 
                type="text" 
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                placeholder="Nombre Completo del Alumno"
              />
              <div className="grid grid-cols-2 gap-4">
                <select 
                  value={level} 
                  onChange={(e) => setLevel(e.target.value as Level)}
                  className="p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-slate-600 cursor-pointer"
                >
                  {Object.values(Level).map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                </select>
                <input 
                  type="text" 
                  value={section} 
                  onChange={(e) => setSection(e.target.value)}
                  className="p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                  placeholder="Sección"
                />
              </div>
              <button 
                type="button"
                onClick={handleAddStudentToList}
                className="w-full p-4 bg-white border-2 border-blue-100 text-blue-600 font-black rounded-2xl hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-[10px]"
              >
                + Añadir Alumno al Registro
              </button>
            </div>
          </div>

          <button 
            type="submit"
            className="w-full p-5 bg-[#0f172a] text-white font-black rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-xl uppercase tracking-widest text-sm"
          >
            Generar Registro Institucional
          </button>
        </form>
      </div>

      {/* List Section */}
      <div className="space-y-8">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm h-full flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Resumen de Carga</h3>
            <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase">
              {addedStudents.length} Alumnos
            </span>
          </div>

          <div className="flex-1">
            {addedStudents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center space-y-4">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                  <ICONS.Registration size={32} />
                </div>
                <div>
                  <p className="text-slate-800 font-bold">Sin alumnos registrados</p>
                  <p className="text-xs font-medium text-slate-400">Complete el formulario a la izquierda para añadir estudiantes.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {addedStudents.map((s, idx) => (
                  <div key={idx} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group">
                    <div>
                      <p className="font-black text-slate-800">{s.fullName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded">{s.level}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sección {s.section}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setAddedStudents(prev => prev.filter((_, i) => i !== idx))}
                      className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-xl transition-all"
                    >
                      <XIcon size={20} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {cedula && (
            <div className="mt-10 pt-8 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-3">Previsualización de Matrícula</p>
              <div className="p-5 bg-[#0f172a] text-blue-400 font-mono text-sm rounded-2xl border border-slate-800 flex items-center justify-between shadow-inner">
                <span className="font-bold tracking-wider">mat-2025-26-{cedula}</span>
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const XIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);

export default StudentRegistration;
