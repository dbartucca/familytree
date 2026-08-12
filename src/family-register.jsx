import React, { useState, useMemo, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import Papa from "papaparse";
import { Search, X, ZoomIn, ZoomOut, Crown, Shield, RotateCcw, ChevronRight } from "lucide-react";

/* ---------------------------------------------------------------------- */
/*  TOKENS                                                                 */
/* ---------------------------------------------------------------------- */
const INK = "#232A3B";
const PARCHMENT = "#EFE7D6";
const CARD = "#F8F3E7";
const BRASS = "#B8863C";
const BURGUNDY = "#7A3B3F";
const LINE = "#C9BFA4";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* ---------------------------------------------------------------------- */
/*  DATA SOURCE — CSVs served from /public/data/ in your repo             */
/* ---------------------------------------------------------------------- */
const DATA_BASE = `${import.meta.env.BASE_URL}data/`;

function fetchCsv(url) {
  return new Promise((resolve) => {
    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.replace(/^\uFEFF/, "").trim(),
      complete: (res) => resolve(res.data),
      error: () => resolve(null),
    });
  });
}

/* ---------------------------------------------------------------------- */
/*  LAYOUT CONSTANTS                                                       */
/* ---------------------------------------------------------------------- */
const NODE_W = 176;
const NODE_H = 66;
const COL_SPACING = 116;
const ROW_HEIGHT = 190;
const MARGIN = 90;

/* ---------------------------------------------------------------------- */
/*  HELPERS                                                                 */
/* ---------------------------------------------------------------------- */
function fullName(p) {
  if (!p) return "Unknown";
  const parts = [p.first_name, p.middle_name, p.last_name].filter(Boolean);
  let n = parts.join(" ");
  if (p.suffix) n += ` ${p.suffix}`;
  return n || "Unnamed";
}

function lifespanLabel(p) {
  if (!p.birth_year && !p.death_year) return "dates unknown";
  if (!p.death_year) return `b. ${p.birth_year}`;
  return `${p.birth_year || "?"}\u2013${p.death_year}`;
}

function fullDate(y, m, d) {
  if (!y) return "";
  let s = "";
  if (d && m) s = `${MONTHS[m - 1]} ${d}, ${y}`;
  else if (m) s = `${MONTHS[m - 1]} ${y}`;
  else s = `${y}`;
  return s;
}

function locationLabel(loc) {
  if (!loc) return "";
  const bits = [loc.details, loc.village, loc.town, loc.county, loc.state, loc.country].filter(Boolean);
  let s = bits.join(", ");
  if (loc.alternative) s += s ? ` (then: ${loc.alternative})` : loc.alternative;
  return s;
}

function toNum(v) {
  if (v === "" || v === undefined || v === null) return "";
  const n = Number(v);
  return Number.isNaN(n) ? "" : n;
}

/* ---------------------------------------------------------------------- */
/*  DATA SANITIZER — flags self-parenting, self-marriage, and ancestry     */
/*  cycles before the layout ever runs                                    */
/* ---------------------------------------------------------------------- */
function validateFamilyGraph(people, marriages) {
  const byId = new Map(people.map((p) => [p.id, p]));
  const issues = [];

  people.forEach((p) => {
    if (p.mother_id && p.mother_id === p.id) {
      issues.push({ type: "Self-parent (mother_id)", ids: [p.id], detail: `${fullName(p)} (id: ${p.id}) lists themself as mother_id.` });
    }
    if (p.father_id && p.father_id === p.id) {
      issues.push({ type: "Self-parent (father_id)", ids: [p.id], detail: `${fullName(p)} (id: ${p.id}) lists themself as father_id.` });
    }
  });

  marriages.forEach((m) => {
    if (m.husband && m.wife && m.husband === m.wife) {
      const p = byId.get(m.husband);
      issues.push({ type: "Self-marriage", ids: [m.husband], detail: `${p ? fullName(p) : "id " + m.husband} (id: ${m.husband}) is listed as married to themself.` });
    }
  });

  const state = new Map(); // id -> 0 unvisited, 1 in-progress, 2 done
  const path = [];
  const seenCycles = new Set();
  function dfs(id) {
    if (!byId.has(id)) return;
    const s = state.get(id) || 0;
    if (s === 2) return;
    if (s === 1) {
      const cycleStart = path.indexOf(id);
      const cycle = path.slice(cycleStart).concat(id);
      const key = [...cycle].sort().join(",");
      if (!seenCycles.has(key)) {
        seenCycles.add(key);
        issues.push({
          type: "Ancestry cycle",
          ids: cycle,
          detail: `Cycle in parentage: ${cycle.map((cid) => `${fullName(byId.get(cid))} (id: ${cid})`).join(" \u2192 ")}`,
        });
      }
      return;
    }
    state.set(id, 1);
    path.push(id);
    const p = byId.get(id);
    if (p.father_id) dfs(p.father_id);
    if (p.mother_id) dfs(p.mother_id);
    path.pop();
    state.set(id, 2);
  }
  people.forEach((p) => dfs(p.id));

  return issues;
}

