import React, { useState, useEffect, useCallback } from 'react';
import { 
  Level, 
  Representative, 
  PaymentRecord, 
  DEFAULT_LEVEL_FEES, 
  LevelFees,
  PaymentStatus, 
  User,
  UserRole
} from './types';
import { ICONS } from './constants';
import { ShieldCheck, LayoutGrid, ClipboardList, Wallet, FileBarChart, Settings, Users, UserPlus, RefreshCcw } from 'lucide-react';
import { initialRepresentatives, initialPayments, initialUsers } from './services/mockData';
import { sheetService } from './services/googleSheets';

import Dashboard from './components/Dashboard';
import StudentRegistration from './components/StudentRegistration';
import PaymentModule from './components/PaymentModule';
import VerificationList from './components/VerificationList';
import ReportsModule from './components/ReportsModule';
import Auth from './components/Auth';
import UserManagement from './components/UserManagement';
import SettingsModule from './components/SettingsModule';
import LedgerModule from './components/LedgerModule';
import RepresentativePortal from './components/RepresentativePortal';

const INSTITUTION_LOGO = "https://i.ibb.co/FbHJbvVT/images.png";

function NavItem({ active, onClick, icon, label, badge }: { active: boolean, onClick: () => void, icon: any, label: string, badge?: number }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all group ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20 font-black' : 'text-slate-400 hover:bg-slate-800/50 font-bold'}`}>
      <div className="flex items-center gap-4">
        <span className={`${active ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>{icon}</span>
        <span className="text-[10px] uppercase tracking-widest">{label}</span>
      </div>
      {badge !== undefined && badge > 0 ? (
        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${active ? 'bg-white text-blue-600' : 'bg-rose-50 text-white'}`}>
          {badge}
        </span>
      ) : null}
    </button>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'payments' | 'verification' | 'reports' | 'users' | 'settings' | 'ledger'>('dashboard');
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentRep, setCurrentRep] = useState<Representative | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [fees, setFees] = useState<LevelFees>(DEFAULT_LEVEL_FEES);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<'online' | 'offline' | 'pending'>('pending');

  const updateData = useCallback(async (newUsers: User[], newReps: Representative[], newPays: PaymentRecord[], newFees: LevelFees) => {
    setUsers([...newUsers]);
    setRepresentatives([...newReps]);
    setPayments([...newPays]);
    setFees({...newFees});
    
    try {
      localStorage.setItem('school_users_local', JSON.stringify(newUsers));
      localStorage.setItem('school_reps_local', JSON.stringify(newReps));
      localStorage.setItem('school_pays_local', JSON.stringify(newPays));
      localStorage.setItem('school_fees_local', JSON.stringify(newFees));
    } catch (e) {
      console.error("Error local storage", e);
    }

    if (sheetService.isValidConfig()) {
      setIsSyncing(true);
      const success = await sheetService.syncAll({
        users: newUsers,
        representatives: newReps,
        payments: newPays,
        fees: newFees
      });
      setCloudStatus(success ? 'online' : 'offline');
      setIsSyncing(false);
    }
  }, []);

  const fetchCloudData = async () => {
    if (!sheetService.isValidConfig()) return;
    setIsSyncing(true);
    try {
      const cloudData = await sheetService.fetchAll();
      if (cloudData && !cloudData.error) {
        if (cloudData.users) setUsers(cloudData.users);
        if (cloudData.representatives) setRepresentatives(cloudData.representatives);
        if (cloudData.payments) setPayments(cloudData.payments);
        if (cloudData.fees) setFees(cloudData.fees);
        setCloudStatus('online');
      }
    } catch (e) {
      setCloudStatus('offline');
    }
    setIsSyncing(false);
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const savedReps = localStorage.getItem('school_reps_local');
        const savedPays = localStorage.getItem('school_pays_local');
        const savedUsers = localStorage.getItem('school_users_local');
        const savedFees = localStorage.getItem('school_fees_local');

        let localUsers = initialUsers;
        let localReps = initialRepresentatives;
        let localPays = initialPayments;
        let localFees = DEFAULT_LEVEL_FEES;

        if (savedUsers) localUsers = JSON.parse(savedUsers);
        if (savedReps) localReps = JSON.parse(savedReps);
        if (savedPays) localPays = JSON.parse(savedPays);
        if (savedFees) localFees = JSON.parse(savedFees);

        setUsers(localUsers);
        setRepresentatives(localReps);
        setPayments(localPays);
        setFees(localFees);

        const savedSession = localStorage.getItem('school_session');
        if (savedSession) {
          const parsed = JSON.parse(savedSession);
          const foundUser = localUsers.find((u: User) => u.cedula === parsed.cedula);
          if (foundUser) {
            setCurrentUser(foundUser);
          } else {
            const foundRep = localReps.find((r: Representative) => r.cedula === parsed.cedula);
            if (foundRep) setCurrentRep(foundRep);
          }
        }

        if (sheetService.isValidConfig()) {
          const cloudData = await sheetService.fetchAll();
          if (cloudData && !cloudData.error) {
            setCloudStatus('online');
          }
        }
      } catch (err) {
        console.error("Load error", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('school_session');
    setCurrentUser(null);
    setCurrentRep(null);
    setActiveTab('dashboard');
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('school_session', JSON.stringify({ cedula: user.cedula }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center text-white">
        <img src={INSTITUTION_LOGO} alt="Logo" className="w-24 h-24 mb-6 animate-pulse" />
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-black uppercase tracking-widest opacity-50">Sincronizando...</p>
      </div>
    );
  }

  if (currentRep) {
    return (
      <RepresentativePortal 
        representative={currentRep} 
        payments={payments.filter(p => p.cedulaRepresentative === currentRep.cedula)}
        fees={fees}
        onRegisterPayment={(p) => updateData(users, representatives, [p, ...payments], fees)}
        onLogout={handleLogout}
      />
    );
  }

  if (!currentUser) {
    return (
      <Auth 
        users={users} 
        onLogin={handleLogin} 
        onRegister={(u) => updateData([...users, u], representatives, payments, fees)} 
      />
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f8fafc]">
      <aside className="w-full md:w-72 bg-[#0f172a] text-white flex flex-col shadow-2xl z-20">
        <div className="p-8 flex items-center gap-4 border-b border-slate-800">
          <img src={INSTITUTION_LOGO} alt="Logo" className="w-10 h-10 object-contain bg-white rounded-lg p-1" />
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter">Colegio<span className="text-blue-500">Pay</span></h1>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Plataforma V3</p>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
          <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutGrid size={20} />} label="Panel Control" />
          <NavItem active={activeTab === 'students'} onClick={() => setActiveTab('students')} icon={<UserPlus size={20} />} label="Matriculación" />
          <NavItem active={activeTab === 'payments'} onClick={() => setActiveTab('payments')} icon={<Wallet size={20} />} label="Caja y Cobros" />
          <NavItem active={activeTab === 'verification'} onClick={() => setActiveTab('verification')} icon={<ShieldCheck size={20} />} label="Verificación" badge={payments.filter(p => p.status === PaymentStatus.PENDIENTE).length} />
          <NavItem active={activeTab === 'ledger'} onClick={() => setActiveTab('ledger')} icon={<ClipboardList size={20} />} label="Libro Maestro" />
          <NavItem active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={<FileBarChart size={20} />} label="Reportes" />
          
          {(currentUser.role === UserRole.ADMINISTRADOR || currentUser.role === UserRole.SUPERVISOR) && (
            <div className="pt-6 mt-6 border-t border-slate-800 space-y-2">
              <p className="px-4 text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4">Administración</p>
              {currentUser.role === UserRole.ADMINISTRADOR && <NavItem active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<Users size={20} />} label="Personal" />}
              <NavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={20} />} label="Parámetros" />
            </div>
          )}
        </nav>

        <div className="p-6 bg-slate-900/50 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black shadow-lg">
              {currentUser.fullName[0]}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-[11px] font-black truncate text-white uppercase tracking-tight">{currentUser.fullName}</p>
              <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest truncate">{currentUser.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full p-3.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest">
            <RefreshCcw size={14} /> Finalizar Turno
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10 overflow-y-auto max-h-screen">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">
              {activeTab === 'dashboard' && "Analítica Global"}
              {activeTab === 'students' && "Nuevas Inscripciones"}
              {activeTab === 'payments' && "Módulo de Tesorería"}
              {activeTab === 'verification' && "Conciliación Bancaria"}
              {activeTab === 'reports' && "Auditoría Escolar"}
              {activeTab === 'users' && "Control de Acceso"}
              {activeTab === 'settings' && "Variables del Sistema"}
              {activeTab === 'ledger' && "Estados de Cuenta"}
            </h2>
          </div>

          <div className="flex items-center gap-3">
             <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-[10px] font-black uppercase tracking-widest ${cloudStatus === 'online' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                <div className={`w-2 h-2 rounded-full ${cloudStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                {isSyncing ? 'Sync...' : `Nube: ${cloudStatus}`}
             </div>
             <button onClick={fetchCloudData} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-500 transition-all active:scale-95 shadow-sm">
               <RefreshCcw size={18} className={isSyncing ? 'animate-spin' : ''} />
             </button>
          </div>
        </header>

        <div className="animate-fadeIn">
          {activeTab === 'dashboard' && <Dashboard representatives={representatives} payments={payments} />}
          {activeTab === 'students' && <StudentRegistration representatives={representatives} onRegister={(r) => updateData(users, [...representatives, r], payments, fees)} fees={fees} />}
          {activeTab === 'payments' && <PaymentModule representatives={representatives} payments={payments} fees={fees} onPay={(p) => updateData(users, representatives, [p, ...payments], fees)} />}
          {activeTab === 'verification' && <VerificationList payments={payments} representatives={representatives} fees={fees} onVerify={(id, status) => updateData(users, representatives, payments.map(p => p.id === id ? {...p, status} : p), fees)} onImportExternal={(news) => updateData(users, representatives, [...news, ...payments], fees)} />}
          {activeTab === 'reports' && <ReportsModule payments={payments} representatives={representatives} />}
          {activeTab === 'ledger' && <LedgerModule representatives={representatives} payments={payments} fees={fees} />}
          {activeTab === 'users' && <UserManagement users={users} onAddUser={(u) => updateData([...users, u], representatives, payments, fees)} onUpdateRole={(id, role) => updateData(users.map(u => u.cedula === id ? {...u, role} : u), representatives, payments, fees)} onDeleteUser={(id) => updateData(users.filter(u => u.cedula !== id), representatives, payments, fees)} />}
          {activeTab === 'settings' && <SettingsModule fees={fees} onUpdateFees={(f) => updateData(users, representatives, payments, f)} />}
        </div>
      </main>
    </div>
  );
}