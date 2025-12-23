
import { User, Representative, PaymentRecord, LevelFees, PaymentStatus } from '../types';

const VIRTUAL_OFFICE_SHEET_ID = '17slRl7f9AKQgCEGF5jDLMGfmOc-unp1gXSRpYFGX1Eg';

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

  /**
   * Nueva función para importar pagos desde la Oficina Virtual externa
   */
  async fetchVirtualOfficePayments() {
    const url = this.getScriptUrl();
    if (!this.isValidConfig()) return [];

    try {
      // Enviamos el ID de la oficina virtual como parámetro a nuestro Apps Script
      const response = await fetch(`${url}?action=get_external_payments&sheetId=${VIRTUAL_OFFICE_SHEET_ID}`, {
        method: 'GET',
        cache: 'no-cache'
      });

      if (!response.ok) return [];
      const data = await response.json();
      
      // Sanitizar datos externos para que coincidan con el esquema interno
      return (data.payments || []).map((p: any) => ({
        ...p,
        status: PaymentStatus.PENDIENTE, // Todo lo que viene de afuera debe ser verificado
        observations: `[OFICINA VIRTUAL] ${p.observations || ''}`
      }));
    } catch (error) {
      console.error('Error al sincronizar con Oficina Virtual:', error);
      return [];
    }
  },

  async syncAll(data: { users: User[], representatives: Representative[], payments: PaymentRecord[], fees: LevelFees }) {
    const url = this.getScriptUrl();
    if (!this.isValidConfig()) return false;

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
          representatives: data.representatives,
          payments: mappedPayments,
          fees: data.fees,
          ledger: ledger
        } 
      };

      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });
      
      return true;
    } catch (error) {
      console.error('Fallo crítico en sincronización:', error);
      return false;
    }
  }
};