/* ---------------------------------------------------------------------- */
/*  LAYOUT ALGORITHM                                                       */
/* ---------------------------------------------------------------------- */
function buildLayout(people, marriages) {
  const byId = new Map(people.map((p) => [p.id, p]));

  const childrenMap = new Map();
  people.forEach((p) => {
    [p.mother_id, p.father_id].forEach((pid) => {
      if (pid && pid !== p.id && byId.has(pid)) {
        if (!childrenMap.has(pid)) childrenMap.set(pid, []);
        childrenMap.get(pid).push(p.id);
      }
    });
  });
  childrenMap.forEach((list, key) => childrenMap.set(key, [...new Set(list)]));

  const spouseMap = new Map();
  const marriageOf = new Map();
  marriages.forEach((m) => {
    if (!byId.has(m.husband) || !byId.has(m.wife)) return;
    if (!spouseMap.has(m.husband)) spouseMap.set(m.husband, []);
    if (!spouseMap.has(m.wife)) spouseMap.set(m.wife, []);
    spouseMap.get(m.husband).push(m.wife);
    spouseMap.get(m.wife).push(m.husband);
    marriageOf.set(`${m.husband}|${m.wife}`, m);
  });

  const genMemo = new Map();
  function genOf(id) {
    if (genMemo.has(id)) return genMemo.get(id);
    genMemo.set(id, 0);
    const p = byId.get(id);
    let g = 0;
    if (p && p.father_id && byId.has(p.father_id)) g = Math.max(g, genOf(p.father_id) + 1);
    if (p && p.mother_id && byId.has(p.mother_id)) g = Math.max(g, genOf(p.mother_id) + 1);
    genMemo.set(id, g);
    return g;
  }
  people.forEach((p) => genOf(p.id));
  marriages.forEach((m) => {
    if (!byId.has(m.husband) || !byId.has(m.wife)) return;
    const g = Math.max(genMemo.get(m.husband) ?? 0, genMemo.get(m.wife) ?? 0);
    genMemo.set(m.husband, g);
    genMemo.set(m.wife, g);
  });

  const xPos = new Map();
  const visited = new Set();
  const cursor = { v: 0 };

  function layoutUnit(id) {
    if (xPos.has(id)) return xPos.get(id);
    visited.add(id);
    const spouses = (spouseMap.get(id) || []).filter((s) => !xPos.has(s) && !visited.has(s));
    spouses.forEach((s) => visited.add(s));
    const members = [id, ...spouses];

    const childSet = new Set();
    members.forEach((m) => (childrenMap.get(m) || []).forEach((c) => childSet.add(c)));
    const children = [...childSet];

    if (children.length === 0) {
      members.forEach((m) => {
        xPos.set(m, cursor.v);
        cursor.v += 1;
      });
    } else {
      const childCenters = children.map((c) => layoutUnit(c));
      const c = (Math.min(...childCenters) + Math.max(...childCenters)) / 2;
      if (members.length === 1) {
        xPos.set(members[0], c);
      } else {
        xPos.set(members[0], c - 0.55);
        xPos.set(members[1], c + 0.55);
      }
    }
    return members.length === 1 ? xPos.get(members[0]) : (xPos.get(members[0]) + xPos.get(members[1])) / 2;
  }

  const sortedIds = [...people].map((p) => p.id).sort((a, b) => genOf(a) - genOf(b));
  sortedIds.forEach((id) => {
    if (!xPos.has(id)) layoutUnit(id);
  });

  const positions = new Map();
  let maxGen = 0;
  people.forEach((p) => {
    const g = genOf(p.id);
    maxGen = Math.max(maxGen, g);
    positions.set(p.id, {
      x: MARGIN + xPos.get(p.id) * (NODE_W + COL_SPACING),
      y: MARGIN + g * ROW_HEIGHT,
      gen: g,
    });
  });

  const edges = [];
  people.forEach((p) => {
    const mom = p.mother_id && positions.has(p.mother_id) ? positions.get(p.mother_id) : null;
    const dad = p.father_id && positions.has(p.father_id) ? positions.get(p.father_id) : null;
    if (!mom && !dad) return;
    const child = positions.get(p.id);
    let unionX;
    if (mom && dad) unionX = (mom.x + dad.x) / 2;
    else unionX = (mom || dad).x;
    const unionY = (mom || dad).y + NODE_H / 2;
    const dropY = unionY + (ROW_HEIGHT - NODE_H) / 2;
    edges.push({
      id: `e-${p.id}`,
      d: `M ${unionX} ${unionY} L ${unionX} ${dropY} L ${child.x} ${dropY} L ${child.x} ${child.y - NODE_H / 2}`,
    });
  });

  const marriageEdges = [];
  marriages.forEach((m, i) => {
    if (!positions.has(m.husband) || !positions.has(m.wife)) return;
    const a = positions.get(m.husband);
    const b = positions.get(m.wife);
    if (a.y !== b.y) return;
    const left = a.x < b.x ? a : b;
    const right = a.x < b.x ? b : a;
    marriageEdges.push({
      id: `m-${i}`,
      x1: left.x + NODE_W / 2,
      x2: right.x - NODE_W / 2,
      y: left.y,
      midX: (left.x + right.x) / 2,
      year: m.year || "",
    });
  });

  const allX = [...positions.values()].map((p) => p.x);
  const allY = [...positions.values()].map((p) => p.y);
  const bounds = {
    minX: (allX.length ? Math.min(...allX) : 0) - NODE_W / 2 - MARGIN,
    maxX: (allX.length ? Math.max(...allX) : 0) + NODE_W / 2 + MARGIN,
    minY: (allY.length ? Math.min(...allY) : 0) - NODE_H / 2 - MARGIN,
    maxY: (allY.length ? Math.max(...allY) : 0) + NODE_H / 2 + MARGIN,
  };

  return { positions, edges, marriageEdges, maxGen, bounds, childrenMap, spouseMap, marriageOf };
}

