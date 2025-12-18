
import React from 'react';
import { 
  LayoutDashboard, 
  UserPlus, 
  CreditCard, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Search,
  Download,
  Filter,
  LogOut,
  ChevronRight,
  Users,
  Settings,
  Lock
} from 'lucide-react';

export const ICONS = {
  Dashboard: <LayoutDashboard size={20} />,
  Registration: <UserPlus size={20} />,
  Payments: <CreditCard size={20} />,
  Reports: <FileText size={20} />,
  Verify: <CheckCircle size={20} />,
  Pending: <Clock size={20} />,
  Alert: <AlertCircle size={20} />,
  Search: <Search size={20} />,
  Download: <Download size={20} />,
  Filter: <Filter size={20} />,
  Exit: <LogOut size={20} />,
  Next: <ChevronRight size={16} />,
  Users: <Users size={20} />,
  Settings: <Settings size={20} />,
  Lock: <Lock size={20} />
};

export const COLORS = {
  primary: 'blue-600',
  primaryDark: 'blue-700',
  secondary: 'slate-600',
  success: 'emerald-500',
  danger: 'rose-500',
  warning: 'amber-500',
  info: 'sky-500'
};
