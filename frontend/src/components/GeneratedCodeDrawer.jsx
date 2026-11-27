"use client";

import React from "react";

export default function GeneratedCodeDrawer({ isOpen, onClose, componentData }) {
  if (!isOpen || !componentData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-soft-lg w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div>
            <span className="inline-block px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full mb-1">
              Generated React Component
            </span>
            <h3 className="text-base font-bold text-slate-900">
              AST-Validated Wizard Source Code
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 border border-slate-200 transition-colors"
          >
            Close
          </button>
        </div>

        <div className="px-6 py-3 bg-emerald-50/70 border-b border-emerald-100 text-xs text-slate-700 flex items-center justify-between">
          <span>
            {componentData.receivedAt ? (
              <>
                Captured at{" "}
                <strong className="text-slate-900">{new Date(componentData.receivedAt).toLocaleTimeString()}</strong>{" "}
                •{" "}
              </>
            ) : (
              <>Preview Mode • </>
            )}
            AST-verified & sandboxed via @babel/standalone.
          </span>
          <span className="font-mono text-emerald-700 font-semibold">
            {componentData.code.length} chars
          </span>
        </div>

        <div className="p-4 bg-slate-950 overflow-auto flex-1">
          <pre className="text-xs font-mono text-emerald-300 leading-relaxed whitespace-pre-wrap">
            {componentData.code}
          </pre>
        </div>
      </div>
    </div>
  );
}
