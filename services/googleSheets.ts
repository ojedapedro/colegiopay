
import { User, Representative, PaymentRecord, LevelFees, PaymentStatus, Level, PaymentMethod } from '../types';

/**
 * ID de la Base de Datos Principal (SistemCol)
 */
const SISTEM_COL_SHEET_ID = '13lZSsC2YeTv6hPd1ktvOsexcIj9CA2wcpbxU-gvdVLo';

/**
 * ID de la Oficina Virtual (Hojas de Pagos y Usuarios externos)
 */
const VIRTUAL_OFFICE_SHEET_ID = '17slRl7f9AKQgCEGF5jDLMGfmOc-unp1gXSRpYFGX1Eg';

/**
 * URL de implementación definitiva proporcionada por el usuario
 */
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbnBy31uyMDtIQ0BhfMHlSH4SyTA1w9_dtFO7DdfCFgnkniSXKlEPlB8AEFyQo7aoTvFw/exec';

const cleanId = (id: any): string => {
  if (!id) return '0';
  return String(id).replace(/[VEve\-\.\s]/g, '').trim();
};

export const sheetService = {
  getScriptUrl() {
    const saved = localStorage.getItem('school_script_url');
    return (saved && saved.trim() !== '') ? saved.trim() : DEFAULT_SCRIPT_URL;
  },

  setScriptUrl(url: string) {
    localStorage.setItem('school_script_url', url.trim());
  },

  isValidConfig() {
    const url = this.getScriptUrl();
    return url && url.includes('/macros/s/') && url.includes('/exec');
  },

  /**
   * Intenta parsear JSON de forma segura manejando errores de CORS/Redirección
   */
  async safeParseJson(response: Response) {
    try {
      const text = await response.text();
      if (!text) return null;
      if (text.trim().toLowerCase().startsWith('<!doctype')) {
        console.error('El servidor de Google requiere autenticación manual o el script no es público.');
        return null;
      }
      return JSON.parse(text);
    } catch (e) {
      console.error('Error parseando respuesta de Google Sheets:', e);
      return null;
    }
  },

  /**
   * Lee la base de datos principal SistemCol (Maestro)
   */
  async fetchAll() {
    if (!this.isValidConfig()) return null;
    const url = this.getScriptUrl();

    try {
      const fetchUrl = `${url}?action=read_all&sheetId=${SISTEM_COL_SHEET_ID}&t=${Date.now()}`;
      const response = await fetch(fetchUrl, {
        method: 'GET',
        mode: 'cors',
        redirect: 'follow',
        cache: 'no-store'
      });
      
      const data = await this.safeParseJson(response);
      if (data && !data.error) {
        if (data.payments) {
          data.payments = data.payments.map((p: any) => ({
            ...p,
            cedulaRepresentative: cleanId(p.cedulaRepresentative || p.cedula)
          }));
        }
        if (data.representatives) {
          data.representatives = data.representatives.map((r: any) => ({
            ...r,
            cedula: cleanId(r.cedula)
          }));
        }
        return data;
      }
      return null;
    } catch (error) {
      console.error('Error crítico conectando a SistemCol:', error);
      return null;
    }
  },

  /**
   * Importa los pagos desde la Oficina Virtual (ID: 17slRl...)
   * Estructura basada exactamente en la Imagen 2
   */
  async fetchVirtualOfficePayments() {
    if (!this.isValidConfig()) return [];
    const url = this.getScriptUrl();

    try {
      const targetUrl = `${url}?action=get_external_payments&sheetId=${VIRTUAL_OFFICE_SHEET_ID}&sheetName=Pagos&t=${Date.now()}`;
      
      const response = await fetch(targetUrl, {
        method: 'GET',
        mode: 'cors',
        redirect: 'follow'
      });

      const result = await this.safeParseJson(response);
      if (!result) return [];

      const rawPayments = Array.isArray(result) ? result : (result.payments || result.data || []);
      
      return rawPayments.map((p: any) => ({
        id: String(p.id || `OV-${Date.now()}`),
        timestamp: String(p.timestamp || ''),
        paymentDate: String(p.paymentDate || ''),
        cedulaRepresentative: cleanId(p.cedulaRepresentative),
        matricula: String(p.matricula || 'N/A'),
        level: (p.level || Level.PRIMARIA) as Level,
        method: (p.method || PaymentMethod.PAGO_MOVIL) as PaymentMethod,
        reference: String(p.reference || ''),
        amount: parseFloat(String(p.amount).replace(',', '.')) || 0,
        observations: String(p.observations || ''),
        status: PaymentStatus.PENDIENTE,
        type: (String(p.type).toUpperCase() === 'ABONO' ? 'ABONO' : 'TOTAL') as 'ABONO' | 'TOTAL',
        pendingBalance: parseFloat(String(p.pendingBalance).replace(',', '.')) || 0
      }));
    } catch (error) {
      console.error('Error importando desde Oficina Virtual:', error);
      return [];
    }
  },

  /**
   * Sincroniza al Libro Maestro y genera CuentasPorCobrar
   * Formato exacto Imagen 3
   */
  async syncAll(data: { users: User[], representatives: Representative[], payments: PaymentRecord[], fees: LevelFees }) {
    if (!this.isValidConfig()) return false;
    const url = this.getScriptUrl();

    try {
      const ledger = data.representatives.map(rep => {
        const totalDue = rep.totalAccruedDebt || 0;
        const totalPaid = data.payments
          .filter(p => cleanId(p.cedulaRepresentative) === cleanId(rep.cedula) && p.status === PaymentStatus.VERIFICADO)
          .reduce((sum, p) => sum + p.amount, 0);
        
        return {
          representante: `${rep.firstName} ${rep.lastName}`,
          cedula: rep.cedula,
          matricula: rep.matricula,
          telefono: rep.phone,
          alumnos: rep.students.map(s => `${s.fullName} (${s.level})`).join(' | '),
          deudaAcumulada: totalDue,
          totalAbonado: totalPaid,
          saldoPendiente: Math.max(0, totalDue - totalPaid)
        };
      });

      const payload = { 
        action: 'sync_all', 
        sheetId: SISTEM_COL_SHEET_ID,
        data: { 
          users: data.users,
          representatives: data.representatives,
          payments: data.payments,
          fees: data.fees,
          ledger // Actualiza hoja CuentasPorCobrar
        } 
      };

      // no-cors evita el preflight pero no permite leer la respuesta (seguro para guardado ciego)
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      
      return true;
    } catch (error) {
      console.error('Fallo en sincronización maestra:', error);
      return false;
    }
  }
};
