'use client';

export interface ToastItem {
  id: number;
  teamName: string;
  flag: string;
}

interface Props {
  toasts: ToastItem[];
}

export function CompletionToast({ toasts }: Props) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="toast-enter bg-white dark:bg-gray-800 border border-green-200 dark:border-green-700 shadow-xl rounded-2xl px-4 py-3 flex items-center gap-3 min-w-[220px]"
        >
          <span className="text-2xl leading-none">{t.flag}</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100">🎉 {t.teamName} complète !</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Toutes les vignettes collées</p>
          </div>
          <span className="text-green-500 font-bold text-base">✓</span>
        </div>
      ))}
    </div>
  );
}
