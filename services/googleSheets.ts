
import { User, Representative, PaymentRecord, LevelFees, PaymentStatus } from '../types';

export const sheetService = {
  getScriptUrl() {
    return localStorage.getItem('school_script_url') || '';
  },

  setScriptUrl(url: string) {
    localStorage.setItem('school_script_url', url.trim());
  },

  isValidConfig() {
    const url = this.getScriptUrl();
    return url !== '' && url.includes('/macros/s/') && url.endsWith('/exec');
  },

  async fetchAll() {
    const url = this.getScriptUrl();
    if (!this.isValidConfig()) return null;

    try {
      const response = await fetch(url, {
        method: 'GET',
        cache: 'no-cache',
        mode: 'cors'
      });
      
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      const data = await response.json();
      
      // Adaptar nombres de columnas si vienen del sheet (cedulaRepresen -> cedulaRepresentative)
      if (data.payments) {
        data.payments = data.payments.map((p: any) => ({
          ...p,
          cedulaRepresentative: p.cedulaRepresen || p.cedulaRepresentative
        }));
      }
      
      return data;
    } catch (error) {
      console.warn('Error al leer de la nube:', error);
      return null;
    }
  },

  async syncAll(data: { users: User[], representatives: Representative[], payments: PaymentRecord[], fees: LevelFees }) {
    const url = this.getScriptUrl();
    if (!this.isValidConfig()) return false;

    // Reporte de CuentasPorCobrar con los nombres EXACTOS de la estructura inicializada
    const ledger = data.representatives.map(rep => {
      const totalDue = rep.students.reduce((sum, s) => sum + data.fees[s.level], 0);
      const totalPaid = data.payments
        .filter(p => p.cedulaRepresentative === rep.cedula && p.status === PaymentStatus.VERIFICADO)
        .reduce((sum, p) => sum + p.amount, 0);
      
      return {
        representante: `${rep.firstName} ${rep.lastName}`,
        cedula: rep.cedula,
        matricula: rep.matricula,
        telefono: rep.phone,
        alumnos: rep.students.map(s => `${s.fullName} (${s.level})`).join(' | '),
        montoMensualid: totalDue,
        totalAbonado: totalPaid,
        saldoPendiente: Math.max(0, totalDue - totalPaid)
      };
    });

    // Mapeo de Representantes asegurando el campo phone
    const mappedReps = data.representatives.map(r => ({
      cedula: r.cedula,
      firstName: r.firstName,
      lastName: r.lastName,
      phone: r.phone || '',
      matricula: r.matricula,
      students: r.students
    }));

    // Mapeo de Pagos con nombres EXACTOS para el Sheet
    const mappedPayments = data.payments.map(p => ({
      id: p.id,
      timestamp: p.timestamp,
      paymentDate: p.paymentDate,
      cedulaRepresen: p.cedulaRepresentative,
      matricula: p.matricula,
      level: p.level,
      method: p.method,
      reference: p.reference,
      amount: p.amount,
      observations: p.observations,
      status: p.status,
      type: p.type,
      pendingBalance: p.pendingBalance
    }));

    try {
      const payload = { 
        action: 'sync_all', 
        data: {
          users: data.users,
          representatives: mappedReps,
          payments: mappedPayments,
          fees: data.fees,
          ledger: ledger
        } 
      };

      // Usamos no-cors para evitar el preflight de Google y enviamos como texto plano
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: JSON.stringify(payload)
      });
      
      console.log('Sincronización enviada a Google Sheets ID 13lZSsC...');
      return true;
    } catch (error) {
      console.error('Fallo crítico en sincronización:', error);
      return false;
    }
  }
};
