
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
import { initialRepresentatives, initialPayments, initialUsers } from './services/mockData';
import { sheetService } from './services/googleSheets';

// UI Components
import Dashboard from './components/Dashboard';
import StudentRegistration from './components/StudentRegistration';
import PaymentModule from './components/PaymentModule';
import VerificationList from './components/VerificationList';
import ReportsModule from './components/ReportsModule';
import Auth from './components/Auth';
import UserManagement from './components/UserManagement';
import SettingsModule from './components/SettingsModule';
import LedgerModule from './components/LedgerModule';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'payments' | 'verification' | 'reports' | 'users' | 'settings' | 'ledger'>('dashboard');
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
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
      
      // 1. Cargar datos locales por defecto
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

      // 2. Intentar cargar sesión
      const savedSession = localStorage.getItem('school_session');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        // Validar si el usuario de la sesión existe en la base de datos actual
        const found = localUsers.find((u: User) => u.cedula === parsed.cedula);
        setCurrentUser(found || parsed);
      }

      // 3. Intentar sincronizar con nube si hay URL
      if (sheetService.isValidConfig()) {
        const cloudData = await sheetService.fetchAll();
        if (cloudData && !cloudData.error) {
          if (cloudData.users) setUsers(cloudData.users);
          if (cloudData.representatives) setRepresentatives(cloudData.representatives);
          if (cloudData.payments) setPayments(cloudData.payments);
          if (cloudData.fees) setFees(cloudData.fees);
          setCloudStatus('online');
        } else {
          setCloudStatus('offline');
        }
      }
      
      setIsLoading(false);
    };

    loadData();
  }, []);

  // Persistir sesión del usuario
  useEffect(() => {
    if (currentUser) localStorage.setItem('school_session', JSON.stringify(currentUser));
  }, [currentUser]);

  const isAdmin = currentUser?.role === UserRole.ADMIN;

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    // Si el usuario es nuevo admin, agregarlo a la lista si no está
    if (user.role === UserRole.ADMIN && !users.find(u => u.cedula === user.cedula)) {
      updateData([...users, user], representatives, payments, fees);
    }
  };
  
  const handleLogout = () => {
    localStorage.removeItem('school_session');
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  const handleRegisterUser = (user: User) => {
    const newUsers = [...users.filter(u => u.cedula !== user.cedula), user];
    updateData(newUsers, representatives, payments, fees);
    setCurrentUser(user);
  };

  const handleUpdateUserRole = (cedula: string, newRole: UserRole) => {
    const newUsers = users.map(u => u.cedula === cedula ? { ...u, role: newRole } : u);
    updateData(newUsers, representatives, payments, fees);
    if (currentUser?.cedula === cedula) {
      setCurrentUser(prev => prev ? { ...prev, role: newRole } : null);
    }
  };

  const handleDeleteUser = (cedula: string) => {
    if (currentUser?.cedula === cedula) return;
    const newUsers = users.filter(u => u.cedula !== cedula);
    updateData(newUsers, representatives, payments, fees);
  };

  const handleAddStudent = (repData: Representative) => {
    let newReps = [...representatives];
    const existingIndex = newReps.findIndex(r => r.cedula === repData.cedula);
    if (existingIndex > -1) {
      newReps[existingIndex] = {
        ...newReps[existingIndex],
        students: [...newReps[existingIndex].students, ...repData.students]
      };
    } else {
      newReps.push(repData);
    }
    updateData(users, newReps, payments, fees);
  };

  const handleRegisterPayment = (payment: PaymentRecord) => {
    const newPays = [payment, ...payments];
    updateData(users, representatives, newPays, fees);
  };

  const handleVerifyPayment = (paymentId: string, status: PaymentStatus) => {
    const newPays = payments.map(p => p.id === paymentId ? { ...p, status } : p);
    updateData(users, representatives, newPays, fees);
  };

  const handleUpdateFees = (newFees: LevelFees) => {
    updateData(users, representatives, payments, newFees);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-8 text-center">
        <div className="w-20 h-20 border-8 border-blue-500 border-t-transparent rounded-full animate-spin mb-8"></div>
        <h2 className="text-3xl font-black mb-2 uppercase tracking-tight">Sincronizando Sistema</h2>
        <p className="text-slate-400 font-medium">Estableciendo conexión segura con Google Cloud...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Auth users={users} onLogin={handleLogin} onRegister={handleRegisterUser} />;
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50">
      <aside className="w-full md:w-72 bg-slate-900 text-white flex flex-col shadow-xl z-20">
        <div className="p-8 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <div className={`p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-900/40`}>
              {ICONS.Registration}
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">ColegioPay</h1>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${cloudStatus === 'online' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {cloudStatus === 'online' ? 'Cloud Sync ON' : 'Offline Mode'}
              </span>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4 mb-2 mt-4">Principal</p>
          <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={ICONS.Dashboard} label="Dashboard" />
          
          {isAdmin && (
            <>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4 mb-2 mt-6">Escolaridad</p>
              <NavItem active={activeTab === 'students'} onClick={() => setActiveTab('students')} icon={ICONS.Registration} label="Registro Alumnos" />
            </>
          )}

          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4 mb-2 mt-6">Finanzas</p>
          <NavItem active={activeTab === 'payments'} onClick={() => setActiveTab('payments')} icon={ICONS.Payments} label="Caja y Cobros" />
          <NavItem active={activeTab === 'ledger'} onClick={() => setActiveTab('ledger')} icon={ICONS.Search} label="Cuentas por Cobrar" />
          <NavItem 
            active={activeTab === 'verification'} 
            onClick={() => setActiveTab('verification')} 
            icon={ICONS.Verify} 
            label="Verificación" 
            badge={payments.filter(p => p.status === PaymentStatus.PENDIENTE).length}
          />
          <NavItem active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={ICONS.Reports} label="Reportes PDF" />

          {isAdmin && (
            <>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4 mb-2 mt-6">Sistema</p>
              <NavItem active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={ICONS.Users} label="Personal" />
              <NavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={ICONS.Settings} label="Configuración" />
            </>
          )}
        </nav>

        {isSyncing && (
          <button onClick={fetchCloudData} className="m-4 p-3 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center gap-3 animate-pulse">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></div>
            <span className="text-[10px] font-black uppercase text-blue-400 tracking-tighter">Sincronizando con Google...</span>
          </button>
        )}

        <div className="p-6 bg-slate-950/50 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-6 px-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center font-bold shadow-lg">
              {currentUser.fullName.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">{currentUser.fullName}</p>
              <p className="text-[10px] text-blue-400 font-bold uppercase">{currentUser.role}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full p-3.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all font-bold text-sm border border-transparent hover:border-rose-500/20"
          >
            {ICONS.Exit}
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto max-h-screen relative p-6 md:p-10">
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight capitalize">
              {activeTab === 'ledger' ? 'Libro Maestro' : 
               activeTab === 'students' ? 'Registro Escolar' :
               activeTab === 'users' ? 'Personal' : activeTab}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`flex h-2 w-2 rounded-full ${cloudStatus === 'online' ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></span>
              <p className="text-sm font-medium text-slate-500">
                {cloudStatus === 'online' ? 'Cloud Link Activo' : 'Carga Local (Offline)'}
              </p>
            </div>
          </div>
          
          <button 
            onClick={fetchCloudData}
            title="Recargar desde la nube"
            className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-400 hover:text-blue-600 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path><path d="M16 16h5v5"></path></svg>
          </button>
        </header>

        <div className="max-w-7xl mx-auto space-y-10 pb-20">
          {activeTab === 'dashboard' && <Dashboard representatives={representatives} payments={payments} />}
          {activeTab === 'students' && <StudentRegistration onRegister={handleAddStudent} representatives={representatives} />}
          {activeTab === 'payments' && <PaymentModule onPay={handleRegisterPayment} representatives={representatives} payments={payments} fees={fees} />}
          {activeTab === 'ledger' && <LedgerModule representatives={representatives} payments={payments} fees={fees} />}
          {activeTab === 'verification' && <VerificationList payments={payments} onVerify={handleVerifyPayment} />}
          {activeTab === 'reports' && <ReportsModule payments={payments} representatives={representatives} />}
          {activeTab === 'users' && <UserManagement users={users} onUpdateRole={handleUpdateUserRole} onDeleteUser={handleDeleteUser} />}
          {activeTab === 'settings' && <SettingsModule fees={fees} onUpdateFees={handleUpdateFees} />}
        </div>
      </main>
    </div>
  );
};

const NavItem: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; badge?: number }> = ({ active, onClick, icon, label, badge }) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-between w-full p-3.5 rounded-xl transition-all duration-300 group ${
      active 
        ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 translate-x-1' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
    }`}
  >
    <div className="flex items-center gap-3">
      <span className={`transition-colors duration-300 ${active ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}`}>{icon}</span>
      <span className="font-bold text-sm tracking-tight">{label}</span>
    </div>
    {badge !== undefined && badge > 0 && (
      <span className={`flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-black rounded-lg ${active ? 'bg-white text-blue-600' : 'bg-rose-500 text-white animate-pulse'}`}>
        {badge}
      </span>
    )}
  </button>
);

export default App;
