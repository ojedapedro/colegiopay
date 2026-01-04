import { User, Representative, PaymentRecord, LevelFees, PaymentStatus, Level, PaymentMethod } from '../types';

/**
 * ID de la base de datos principal extraído de la captura de pantalla del usuario.
 */
const SISTEM_COL_SHEET_ID = '12D-vuHFdm9ZEowT0cLR8QWYhzYgp40grsdmVHjfqiw';

/** 
 * URL del Apps Script (Puente de conexión).
 */
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxNBy31uyMDtIQ0BhfMHISH4SyTA1w9_dtFO7DdfCFgnkniSXKlEPIB8AEFyQo7aoTvFw/exec';

const cleanId = (id: any): string => {
  if (!id) return '0';
  return String(id).replace(/[VEve\-\.\s]/g, '').trim();
};

const getFlexValue = (obj: any, searchKey: string): any => {
  const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s/g, "");
  const target = normalize(searchKey);
  const key = Object.keys(obj).find(k => normalize(k) === target);
  return key ? obj[key] : undefined;
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
      if (!text || text.includes('<!DOCTYPE') || text.length < 5) {
        return null;
      }
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  },

  /**
   * Obtiene todos los datos maestros de la hoja SistColPay
   */
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
      return (data && !data.error) ? data : null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Sincronización específica para pagos electrónicos de Oficina Virtual y Pagos Administrativos
   */
  async fetchVirtualOfficePayments() {
    if (!this.isValidConfig()) return [];
    const url = this.getScriptUrl();
    try {
      // Se solicitan los datos de la pestaña "OficinaVirtual"
      const targetUrl = `${url}?action=get_external_payments&sheetId=${SISTEM_COL_SHEET_ID}&sheetName=OficinaVirtual&t=${Date.now()}`;
      const response = await fetch(targetUrl, { method: 'GET', mode: 'cors', redirect: 'follow' });
      const result = await this.safeParseJson(response);
      
      if (!result) return [];
      const rawPayments = Array.isArray(result) ? result : (result.payments || result.data || []);
      
      return rawPayments.map((p: any, index: number) => {
        const amount = parseFloat(String(getFlexValue(p, 'amount') || getFlexValue(p, 'monto') || 0).replace(',', '.'));
        const ref = String(getFlexValue(p, 'reference') || getFlexValue(p, 'referencia') || '0');
        const cedula = cleanId(getFlexValue(p, 'cedulaRepresentative') || getFlexValue(p, 'cedula') || getFlexValue(p, 'representante'));
        const idFromSheet = String(getFlexValue(p, 'id') || '');
        
        // Mantener integridad de IDs OV-
        let finalId = idFromSheet;
        if (!finalId.startsWith('OV-')) {
          finalId = `OV-${index}-${ref}`;
        }

        return {
          id: finalId, 
          timestamp: String(getFlexValue(p, 'timestamp') || new Date().toISOString()),
          paymentDate: String(getFlexValue(p, 'paymentDate') || getFlexValue(p, 'fecha') || new Date().toISOString().split('T')[0]),
          cedulaRepresentative: cedula,
          matricula: String(getFlexValue(p, 'matricula') || 'N/A'),
          level: (getFlexValue(p, 'level') || Level.PRIMARIA) as Level,
          method: (getFlexValue(p, 'method') || getFlexValue(p, 'instrumento') || PaymentMethod.PAGO_MOVIL) as PaymentMethod,
          reference: ref,
          amount: isNaN(amount) ? 0 : amount,
          observations: String(getFlexValue(p, 'observations') || getFlexValue(p, 'observaciones') || '[Oficina Virtual]'),
          status: (getFlexValue(p, 'status') || PaymentStatus.PENDIENTE) as PaymentStatus,
          type: (String(getFlexValue(p, 'type') || '').toUpperCase().includes('ABONO') ? 'ABONO' : 'TOTAL') as 'ABONO' | 'TOTAL',
          pendingBalance: parseFloat(String(getFlexValue(p, 'pendingBalance') || 0))
        };
      });
    } catch (error) {
      return [];
    }
  },

  async syncAll(data: { users: User[], representatives: Representative[], payments: PaymentRecord[], fees: LevelFees }) {
    if (!this.isValidConfig()) return false;
    const url = this.getScriptUrl();
    try {
      const payload = { 
        action: 'sync_all', 
        sheetId: SISTEM_COL_SHEET_ID,
        data: data 
      };

      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });
      return true;
    } catch (error) {
      return false;
    }
  }
};