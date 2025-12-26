
import { User, Representative, PaymentRecord, LevelFees, PaymentStatus, Level } from '../types';

// IDs de las Hojas de Cálculo según requerimiento
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

  /**
   * Obtiene datos de la Base de Datos ColegioPay (Interna)
   */
  async fetchAll() {
    const url = this.getScriptUrl();
    if (!this.isValidConfig()) return null;

    try {
      const response = await fetch(`${url}?action=read_all&sheetId=${COLEGIO_PAY_SHEET_ID}`, {
        method: 'GET',
        cache: 'no-store'
      });
      
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      const data = await response.json();
      
      if (data && data.payments) {
        data.payments = data.payments.map((p: any) => ({
          ...p,
          cedulaRepresentative: String(p.cedulaRepresentative || p.cedula || '0').replace('V-', '').replace('E-', '').trim()
        }));
      }
      return data;
    } catch (error) {
      console.error('Error al leer ColegioPay:', error);
      return null;
    }
  },

  /**
   * Obtiene datos de la OFICINA VIRTUAL (Externa - Padres)
   * Mapeo robusto de columnas para evitar fallos por nombres de headers.
   */
  async fetchVirtualOfficePayments() {
    const url = this.getScriptUrl();
    if (!this.isValidConfig()) return [];

    try {
      // Forzamos la consulta a la hoja 'consolidado' del ID de Oficina Virtual
      const targetUrl = `${url}?action=get_external_payments&sheetId=${VIRTUAL_OFFICE_SHEET_ID}&sheetName=consolidado`;
      
      const response = await fetch(targetUrl, {
        method: 'GET',
        cache: 'no-store'
      });

      if (!response.ok) throw new Error('Fallo de conexión con Oficina Virtual');
      
      const result = await response.json();
      const rawPayments = Array.isArray(result) ? result : (result.payments || result.data || []);
      
      if (rawPayments.length === 0) return [];

      return rawPayments.map((p: any) => {
        // Buscamos variaciones comunes de nombres de columnas que suelen venir del Sheet
        const rawCedula = String(p["Cedula Representan"] || p["Cédula"] || p.cedulaRepresen || p.cedulaRepresentative || p.cedula || '0');
        const cleanCedula = rawCedula.replace('V-', '').replace('E-', '').trim();
        
        const rawMonto = p["Monto"] || p["Amount"] || p.amount || 0;
        const amount = typeof rawMonto === 'string' ? parseFloat(rawMonto.replace(',', '.')) : parseFloat(rawMonto);

        const ref = String(p["Referencia"] || p["Reference"] || p.reference || '000000');
        const ts = String(p["Timestamp"] || p["Fecha"] || p.timestamp || new Date().toISOString());

        return {
          id: `EXT-${ref}-${cleanCedula}-${Date.now()}`, // ID único compuesto
          timestamp: ts,
          paymentDate: p["Fecha Pago"] || p["Fecha"] || p.paymentDate || new Date().toISOString().split('T')[0],
          cedulaRepresentative: cleanCedula,
          matricula: p["Matricula"] || p["Matrícula"] || p.matricula || 'N/A',
          level: (p["Nivel"] || p.level || Level.PRIMARIA) as Level,
          method: (p["Tipo Pago"] || p["Metodo"] || p.method || 'Pago Móvil'),
          reference: ref,
          amount: isNaN(amount) ? 0 : amount,
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
   * Sincroniza datos hacia ColegioPay
   */
  async syncAll(data: { users: User[], representatives: Representative[], payments: PaymentRecord[], fees: LevelFees }) {
    const url = this.getScriptUrl();
    if (!this.isValidConfig()) return false;

    // Preparar el Ledger para la hoja de cálculo
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
        sheetId: COLEGIO_PAY_SHEET_ID,
        data: {
          ...data,
          ledger: ledger
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
      console.error('Error de sincronización POST:', error);
      return false;
    }
  }
};
export default sheetService;