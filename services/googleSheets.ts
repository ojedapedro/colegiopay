
import { User, Representative, PaymentRecord, LevelFees, PaymentStatus } from '../types';

const VIRTUAL_OFFICE_SHEET_ID = '17slRl7f9AKQgCEGF5jDLMGfmOc-unp1gXSRpYFGX1Eg';
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzBdfC3yAPAtheuAMpBb1jtW98uHIsGL0dONHl33w891WlgyrbsunesQMHqvhkcHDg21A/exec';

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
   * Obtiene datos del Libro Maestro
   */
  async fetchAll() {
    const url = this.getScriptUrl();
    if (!this.isValidConfig()) return null;

    try {
      const response = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        mode: 'cors'
      });
      
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      const data = await response.json();
      
      if (data.payments) {
        data.payments = data.payments.map((p: any) => ({
          ...p,
          cedulaRepresentative: String(p["Cedula Representan"] || p.cedulaRepresen || p.cedulaRepresentative || p.cedula || '0').replace('V-', '').replace('E-', '').trim()
        }));
      }
      
      return data;
    } catch (error) {
      console.warn('Error al leer de la nube:', error);
      return null;
    }
  },

  /**
   * Importa pagos desde la hoja 'consolidado' de la Oficina Virtual
   */
  async fetchVirtualOfficePayments() {
    const url = this.getScriptUrl();
    if (!this.isValidConfig()) return [];

    try {
      const syncUrl = new URL(url);
      syncUrl.searchParams.append('action', 'get_external_payments');
      syncUrl.searchParams.append('sheetId', VIRTUAL_OFFICE_SHEET_ID);
      syncUrl.searchParams.append('sheetName', 'consolidado'); // Apuntamos a la hoja correcta según tu indicación

      const response = await fetch(syncUrl.toString(), {
        method: 'GET',
        cache: 'no-store',
        mode: 'cors'
      });

      if (!response.ok) throw new Error('Error en respuesta de Oficina Virtual');
      
      const data = await response.json();
      // Verificamos si los datos vienen en una propiedad 'payments', 'data' o si es el array directamente
      const rawPayments = Array.isArray(data) ? data : (data.payments || data.data || []);
      
      if (rawPayments.length === 0) return [];

      return rawPayments.map((p: any) => {
        // Normalización de Cédula (Remover V- o E-)
        let rawCedula = String(p["Cedula Representan"] || p.cedulaRepresen || p.cedulaRepresentative || p.cedula || '0');
        const cleanCedula = rawCedula.replace('V-', '').replace('E-', '').trim();

        // Creamos un ID único usando Referencia + Timestamp para evitar duplicados falsos
        const ref = String(p["Referencia"] || p.reference || '000000');
        const ts = String(p["Timestamp"] || p.timestamp || Date.now());
        const uniqueId = `EXT-${ref}-${ts.replace(/[:\s\-\/]/g, '')}`;

        return {
          id: uniqueId,
          timestamp: p["Timestamp"] || p.timestamp || new Date().toISOString(),
          paymentDate: p["Fecha Pago"] || p.paymentDate || new Date().toISOString().split('T')[0],
          cedulaRepresentative: cleanCedula,
          matricula: p["Matricula"] || p.matricula || 'N/A',
          level: p["Nivel"] || p.level || 'Primaria',
          method: p["Tipo Pago"] || p.method || 'Pago Móvil',
          reference: ref,
          amount: parseFloat(String(p["Monto"] || p.amount || 0).replace(',', '.')),
          observations: `[OFICINA VIRTUAL] ${p["Observaciones"] || p.observations || ''}`,
          status: PaymentStatus.PENDIENTE,
          type: 'TOTAL',
          pendingBalance: 0
        };
      });
    } catch (error) {
      console.error('Fallo de conexión con Oficina Virtual:', error);
      return [];
    }
  },

  async syncAll(data: { users: User[], representatives: Representative[], payments: PaymentRecord[], fees: LevelFees }) {
    const url = this.getScriptUrl();
    if (!this.isValidConfig()) return false;

    const ledger = data.representatives.map(rep => {
      const totalDue = rep.totalAccruedDebt || 0;
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
