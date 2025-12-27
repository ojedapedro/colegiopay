
import { User, Representative, PaymentRecord, LevelFees, PaymentStatus, Level, PaymentMethod } from '../types';

/**
 * ID de la Base de Datos Principal (SistemCol)
 * Este ID se usa para el libro de cuentas maestro.
 */
const SISTEM_COL_SHEET_ID = '13lZSsC2YeTv6hPd1ktvOsexcIj9CA2wcpbxU-gvdVLo';

/**
 * ID de la Oficina Virtual proporcionado por el usuario
 * Aquí es donde se registró la nueva estructura de pagos.
 */
const VIRTUAL_OFFICE_SHEET_ID = '17slRl7f9AKQgCEGF5jDLMGfmOc-unp1gXSRpYFGX1Eg';

/**
 * URL del Apps Script proporcionado por el usuario
 */
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxBBsRqQ9nZykVioVqgQ_I3wmCYz3gncOM1rxZbFfgEPF-ijLp0Qp63fAKjsNxcytPNIQ/exec';

/**
 * Limpia y normaliza la cédula
 */
const cleanId = (id: any): string => {
  if (!id) return '0';
  return String(id)
    .replace(/[VEve\-\.\s]/g, '')
    .trim();
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
    return url.startsWith('https://script.google.com/macros/s/') && url.endsWith('/exec');
  },

  /**
   * Intenta parsear JSON de forma segura
   */
  async safeParseJson(response: Response) {
    try {
      const text = await response.text();
      if (!text || text.trim().startsWith('<!DOCTYPE')) {
        console.warn('La respuesta no es un JSON válido. Verifique los permisos del Apps Script (Cualquiera/Anyone).');
        return null;
      }
      return JSON.parse(text);
    } catch (e) {
      console.error('Error al parsear JSON:', e);
      return null;
    }
  },

  /**
   * Lee datos de SistemCol (Libro Maestro)
   */
  async fetchAll() {
    if (!this.isValidConfig()) return null;
    const url = this.getScriptUrl();

    try {
      // Petición mínima sin headers para evitar preflight CORS
      const response = await fetch(`${url}?action=read_all&sheetId=${SISTEM_COL_SHEET_ID}`, {
        method: 'GET',
        mode: 'cors', // Google Apps Script soporta CORS en GET si se publica como 'Anyone'
        redirect: 'follow'
      });
      
      const data = await this.safeParseJson(response);
      if (data && !data.error) {
        if (data.payments) {
          data.payments = data.payments.map((p: any) => ({
            ...p,
            cedulaRepresentative: cleanId(p.cedulaRepresen || p.cedulaRepresentative || p.cedula)
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
      console.warn('Error en fetchAll (SistemCol):', error);
      return null;
    }
  },

  /**
   * Lee la nueva base de datos de la Oficina Virtual (ID: 17slRl...)
   */
  async fetchVirtualOfficePayments() {
    if (!this.isValidConfig()) return [];
    const url = this.getScriptUrl();

    try {
      const targetUrl = `${url}?action=get_external_payments&sheetId=${VIRTUAL_OFFICE_SHEET_ID}&sheetName=OficinaVirtual&t=${Date.now()}`;
      
      const response = await fetch(targetUrl, {
        method: 'GET',
        mode: 'cors',
        redirect: 'follow'
      });

      const result = await this.safeParseJson(response);
      if (!result) return [];

      const rawPayments = Array.isArray(result) ? result : (result.payments || result.data || []);
      
      return rawPayments.map((p: any) => {
        // Mapeo según estructura de la Oficina Virtual
        const cleanedCedula = cleanId(p["Cedula Represe"] || p["Cedula Representante"] || p.cedula);
        const rawMonto = p["Monto"] || p["Amount"] || 0;
        const amount = typeof rawMonto === 'string' ? parseFloat(rawMonto.replace(',', '.')) : parseFloat(rawMonto);
        const ref = String(p["Referencia"] || p.reference || '000000');
        
        return {
          id: `OV-${ref}-${cleanedCedula}-${Date.now()}`,
          timestamp: String(p["Timestamp"] || new Date().toISOString()),
          paymentDate: String(p["Fecha Pago"] || p["Fecha Registro"] || new Date().toISOString().split('T')[0]),
          cedulaRepresentative: cleanedCedula,
          matricula: String(p["Matricula"] || 'N/A'),
          level: (p["Nivel"] || Level.PRIMARIA) as Level,
          method: (p["Tipo Pago"] || PaymentMethod.PAGO_MOVIL) as PaymentMethod,
          reference: ref,
          amount: isNaN(amount) ? 0 : amount,
          observations: `[OFICINA VIRTUAL] ${p["Observaciones"] || ''}`,
          status: PaymentStatus.PENDIENTE,
          type: (p["Modo Pago"] === 'Abono' ? 'ABONO' : 'TOTAL') as 'ABONO' | 'TOTAL',
          pendingBalance: 0
        };
      });
    } catch (error) {
      console.warn('Error en fetchVirtualOfficePayments:', error);
      return [];
    }
  },

  /**
   * Sincroniza los datos al libro maestro
   */
  async syncAll(data: { users: User[], representatives: Representative[], payments: PaymentRecord[], fees: LevelFees }) {
    if (!this.isValidConfig()) return false;
    const url = this.getScriptUrl();

    try {
      const cleanedReps = data.representatives.map(r => ({ ...r, cedula: cleanId(r.cedula) }));
      const cleanedPays = data.payments.map(p => ({ 
        ...p, 
        cedulaRepresentative: cleanId(p.cedulaRepresentative)
      }));

      const ledger = cleanedReps.map(rep => {
        const totalDue = rep.totalAccruedDebt || 0;
        const totalPaid = cleanedPays
          .filter(p => p.cedulaRepresentative === rep.cedula && p.status === PaymentStatus.VERIFICADO)
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
          representatives: cleanedReps,
          payments: cleanedPays,
          fees: data.fees,
          ledger 
        } 
      };

      // POST usando 'text/plain' para evitar preflight OPTIONS de CORS
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors', // Enviamos datos pero no necesitamos leer la respuesta por seguridad CORS en POST
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      
      return true;
    } catch (error) {
      console.error('Error en syncAll:', error);
      return false;
    }
  }
};
