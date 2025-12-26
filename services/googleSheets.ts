
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
   * Obtiene todos los datos de la Base de Datos Principal (ColegioPay)
   */
  async fetchAll() {
    const url = this.getScriptUrl();
    if (!this.isValidConfig()) return null;

    try {
      const response = await fetch(`${url}?action=read_all&sheetId=${COLEGIO_PAY_SHEET_ID}`, {
        method: 'GET',
        cache: 'no-store'
      });
      
      if (!response.ok) throw new Error(`Error de conexión: ${response.status}`);
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
   * Obtiene datos específicamente de la OFICINA VIRTUAL (17slRl...)
   * Implementa un mapeo flexible de headers para asegurar la captura de datos.
   */
  async fetchVirtualOfficePayments() {
    const url = this.getScriptUrl();
    if (!this.isValidConfig()) return [];

    try {
      const targetUrl = `${url}?action=get_external_payments&sheetId=${VIRTUAL_OFFICE_SHEET_ID}&sheetName=consolidado`;
      
      const response = await fetch(targetUrl, {
        method: 'GET',
        cache: 'no-store'
      });

      if (!response.ok) throw new Error('Error de red con Oficina Virtual');
      
      const result = await response.json();
      const rawPayments = Array.isArray(result) ? result : (result.payments || result.data || []);
      
      if (!rawPayments || rawPayments.length === 0) return [];

      return rawPayments.map((p: any) => {
        // Mapeo robusto: Busca el valor en múltiples posibles nombres de columna
        const getVal = (keys: string[]) => {
          for (const key of keys) {
            if (p[key] !== undefined) return p[key];
          }
          return undefined;
        };

        const rawCedula = String(getVal(["Cedula Representan", "Cédula", "Cedula", "cedulaRepresen", "cedula"]) || '0');
        const cleanCedula = rawCedula.replace('V-', '').replace('E-', '').trim();
        
        const rawMonto = getVal(["Monto", "Amount", "monto", "amount"]) || 0;
        const amount = typeof rawMonto === 'string' ? parseFloat(rawMonto.replace(',', '.')) : parseFloat(rawMonto);

        const ref = String(getVal(["Referencia", "Reference", "referencia", "reference"]) || '000000');
        const ts = String(getVal(["Timestamp", "Fecha", "timestamp", "date"]) || new Date().toISOString());

        return {
          id: `EXT-${ref}-${cleanCedula}-${Date.now()}`,
          timestamp: ts,
          paymentDate: String(getVal(["Fecha Pago", "Fecha", "date"]) || new Date().toISOString().split('T')[0]),
          cedulaRepresentative: cleanCedula,
          matricula: String(getVal(["Matricula", "Matrícula", "matricula"]) || 'N/A'),
          level: (getVal(["Nivel", "Level", "nivel"]) || Level.PRIMARIA) as Level,
          method: String(getVal(["Tipo Pago", "Metodo", "method"]) || 'Pago Móvil'),
          reference: ref,
          amount: isNaN(amount) ? 0 : amount,
          observations: `[OFICINA VIRTUAL] ${getVal(["Observaciones", "observations"]) || ''}`,
          status: PaymentStatus.PENDIENTE,
          type: 'TOTAL',
          pendingBalance: 0
        };
      });
    } catch (error) {
      console.error('Error crítico sincronizando Oficina Virtual:', error);
      return [];
    }
  },

  /**
   * Sincroniza el estado global de la App hacia la hoja ColegioPay
   */
  async syncAll(data: { users: User[], representatives: Representative[], payments: PaymentRecord[], fees: LevelFees }) {
    const url = this.getScriptUrl();
    if (!this.isValidConfig()) return false;

    try {
      // Calcular Ledger para reporte en Drive
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
        data: { ...data, ledger } 
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
