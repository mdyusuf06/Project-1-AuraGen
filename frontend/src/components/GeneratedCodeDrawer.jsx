"use client";

import React from "react";

export default function GeneratedCodeDrawer({ isOpen, onClose, componentData }) {
  if (!isOpen || !componentData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div>
            <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-indigo-600 rounded-md mb-1">
              WebSocket Reply: {"{ type: 'component' }"}
            </span>
            <h3 className="text-base font-semibold">
              Self-Healing Component Payload Received (Week 1 Preview)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>

        <div className="px-6 py-3 bg-indigo-50 border-b border-indigo-100 text-xs text-indigo-900 flex items-center justify-between">
          <span>
            Triggered at{" "}
            <strong>{new Date(componentData.receivedAt).toLocaleTimeString()}</strong>.
            In Week 2, this string will be AST-validated by Babel and dynamically mounted via React Suspense.
          </span>
          <span className="font-mono text-indigo-700">
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

