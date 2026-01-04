import { User, Representative, PaymentRecord, LevelFees, PaymentStatus, Level, PaymentMethod } from '../types';

const SISTEM_COL_SHEET_ID = '12D-vuHFdm9ZEowT0cLR8QWYhzYgp40grsdmVHjfqiw';
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxNBy31uyMDtIQ0BhfMHISH4SyTA1w9_dtFO7DdfCFgnkniSXKlEPIB8AEFyQo7aoTvFw/exec';

const cleanId = (id: any): string => {
  if (!id) return '0';
  return String(id).replace(/[VEve\-\.\s]/g, '').trim();
};

const normalizeStr = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

const getFlexValue = (obj: any, searchKey: string): any => {
  const target = normalizeStr(searchKey).replace(/\s/g, "");
  const key = Object.keys(obj).find(k => normalizeStr(k).replace(/\s/g, "") === target);
  return key ? obj[key] : undefined;
};

// Mapeo inteligente para asegurar que el string de Sheets coincida con el Enum
const mapStatus = (val: string): PaymentStatus => {
  const s = normalizeStr(val);
  if (s.includes('verificado') || s.includes('aprobado')) return PaymentStatus.VERIFICADO;
  if (s.includes('rechazado') || s.includes('negado')) return PaymentStatus.RECHAZADO;
  return PaymentStatus.PENDIENTE;
};

const mapMethod = (val: string): PaymentMethod => {
  const m = normalizeStr(val);
  if (m.includes('zelle')) return PaymentMethod.ZELLE;
  if (m.includes('pago movil')) return PaymentMethod.PAGO_MOVIL;
  if (m.includes('transferencia')) return PaymentMethod.TRANSFERENCIA;
  if (m.includes('efectivo') && m.includes('$')) return PaymentMethod.EFECTIVO_USD;
  if (m.includes('efectivo') && (m.includes('bs') || m.includes('bolivares'))) return PaymentMethod.EFECTIVO_BS;
  if (m.includes('tdc')) return PaymentMethod.TDC;
  if (m.includes('tdd')) return PaymentMethod.TDD;
  return PaymentMethod.PAGO_MOVIL; // Default para electrónicos desconocidos
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
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  },

  async fetchAll() {
    if (!this.isValidConfig()) return null;
    try {
      const response = await fetch(`${this.getScriptUrl()}?action=read_all&sheetId=${SISTEM_COL_SHEET_ID}&t=${Date.now()}`, {
        method: 'GET',
        mode: 'cors',
        redirect: 'follow'
      });
      return await this.safeParseJson(response);
    } catch (error) {
      return null;
    }
  },

  async fetchVirtualOfficePayments() {
    if (!this.isValidConfig()) return [];
    try {
      const response = await fetch(`${this.getScriptUrl()}?action=get_external_payments&sheetId=${SISTEM_COL_SHEET_ID}&sheetName=OficinaVirtual&t=${Date.now()}`, {
        method: 'GET',
        mode: 'cors',
        redirect: 'follow'
      });
      const result = await this.safeParseJson(response);
      if (!result) return [];
      
      const rawPayments = Array.isArray(result) ? result : (result.payments || result.data || []);
      
      return rawPayments.map((p: any, index: number) => {
        const rawMonto = getFlexValue(p, 'amount') || getFlexValue(p, 'monto') || 0;
        const amount = parseFloat(String(rawMonto).replace(',', '.'));
        const ref = String(getFlexValue(p, 'reference') || getFlexValue(p, 'referencia') || 'S/R');
        const cedula = cleanId(getFlexValue(p, 'cedulaRepresentative') || getFlexValue(p, 'cedula') || getFlexValue(p, 'representante'));
        const idFromSheet = String(getFlexValue(p, 'id') || '');
        
        let finalId = idFromSheet;
        if (!finalId.startsWith('OV-')) {
          finalId = `OV-${ref}-${index}`;
        }

        return {
          id: finalId, 
          timestamp: String(getFlexValue(p, 'timestamp') || new Date().toISOString()),
          paymentDate: String(getFlexValue(p, 'paymentDate') || getFlexValue(p, 'fecha') || new Date().toISOString().split('T')[0]),
          cedulaRepresentative: cedula,
          matricula: String(getFlexValue(p, 'matricula') || 'N/A'),
          level: (getFlexValue(p, 'level') || Level.PRIMARIA) as Level,
          method: mapMethod(String(getFlexValue(p, 'method') || getFlexValue(p, 'instrumento') || 'Pago Movil')),
          reference: ref,
          amount: isNaN(amount) ? 0 : amount,
          observations: String(getFlexValue(p, 'observations') || getFlexValue(p, 'observaciones') || '[Oficina Virtual]'),
          status: mapStatus(String(getFlexValue(p, 'status') || 'Pendiente')),
          type: (String(getFlexValue(p, 'type') || '').toUpperCase().includes('ABONO') ? 'ABONO' : 'TOTAL') as 'ABONO' | 'TOTAL',
          pendingBalance: parseFloat(String(getFlexValue(p, 'pendingBalance') || 0))
        };
      });
    } catch (error) {
      return [];
    }
  },

  async syncAll(data: any) {
    if (!this.isValidConfig()) return false;
    try {
      await fetch(this.getScriptUrl(), {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'sync_all', sheetId: SISTEM_COL_SHEET_ID, data: data })
      });
      return true;
    } catch (error) {
      return false;
    }
  }
};