
import { User, Representative, PaymentRecord, LevelFees, PaymentStatus } from '../types';

const VIRTUAL_OFFICE_SHEET_ID = '17slRl7f9AKQgCEGF5jDLMGfmOc-unp1gXSRpYFGX1Eg';
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzs9a_-0PIWvOPWwwzfgQdWBzUZMPwd7AV8NVTOHjsXZPKBEcFKP2X6nezc2O8EZBhA/exec';

export const sheetService = {
  getScriptUrl() {
    const saved = localStorage.getItem('school_script_url');
    return saved || DEFAULT_SCRIPT_URL;
  },

  setScriptUrl(url: string) {
    localStorage.setItem('school_script_url', url.trim());
  },

  isValidConfig() {
    const url = this.getScriptUrl();
    return url !== '' && url.includes('/macros/s/') && url.endsWith('/exec');
  },

  /**
   * Obtiene todos los datos del Libro Maestro (Local/Privado)
   */
  async fetchAll() {
    const url = this.getScriptUrl();
    if (!this.isValidConfig()) return null;

    try {
      // Usamos cache: 'no-store' para evitar datos viejos
      const response = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        mode: 'cors'
      });
      
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      const data = await response.json();
      
      // Normalización de campos para consistencia
      if (data.payments) {
        data.payments = data.payments.map((p: any) => ({
          ...p,
          cedulaRepresentative: p.cedulaRepresen || p.cedulaRepresentative || p.cedula
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
      // Construcción robusta de URL con parámetros
      const syncUrl = new URL(url);
      syncUrl.searchParams.append('action', 'get_external_payments');
      syncUrl.searchParams.append('sheetId', VIRTUAL_OFFICE_SHEET_ID);

      const response = await fetch(syncUrl.toString(), {
        method: 'GET',
        cache: 'no-store',
        mode: 'cors'
      });

      if (!response.ok) throw new Error('Error en respuesta de Oficina Virtual');
      
      const data = await response.json();
      const rawPayments = data.payments || data.data || [];
      
      // Sanitizar datos externos para que coincidan con el esquema interno de ColegioPay
      return rawPayments.map((p: any) => ({
        id: p.id || `EXT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        timestamp: p.timestamp || new Date().toISOString(),
        paymentDate: p.paymentDate || new Date().toISOString().split('T')[0],
        cedulaRepresentative: p.cedulaRepresen || p.cedulaRepresentative || p.cedula || '0',
        matricula: p.matricula || 'N/A',
        level: p.level || 'Primaria',
        method: p.method || 'Transferencia',
        reference: p.reference || '000000',
        amount: parseFloat(p.amount) || 0,
        observations: `[OFICINA VIRTUAL] ${p.observations || p.concepto || ''}`,
        status: PaymentStatus.PENDIENTE,
        type: p.type || 'TOTAL',
        pendingBalance: parseFloat(p.pendingBalance) || 0
      }));
    } catch (error) {
      console.error('Fallo de conexión con Oficina Virtual:', error);
      return [];
    }
  },

  async syncAll(data: { users: User[], representatives: Representative[], payments: PaymentRecord[], fees: LevelFees }) {
    const url = this.getScriptUrl();
    if (!this.isValidConfig()) return false;

    // Generar Ledger para sincronización
    const ledger = data.representatives.map(rep => {
      const totalDue = rep.students.reduce((sum, s) => sum + (data.fees[s.level] || 0), 0);
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

    try {
      const payload = { 
        action: 'sync_all', 
        data: {
          users: data.users,
          representatives: data.representatives,
          payments: data.payments,
          fees: data.fees,
          ledger: ledger
        } 
      };

      // Enviar como text/plain para evitar problemas de pre-flight CORS en Apps Script
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });
      
      return true;
    } catch (error) {
      console.error('Fallo crítico en sincronización POST:', error);
      return false;
    }
  }
};
