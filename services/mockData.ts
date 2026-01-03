import { Representative, Level, Student, PaymentRecord, PaymentMethod, PaymentStatus, User, UserRole } from '../types';

export const initialUsers: User[] = [
  {
    cedula: "10203040",
    fullName: "Admin Principal",
    role: UserRole.ADMINISTRADOR,
    password: "123456",
    createdAt: new Date().toISOString()
  },
  {
    cedula: "20304050",
    fullName: "Operador Caja",
    role: UserRole.CAJERO,
    password: "123456",
    createdAt: new Date().toISOString()
  }
];

export const initialRepresentatives: Representative[] = [
  {
    cedula: "12345678",
    firstName: "Juan",
    lastName: "Pérez",
    phone: "0412-5555555",
    matricula: "mat-2025-26-12345678",
    students: [
      { id: "S1", fullName: "Miguel Pérez", level: Level.PRIMARIA, section: "A" },
      { id: "S2", fullName: "Ana Pérez", level: Level.MATERNAL, section: "U" }
    ],
    totalAccruedDebt: 130.00,
    lastAccrualMonth: "2024-05"
  }
];

export const initialPayments: PaymentRecord[] = [
  {
    id: "PAY-001",
    timestamp: new Date().toISOString(),
    paymentDate: "2024-05-15",
    cedulaRepresentative: "12345678",
    matricula: "mat-2025-26-12345678",
    level: Level.PRIMARIA,
    method: PaymentMethod.EFECTIVO_USD,
    reference: "N/A",
    amount: 80.00,
    observations: "Pago completo mes mayo",
    status: PaymentStatus.VERIFICADO,
    type: 'TOTAL',
    pendingBalance: 0
  }
];