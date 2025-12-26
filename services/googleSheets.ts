
import { User, Representative, PaymentRecord, LevelFees, PaymentStatus } from '../types';

// ID de la Base de Datos Principal de la Aplicación (ColegioPay)
const COLEGIO_PAY_SHEET_ID = '13lZSsC2YeTv6hPd1ktvOsexcIj9CA2wcpbxU-gvdVLo';
// ID de la Base de Datos Externa (Oficina Virtual / Padres)
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
   * Obtiene todos los datos desde la hoja COLEGIO PAY (Base Interna)
   */
  async fetchAll() {
    const url = this.getScriptUrl();
    if (!this.isValidConfig()) return null;

    try {
      const response = await fetch(`${url}?action=read_all&sheetId=${COLEGIO_PAY_SHEET_ID}`, {
        method: 'GET',
        cache: 'no-store',
        mode: 'cors'
      });
      
      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
      const data = await response.json();
      
      if (data && data.payments) {
        data.payments = data.payments.map((p: any) => ({
          ...p,
          cedulaRepresentative: String(p.cedulaRepresentative || p.cedula || '0').replace('V-', '').replace('E-', '').trim()
        }));
      }
      return data;
    } catch (error) {
      console.warn('Fallo al leer base ColegioPay:', error);
      return null;
    }
  },

  /**
   * Sincroniza con la OFICINA VIRTUAL (Base Externa)
   * Trae los registros cargados por los representantes.
   */
  async fetchVirtualOfficePayments() {
    const url = this.getScriptUrl();
    if (!this.isValidConfig()) return [];

    try {
      // Forzamos la consulta a la hoja 'consolidado' del ID de Oficina Virtual
      const response = await fetch(`${url}?action=get_external_payments&sheetId=${VIRTUAL_OFFICE_SHEET_ID}&sheetName=consolidado`, {
        method: 'GET',
        cache: 'no-store',
        mode: 'cors'
      });

      if (!response.ok) throw new Error('Error al conectar con la Oficina Virtual');
      
      const result = await response.json();
      // El script puede devolver {payments: [...]} o el array directamente
      const rawPayments = Array.isArray(result) ? result : (result.payments || result.data || []);
      
      if (rawPayments.length === 0) return [];

      return rawPayments.map((p: any) => {
        const rawCedula = String(p["Cedula Representan"] || p.cedulaRepresen || p.cedulaRepresentative || p.cedula || '0');
        const cleanCedula = rawCedula.replace('V-', '').replace('E-', '').trim();
        const ref = String(p["Referencia"] || p.reference || '000000');
        const ts = String(p["Timestamp"] || p.timestamp || Date.now());
        
        return {
          id: `EXT-${ref}-${ts.replace(/[:\s\-\/]/g, '')}`,
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
      console.error('Error sincronizando Oficina Virtual:', error);
      return [];
    }
  },

  /**
   * Envía los datos a la nube para guardarlos en la hoja COLEGIO PAY
   */
  async syncAll(data: { users: User[], representatives: Representative[], payments: PaymentRecord[], fees: LevelFees }) {
    const url = this.getScriptUrl();
    if (!this.isValidConfig()) return false;

    // Calculamos el ledger para tener un espejo visual en el Google Sheet
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

    try {
      const payload = { 
        action: 'sync_all', 
        sheetId: COLEGIO_PAY_PAYMENTS_SHEET_ID_DUMMY, // El script suele tener el ID hardcoded pero lo enviamos por si acaso
        data: {
          ...data,
          ledger: ledger
        } 
      };

      // Usamos text/plain para evitar problemas de CORS preflight en Apps Script
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });
      
      return true;
    } catch (error) {
      console.error('Error de sincronización POST:', error);
      return false;
    }
  }
};

// Constante interna para ayudar al script a identificar la hoja principal
const COLEGIO_PAY_PAYMENTS_SHEET_ID_DUMMY = '13lZSsC2YeTv6hPd1ktvOsexcIj9CA2wcpbxU-gvdVLo';
