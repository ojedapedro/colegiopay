
export enum Level {
  MATERNAL = 'Maternal',
  PRE_ESCOLAR = 'Pre-escolar',
  PRIMARIA = 'Primaria',
  SECUNDARIA = 'Secundaria'
}

export enum UserRole {
  ADMIN = 'Administrador',
  BASIC = 'Usuario Básico'
}

export interface User {
  cedula: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
}

export type LevelFees = Record<Level, number>;

export const DEFAULT_LEVEL_FEES: LevelFees = {
  [Level.MATERNAL]: 50.00,
  [Level.PRE_ESCOLAR]: 65.00,
  [Level.PRIMARIA]: 80.00,
  [Level.SECUNDARIA]: 100.00
};

export enum PaymentMethod {
  EFECTIVO_BS = 'Efectivo Bs',
  EFECTIVO_USD = 'Efectivo $',
  EFECTIVO_EUR = 'Efectivo Euro',
  TDC = 'TDC',
  TDD = 'TDD',
  PAGO_MOVIL = 'Pago Móvil',
  TRANSFERENCIA = 'Transferencia',
  ZELLE = 'Zelle'
}

export enum PaymentStatus {
  PENDIENTE = 'Pendiente',
  VERIFICADO = 'Verificado',
  RECHAZADO = 'Rechazado'
}

export interface Student {
  id: string;
  fullName: string;
  level: Level;
  section: string;
}

export interface Representative {
  cedula: string;
  firstName: string;
  lastName: string;
  matricula: string;
  students: Student[];
}

export interface PaymentRecord {
  id: string;
  timestamp: string;
  paymentDate: string;
  cedulaRepresentative: string;
  matricula: string;
  level: Level;
  method: PaymentMethod;
  reference: string;
  amount: number;
  observations: string;
  status: PaymentStatus;
  type: 'ABONO' | 'TOTAL';
  pendingBalance: number;
}
