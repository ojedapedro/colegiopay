import { User, Representative, PaymentRecord, LevelFees, PaymentStatus, Level, PaymentMethod } from '../types';

// ID de la Hoja de Cálculo SistemCol (ColegioPay)
const COLEGIO_PAY_SHEET_ID = '13lZSsC2YeTv6hPd1ktvOsexcIj9CA2wcpbxU-gvdVLo';

// URL del Apps Script (Motor de datos)
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxv497Vl2JiZMx4clinJ-BXmEEHRnZaxfho3-ZRTVp1gtmbk69ncbAHsxxCsPz03vOcyg/exec';

/**
 * Utilidad para normalizar cédulas: elimina prefijos (V-, E-), puntos y espacios.
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

  async safeParseJson(response: Response) {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      console.warn('Respuesta no JSON recibida:', text);
      return null;
    }
  },

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
          cedulaRepresentative: cleanId(p.cedulaRepresen || p.cedulaRepresentative || p.cedula)
        }));
      }

      if (data && data.representatives) {
        data.representatives = data.representatives.map((r: any) => ({
          ...r,
          cedula: cleanId(r.cedula)
        }));
      }

      return data;
    } catch (error) {
      console.error('Error al leer ColegioPay:', error);
      return null;
    }
  },

  /**
   * Obtiene datos de la pestaña 'OficinaVirtual' dentro de SistemCol
   */
  async fetchVirtualOfficePayments() {
    const url = this.getScriptUrl();
    if (!this.isValidConfig()) return [];

    try {
      const targetUrl = `${url}?action=get_external_payments&sheetId=${COLEGIO_PAY_SHEET_ID}&sheetName=OficinaVirtual&t=${Date.now()}`;
      
      const response = await fetch(targetUrl, {
        method: 'GET',
        cache: 'no-store'
      });

      const result = await this.safeParseJson(response);
      if (!result) return [];

      const rawPayments = Array.isArray(result) ? result : (result.payments || result.data || []);
      
      return rawPayments.map((p: any) => {
        // Mapeo basado en la estructura de la imagen de Google Sheets
        const cleanedCedula = cleanId(p["Cedula Represe"] || p["Cedula Representante"] || p.cedula);
        const rawMonto = p["Monto"] || p["Amount"] || 0;
        const amount = typeof rawMonto === 'string' ? parseFloat(rawMonto.replace(',', '.')) : parseFloat(rawMonto);
        const ref = String(p["Referencia"] || p.reference || '000000');
        
        return {
          id: `WEB-${ref}-${cleanedCedula}-${Date.now()}`,
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
      console.error('Error leyendo OficinaVirtual:', error);
      return [];
    }
  },

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
        sheetId: COLEGIO_PAY_SHEET_ID,
        data: { 
          users: data.users,
          representatives: cleanedReps,
          payments: cleanedPays,
          fees: data.fees,
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