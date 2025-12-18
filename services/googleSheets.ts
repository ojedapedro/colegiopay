
import { User, Representative, PaymentRecord, LevelFees } from '../types';

export const sheetService = {
  getScriptUrl() {
    return localStorage.getItem('school_script_url') || '';
  },

  setScriptUrl(url: string) {
    localStorage.setItem('school_script_url', url);
  },

  isValidConfig() {
    const url = this.getScriptUrl();
    return url !== '' && (url.startsWith('https://script.google.com') || url.startsWith('https://script.googleusercontent.com'));
  },

  async fetchAll() {
    const url = this.getScriptUrl();
    if (!this.isValidConfig()) return null;

    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow'
      });
      
      if (!response.ok) {
        throw new Error(`Error de servidor: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Validar si la respuesta contiene un error del script
      if (data && data.error) {
        console.error('Error desde Google Script:', data.error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error al conectar con Google Sheets:', error);
      return null;
    }
  },

  async syncAll(data: { users: User[], representatives: Representative[], payments: PaymentRecord[], fees: LevelFees }) {
    const url = this.getScriptUrl();
    if (!this.isValidConfig()) return false;

    try {
      // Usamos no-cors para evitar problemas de pre-flight CORS con Google Apps Script
      // Aunque no podemos leer la respuesta, los datos se envían correctamente.
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'sync_all',
          data
        })
      });
      return true;
    } catch (error) {
      console.error('Error de sincronización:', error);
      return false;
    }
  }
};
