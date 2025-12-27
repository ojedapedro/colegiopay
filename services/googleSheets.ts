
import { User, Representative, PaymentRecord, LevelFees, PaymentStatus, Level, PaymentMethod } from '../types';

// ID de la Base de Datos Principal (SistemCol)
const SISTEM_COL_SHEET_ID = '13lZSsC2YeTv6hPd1ktvOsexcIj9CA2wcpbxU-gvdVLo';

// ID de la Base de Datos de Reportes (Oficina Virtual)
const VIRTUAL_OFFICE_SHEET_ID = '17slRl7f9AKQgCEGF5jDLMGfmOc-unp1gXSRpYFGX1Eg';

// URL del Motor de Datos (Apps Script)
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxBBsRqQ9nZykVioVqgQ_I3wmCYz3gncOM1rxZbFfgEPF-ijLp0Qp63fAKjsNxcytPNIQ/exec';

/**
 * Normaliza la cédula: elimina prefijos, puntos y espacios.
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
   * Intenta parsear JSON de forma segura, manejando respuestas vacías o errores de HTML
   */
  async safeParseJson(response: Response) {
    try {
      const text = await response.text();
      if (!text || text.trim().startsWith('<!DOCTYPE')) {
        console.error('La respuesta del servidor no es JSON (posible error de permisos o script no publicado)');
        return null;
      }
      return JSON.parse(text);
    } catch (e) {
      console.error('Error al parsear respuesta del servidor:', e);
      return null;
    }
  },

  /**
   * Lee datos de SistemCol (Base Principal)
   * Se simplifica la petición para evitar errores 'Failed to fetch' por CORS
   */
  async fetchAll() {
    const url = this.getScriptUrl();
    if (!this.isValidConfig()) return null;

    try {
      // Petición simplificada para evitar preflight de CORS
      const response = await fetch(`${url}?action=read_all&sheetId=${SISTEM_COL_SHEET_ID}`, {
        method: 'GET',
        redirect: 'follow',
        cache: 'no-store'
      });
      
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      
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
      }
      return data;
    } catch (error) {
      console.error('Error al leer SistemCol:', error);
      return null;
    }
  },

  /**
   * Lee la base de datos de la Oficina Virtual
   */
  async fetchVirtualOfficePayments() {
    const url = this.getScriptUrl();
    if (!this.isValidConfig()) return [];

    try {
      const targetUrl = `${url}?action=get_external_payments&sheetId=${VIRTUAL_OFFICE_SHEET_ID}&sheetName=OficinaVirtual&t=${Date.now()}`;
      
      const response = await fetch(targetUrl, {
        method: 'GET',
        redirect: 'follow',
        cache: 'no-store'
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const result = await this.safeParseJson(response);
      if (!result) return [];

      const rawPayments = Array.isArray(result) ? result : (result.payments || result.data || []);
      
      return rawPayments.map((p: any) => {
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
      console.error('Error leyendo Oficina Virtual:', error);
      return [];
    }
  },

  /**
   * Sincroniza al Libro de Cuentas por Cobrar en SistemCol
   */
  async syncAll(data: { users: User[], representatives: Representative[], payments: PaymentRecord[], fees: LevelFees }) {
    const url = this.getScriptUrl();
    if (!this.isValidConfig()) return false;

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

      // Usamos Content-Type text/plain para evitar comprobaciones pre-vuelo de CORS
      // Google Apps Script lo recibirá como e.postData.contents
      await fetch(url, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      
      return true;
    } catch (error) {
      console.error('Error de sincronización:', error);
      return false;
    }
  }
};
