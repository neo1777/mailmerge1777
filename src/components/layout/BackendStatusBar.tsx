import { useBackendStatus } from '../../hooks/useBackendStatus';
import { detectOs, getScriptInfo, downloadServerPackage } from '../../utils/osDetection';
import { useState } from 'react';

export function BackendStatusBar() {
  const { status, retry, lastChecked } = useBackendStatus();
  const [showInstructions, setShowInstructions] = useState(false);

  const os = detectOs();
  const scriptInfo = getScriptInfo(os);

  if (status === 'checking') {
    return (
      <div className="w-full bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center gap-2 text-sm text-gray-400">
        <span className="w-2 h-2 rounded-full bg-gray-500 animate-pulse inline-block" />
        Verifica connessione al server locale...
      </div>
    );
  }

  if (status === 'online') {
    return (
      <div className="w-full bg-green-950 border-b border-green-800 px-4 py-2 flex items-center gap-2 text-sm text-green-400">
        <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
        Server locale online — pronto all'uso
        {lastChecked && (
          <span className="ml-auto text-green-700 text-xs">
            Ultimo controllo: {lastChecked.toLocaleTimeString('it-IT')}
          </span>
        )}
      </div>
    );
  }

  // status === 'offline'
  return (
    <div className="w-full bg-red-950 border-b border-red-800">
      {/* Barra principale */}
      <div className="px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-red-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
          Server locale non raggiungibile
        </div>

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <div className="flex flex-col gap-1 items-end mr-4">
            <button
              onClick={downloadServerPackage}
              className="flex items-center gap-1.5 bg-red-700 hover:bg-red-600 text-white text-sm px-3 py-1.5 rounded transition-colors shadow-md border border-red-500/50"
            >
              ↓ Scarica pacchetto server (.zip)
            </button>
            <span className="text-red-300 text-xs">
              Dopo l'estrazione: {
                os === 'windows' ? 'doppio clic su start.bat' :
                os === 'mac'     ? 'terminale → ./start-mac.sh' :
                os === 'linux'   ? 'terminale → ./start-linux.sh' :
                'avviare lo script per il proprio sistema'
              }
            </span>
          </div>

          <button
            onClick={() => setShowInstructions(v => !v)}
            className="text-red-300 hover:text-white text-sm underline"
          >
            {showInstructions ? 'Nascondi istruzioni' : 'Come avviarlo?'}
          </button>

          <button
            onClick={retry}
            className="text-red-300 hover:text-white text-sm border border-red-700 px-2 py-1 rounded"
          >
            ↺ Riprova
          </button>
        </div>
      </div>

      {/* Pannello istruzioni espandibile */}
      {showInstructions && (
        <div className="px-4 pb-4 border-t border-red-900 mt-1 pt-3">
          <p className="text-red-300 text-sm font-medium mb-2">
            Come avviare il server ({scriptInfo.label}):
          </p>
          <ol className="text-red-200 text-sm space-y-1 list-decimal list-inside">
            {scriptInfo.instructions.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
          <p className="text-red-400 text-xs mt-3">
            Il server deve girare sul PC dove vuoi salvare i file di output e usare l'SMTP.
            Dopo averlo avviato, questa barra diventerà verde automaticamente e il PC locale si collegherà all'app.
          </p>
        </div>
      )}
    </div>
  );
}
