
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
      return data;
    } catch (error) {
      console.warn('Fallo fetchAll:', error);
      return null;
    }
  },

  async syncAll(data: { users: User[], representatives: Representative[], payments: PaymentRecord[], fees: LevelFees }) {
    const url = this.getScriptUrl();
    if (!this.isValidConfig()) return false;

    // Preparar reporte de cuentas por cobrar para Google Sheets
    const ledger = data.representatives.map(rep => {
      const totalDue = rep.students.reduce((sum, s) => sum + data.fees[s.level], 0);
      const totalPaid = data.payments
        .filter(p => p.cedulaRepresentative === rep.cedula && p.status === PaymentStatus.VERIFICADO)
        .reduce((sum, p) => sum + p.amount, 0);
      
      return {
        Representante: `${rep.firstName} ${rep.lastName}`,
        Cedula: rep.cedula,
        TotalDeuda: totalDue,
        TotalAbonado: totalPaid,
        SaldoPendiente: Math.max(0, totalDue - totalPaid),
        Alumnos: rep.students.map(s => `${s.fullName} (${s.level})`).join(' | ')
      };
    });

    try {
      const payload = { 
        action: 'sync_all', 
        data: {
          ...data,
          ledger: ledger
        } 
      };

      // Enviamos como text/plain para que Google Apps Script doPost no requiera preflight (CORS simple)
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: JSON.stringify(payload)
      });
      
      return true;
    } catch (error) {
      console.error('Error syncAll:', error);
      return false;
    }
  }
};
