
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Level, 
  Representative, 
  PaymentRecord, 
  DEFAULT_LEVEL_FEES, 
  LevelFees,
  PaymentMethod, 
  PaymentStatus, 
  User,
  UserRole
} from './types';
import { ICONS } from './constants';
import { ChevronDown, ChevronUp, ShieldCheck, LayoutGrid, ClipboardList, Wallet, FileBarChart, Settings, Users, UserPlus, Bell, RefreshCcw } from 'lucide-react';
import { initialRepresentatives, initialPayments, initialUsers } from './services/mockData';
import { sheetService } from './services/googleSheets';

// UI Components con extensiones explícitas para el bundler
import Dashboard from './components/Dashboard.tsx';
import StudentRegistration from './components/StudentRegistration.tsx';
import PaymentModule from './components/PaymentModule.tsx';
import VerificationList from './components/VerificationList.tsx';
import ReportsModule from './components/ReportsModule.tsx';
import Auth from './components/Auth.tsx';
import UserManagement from './components/UserManagement.tsx';
import SettingsModule from './components/SettingsModule.tsx';
import LedgerModule from './components/LedgerModule.tsx';
import RepresentativePortal from './components/RepresentativePortal.tsx';

const INSTITUTION_LOGO = "https://i.ibb.co/FbHJbvVT/images.png";

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'payments' | 'verification' | 'reports' | 'users' | 'settings' | 'ledger'>('dashboard');
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  
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
    setUsers(newUsers);
    setRepresentatives(newReps);
    setPayments(newPays);
    setFees(newFees);
    
    localStorage.setItem('school_users_local', JSON.stringify(newUsers));
    localStorage.setItem('school_reps_local', JSON.stringify(newReps));
    localStorage.setItem('school_pays_local', JSON.stringify(newPays));
    localStorage.setItem('school_fees_local', JSON.stringify(newFees));

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
    const cloudData = await sheetService.fetchAll();
    if (cloudData && !cloudData.error) {
      if (cloudData.users) setUsers(cloudData.users);
      if (cloudData.representatives) setRepresentatives(cloudData.representatives);
      if (cloudData.payments) setPayments(cloudData.payments);
      if (cloudData.fees) setFees(cloudData.fees);
      setCloudStatus('online');
    }
    setIsSyncing(false);
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const savedReps = localStorage.getItem('school_reps_local');
      const savedPays = localStorage.getItem('school_pays_local');
      const savedUsers = localStorage.getItem('school_users_local');
      const savedFees = localStorage.getItem('school_fees_local');

      const localUsers = savedUsers ? JSON.parse(savedUsers) : initialUsers;
      const localReps = savedReps ? JSON.parse(savedReps) : initialRepresentatives;
      const localPays = savedPays ? JSON.parse(savedPays) : initialPayments;
      const localFees = savedFees ? JSON.parse(savedFees) : DEFAULT_LEVEL_FEES;

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
          if (cloudData.users) setUsers(cloudData.users);
          if (cloudData.representatives) setRepresentatives(cloudData.representatives);
          if (cloudData.payments) setPayments(cloudData.payments);
          if (cloudData.fees) setFees(cloudData.fees);
        }
      }
      setIsLoading(false);
    };
    loadData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('school_session');
    setCurrentUser(null);
    setCurrentRep(null);
    setActiveTab('dashboard');
  };

  const handleLogin = (id: string) => {
    const user = users.find(u => u.cedula === id);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('school_session', JSON.stringify({ cedula: user.cedula }));
      return;
    }
    
    const rep = representatives.find(r => r.cedula === id);
    if (rep) {
      setCurrentRep(rep);
      localStorage.setItem('school_session', JSON.stringify({ cedula: rep.cedula }));
    } else {
      alert("Identificación no reconocida en el sistema administrativo.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center text-white">
        <img src={INSTITUTION_LOGO} alt="Logo" className="w-24 h-24 mb-6 animate-pulse" />
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
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
        onLogin={(u) => handleLogin(u.cedula)} 
        onRegister={(u) => updateData([...users, u], representatives, payments, fees)} 
      />
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f1f5f9]">
      <aside className="w-full md:w-72 bg-[#0f172a] text-white flex flex-col shadow-2xl z-20">
        <div className="p-8 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-1.5 shadow-xl">
              <img src={INSTITUTION_LOGO} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tighter uppercase leading-none">Colegio<span className="text-blue-500">Pay</span></h1>
              <span className={`text-[9px] font-black uppercase tracking-widest ${cloudStatus === 'online' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {cloudStatus === 'online' ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutGrid size={20} />} label="Panel de Control" />
          <NavItem active={activeTab === 'payments'} onClick={() => setActiveTab('payments')} icon={<Wallet size={20} />} label="Caja y Cobros" />
          <NavItem active={activeTab === 'ledger'} onClick={() => setActiveTab('ledger')} icon={<ClipboardList size={20} />} label="Cuentas por Cobrar" />
          <NavItem active={activeTab === 'verification'} onClick={() => setActiveTab('verification')} icon={<ShieldCheck size={20} />} label="Verificación" />
          <NavItem active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={<FileBarChart size={20} />} label="Reportes" />

          {currentUser.role === UserRole.ADMIN && (
            <>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4 mb-1 mt-4">Administración</p>
              <div className="space-y-1">
                <button
                  onClick={() => setIsAdminOpen(!isAdminOpen)}
                  className={`flex items-center justify-between w-full p-4 rounded-xl transition-all font-bold text-sm ${isAdminOpen ? 'bg-slate-800 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                >
                  <div className="flex items-center gap-3">
                    <Settings size={20} />
                    <span>Configuración</span>
                  </div>
                  {isAdminOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {isAdminOpen && (
                  <div className="pl-4 space-y-1 mt-1">
                    <NavItem active={activeTab === 'students'} onClick={() => setActiveTab('students')} icon={<UserPlus size={18} />} label="Matrícula" />
                    <NavItem active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<Users size={18} />} label="Personal" />
                    <NavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={18} />} label="Parámetros" />
                  </div>
                )}
              </div>
            </>
          )}
        </nav>

        <div className="p-6 bg-[#020617] border-t border-slate-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white uppercase">
              {currentUser.fullName.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-bold truncate text-slate-200">{currentUser.fullName}</p>
              <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">{currentUser.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-3 w-full p-3 text-slate-500 hover:text-rose-400 hover:bg-rose-900/20 rounded-xl transition-all font-bold text-xs uppercase">
            {ICONS.Exit} <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto max-h-screen p-8">
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight capitalize">
              {activeTab === 'ledger' ? 'Cuentas por Cobrar' : 
               activeTab === 'students' ? 'Registro Escolar' : 
               activeTab === 'dashboard' ? 'Panel Informativo' : 
               activeTab === 'verification' ? 'Verificación de Pagos' : 
               activeTab === 'users' ? 'Control de Personal' :
               activeTab === 'settings' ? 'Ajustes del Sistema' : activeTab}
            </h2>
          </div>
          <div className="flex items-center gap-3">
             {isSyncing && <span className="text-[10px] font-black text-blue-600 animate-pulse tracking-widest">SINCRONIZANDO...</span>}
             <button onClick={fetchCloudData} className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-400 hover:text-blue-600 transition-all">
                <RefreshCcw size={20} />
             </button>
          </div>
        </header>

        <div className="max-w-7xl mx-auto space-y-10">
          {activeTab === 'dashboard' && <Dashboard representatives={representatives} payments={payments} />}
          {activeTab === 'students' && <StudentRegistration onRegister={(r) => updateData(users, [...representatives, r], payments, fees)} representatives={representatives} fees={fees} />}
          {activeTab === 'payments' && <PaymentModule onPay={(p) => updateData(users, representatives, [p, ...payments], fees)} representatives={representatives} payments={payments} fees={fees} />}
          {activeTab === 'ledger' && <LedgerModule representatives={representatives} payments={payments} fees={fees} />}
          {activeTab === 'verification' && <VerificationList payments={payments} representatives={representatives} fees={fees} onVerify={(id, status) => updateData(users, representatives, payments.map(p => p.id === id ? {...p, status} : p), fees)} onImportExternal={(news) => updateData(users, representatives, [...news, ...payments], fees)} />}
          {activeTab === 'reports' && <ReportsModule payments={payments} representatives={representatives} />}
          {activeTab === 'users' && <UserManagement users={users} onUpdateRole={(c, r) => updateData(users.map(u => u.cedula === c ? {...u, role: r} : u), representatives, payments, fees)} onDeleteUser={(c) => updateData(users.filter(u => u.cedula !== c), representatives, payments, fees)} />}
          {activeTab === 'settings' && <SettingsModule fees={fees} onUpdateFees={(f) => updateData(users, representatives, payments, f)} />}
        </div>
      </main>
    </div>
  );
};

const NavItem: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-3 w-full p-4 rounded-xl transition-all font-bold text-sm ${
      active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 translate-x-1' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}
  >
    {icon} <span className="tracking-tight uppercase">{label}</span>
  </button>
);

export default App;
