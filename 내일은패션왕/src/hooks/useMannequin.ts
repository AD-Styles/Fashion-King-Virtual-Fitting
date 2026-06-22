import { useAppStore } from "@/lib/store";

export function useMannequin() {
  const bodyShape = useAppStore((s) => s.bodyShape);
  const setBodyParam = useAppStore((s) => s.setBodyParam);
  const resetBodyShape = useAppStore((s) => s.resetBodyShape);

  return { bodyShape, setBodyParam, resetBodyShape };
}
