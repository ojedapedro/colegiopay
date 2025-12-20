
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
    return url !== '' && url.startsWith('https://script.google.com/macros/s/') && url.endsWith('/exec');
  },

  async fetchAll() {
    const url = this.getScriptUrl();
    if (!this.isValidConfig()) return null;

    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal
      });
      
      clearTimeout(id);
      
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      
      const data = await response.json();
      if (data && data.error) {
        console.error('Error reportado por Apps Script:', data.error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.warn('Fallo al obtener datos de Google Sheets:', error);
      return null;
    }
  },

  async syncAll(data: { users: User[], representatives: Representative[], payments: PaymentRecord[], fees: LevelFees }) {
    const url = this.getScriptUrl();
    if (!this.isValidConfig()) return false;

    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const deadlineStr = lastDayOfMonth.toISOString().split('T')[0];
    const daysUntilDeadline = Math.ceil((lastDayOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    const accountsReceivable = data.representatives.map(rep => {
      const totalDue = rep.students.reduce((sum, s) => sum + data.fees[s.level], 0);
      const totalPaid = data.payments
        .filter(p => p.cedulaRepresentative === rep.cedula && p.status === PaymentStatus.VERIFICADO)
        .reduce((sum, p) => sum + p.amount, 0);
      
      const balance = Math.max(0, totalDue - totalPaid);
      
      return {
        representante: `${rep.firstName} ${rep.lastName}`,
        cedula: rep.cedula,
        matricula: rep.matricula,
        alumnos: rep.students.map(s => `${s.fullName} (${s.level})`).join(', '),
        montoMensualidad: totalDue,
        totalAbonado: totalPaid,
        saldoPendiente: balance,
        fechaTopePago: deadlineStr,
        diasRestantes: balance > 0 ? daysUntilDeadline : 'SOLVENTE'
      };
    });

    try {
      // Para Google Apps Script POST, enviamos como text/plain para evitar Preflight CORS
      // El script recibirá el JSON en e.postData.contents
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-cache',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ 
          action: 'sync_all', 
          data: {
            ...data,
            ledger: accountsReceivable
          } 
        })
      });
      
      return true;
    } catch (error) {
      console.error('Error crítico en sincronización:', error);
      return false;
    }
  }
};
