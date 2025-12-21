
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
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          {ICONS.Registration} Registro de Alumnos Nuevos
        </h3>
        
        <form onSubmit={handleFinalSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Cédula Representante</label>
              <input 
                type="text" 
                value={cedula} 
                onChange={(e) => setCedula(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="Ej. 12345678"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Nombres</label>
              <input 
                type="text" 
                value={firstName} 
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="Nombre"
                required
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Apellidos</label>
              <input 
                type="text" 
                value={lastName} 
                onChange={(e) => setLastName(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="Apellido"
                required
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Teléfono de Contacto</label>
              <input 
                type="text" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="Ej. 0412-1234567"
                required
              />
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-2xl space-y-4 border border-blue-100">
            <h4 className="text-sm font-bold text-blue-700">Agregar Alumno a Representante</h4>
            <div className="space-y-4">
              <input 
                type="text" 
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full p-2.5 bg-white border border-blue-200 rounded-lg outline-none"
                placeholder="Nombre Completo del Alumno"
              />
              <div className="grid grid-cols-2 gap-2">
                <select 
                  value={level} 
                  onChange={(e) => setLevel(e.target.value as Level)}
                  className="p-2.5 bg-white border border-blue-200 rounded-lg outline-none"
                >
                  {Object.values(Level).map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                </select>
                <input 
                  type="text" 
                  value={section} 
                  onChange={(e) => setSection(e.target.value)}
                  className="p-2.5 bg-white border border-blue-200 rounded-lg outline-none"
                  placeholder="Sección"
                />
              </div>
              <button 
                type="button"
                onClick={handleAddStudentToList}
                className="w-full p-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                {ICONS.Registration} Añadir Alumno
              </button>
            </div>
          </div>

          <button 
            type="submit"
            className="w-full p-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-lg"
          >
            Finalizar Registro y Generar Matrícula
          </button>
        </form>
      </div>

      {/* List Section */}
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Resumen de Registro</h3>
          <div className="flex-1">
            {addedStudents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center space-y-3">
                <div className="p-4 bg-slate-50 rounded-full">{ICONS.Alert}</div>
                <p>No has agregado alumnos todavía.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {addedStudents.map((s, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-700">{s.fullName}</p>
                      <p className="text-xs text-slate-500">{s.level} - Sección {s.section}</p>
                    </div>
                    <button 
                      onClick={() => setAddedStudents(prev => prev.filter((_, i) => i !== idx))}
                      className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {cedula && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <p className="text-xs text-slate-400 font-bold uppercase mb-1">Previsualización Matrícula</p>
              <div className="p-4 bg-emerald-50 text-emerald-700 font-mono rounded-xl border border-emerald-100 break-all">
                mat-2025-26-{cedula}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentRegistration;