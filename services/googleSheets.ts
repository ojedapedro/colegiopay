
import { User, Representative, PaymentRecord, LevelFees, PaymentStatus, Level, PaymentMethod } from '../types';

/**
 * ID de la Base de Datos Principal (SistemCol) - Visto en URL de Imagen 3
 */
const SISTEM_COL_SHEET_ID = '13lZSsC2YeTv6hPd1ktvOsexcIj9CA2wcpbxU-gvdVLo';

/**
 * ID de la Oficina Virtual - Visto en URL de Imagen 1
 */
const VIRTUAL_OFFICE_SHEET_ID = '17slRl7f9AKQgCEGF5jDLMGfmOc-unp1gXSRpYFGX1Eg';

/**
 * URL de implementación del Apps Script (Debe terminar en /exec)
 */
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxBBsRqQ9nZykVioVqgQ_I3wmCYz3gncOM1rxZbFfgEPF-ijLp0Qp63fAKjsNxcytPNIQ/exec';

const cleanId = (id: any): string => {
  if (!id) return '0';
  return String(id).replace(/[VEve\-\.\s]/g, '').trim();
};

export const sheetService = {
  getScriptUrl() {
    const saved = localStorage.getItem('school_script_url');
    const url = (saved && saved.trim() !== '') ? saved.trim() : DEFAULT_SCRIPT_URL;
    return url;
  },

  setScriptUrl(url: string) {
    localStorage.setItem('school_script_url', url.trim());
  },

  isValidConfig() {
    const url = this.getScriptUrl();
    return url && url.startsWith('https://script.google.com/macros/s/') && url.endsWith('/exec');
  },

  /**
   * Intenta parsear la respuesta del servidor de forma segura.
   * Si devuelve HTML (página de login de Google), lanza error descriptivo.
   */
  async safeParseJson(response: Response) {
    try {
      const text = await response.text();
      if (!text) return null;
      if (text.trim().toLowerCase().startsWith('<!doctype')) {
        throw new Error('El script no está configurado como "Cualquiera" (Anyone). Google devolvió una página de acceso.');
      }
      return JSON.parse(text);
    } catch (e: any) {
      console.error('Error al procesar respuesta del servidor:', e.message);
      return null;
    }
  },

  /**
   * Lee la base de datos principal SistemCol
   */
  async fetchAll() {
    if (!this.isValidConfig()) return null;
    const url = this.getScriptUrl();

    try {
      // Usamos GET con parámetros para evitar problemas de CORS preflight
      const fetchUrl = `${url}?action=read_all&sheetId=${SISTEM_COL_SHEET_ID}&t=${Date.now()}`;
      const response = await fetch(fetchUrl, {
        method: 'GET',
        mode: 'cors',
        redirect: 'follow',
        cache: 'no-store'
      });
      
      const data = await this.safeParseJson(response);
      if (data && !data.error) {
        // Normalización de datos para asegurar compatibilidad
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
      console.warn('Fallo de red en SistemCol (fetchAll). Probablemente CORS o URL incorrecta.');
      return null;
    }
  },

  /**
   * Lee los pagos reportados desde la Oficina Virtual (ID: 17slRl...)
   * Mapeo exacto según Imagen 2 de la hoja "Pagos"
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
        timestamp: String(p.timestamp || new Date().toISOString()),
        paymentDate: String(p.paymentDate || new Date().toISOString().split('T')[0]),
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
      console.warn('Fallo de red en Oficina Virtual. Verifique permisos del script.');
      return [];
    }
  },

  /**
   * Sincroniza todos los datos y genera la hoja "CuentasPorCobrar"
   * Formato exacto según Imagen 3
   */
  async syncAll(data: { users: User[], representatives: Representative[], payments: PaymentRecord[], fees: LevelFees }) {
    if (!this.isValidConfig()) return false;
    const url = this.getScriptUrl();

    try {
      // Generamos el libro de cuentas por cobrar exactamente como en la imagen 3
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
          ledger // Esto actualizará la hoja "CuentasPorCobrar"
        } 
      };

      // Usar mode: 'no-cors' para el POST asegura que los datos se envíen sin disparar errores de seguridad complejos
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      
      return true;
    } catch (error) {
      console.error('Error en sincronización (syncAll):', error);
      return false;
    }
  }
};
