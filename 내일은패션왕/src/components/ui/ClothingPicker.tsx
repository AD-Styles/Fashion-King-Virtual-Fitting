"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { ClothingCategory, Outfit } from "@/types";
import { SAMPLE_OUTFITS } from "@/lib/sample-outfits";

const CATEGORY_LABELS: Record<ClothingCategory, string> = {
  top: "상의",
  bottom: "하의",
  dress: "원피스",
  shoes: "신발",
  accessory: "액세서리",
};

export default function ClothingPicker() {
  const { outfits, currentOutfits, registerOutfit, setOutfit, clearOutfits } =
    useAppStore();

  useEffect(() => {
    SAMPLE_OUTFITS.forEach(registerOutfit);
  }, [registerOutfit]);

  const byCategory = (Object.keys(CATEGORY_LABELS) as ClothingCategory[]).map(
    (cat) => ({
      category: cat,
      items: outfits.filter((o) => o.category === cat),
    }),
  );

  const handleClick = (outfit: Outfit) => {
    const isSelected = currentOutfits[outfit.category]?.id === outfit.id;
    setOutfit(outfit.category, isSelected ? null : outfit);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">옷 입히기</h2>
        <button
          onClick={clearOutfits}
          className="text-xs text-foreground/50 hover:text-foreground"
        >
          모두 벗기
        </button>
      </div>

      {byCategory.map(({ category, items }) => (
        <section key={category} className="flex flex-col gap-2">
          <h3 className="text-xs uppercase tracking-wide text-foreground/50">
            {CATEGORY_LABELS[category]}
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {items.map((item) => {
              const selected = currentOutfits[category]?.id === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleClick(item)}
                  className={`flex flex-col items-center gap-1 rounded border p-2 text-xs transition ${
                    selected
                      ? "border-accent bg-accent/10"
                      : "border-white/10 hover:border-white/30"
                  }`}
                >
                  <span
                    className="h-8 w-8 rounded-full border border-white/20"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-center leading-tight">{item.name}</span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
