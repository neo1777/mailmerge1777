import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppHeader } from './components/layout/AppHeader';
import { AppFooter } from './components/layout/AppFooter';
import { WizardSidebar } from './components/layout/WizardSidebar';
import { Step1Dati } from './pages/Step1_Dati';
import { Step2Template } from './pages/Step2_Template';
import { Step3Mapping } from './pages/Step3_Mapping';
import { Step4Email } from './pages/Step4_Email';
import { Step5Invio } from './pages/Step5_Invio';
import { Step6Monitor } from './pages/Step6_Monitor';
import { useBackendStatus } from './hooks/useBackendStatus';
import { ReportParsing } from './types';

export interface AppState {
  destinatari: any[];
  colonneRilevate: string[];
  campiDerivati: string[];
  reportParsing?: ReportParsing;
  templatePdf: any;
  allegatiStatici: any[];
  campiPdf: any[];
  mapping: any[];
  configEmail: {
    oggetto: string;
    html: string;
    testo: string;
    firma: string;
    includiFirma: boolean;
  };
  opzioniPdf: {
      appiattisciCampiDato: boolean;
      appiattisciCampiCliente: boolean;
  };
}

export default function App() {
  const [maxStepReached, setMaxStepReached] = useState(1);
  const [appState, setAppState] = useState<AppState>({
    destinatari: [],
    colonneRilevate: [],
    campiDerivati: [],
    templatePdf: null,
    allegatiStatici: [],
    campiPdf: [],
    mapping: [],
    configEmail: {
      oggetto: '', html: '', testo: '', firma: '', includiFirma: true
    },
    opzioniPdf: { appiattisciCampiDato: true, appiattisciCampiCliente: false }
  });

  const [configLoaded, setConfigLoaded] = useState(false);
  const { status } = useBackendStatus();
  const isOffline = status === 'offline';

  useEffect(() => {
     fetch('/api/config')
       .then(r => r.json())
       .then(data => {
           setAppState(prev => ({
               ...prev,
               configEmail: data.email || prev.configEmail,
               opzioniPdf: (data.pdf && data.pdf.opzioni) ? data.pdf.opzioni : prev.opzioniPdf
           }));
           setConfigLoaded(true);
       })
       .catch(err => {
         console.error(err);
         setConfigLoaded(true); // Evita di bloccare l'interfaccia se offline
       });
  }, []);

  if (!configLoaded) return <div className="p-8 text-center text-[#94a3b8]">Avvio applicazione...</div>;

  return (
    <BrowserRouter basename={window.location.pathname.startsWith('/mailmerge1777') ? '/mailmerge1777' : '/'}>
      <div className="min-h-screen flex flex-col font-sans text-slate-200" style={{ backgroundColor: '#020203', backgroundImage: 'radial-gradient(circle at 50% 0%, #0f172a 0%, #020617 100%)' }}>
        <AppHeader />
        
        <div className="flex-1 flex overflow-hidden">
          <WizardSidebar maxStepReached={maxStepReached} />
          
          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-4xl mx-auto flex flex-col min-h-full">
              <Routes>
                <Route path="/" element={<Navigate to="/step1" replace />} />
                <Route path="/step1" element={
                  <Step1Dati state={appState} setState={setAppState} isOffline={isOffline} />
                } />
                <Route path="/step2" element={
                    <Step2Template state={appState} setState={setAppState} isOffline={isOffline} />
                } />
                <Route path="/step3" element={
                    <Step3Mapping state={appState} setState={setAppState} isOffline={isOffline} />
                } />
                <Route path="/step4" element={
                    <Step4Email state={appState} setState={setAppState} isOffline={isOffline} />
                } />
                <Route path="/step5" element={
                    <Step5Invio state={appState} setState={setAppState} isOffline={isOffline} />
                } />
                <Route path="/step6" element={
                    <Step6Monitor state={appState} />
                } />
              </Routes>
              
              <AppFooter />
            </div>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
