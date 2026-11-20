"use client";

import React from "react";

export default function GeneratedCodeDrawer({ isOpen, onClose, componentData }) {
  if (!isOpen || !componentData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <span className="inline-block px-2.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 rounded-md mb-1 border border-emerald-200">
              WebSocket Payload: {"{ type: 'component' }"}
            </span>
            <h3 className="text-base font-semibold text-slate-800">
              Synthesized Self-Healing Component
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium rounded-xl bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 text-xs text-slate-500 flex items-center justify-between">
          <span>
            Generated at{" "}
            <strong className="text-slate-700">{new Date(componentData.receivedAt).toLocaleTimeString()}</strong>.
            AST-validated via Babel and transpiled dynamically.
          </span>
          <span className="font-mono text-emerald-700 font-semibold">
            {componentData.code.length} chars
          </span>
        </div>

        <div className="p-5 bg-slate-900 overflow-auto flex-1">
          <pre className="text-xs font-mono text-emerald-400 leading-relaxed whitespace-pre-wrap">
            {componentData.code}
          </pre>
        </div>
      </div>
    </div>
  );
}