/* ---------------------------------------------------------------------- */
/*  NODE                                                                    */
/* ---------------------------------------------------------------------- */
function PersonNode({ person, pos, selected, onSelect }) {
  const isFemale = person.gender === "F";
  const accent = isFemale ? BURGUNDY : INK;
  return (
    <g
      transform={`translate(${pos.x - NODE_W / 2}, ${pos.y - NODE_H / 2})`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(person.id);
      }}
      style={{ cursor: "pointer" }}
    >
      <rect
        width={NODE_W}
        height={NODE_H}
        rx={2}
        fill={CARD}
        stroke={selected ? BRASS : LINE}
        strokeWidth={selected ? 2.25 : 1}
        style={{ filter: selected ? "drop-shadow(0 3px 6px rgba(35,42,59,0.28))" : "drop-shadow(0 1px 2px rgba(35,42,59,0.12))" }}
      />
      <rect x={0} y={0} width={4} height={NODE_H} fill={accent} />
      <text x={16} y={24} fontFamily="Fraunces, serif" fontWeight={600} fontSize={14} fill={INK}>
        {fullName(person).length > 20 ? fullName(person).slice(0, 19) + "\u2026" : fullName(person)}
      </text>
      <text x={16} y={41} fontFamily="'IBM Plex Mono', monospace" fontSize={10.5} fill="#6B6350">
        {lifespanLabel(person)}
      </text>
      {person.tittle ? (
        <text x={16} y={56} fontFamily="Inter, sans-serif" fontStyle="italic" fontSize={10} fill={BRASS}>
          {person.tittle.length > 22 ? person.tittle.slice(0, 21) + "\u2026" : person.tittle}
        </text>
      ) : null}
      {person.tittle ? <Crown x={NODE_W - 22} y={8} size={13} color={BRASS} strokeWidth={2} /> : null}
      {person.military ? <Shield x={NODE_W - (person.tittle ? 40 : 22)} y={8} size={13} color={accent} strokeWidth={2} /> : null}
    </g>
  );
}

