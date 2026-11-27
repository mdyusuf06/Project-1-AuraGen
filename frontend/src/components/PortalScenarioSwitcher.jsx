"use client";

import React from "react";

export const PORTAL_SCENARIOS = [
  {
    id: "infosys-career-v1",
    name: "Infosys Enterprise Career Portal",
    badge: "HR & BGV Portal",
    subtitle: "Senior AI / Full-Stack Engineer • Notice Buyout, CGPA Formula & 24-Mo Gap Audit",
    fieldCount: 18
  },
  {
    id: "infotact-finance-v1",
    name: "Infotact Financial Underwriting",
    badge: "FinTech Disclosure",
    subtitle: "Commercial Credit & Wealth • 21-Field Financial Risk Assessment",
    fieldCount: 21
  }
];

export default function PortalScenarioSwitcher({
  activeScenario,
  onSelectScenario,
  extractedFieldCount = 0,
  disabled = false
}) {
  return (
    <div className="mb-6 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-sm">
          DOM
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Universal Portal Scenario Switcher
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-semibold">
              {extractedFieldCount > 0 ? `${extractedFieldCount} DOM fields extracted` : "Schema Ready"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Autonomous DOM Extractor adapts AuraGen to any live enterprise form without hardcoding.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PORTAL_SCENARIOS.map((scenario) => {
          const isActive = activeScenario === scenario.id;
          return (
            <button
              key={scenario.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectScenario(scenario.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all text-left ${
                isActive
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border-slate-200"
              } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <span className="block font-semibold">{scenario.name}</span>
              <span className={`text-[10px] ${isActive ? "text-emerald-100" : "text-slate-400"}`}>
                {scenario.badge} • {scenario.fieldCount} fields
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
