import { PDFDocument } from 'pdf-lib';
import fs from 'fs/promises';

export async function detectPdfFields(filePath: string) {
  const content = await fs.readFile(filePath);
  const pdfDoc = await PDFDocument.load(content);
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  if (fields.length === 0) {
    throw new Error("Questo PDF non ha campi form. Aprilo prima con acroform1777 per aggiungere i campi.");
  }

  const campiRilevati = fields.map(field => {
      // In pdf-lib 1.17, to check if a field is readonly, we check the field's internal flags or use isReadOnly() if available 
      // Actually isReadOnly() is a method on PDFField
      let readOnly = false;
      try {
           readOnly = field.isReadOnly();
      } catch(e) {}
      
      return {
          nome: field.getName(),
          tipo: readOnly ? 'dato' : 'cliente',
          // Pagina is not trivially retrieved in pdf-lib without traversing annotations, 
          // but we can put 1 for now or skip.
          pagina: 1 
      };
  });

  return campiRilevati;
}

export async function compilaPdf(templateBytes: Uint8Array, valoriCampi: Record<string, any>, opzioni: { appiattisciCampiDato: boolean, appiattisciCampiCliente: boolean }) {
  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();
  
  for (const [nomeCampo, valore] of Object.entries(valoriCampi)) {
    try {
      const field = form.getTextField(nomeCampo);
      field.setText(valore !== null && valore !== undefined ? String(valore) : '');
    } catch {
      // Ignore if field is not a text field or doesn't exist
    }
  }
  
  if (opzioni.appiattisciCampiDato) {
    form.getFields()
      .filter(f => {
          try { return f.isReadOnly() } catch { return false }
      })
      .forEach(f => {
         try { f.enableReadOnly(); } catch {}
      });
  }
  
  if (opzioni.appiattisciCampiCliente) {
    form.getFields()
      .filter(f => {
           try { return !f.isReadOnly() } catch { return true }
      })
      .forEach(f => {
         try { f.enableReadOnly(); } catch {}
      });
  }
  
  // To truly flatten, we would do form.flatten(), but it flattens everything.
  // The prompt asks to "Appiattisci" specific fields. Making them readonly is the AcroForm equivalent if we want to keep others editable.
  // If BOTH are selected, we can call form.flatten()
  if (opzioni.appiattisciCampiDato && opzioni.appiattisciCampiCliente) {
      form.flatten();
  }
  
  return await pdfDoc.save();
}