/* ---------------------------------------------------------------------- */
/*  RECORD CARD (side panel)                                               */
/* ---------------------------------------------------------------------- */
function RecordCard({ person, locationsById, peopleById, spouseMap, marriageOf, childrenMap, onJump, onClose }) {
  if (!person) return null;
  const birthLoc = locationLabel(locationsById.get(person.birth_location_id));
  const deathLoc = locationLabel(locationsById.get(person.death_location_id));
  const spouses = spouseMap.get(person.id) || [];
  const kids = childrenMap.get(person.id) || [];
  const parents = [person.father_id, person.mother_id].filter((id) => peopleById.has(id));

  const Row = ({ label, children }) =>
    children ? (
      <div className="mb-3">
        <div className="text-[10px] tracking-[0.14em] uppercase font-medium" style={{ color: BRASS, fontFamily: "Inter, sans-serif" }}>
          {label}
        </div>
        <div className="text-[13.5px] leading-snug mt-0.5" style={{ color: INK, fontFamily: "Inter, sans-serif" }}>
          {children}
        </div>
      </div>
    ) : null;

  const Link = ({ id }) => (
    <button
      onClick={() => onJump(id)}
      className="inline-flex items-center gap-0.5 underline decoration-dotted underline-offset-2 hover:opacity-70"
      style={{ color: BURGUNDY }}
    >
      {fullName(peopleById.get(id))}
    </button>
  );

  return (
    <div
      className="fixed md:absolute inset-x-0 bottom-0 md:inset-x-auto md:right-0 md:top-0 md:bottom-0 md:w-[360px] max-h-[72vh] md:max-h-none overflow-y-auto z-20 rounded-t-xl md:rounded-none border-t md:border-t-0 md:border-l"
      style={{ background: CARD, borderColor: LINE }}
    >
      <div className="sticky top-0 flex items-start justify-between px-5 pt-4 pb-3 border-b" style={{ background: CARD, borderColor: LINE }}>
        <div>
          <div className="text-[10px] tracking-[0.14em]" style={{ color: BRASS, fontFamily: "'IBM Plex Mono', monospace" }}>
            RECORD NO. {person.id.replace(/[^0-9]/g, "").padStart(3, "0")}
          </div>
          <div className="text-lg font-semibold leading-tight mt-0.5" style={{ fontFamily: "Fraunces, serif", color: INK }}>
            {fullName(person)}
          </div>
          {person.tittle ? (
            <div className="text-xs italic mt-0.5" style={{ color: BRASS }}>
              {person.tittle}
            </div>
          ) : null}
        </div>
        <button onClick={onClose} className="p-1 rounded hover:opacity-60 shrink-0" style={{ color: INK }}>
          <X size={18} />
        </button>
      </div>

      <div className="px-5 py-4">
        <Row label="Born">
          {[fullDate(person.birth_year, person.birth_month, person.birth_day), birthLoc].filter(Boolean).join(" \u00b7 ") || "Unknown"}
        </Row>
        <Row label="Died">
          {person.death_year ? [fullDate(person.death_year, person.death_month, person.death_day), deathLoc].filter(Boolean).join(" \u00b7 ") : null}
        </Row>
        {person.married_name ? <Row label="Married name">{person.married_name}</Row> : null}
        {person.military ? <Row label="Military service">{person.military}</Row> : null}
        {parents.length ? (
          <Row label="Parents">
            {parents.map((id, i) => (
              <span key={id}>
                {i > 0 ? " & " : ""}
                <Link id={id} />
              </span>
            ))}
          </Row>
        ) : null}
        {spouses.length ? (
          <Row label={spouses.length > 1 ? "Spouses" : "Spouse"}>
            {spouses.map((sid, i) => {
              const rec = marriageOf.get(`${person.id}|${sid}`) || marriageOf.get(`${sid}|${person.id}`);
              return (
                <div key={sid} className={i > 0 ? "mt-1.5" : ""}>
                  <Link id={sid} />
                  {rec && rec.year ? (
                    <span className="text-[12px]" style={{ color: "#6B6350" }}>
                      {" "}
                      &mdash; m. {fullDate(rec.year, rec.month, rec.day)}
                      {rec.location_id ? `, ${locationLabel(locationsById.get(rec.location_id))}` : ""}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </Row>
        ) : null}
        {kids.length ? (
          <Row label="Children">
            <div className="flex flex-col gap-1">
              {kids.map((id) => (
                <div key={id} className="flex items-center gap-1">
                  <ChevronRight size={12} color={BRASS} />
                  <Link id={id} />
                </div>
              ))}
            </div>
          </Row>
        ) : null}
        {person.description ? <Row label="Notes">{person.description}</Row> : null}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  MAIN APP                                                                */
/* ---------------------------------------------------------------------- */
export default function FamilyRegister() {
  const [people, setPeople] = useState([]);
  const [marriages, setMarriages] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loadState, setLoadState] = useState("loading"); // loading | ready | error | invalid
  const [loadMessage, setLoadMessage] = useState("");
  const [issues, setIssues] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const containerRef = useRef(null);
  const panState = useRef({ dragging: false, startX: 0, startY: 0, origX: 0, origY: 0 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const peopleRaw = await fetchCsv(`${DATA_BASE}people.csv`);
      if (cancelled) return;
      if (!peopleRaw || !peopleRaw.length) {
        setLoadState("error");
        setLoadMessage(`Couldn't find records at ${DATA_BASE}people.csv. Make sure your CSVs are in the repo's public/data/ folder.`);
        return;
      }
      const [marriagesRaw, locationsRaw] = await Promise.all([
        fetchCsv(`${DATA_BASE}marriages.csv`),
        fetchCsv(`${DATA_BASE}location.csv`),
      ]);
      if (cancelled) return;

      const cleanPeople = peopleRaw
        .filter((p) => p.id)
        .map((p) => ({
          ...p,
          birth_year: toNum(p.birth_year),
          birth_month: toNum(p.birth_month),
          birth_day: toNum(p.birth_day),
          death_year: toNum(p.death_year),
          death_month: toNum(p.death_month),
          death_day: toNum(p.death_day),
        }));
      const cleanMarriages = (marriagesRaw || [])
        .filter((m) => m.husband && m.wife)
        .map((m) => ({ ...m, year: toNum(m.year), month: toNum(m.month), day: toNum(m.day) }));
      const cleanLocations = locationsRaw || [];

      const foundIssues = validateFamilyGraph(cleanPeople, cleanMarriages);
      if (foundIssues.length) {
        setIssues(foundIssues);
        setLoadState("invalid");
        return;
      }

      setPeople(cleanPeople);
      setMarriages(cleanMarriages);
      setLocations(cleanLocations);
      setLoadState("ready");
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const locationsById = useMemo(() => new Map(locations.map((l) => [l.location_id, l])), [locations]);
  const layout = useMemo(() => buildLayout(people, marriages), [people, marriages]);

  const fitView = useCallback(() => {
    const el = containerRef.current;
    if (!el || !people.length) return;
    const { bounds } = layout;
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    const treeW = bounds.maxX - bounds.minX || 1;
    const treeH = bounds.maxY - bounds.minY || 1;
    const scale = Math.min(cw / treeW, ch / treeH, 1);
    setView({
      x: cw / 2 - ((bounds.minX + bounds.maxX) / 2) * scale,
      y: 56 - bounds.minY * scale,
      scale,
    });
  }, [layout, people.length]);

  useLayoutEffect(() => {
    if (loadState !== "ready") return;
    fitView();
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, loadState]);

  function centerOn(id) {
    const el = containerRef.current;
    const pos = layout.positions.get(id);
    if (!el || !pos) return;
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    setView((v) => ({
      scale: Math.max(v.scale, 0.75),
      x: cw / 2 - pos.x * Math.max(v.scale, 0.75),
      y: ch / 2 - pos.y * Math.max(v.scale, 0.75),
    }));
  }

  function selectAndCenter(id) {
    setSelectedId(id);
    setSearch("");
    setShowSearchResults(false);
    centerOn(id);
  }

  function onWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.09 : 0.09;
    setView((v) => ({ ...v, scale: Math.min(2, Math.max(0.3, v.scale + delta)) }));
  }

  function onPointerDown(e) {
    panState.current = { dragging: true, startX: e.clientX, startY: e.clientY, origX: view.x, origY: view.y };
  }
  function onPointerMove(e) {
    if (!panState.current.dragging) return;
    const dx = e.clientX - panState.current.startX;
    const dy = e.clientY - panState.current.startY;
    setView((v) => ({ ...v, x: panState.current.origX + dx, y: panState.current.origY + dy }));
  }
  function onPointerUp() {
    panState.current.dragging = false;
  }

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.trim().toLowerCase();
    return people.filter((p) => fullName(p).toLowerCase().includes(q)).slice(0, 8);
  }, [search, people]);

  const selectedPerson = selectedId ? peopleById.get(selectedId) : null;
  const genCount = layout.maxGen + 1;

  return (
    <div
      className="w-full h-[640px] max-h-[85vh] flex flex-col overflow-hidden select-none"
      style={{ background: PARCHMENT, fontFamily: "Inter, sans-serif" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,600;0,700;1,500&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');`}</style>

      {/* header */}
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b shrink-0" style={{ borderColor: LINE }}>
        <div>
          <h1 className="text-xl leading-none" style={{ fontFamily: "Fraunces, serif", fontWeight: 700, color: INK }}>
            The Family Register
          </h1>
          <div className="text-[11px] mt-1 tracking-wide" style={{ color: "#8A8265", fontFamily: "'IBM Plex Mono', monospace" }}>
            {loadState === "ready"
              ? `${people.length} recorded lives \u00b7 ${genCount} generations`
              : loadState === "loading"
              ? "Loading records\u2026"
              : loadState === "invalid"
              ? `${issues.length} data issue${issues.length === 1 ? "" : "s"} found`
              : "No records loaded"}
          </div>
        </div>
        {loadState === "ready" ? (
          <div className="relative">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border" style={{ borderColor: LINE, background: CARD }}>
              <Search size={14} color="#8A8265" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowSearchResults(true);
                }}
                onFocus={() => setShowSearchResults(true)}
                placeholder="Find a name\u2026"
                className="text-[13px] bg-transparent outline-none w-28 md:w-40"
                style={{ color: INK }}
              />
            </div>
            {showSearchResults && searchResults.length > 0 ? (
              <div
                className="absolute right-0 mt-1 w-56 rounded border shadow-lg z-30 overflow-hidden"
                style={{ background: CARD, borderColor: LINE }}
              >
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => selectAndCenter(p.id)}
                    className="w-full text-left px-3 py-2 text-[13px] hover:opacity-70 flex justify-between items-center"
                    style={{ color: INK }}
                  >
                    <span>{fullName(p)}</span>
                    <span className="text-[10px]" style={{ color: "#8A8265", fontFamily: "'IBM Plex Mono', monospace" }}>
                      {lifespanLabel(p)}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* canvas */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden"
        style={{
          background: "radial-gradient(circle at 1px 1px, rgba(35,42,59,0.09) 1px, transparent 0) " + PARCHMENT,
          backgroundSize: "22px 22px",
          cursor: panState.current.dragging ? "grabbing" : "grab",
        }}
        onWheel={loadState === "ready" ? onWheel : undefined}
        onPointerDown={loadState === "ready" ? onPointerDown : undefined}
        onPointerMove={loadState === "ready" ? onPointerMove : undefined}
        onPointerUp={loadState === "ready" ? onPointerUp : undefined}
        onPointerLeave={loadState === "ready" ? onPointerUp : undefined}
        onClick={() => setShowSearchResults(false)}
      >
        {loadState === "loading" ? (
          <div className="absolute inset-0 flex items-center justify-center text-[13px]" style={{ color: "#8A8265", fontFamily: "Inter, sans-serif" }}>
            Loading records&hellip;
          </div>
        ) : null}

        {loadState === "error" ? (
          <div className="absolute inset-0 flex items-center justify-center px-8">
            <div className="max-w-md text-center text-[13.5px] leading-relaxed" style={{ color: BURGUNDY, fontFamily: "Inter, sans-serif" }}>
              {loadMessage}
            </div>
          </div>
        ) : null}

        {loadState === "invalid" ? (
          <div className="absolute inset-0 overflow-y-auto px-6 py-8 flex justify-center">
            <div className="max-w-2xl w-full">
              <div className="text-[14px] font-semibold mb-1" style={{ color: BURGUNDY, fontFamily: "Fraunces, serif" }}>
                The tree can't be built until these are fixed
              </div>
              <div className="text-[12.5px] mb-4" style={{ color: "#6B6350", fontFamily: "Inter, sans-serif" }}>
                Self-parenting, self-marriage, and ancestry cycles aren't allowed &mdash; fix the source CSVs and reload.
              </div>
              <div className="flex flex-col gap-2">
                {issues.map((issue, i) => (
                  <div key={i} className="rounded border px-3 py-2.5" style={{ borderColor: LINE, background: CARD }}>
                    <div className="text-[10px] tracking-[0.12em] uppercase font-medium mb-1" style={{ color: BRASS, fontFamily: "Inter, sans-serif" }}>
                      {issue.type}
                    </div>
                    <div className="text-[13px] leading-snug" style={{ color: INK, fontFamily: "'IBM Plex Mono', monospace" }}>
                      {issue.detail}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {loadState === "ready" ? (
          <svg width="100%" height="100%" style={{ opacity: ready ? 1 : 0, transition: "opacity 0.3s" }}>
            <g transform={`translate(${view.x},${view.y}) scale(${view.scale})`}>
              {layout.edges.map((e) => (
                <path key={e.id} d={e.d} fill="none" stroke={LINE} strokeWidth={1.4} />
              ))}
              {layout.marriageEdges.map((m) => (
                <g key={m.id}>
                  <line x1={m.x1} x2={m.x2} y1={m.y} y2={m.y} stroke={BRASS} strokeWidth={1.4} />
                  <rect x={m.midX - 3.5} y={m.y - 3.5} width={7} height={7} fill={BRASS} transform={`rotate(45 ${m.midX} ${m.y})`} />
                </g>
              ))}
              {people.map((p) => {
                const pos = layout.positions.get(p.id);
                if (!pos) return null;
                return <PersonNode key={p.id} person={p} pos={pos} selected={selectedId === p.id} onSelect={selectAndCenter} />;
              })}
            </g>
          </svg>
        ) : null}

        {loadState === "ready" ? (
          <>
            <div className="absolute bottom-4 right-4 flex flex-col rounded border overflow-hidden" style={{ borderColor: LINE, background: CARD }}>
              <button
                onClick={() => setView((v) => ({ ...v, scale: Math.min(2, v.scale + 0.15) }))}
                className="p-2 border-b hover:opacity-70"
                style={{ borderColor: LINE, color: INK }}
              >
                <ZoomIn size={15} />
              </button>
              <button
                onClick={() => setView((v) => ({ ...v, scale: Math.max(0.3, v.scale - 0.15) }))}
                className="p-2 border-b hover:opacity-70"
                style={{ borderColor: LINE, color: INK }}
              >
                <ZoomOut size={15} />
              </button>
              <button onClick={fitView} className="p-2 hover:opacity-70" style={{ color: INK }}>
                <RotateCcw size={15} />
              </button>
            </div>

            <div
              className="absolute bottom-4 left-4 hidden md:flex items-center gap-4 text-[11px] px-3 py-2 rounded border"
              style={{ borderColor: LINE, background: CARD, color: "#6B6350" }}
            >
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5" style={{ background: INK }} /> male line
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5" style={{ background: BURGUNDY }} /> female line
              </span>
              <span className="flex items-center gap-1.5">
                <Crown size={12} color={BRASS} /> titled
              </span>
              <span className="flex items-center gap-1.5">
                <Shield size={12} color={INK} /> military
              </span>
            </div>
          </>
        ) : null}

        {selectedPerson ? (
          <RecordCard
            person={selectedPerson}
            locationsById={locationsById}
            peopleById={peopleById}
            spouseMap={layout.spouseMap}
            marriageOf={layout.marriageOf}
            childrenMap={layout.childrenMap}
            onJump={selectAndCenter}
            onClose={() => setSelectedId(null)}
          />
        ) : null}
      </div>
    </div>
  );
}
