/**
 * Client-side CSV → box rows for staging (no packing).
 * Expected columns (header, case-insensitive): id, name, length, width, height, weight, fragile
 * fragile must be the literal "true" or "false" (case-insensitive).
 */

function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (ch === '"') {
      i++;
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') {
          cur += '"';
          i += 2;
          continue;
        }
        if (line[i] === '"') {
          i++;
          break;
        }
        cur += line[i];
        i++;
      }
      continue;
    }
    if (ch === ",") {
      out.push(cur.trim());
      cur = "";
      i++;
      continue;
    }
    cur += ch;
    i++;
  }
  out.push(cur.trim());
  return out;
}

/** @param {string} raw */
function parseFragileCell(raw) {
  const t = String(raw ?? "").trim().toLowerCase();
  if (t === "true") return { ok: true, value: true };
  if (t === "false") return { ok: true, value: false };
  return { ok: false };
}

export function parseCsvBoxes(text) {
  const errors = [];
  const rows = [];
  const rawLines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (rawLines.length < 2) {
    return {
      rows: [],
      errors: ["CSV must include a header row and at least one data row."],
    };
  }

  const headerCells = splitCsvLine(rawLines[0]).map((h) => h.trim().toLowerCase());
  const col = (name) => headerCells.indexOf(name);

  const idCol = col("id");
  const nameCol = col("name");
  const lenCol = col("length");
  const wCol = col("width");
  const hCol = col("height");
  const wtCol = col("weight");
  const fragCol = col("fragile");

  if (idCol < 0 || nameCol < 0 || lenCol < 0 || wCol < 0 || hCol < 0 || wtCol < 0 || fragCol < 0) {
    return {
      rows: [],
      errors: [
        "Header must include columns: id, name, length, width, height, weight, fragile (names are case-insensitive).",
      ],
    };
  }

  for (let i = 1; i < rawLines.length; i++) {
    const lineNum = i + 1;
    const cells = splitCsvLine(rawLines[i]);
    const pick = (idx) => (idx < cells.length ? cells[idx] : "").trim();
    const idRaw = pick(idCol);
    const nameRaw = pick(nameCol);
    const lenRaw = pick(lenCol);
    const wRaw = pick(wCol);
    const hRaw = pick(hCol);
    const wtRaw = pick(wtCol);
    const fragRaw = pick(fragCol);

    if (!idRaw && !nameRaw && !lenRaw && !wRaw && !hRaw && !wtRaw && !fragRaw) continue;

    const length = parseFloat(lenRaw);
    const width = parseFloat(wRaw);
    const height = parseFloat(hRaw);
    const weight = parseFloat(wtRaw);
    const fragileParsed = parseFragileCell(fragRaw);

    const bad = [];
    if (!idRaw) bad.push("missing id");
    if (!Number.isFinite(length) || length <= 0) bad.push("invalid length");
    if (!Number.isFinite(width) || width <= 0) bad.push("invalid width");
    if (!Number.isFinite(height) || height <= 0) bad.push("invalid height");
    if (!Number.isFinite(weight) || weight < 0) bad.push("invalid weight");
    if (!fragileParsed.ok) bad.push('invalid fragile (use "true" or "false")');

    if (bad.length) {
      errors.push(`Row ${lineNum}: ${bad.join(", ")}`);
      continue;
    }

    const displayName = nameRaw.length > 0 ? nameRaw : `Box ${idRaw}`;

    rows.push({
      sourceId: idRaw,
      name: displayName,
      length,
      width,
      height,
      weight,
      fragile: fragileParsed.value,
      rowIndex: lineNum,
    });
  }

  if (rows.length === 0 && errors.length === 0) {
    errors.push("No data rows found after the header.");
  }

  return { rows, errors };
}

/** Whether the staged CSV + max + algorithm allow running packing (UI gate). */
export function canExecuteCsvImport(state) {
  const n = parseInt(String(state.maxBoxesToUseInput ?? "").trim(), 10);
  return (
    state.csvUploadStatus === "success" &&
    state.parsedCsvBoxes.length > 0 &&
    state.selectedPackAlgorithm != null &&
    Number.isFinite(n) &&
    n >= 1
  );
}
