import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { Check, ChevronRight } from 'lucide-react';

const steps = [
  { path: '/step1', number: 1, title: 'Dati Destinatari', desc: 'Carica file Excel/CSV' },
  { path: '/step2', number: 2, title: 'Template & Allegati', desc: 'PDF AcroForm e file fissi' },
  { path: '/step3', number: 3, title: 'Mapping Dati', desc: 'Collega i campi al PDF' },
  { path: '/step4', number: 4, title: 'Email & Opzioni', desc: 'Oggetto, testo e firma' },
  { path: '/step5', number: 5, title: 'Configurazione Invio', desc: 'SMTP e opzioni finali' },
  { path: '/step6', number: 6, title: 'Monitoraggio', desc: 'Stato invio in tempo reale' },
];

export function WizardSidebar({ maxStepReached }: { maxStepReached: number }) {
  const location = useLocation();
  const currentStep = steps.find(s => s.path === location.pathname)?.number || 1;

  return (
    <aside className="w-full md:w-64 lg:w-80 bg-transparent border-r border-white/5 p-6 flex flex-col hidden md:flex shrink-0 overflow-y-auto">
      <nav className="flex-1">
        <ul className="space-y-6">
          {steps.map((step) => {
            const isCurrent = currentStep === step.number;
            const isCompleted = step.number < currentStep;
            const isLocked = step.number > maxStepReached && step.number !== 6;

            return (
              <li key={step.number} className="relative">
                {step.number !== steps.length && (
                  <div className={clsx(
                    "absolute left-4 top-10 bottom-[-24px] w-[2px]",
                    isCompleted ? "bg-[#10b981]" : "bg-slate-700"
                  )} />
                )}
                
                <Link
                  to={isLocked ? '#' : step.path}
                  onClick={(e) => isLocked && e.preventDefault()}
                  className={clsx(
                    "relative flex items-start gap-4 p-2 rounded-lg transition-colors",
                    isLocked ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-slate-800/50",
                    isCurrent && "bg-[#0f172a]/40 shadow-sm ring-1 ring-white/10"
                  )}
                >
                  <div className={clsx(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-colors",
                    isCurrent ? "bg-[#10b981] text-white ring-4 ring-[#10b981]/20" : 
                    isCompleted ? "bg-[#10b981] text-white" : 
                    "bg-slate-700 text-[#94a3b8]"
                  )}>
                    {isCompleted ? <Check size={16} strokeWidth={3} /> : <span className="text-sm font-bold">{step.number}</span>}
                  </div>
                  
                  <div>
                    <div className={clsx(
                      "font-semibold text-sm",
                      isCurrent ? "text-white" : "text-slate-300"
                    )}>
                      {step.title}
                    </div>
                    <div className="text-xs text-[#94a3b8] mt-0.5">
                      {step.desc}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
