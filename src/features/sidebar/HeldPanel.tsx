import { PushPin, PushPinSlash, Trash } from "@phosphor-icons/react";
import { useHeldStore } from "@/features/held/store";

interface Props {
  onOpenAt: (path: string, line?: number) => void;
}

export function HeldPanel({ onOpenAt }: Props) {
  const items = useHeldStore((s) => s.items);
  const remove = useHeldStore((s) => s.remove);
  const clear = useHeldStore((s) => s.clear);

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="px-3 pt-2 pb-1 flex items-center justify-between shrink-0">
        <p className="text-[10px] uppercase tracking-[0.12em] font-semibold text-stone-400 dark:text-stone-600">
          Held · {items.length}
        </p>
        <button
          type="button"
          onClick={clear}
          disabled={items.length === 0}
          title="Clear all"
          className="p-1 rounded text-stone-400 dark:text-stone-600 hover:text-stone-600 dark:hover:text-stone-400 hover:bg-stone-100 dark:hover:bg-white/[0.05] disabled:opacity-30 transition-colors"
        >
          <Trash size={11} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-1 pb-3">
        {items.length === 0 && (
          <p className="px-4 py-3 text-[11px] text-stone-400 dark:text-stone-600 leading-relaxed">
            <PushPin size={11} className="inline mr-1" />
            Pin search hits or files to keep them within reach.
          </p>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className="group flex items-start gap-1 px-2 py-1 rounded-md hover:bg-stone-50 dark:hover:bg-white/[0.03]"
          >
            <button
              type="button"
              onClick={() => onOpenAt(item.path, item.line)}
              className="flex-1 text-left min-w-0"
              title={item.path}
            >
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="text-[12px] font-medium text-stone-700 dark:text-stone-300 truncate">
                  {item.name}
                </span>
                {item.line != null && (
                  <span className="text-[10px] font-mono tabular-nums text-stone-400 dark:text-stone-600 shrink-0">
                    L{item.line}
                  </span>
                )}
              </div>
              {item.snippet && (
                <p className="text-[11px] text-stone-500 dark:text-stone-500 truncate mt-0.5">
                  {item.snippet}
                </p>
              )}
            </button>
            <button
              type="button"
              onClick={() => remove(item.id)}
              title="Unhold"
              className="p-0.5 text-stone-400 dark:text-stone-600 opacity-0 group-hover:opacity-100 hover:text-stone-700 dark:hover:text-stone-300 transition-opacity"
            >
              <PushPinSlash size={11} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
