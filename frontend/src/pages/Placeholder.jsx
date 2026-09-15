import { Construction } from "lucide-react";

export default function Placeholder({ titulo, descricao }) {
  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-terra-line px-8 py-4">
        <h1 className="font-display text-lg font-medium text-terra-navy">{titulo}</h1>
      </header>
      <div className="flex flex-1 items-center justify-center px-8">
        <div className="max-w-sm text-center">
          <Construction className="mx-auto text-terra-ink-muted" size={22} strokeWidth={1.5} />
          <p className="mt-3 text-sm text-terra-ink-muted">{descricao}</p>
          <p className="mt-1 text-sm text-terra-ink-muted">
            Fase 2 do <span className="font-mono text-xs">PAINEL-STATUS.md</span>. Usa o
            Chat enquanto isso.
          </p>
        </div>
      </div>
    </div>
  );
}
