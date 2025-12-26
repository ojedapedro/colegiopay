
import { User, Representative, PaymentRecord, LevelFees, PaymentStatus, Level } from '../types';

// IDs de las Hojas de Cálculo según las imágenes proporcionadas
const COLEGIO_PAY_SHEET_ID = '13lZSsC2YeTv6hPd1ktvOsexcIj9CA2wcpbxU-gvdVLo';
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

  async safeParseJson(response: Response) {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      console.warn('Respuesta no JSON recibida:', text);
      return null;
    }
  },

  /**
   * Obtiene datos de ColegioPay (SistemCol)
   * Según Imagen 1: headers son 'id', 'cedulaRepresen', 'matricula', etc.
   */
  async fetchAll() {
    const url = this.getScriptUrl();
    if (!this.isValidConfig()) return null;

    try {
      const response = await fetch(`${url}?action=read_all&sheetId=${COLEGIO_PAY_SHEET_ID}`, {
        method: 'GET',
        cache: 'no-store'
      });
      
      const data = await this.safeParseJson(response);
      
      if (data && data.payments) {
        data.payments = data.payments.map((p: any) => ({
          ...p,
          // Mapeo según Imagen 1: 'cedulaRepresen'
          cedulaRepresentative: String(p.cedulaRepresen || p.cedulaRepresentative || p.cedula || '0')
            .replace(/[VEve]-/, '')
            .trim()
        }));
      }
      return data;
    } catch (error) {
      console.error('Error al leer ColegioPay:', error);
      return null;
    }
  },

  /**
   * Obtiene datos de Oficina Virtual
   * Según Imagen 2: headers son 'Cedula Representante', 'Matricula', 'Monto', 'Tipo Pago'
   */
  async fetchVirtualOfficePayments() {
    const url = this.getScriptUrl();
    if (!this.isValidConfig()) return [];

    try {
      const targetUrl = `${url}?action=get_external_payments&sheetId=${VIRTUAL_OFFICE_SHEET_ID}&sheetName=consolidado&t=${Date.now()}`;
      
      const response = await fetch(targetUrl, {
        method: 'GET',
        cache: 'no-store'
      });

      const result = await this.safeParseJson(response);
      if (!result) return [];

      const rawPayments = Array.isArray(result) ? result : (result.payments || result.data || []);
      
      return rawPayments.map((p: any) => {
        // Limpieza de Cédula (Remover V- o E-)
        const rawCedula = String(p["Cedula Representante"] || p["Cédula"] || p.cedula || '0');
        const cleanCedula = rawCedula.replace(/[VEve]-/, '').trim();
        
        const rawMonto = p["Monto"] || p["Amount"] || 0;
        const amount = typeof rawMonto === 'string' ? parseFloat(rawMonto.replace(',', '.')) : parseFloat(rawMonto);

        const ref = String(p["Referencia"] || p.reference || '000000');
        
        return {
          id: `EXT-${ref}-${cleanCedula}-${Date.now()}`,
          timestamp: String(p["Timestamp"] || new Date().toISOString()),
          paymentDate: String(p["Fecha Pago"] || p["Fecha Registro"] || new Date().toISOString().split('T')[0]),
          cedulaRepresentative: cleanCedula,
          matricula: String(p["Matricula"] || p["Matrícula"] || 'N/A'),
          level: (p["Nivel"] || Level.PRIMARIA) as Level,
          method: String(p["Tipo Pago"] || p["Modo Pago"] || 'Pago Móvil'),
          reference: ref,
          amount: isNaN(amount) ? 0 : amount,
          observations: `[OFICINA VIRTUAL] ${p["Observaciones"] || ''}`,
          status: PaymentStatus.PENDIENTE,
          type: (p["Modo Pago"] === 'Abono' ? 'ABONO' : 'TOTAL') as 'ABONO' | 'TOTAL',
          pendingBalance: 0
        };
      });
    } catch (error) {
      console.error('Error Oficina Virtual:', error);
      return [];
    }
  },

  async syncAll(data: { users: User[], representatives: Representative[], payments: PaymentRecord[], fees: LevelFees }) {
    const url = this.getScriptUrl();
    if (!this.isValidConfig()) return false;

    try {
      // Preparamos los pagos para que coincidan con los headers de la Imagen 1
      const paymentsToSync = data.payments.map(p => ({
        ...p,
        cedulaRepresen: p.cedulaRepresentative // Mapeo inverso para la hoja SistemCol
      }));

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
          deudaAcumulada: totalDue,
          totalAbonado: totalPaid,
          saldoPendiente: Math.max(0, totalDue - totalPaid)
        };
      });

      const payload = { 
        action: 'sync_all', 
        sheetId: COLEGIO_PAY_SHEET_ID,
        data: { 
          ...data, 
          payments: paymentsToSync,
          ledger 
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
      console.error('Error de sincronización:', error);
      return false;
    }
  }
};
