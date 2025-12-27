
import { User, Representative, PaymentRecord, LevelFees, PaymentStatus, Level, PaymentMethod } from '../types';

/**
 * ID de la Base de Datos Principal (SistemCol) - Imagen 3
 */
const SISTEM_COL_SHEET_ID = '13lZSsC2YeTv6hPd1ktvOsexcIj9CA2wcpbxU-gvdVLo';

/**
 * ID de la Oficina Virtual - Imagen 1 y 2
 */
const VIRTUAL_OFFICE_SHEET_ID = '17slRl7f9AKQgCEGF5jDLMGfmOc-unp1gXSRpYFGX1Eg';

/**
 * URL Oficial proporcionada por el usuario (Corregida: AKfycbn...)
 */
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbnBy31uyMDtIQ0BhfMHlSH4SyTA1w9_dtFO7DdfCFgnkniSXKlEPlB8AEFyQo7aoTvFw/exec';

const cleanId = (id: any): string => {
  if (!id) return '0';
  return String(id).replace(/[VEve\-\.\s]/g, '').trim();
};

export const sheetService = {
  getScriptUrl() {
    const saved = localStorage.getItem('school_script_url');
    return (saved && saved.trim() !== '' && saved.includes('script.google.com')) ? saved.trim() : DEFAULT_SCRIPT_URL;
  },

  setScriptUrl(url: string) {
    localStorage.setItem('school_script_url', url.trim());
  },

  isValidConfig() {
    const url = this.getScriptUrl();
    return url && url.includes('/macros/s/') && url.includes('/exec');
  },

  async safeParseJson(response: Response) {
    try {
      const text = await response.text();
      if (!text || text.includes('<!DOCTYPE') || text.includes('<html')) {
        console.error('La respuesta de Google no es JSON válido (Posible error de permisos/Anyone).');
        return null;
      }
      return JSON.parse(text);
    } catch (e) {
      console.error('Error al parsear respuesta:', e);
      return null;
    }
  },

  async fetchAll() {
    if (!this.isValidConfig()) return null;
    const url = this.getScriptUrl();

    try {
      const response = await fetch(`${url}?action=read_all&sheetId=${SISTEM_COL_SHEET_ID}&t=${Date.now()}`, {
        method: 'GET',
        mode: 'cors',
        redirect: 'follow'
      });
      
      const data = await this.safeParseJson(response);
      if (data && !data.error) {
        if (data.payments) {
          data.payments = data.payments.map((p: any) => ({
            ...p,
            cedulaRepresentative: cleanId(p.cedulaRepresentative || p.cedula)
          }));
        }
        return data;
      }
      return null;
    } catch (error) {
      console.warn('SistemCol unreachable');
      return null;
    }
  },

  async fetchVirtualOfficePayments() {
    if (!this.isValidConfig()) return [];
    const url = this.getScriptUrl();

    try {
      // Intentamos obtener desde la hoja "Pagos" (Imagen 2)
      const targetUrl = `${url}?action=get_external_payments&sheetId=${VIRTUAL_OFFICE_SHEET_ID}&sheetName=Pagos&t=${Date.now()}`;
      
      const response = await fetch(targetUrl, {
        method: 'GET',
        mode: 'cors',
        redirect: 'follow'
      });

      const result = await this.safeParseJson(response);
      if (!result) return [];

      const rawPayments = Array.isArray(result) ? result : (result.payments || result.data || []);
      
      // Mapeo exhaustivo para garantizar que los datos aparezcan en la UI
      return rawPayments.map((p: any) => {
        const amount = parseFloat(String(p.amount || p.Monto || 0).replace(',', '.'));
        const ref = String(p.reference || p.Referencia || '0');
        const cedula = cleanId(p.cedulaRepresentative || p.cedula || p["Cedula Represe"]);
        
        return {
          id: String(p.id || `OV-${ref}-${cedula}-${Date.now()}`),
          timestamp: String(p.timestamp || new Date().toISOString()),
          paymentDate: String(p.paymentDate || p["Fecha Pago"] || new Date().toISOString().split('T')[0]),
          cedulaRepresentative: cedula,
          matricula: String(p.matricula || p.Matricula || 'N/A'),
          level: (p.level || p.Nivel || Level.PRIMARIA) as Level,
          method: (p.method || p.Instrumento || PaymentMethod.PAGO_MOVIL) as PaymentMethod,
          reference: ref,
          amount: isNaN(amount) ? 0 : amount,
          observations: String(p.observations || p.Observaciones || '[Oficina Virtual]'),
          status: PaymentStatus.PENDIENTE, // Forzamos PENDIENTE para que aparezca en Verificación
          type: (String(p.type || '').toUpperCase().includes('ABONO') ? 'ABONO' : 'TOTAL') as 'ABONO' | 'TOTAL',
          pendingBalance: parseFloat(String(p.pendingBalance || 0))
        };
      });
    } catch (error) {
      console.error('Error Oficina Virtual:', error);
      return [];
    }
  },

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
          ledger 
        } 
      };

      await fetch(url, {
        method: 'POST',
        mode: 'no-cors', // Evita errores de preflight CORS
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });
      
      return true;
    } catch (error) {
      return false;
    }
  }
};
