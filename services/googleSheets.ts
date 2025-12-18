
import { User, Representative, PaymentRecord, LevelFees, PaymentStatus } from '../types';

export const sheetService = {
  getScriptUrl() {
    return localStorage.getItem('school_script_url') || '';
  },

  setScriptUrl(url: string) {
    localStorage.setItem('school_script_url', url);
  },

  isValidConfig() {
    const url = this.getScriptUrl();
    return url !== '' && url.includes('script.google.com');
  },

  async fetchAll() {
    const url = this.getScriptUrl();
    if (!this.isValidConfig()) return null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) return null;
      
      const data = await response.json();
      if (data && data.error) {
        console.error('Error del Script:', data.error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.warn('No se pudo conectar con Google Sheets. Usando datos locales.');
      return null;
    }
  },

  async syncAll(data: { users: User[], representatives: Representative[], payments: PaymentRecord[], fees: LevelFees }) {
    const url = this.getScriptUrl();
    if (!this.isValidConfig()) return false;

    // Lógica de fecha tope
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const deadlineStr = lastDayOfMonth.toISOString().split('T')[0];
    const daysUntilDeadline = Math.ceil((lastDayOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Generar datos para el Libro de Cuentas por Cobrar
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
        diasRestantes: balance > 0 ? daysUntilDeadline : 'Pagado'
      };
    });

    try {
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
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
      console.error('Fallo de sincronización:', error);
      return false;
    }
  }
};
