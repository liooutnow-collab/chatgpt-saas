"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, RotateCcw } from "lucide-react";
import * as XLSX from "xlsx";
import { Lead } from "@/lib/providers/types";
import {
  createExportFilename,
  createFormattedRows,
  displayFormatterValue,
  FORMATTER_FIELDS,
  FORMATTER_PRESETS,
  FormatterFieldId,
  FormatterPreset,
  getFormatterField,
} from "@/lib/formatter";

interface Props {
  searchId: string;
  businessType: string;
  location: string;
  leads: Lead[];
}

const STORAGE_PREFIX = "li_formatter_fields:";
const DEFAULT_FIELDS = FORMATTER_PRESETS["Contact List"];

export function ResultFormatter({ searchId, businessType, location, leads }: Props) {
  const [selectedFields, setSelectedFields] = useState<FormatterFieldId[]>(DEFAULT_FIELDS);
  const [preset, setPreset] = useState<FormatterPreset>("Contact List");

  useEffect(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}${searchId}`);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as FormatterFieldId[];
      const valid = parsed.filter((id) => Boolean(getFormatterField(id)));
      if (valid.length > 0) {
        setSelectedFields(valid);
        setPreset("Custom");
      }
    } catch {
      // Ignore malformed local state and keep the useful default preset.
    }
  }, [searchId]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}${searchId}`, JSON.stringify(selectedFields));
  }, [searchId, selectedFields]);

  const uniqueLeads = useMemo(() => {
    const seen = new Set<string>();
    return leads.filter((lead) => {
      const key = lead.source && lead.sourceId
        ? `${lead.source}:${lead.sourceId}`
        : lead.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [leads]);

  const fields = useMemo(
    () => selectedFields.map(getFormatterField).filter(Boolean) as typeof FORMATTER_FIELDS,
    [selectedFields]
  );
  const rows = useMemo(() => createFormattedRows(uniqueLeads, selectedFields), [uniqueLeads, selectedFields]);
  const categories = Array.from(new Set(FORMATTER_FIELDS.map((field) => field.category)));

  function applyPreset(next: FormatterPreset) {
    setPreset(next);
    if (next !== "Custom") setSelectedFields([...FORMATTER_PRESETS[next]]);
  }

  function toggleField(id: FormatterFieldId) {
    setPreset("Custom");
    setSelectedFields((current) =>
      current.includes(id) ? current.filter((fieldId) => fieldId !== id) : [...current, id]
    );
  }

  function downloadCsv() {
    const header = fields.map((field) => field.label);
    const lines = [header, ...rows.map((row) => fields.map((field) => row[field.label] ?? ""))].map((line) =>
      line.map((value) => {
        const text = String(value ?? "");
        return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
      }).join(",")
    );
    const blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    downloadBlob(blob, createExportFilename(businessType, location, "csv"));
  }

  function downloadXlsx() {
    const worksheet = XLSX.utils.json_to_sheet(rows, { header: fields.map((field) => field.label) });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
    XLSX.writeFile(workbook, createExportFilename(businessType, location, "xlsx"));
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Customize Results</p>
            <h2 className="mt-1 text-lg font-medium text-slate-900">Choose the information to focus on</h2>
            <p className="mt-1 text-sm text-slate-500">Formatting uses only the results already returned for this search.</p>
          </div>
          <div className="shrink-0 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            <strong className="text-slate-900">{selectedFields.length}</strong> fields · <strong className="text-slate-900">{uniqueLeads.length}</strong> leads
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Formatter presets">
          {[...Object.keys(FORMATTER_PRESETS), "Custom"].map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => applyPreset(name as FormatterPreset)}
              className={`min-h-10 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${preset === name ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              {name}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <fieldset key={category} className="rounded-lg border border-slate-200 p-3">
              <legend className="px-1 text-xs font-medium uppercase tracking-wider text-slate-400">{category}</legend>
              <div className="mt-2 space-y-2">
                {FORMATTER_FIELDS.filter((field) => field.category === category).map((field) => (
                  <label key={field.id} className="flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(field.id)}
                      onChange={() => toggleField(field.id)}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                    />
                    <span className="text-sm text-slate-700">{field.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-medium text-slate-900">Preview</h2>
            <p className="text-sm text-slate-500">{selectedFields.length} fields selected · {uniqueLeads.length} unique leads</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={selectedFields.length === 0 || uniqueLeads.length === 0} onClick={downloadCsv} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
              <Download className="h-4 w-4" /> Export CSV
            </button>
            <button type="button" disabled={selectedFields.length === 0 || uniqueLeads.length === 0} onClick={downloadXlsx} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
              <FileSpreadsheet className="h-4 w-4" /> Export Excel
            </button>
          </div>
        </div>

        {selectedFields.length === 0 ? (
          <div className="mt-5 rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">Select at least one field to preview and export results.</div>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>{fields.map((field) => <th key={field.id} className="whitespace-nowrap border-b border-slate-200 px-3 py-3 font-medium">{field.label}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {rows.map((row, index) => (
                  <tr key={`${searchId}-${index}`}>
                    {fields.map((field) => <td key={field.id} className="max-w-xs whitespace-nowrap px-3 py-3 text-slate-700">{displayFormatterValue(row[field.label])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <RotateCcw className="h-3.5 w-3.5" /> Exporting is local and does not run another lead search or consume usage.
      </div>
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
