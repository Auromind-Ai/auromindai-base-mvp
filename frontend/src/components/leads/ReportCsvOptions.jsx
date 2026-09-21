"use client";

export default function ReportCsvOptions({ columns, onChange, options }) {
  return (
    <fieldset className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
      <legend className="px-1 text-sm font-semibold">
        Select fields to include in CSV
      </legend>
      <p className="text-xs text-zinc-400">
        Leave all unchecked to include every field from your Leads table. Select
        fields to send only those columns.
      </p>
      <div className="flex flex-wrap gap-4">
        {options.map(({ key, label }) => (
          <label
            key={key}
            className="flex items-center gap-2 text-sm cursor-pointer"
          >
            <input
              type="checkbox"
              className="accent-violet-500"
              checked={columns.includes(key)}
              onChange={() =>
                onChange(
                  options
                    .map((option) => option.key)
                    .filter((field) =>
                      field === key
                        ? !columns.includes(key)
                        : columns.includes(field),
                    ),
                )
              }
            />
            {label}
          </label>
        ))}
      </div>
      {columns.length > 0 && (
        <button
          type="button"
          className="text-xs text-violet-300"
          onClick={() => onChange([])}
        >
          Reset to all fields
        </button>
      )}
    </fieldset>
  );
}
