// Background prefetch of the full project list from the Google Sheet,
// started at module load so the panel usually opens with data ready.
const SHEET_URL = "https://docs.google.com/spreadsheets/d/1zXjODOR6P4kRfhAbe2NBTgqrnj2Pcd_xH1ayGHiJE9M/export?format=tsv";

export let projectCache = null;
export let projectError = false;

export const projectFetch = fetch(SHEET_URL)
  .then(r => r.text())
  .then(text => {
    const lines = text.trim().split("\n");
    const rows = lines.slice(1).map(line => {
      const c = line.split("\t");
      return { name: (c[0] || "").trim(), desc: (c[1] || "").trim(), date: (c[2] || "").trim(), url: (c[3] || "").trim(), type: (c[4] || "").trim() };
    }).filter(r => r.name);
    rows.sort((a, b) => {
      const pd = s => { if (!s) return new Date(0); const [d, m, y] = s.split("/"); return new Date(+y, +m - 1, +d); };
      return pd(b.date) - pd(a.date);
    });
    projectCache = rows;
  })
  .catch(() => { projectError = true; });
