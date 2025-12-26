
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
   * Intenta parsear una respuesta como JSON de forma segura.
   * Si la respuesta es texto plano (como "Servicio Activo"), devuelve null o un objeto vacío.
   */
  async safeParseJson(response: Response) {
    const text = await response.text();
    try {
      // Intentamos parsear. Google Apps Script a veces devuelve texto plano si hay un error o configuración por defecto.
      return JSON.parse(text);
    } catch (e) {
      console.warn('La respuesta del servidor no es un JSON válido. Recibido:', text);
      return null;
    }
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
      
      if (!response.ok) throw new Error(`Error de conexión HTTP: ${response.status}`);
      
      const data = await this.safeParseJson(response);
      
      if (data && data.payments) {
        data.payments = data.payments.map((p: any) => ({
          ...p,
          cedulaRepresentative: String(p.cedulaRepresentative || p.cedula || '0').replace('V-', '').replace('E-', '').trim()
        }));
      }
      return data;
    } catch (error) {
      console.error('Error crítico al leer ColegioPay:', error);
      return null;
    }
  },

  /**
   * Obtiene datos específicamente de la OFICINA VIRTUAL (17slRl...)
   */
  async fetchVirtualOfficePayments() {
    const url = this.getScriptUrl();
    if (!this.isValidConfig()) return [];

    try {
      // Agregamos parámetros de prevención de caché y especificamos la hoja 'consolidado'
      const targetUrl = `${url}?action=get_external_payments&sheetId=${VIRTUAL_OFFICE_SHEET_ID}&sheetName=consolidado&t=${Date.now()}`;
      
      const response = await fetch(targetUrl, {
        method: 'GET',
        cache: 'no-store'
      });

      if (!response.ok) throw new Error('Error de red con la Oficina Virtual');
      
      const result = await this.safeParseJson(response);
      
      // Si el resultado es null (porque recibimos "Servicio Activo"), devolvemos array vacío.
      if (!result) return [];

      const rawPayments = Array.isArray(result) ? result : (result.payments || result.data || []);
      
      if (!rawPayments || rawPayments.length === 0) return [];

      return rawPayments.map((p: any) => {
        const getVal = (keys: string[]) => {
          for (const key of keys) {
            if (p[key] !== undefined && p[key] !== null) return p[key];
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

      // Usamos POST con modo no-cors para evitar problemas de preflight en Apps Script
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
