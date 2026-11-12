"use client";

import { Phone, Shield, Flame, HeartPulse, Car, Users, AlertCircle } from "lucide-react";
import { VERIFIED_EMERGENCY_NUMBERS, type EmergencyContact } from "@/lib/rwanda-geo";

function getPresentation(category: EmergencyContact["category"]) {
  switch (category) {
    case "police":
      return { Icon: Shield, color: "bg-blue-700 hover:bg-blue-800" };
    case "fire":
      return { Icon: Flame, color: "bg-orange-600 hover:bg-orange-700" };
    case "medical":
      return { Icon: HeartPulse, color: "bg-red-600 hover:bg-red-700" };
    case "traffic":
      return { Icon: Car, color: "bg-slate-700 hover:bg-slate-800" };
    case "protection":
      return { Icon: Users, color: "bg-emerald-700 hover:bg-emerald-800" };
    default:
      return { Icon: AlertCircle, color: "bg-slate-700 hover:bg-slate-800" };
  }
}

/** National Rwanda emergency and specialist helplines from the shared verified list. */
export function EmergencyBar() {
  return (
    <div
      role="region"
      aria-label="Numero z'ubutabazi"
      className="border-b border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-2 px-3 py-2 sm:justify-between sm:px-6">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-red-800 dark:text-red-300">
          <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>Ubutabazi</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {VERIFIED_EMERGENCY_NUMBERS.map((item) => {
            const { Icon, color } = getPresentation(item.category);
            return (
              <a
                key={item.number}
                href={`tel:${item.number}`}
                aria-label={`Hamagara ${item.number}: ${item.name_kiny}`}
                className={`inline-flex min-h-[44px] items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm transition-colors ${color}`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                <span>{item.number}</span>
                <span className="hidden font-medium opacity-90 sm:inline">{item.name_kiny}</span>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
