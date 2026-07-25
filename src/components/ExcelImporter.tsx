import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { AlertCircle, CheckCircle2, Upload, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

const TARGET_TABLE = 'lesson_segments'

const REQUIRED_FIELDS = [
  'word',
  'definition',
  'context_sentence',
  'timestamp_start',
  'timestamp_end',
] as const

type RequiredField = (typeof REQUIRED_FIELDS)[number]
type RowData = Record<RequiredField, string>

interface ParsedRow {
  rowNumber: number
  data: RowData
  missingFields: RequiredField[]
}

function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, '_')
}

function normalizeValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function parseWorkbook(buffer: ArrayBuffer): ParsedRow[] {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return []
  const sheet = workbook.Sheets[sheetName]
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

  return rawRows.map((raw, i) => {
    const normalized: Record<string, string> = {}
    for (const [key, value] of Object.entries(raw)) {
      normalized[normalizeKey(key)] = normalizeValue(value)
    }

    const data = REQUIRED_FIELDS.reduce((acc, field) => {
      acc[field] = normalized[field] ?? ''
      return acc
    }, {} as RowData)

    const missingFields = REQUIRED_FIELDS.filter((field) => !data[field])

    return { rowNumber: i + 2, data, missingFields } // +2: header row + 1-indexed
  })
}

export function ExcelImporter() {
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState<string | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validRows = rows.filter((r) => r.missingFields.length === 0)
  const invalidRows = rows.filter((r) => r.missingFields.length > 0)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setParseError(null)
    setImportResult(null)
    setRows([])

    try {
      const buffer = await file.arrayBuffer()
      const parsed = parseWorkbook(buffer)
      if (parsed.length === 0) {
        setParseError('No rows found in the file.')
        return
      }
      setRows(parsed)
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to parse file.')
    }
  }

  async function handleImport() {
    if (validRows.length === 0) return
    setImporting(true)
    setImportResult(null)

    const { error } = await supabase.from(TARGET_TABLE).insert(validRows.map((r) => r.data))

    setImporting(false)
    if (error) {
      setImportResult(`Import failed: ${error.message}`)
    } else {
      setImportResult(`Imported ${validRows.length} row(s) into "${TARGET_TABLE}".`)
    }
  }

  function reset() {
    setRows([])
    setFileName(null)
    setParseError(null)
    setImportResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Import vocabulary</h2>
        <p className="mt-1 text-sm text-slate-500">
          Upload an .xlsx or .csv file with columns: word, definition, context_sentence, timestamp_start,
          timestamp_end. Nothing is written to Supabase until you review the preview below and confirm.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          <Upload className="h-4 w-4" />
          Choose file
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
        {fileName && <span className="text-sm text-slate-500">{fileName}</span>}
        {rows.length > 0 && (
          <button
            type="button"
            onClick={reset}
            className="text-sm font-medium text-slate-500 underline hover:text-slate-700"
          >
            Clear
          </button>
        )}
      </div>

      {parseError && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {parseError}
        </div>
      )}

      {rows.length > 0 && (
        <>
          <div className="flex gap-4 text-sm">
            <span className="inline-flex items-center gap-1.5 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              {validRows.length} valid
            </span>
            <span className="inline-flex items-center gap-1.5 text-amber-700">
              <AlertCircle className="h-4 w-4" />
              {invalidRows.length} missing data
            </span>
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Row</th>
                  {REQUIRED_FIELDS.map((field) => (
                    <th key={field} className="px-3 py-2 text-left font-medium text-slate-500">
                      {field}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.rowNumber} className={row.missingFields.length > 0 ? 'bg-amber-50' : undefined}>
                    <td className="px-3 py-2 text-slate-400">{row.rowNumber}</td>
                    {REQUIRED_FIELDS.map((field) => (
                      <td
                        key={field}
                        className={
                          row.missingFields.includes(field)
                            ? 'px-3 py-2 italic text-amber-600'
                            : 'px-3 py-2 text-slate-700'
                        }
                      >
                        {row.data[field] || '(empty)'}
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      {row.missingFields.length === 0 ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Valid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Missing: {row.missingFields.join(', ')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={handleImport}
            disabled={validRows.length === 0 || importing}
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {importing && <Loader2 className="h-4 w-4 animate-spin" />}
            {importing ? 'Importing…' : `Import ${validRows.length} valid row(s)`}
          </button>

          {importResult && <p className="text-sm text-slate-600">{importResult}</p>}
        </>
      )}
    </div>
  )
}
