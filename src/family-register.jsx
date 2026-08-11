import React, { useState, useMemo, useRef, useLayoutEffect, useCallback } from "react";
import Papa from "papaparse";
import { Search, Upload, X, ZoomIn, ZoomOut, Crown, Shield, RotateCcw, ChevronRight } from "lucide-react";

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
/*  SAMPLE DATA — matches the people / marriages / location schema        */
/* ---------------------------------------------------------------------- */
const SAMPLE_LOCATIONS = [
  { location_id: "loc1", country: "US", state: "Massachusetts", county: "Suffolk", town: "Boston", village: "", alternative: "", details: "Trinity Church" },
  { location_id: "loc3", country: "GB", state: "", county: "Yorkshire", town: "York", village: "", alternative: "Eboracum, Roman Britain", details: "" },
  { location_id: "loc4", country: "US", state: "Virginia", county: "Fairfax", town: "Alexandria", village: "", alternative: "", details: "" },
  { location_id: "loc5", country: "US", state: "New York", county: "New York", town: "Manhattan", village: "", alternative: "New Amsterdam", details: "St. Patrick's Cathedral" },
  { location_id: "loc6", country: "US", state: "Massachusetts", county: "Middlesex", town: "Cambridge", village: "", alternative: "", details: "" },
];

const SAMPLE_PEOPLE = [
  { id: "p1", first_name: "James", middle_name: "", last_name: "Whitfield", married_name: "", suffix: "Sr.", birth_year: 1802, birth_month: 4, birth_day: 12, birth_location_id: "loc3", mother_id: "", father_id: "", description: "Emigrated from York in 1824 and established the family's Boston trade.", gender: "M", death_year: 1871, death_month: 11, death_day: 2, death_location_id: "loc1", tittle: "", military: "" },
  { id: "p2", first_name: "Margaret", middle_name: "", last_name: "Holloway", married_name: "Margaret Whitfield", suffix: "", birth_year: 1806, birth_month: 1, birth_day: 22, birth_location_id: "loc1", mother_id: "", father_id: "", description: "", gender: "F", death_year: 1868, death_month: 6, death_day: 14, death_location_id: "loc1", tittle: "", military: "" },
  { id: "p3", first_name: "Thomas", middle_name: "", last_name: "Whitfield", married_name: "", suffix: "", birth_year: 1828, birth_month: 3, birth_day: 9, birth_location_id: "loc1", mother_id: "p2", father_id: "p1", description: "", gender: "M", death_year: 1901, death_month: 5, death_day: 19, death_location_id: "loc1", tittle: "", military: "" },
  { id: "p4", first_name: "Sarah", middle_name: "", last_name: "Whitfield", married_name: "Sarah Pierce", suffix: "", birth_year: 1831, birth_month: 7, birth_day: 30, birth_location_id: "loc1", mother_id: "p2", father_id: "p1", description: "", gender: "F", death_year: 1889, death_month: 2, death_day: 11, death_location_id: "loc4", tittle: "", military: "" },
  { id: "p5", first_name: "Edmund", middle_name: "", last_name: "Whitfield", married_name: "", suffix: "", birth_year: 1834, birth_month: 9, birth_day: 2, birth_location_id: "loc1", mother_id: "p2", father_id: "p1", description: "Fell at the Battle of Antietam.", gender: "M", death_year: 1862, death_month: 9, death_day: 17, death_location_id: "loc4", tittle: "", military: "US ARMY" },
  { id: "p6", first_name: "Eliza", middle_name: "", last_name: "Carter", married_name: "Eliza Whitfield", suffix: "", birth_year: 1830, birth_month: 12, birth_day: 5, birth_location_id: "loc1", mother_id: "", father_id: "", description: "", gender: "F", death_year: 1905, death_month: 3, death_day: 28, death_location_id: "loc1", tittle: "", military: "" },
  { id: "p7", first_name: "William", middle_name: "", last_name: "Pierce", married_name: "", suffix: "", birth_year: 1828, birth_month: 2, birth_day: 17, birth_location_id: "loc4", mother_id: "", father_id: "", description: "", gender: "M", death_year: 1895, death_month: 8, death_day: 9, death_location_id: "loc4", tittle: "Colonel", military: "US ARMY" },
  { id: "p8", first_name: "Henry", middle_name: "Alden", last_name: "Whitfield", married_name: "", suffix: "", birth_year: 1855, birth_month: 4, birth_day: 11, birth_location_id: "loc1", mother_id: "p6", father_id: "p3", description: "", gender: "M", death_year: 1930, death_month: 1, death_day: 30, death_location_id: "loc6", tittle: "Captain", military: "US ARMY" },
  { id: "p9", first_name: "Charlotte", middle_name: "", last_name: "Whitfield", married_name: "Charlotte Reed", suffix: "", birth_year: 1858, birth_month: 8, birth_day: 19, birth_location_id: "loc1", mother_id: "p6", father_id: "p3", description: "", gender: "F", death_year: 1940, death_month: 12, death_day: 2, death_location_id: "loc5", tittle: "", military: "" },
  { id: "p10", first_name: "Robert", middle_name: "", last_name: "Pierce", married_name: "", suffix: "", birth_year: 1853, birth_month: 6, birth_day: 23, birth_location_id: "loc4", mother_id: "p4", father_id: "p7", description: "", gender: "M", death_year: 1920, death_month: 4, death_day: 14, death_location_id: "loc4", tittle: "", military: "" },
  { id: "p11", first_name: "Anna", middle_name: "", last_name: "Pierce", married_name: "Anna Whitmore", suffix: "", birth_year: 1856, birth_month: 1, birth_day: 9, birth_location_id: "loc4", mother_id: "p4", father_id: "p7", description: "", gender: "F", death_year: 1912, death_month: 7, death_day: 22, death_location_id: "loc4", tittle: "", military: "" },
  { id: "p26", first_name: "Charles", middle_name: "", last_name: "Whitmore", married_name: "", suffix: "", birth_year: 1854, birth_month: 5, birth_day: 3, birth_location_id: "loc4", mother_id: "", father_id: "", description: "", gender: "M", death_year: 1930, death_month: 2, death_day: 16, death_location_id: "loc4", tittle: "", military: "" },
  { id: "p12", first_name: "Louisa", middle_name: "", last_name: "Bennett", married_name: "Louisa Whitfield", suffix: "", birth_year: 1860, birth_month: 3, birth_day: 2, birth_location_id: "loc6", mother_id: "", father_id: "", description: "", gender: "F", death_year: 1935, death_month: 10, death_day: 11, death_location_id: "loc6", tittle: "", military: "" },
  { id: "p13", first_name: "Joseph", middle_name: "", last_name: "Reed", married_name: "", suffix: "", birth_year: 1855, birth_month: 9, birth_day: 14, birth_location_id: "loc5", mother_id: "", father_id: "", description: "Physician.", gender: "M", death_year: 1922, death_month: 2, death_day: 27, death_location_id: "loc5", tittle: "Dr.", military: "" },
  { id: "p14", first_name: "Mary", middle_name: "", last_name: "Todd", married_name: "Mary Pierce", suffix: "", birth_year: 1857, birth_month: 5, birth_day: 30, birth_location_id: "loc4", mother_id: "", father_id: "", description: "", gender: "F", death_year: 1930, death_month: 9, death_day: 19, death_location_id: "loc4", tittle: "", military: "" },
  { id: "p15", first_name: "Walter", middle_name: "", last_name: "Whitfield", married_name: "", suffix: "", birth_year: 1882, birth_month: 2, birth_day: 19, birth_location_id: "loc6", mother_id: "p12", father_id: "p8", description: "", gender: "M", death_year: 1959, death_month: 3, death_day: 22, death_location_id: "loc6", tittle: "", military: "USMC" },
  { id: "p16", first_name: "Grace", middle_name: "", last_name: "Whitfield", married_name: "Grace Sutton", suffix: "", birth_year: 1885, birth_month: 7, birth_day: 8, birth_location_id: "loc6", mother_id: "p12", father_id: "p8", description: "", gender: "F", death_year: 1963, death_month: 11, death_day: 30, death_location_id: "loc6", tittle: "", military: "" },
  { id: "p17", first_name: "Edith", middle_name: "", last_name: "Reed", married_name: "", suffix: "", birth_year: 1880, birth_month: 10, birth_day: 2, birth_location_id: "loc5", mother_id: "p9", father_id: "p13", description: "", gender: "F", death_year: 1955, death_month: 6, death_day: 18, death_location_id: "loc5", tittle: "", military: "" },
  { id: "p18", first_name: "Frank", middle_name: "", last_name: "Pierce", married_name: "", suffix: "", birth_year: 1880, birth_month: 1, birth_day: 15, birth_location_id: "loc4", mother_id: "p14", father_id: "p10", description: "", gender: "M", death_year: 1945, death_month: 8, death_day: 27, death_location_id: "loc4", tittle: "", military: "" },
  { id: "p19", first_name: "Helen", middle_name: "", last_name: "Cross", married_name: "Helen Whitfield", suffix: "", birth_year: 1888, birth_month: 4, birth_day: 25, birth_location_id: "loc6", mother_id: "", father_id: "", description: "", gender: "F", death_year: 1965, death_month: 1, death_day: 9, death_location_id: "loc6", tittle: "", military: "" },
  { id: "p20", first_name: "George", middle_name: "", last_name: "Sutton", married_name: "", suffix: "", birth_year: 1883, birth_month: 11, birth_day: 11, birth_location_id: "loc6", mother_id: "", father_id: "", description: "Parish minister.", gender: "M", death_year: 1950, death_month: 5, death_day: 6, death_location_id: "loc6", tittle: "Reverend", military: "" },
  { id: "p21", first_name: "Margaret", middle_name: "Anne", last_name: "Whitfield", married_name: "Margaret Doyle", suffix: "II", birth_year: 1907, birth_month: 5, birth_day: 14, birth_location_id: "loc6", mother_id: "p19", father_id: "p15", description: "", gender: "F", death_year: 1990, death_month: 2, death_day: 8, death_location_id: "loc6", tittle: "", military: "" },
  { id: "p22", first_name: "James", middle_name: "", last_name: "Whitfield", married_name: "", suffix: "II", birth_year: 1910, birth_month: 8, birth_day: 30, birth_location_id: "loc6", mother_id: "p19", father_id: "p15", description: "Never married; served as town archivist for forty years, cataloguing the family's papers now held at the Cambridge historical society.", gender: "M", death_year: 1975, death_month: 12, death_day: 19, death_location_id: "loc6", tittle: "", military: "" },
  { id: "p23", first_name: "Dorothy", middle_name: "", last_name: "Sutton", married_name: "", suffix: "", birth_year: 1909, birth_month: 3, birth_day: 27, birth_location_id: "loc6", mother_id: "p16", father_id: "p20", description: "", gender: "F", death_year: 1998, death_month: 9, death_day: 14, death_location_id: "loc6", tittle: "", military: "" },
  { id: "p24", first_name: "Charles", middle_name: "", last_name: "Doyle", married_name: "", suffix: "", birth_year: 1905, birth_month: 12, birth_day: 8, birth_location_id: "loc1", mother_id: "", father_id: "", description: "", gender: "M", death_year: 1980, death_month: 4, death_day: 2, death_location_id: "loc1", tittle: "", military: "" },
  { id: "p25", first_name: "Patricia", middle_name: "Ann", last_name: "Doyle", married_name: "", suffix: "", birth_year: 1930, birth_month: 4, birth_day: 17, birth_location_id: "loc6", mother_id: "p21", father_id: "p24", description: "Family historian who began compiling this register in 1975.", gender: "F", death_year: 2015, death_month: 1, death_day: 25, death_location_id: "loc6", tittle: "", military: "" },
];

const SAMPLE_MARRIAGES = [
  { husband: "p1", wife: "p2", year: 1825, month: 6, day: 3, location_id: "loc1" },
  { husband: "p3", wife: "p6", year: 1852, month: 10, day: 2, location_id: "loc1" },
  { husband: "p7", wife: "p4", year: 1850, month: 5, day: 20, location_id: "loc4" },
  { husband: "p26", wife: "p11", year: 1877, month: 9, day: 1, location_id: "loc4" },
  { husband: "p8", wife: "p12", year: 1880, month: 6, day: 15, location_id: "loc6" },
  { husband: "p13", wife: "p9", year: 1878, month: 4, day: 3, location_id: "loc5" },
  { husband: "p10", wife: "p14", year: 1878, month: 11, day: 8, location_id: "loc4" },
  { husband: "p15", wife: "p19", year: 1905, month: 9, day: 2, location_id: "loc6" },
  { husband: "p20", wife: "p16", year: 1907, month: 6, day: 21, location_id: "loc6" },
  { husband: "p24", wife: "p21", year: 1928, month: 6, day: 9, location_id: "loc1" },
];

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
/*  LAYOUT ALGORITHM                                                       */
/* ---------------------------------------------------------------------- */
function buildLayout(people, marriages) {
  const byId = new Map(people.map((p) => [p.id, p]));

  const childrenMap = new Map(); // parentId -> [childId]
  people.forEach((p) => {
    [p.mother_id, p.father_id].forEach((pid) => {
      if (pid && byId.has(pid)) {
        if (!childrenMap.has(pid)) childrenMap.set(pid, []);
        childrenMap.get(pid).push(p.id);
      }
    });
  });
  childrenMap.forEach((list, key) => childrenMap.set(key, [...new Set(list)]));

  const spouseMap = new Map(); // personId -> [spouseId]
  const marriageOf = new Map(); // "a|b" -> marriage record
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
    minX: Math.min(...allX) - NODE_W / 2 - MARGIN,
    maxX: Math.max(...allX) + NODE_W / 2 + MARGIN,
    minY: Math.min(...allY) - NODE_H / 2 - MARGIN,
    maxY: Math.max(...allY) + NODE_H / 2 + MARGIN,
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
/*  UPLOAD DRAWER                                                          */
/* ---------------------------------------------------------------------- */
function UploadDrawer({ onClose, onLoad, onReset }) {
  const [peopleFile, setPeopleFile] = useState(null);
  const [marriagesFile, setMarriagesFile] = useState(null);
  const [locationsFile, setLocationsFile] = useState(null);
  const [error, setError] = useState("");

  function parseFile(file) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve([]);
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => resolve(res.data),
        error: reject,
      });
    });
  }

  async function handleLoad() {
    setError("");
    if (!peopleFile) {
      setError("A people CSV is required.");
      return;
    }
    try {
      const [people, marriages, locations] = await Promise.all([
        parseFile(peopleFile),
        parseFile(marriagesFile),
        parseFile(locationsFile),
      ]);
      const cleanPeople = people
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
      const cleanMarriages = marriages
        .filter((m) => m.husband && m.wife)
        .map((m) => ({ ...m, year: toNum(m.year), month: toNum(m.month), day: toNum(m.day) }));
      onLoad({ people: cleanPeople, marriages: cleanMarriages, locations });
    } catch (e) {
      setError("Could not parse one of the files. Check that they're valid CSVs.");
    }
  }

  const FileRow = ({ label, required, file, setFile }) => (
    <label className="flex items-center justify-between gap-3 py-2.5 border-b cursor-pointer" style={{ borderColor: LINE }}>
      <span className="text-[13px]" style={{ fontFamily: "Inter, sans-serif", color: INK }}>
        {label} {required ? <span style={{ color: BURGUNDY }}>*</span> : <span style={{ color: "#8A8265" }}>(optional)</span>}
      </span>
      <span
        className="text-[12px] px-2.5 py-1 rounded shrink-0 max-w-[130px] truncate"
        style={{ background: file ? BRASS : "transparent", color: file ? CARD : BRASS, border: `1px solid ${BRASS}` }}
      >
        {file ? file.name : "Choose file"}
      </span>
      <input type="file" accept=".csv" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
    </label>
  );

  return (
    <div className="fixed inset-0 z-30 flex items-end md:items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="w-full md:w-[440px] max-h-[85vh] overflow-y-auto rounded-t-xl md:rounded-lg p-6"
        style={{ background: CARD }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold" style={{ fontFamily: "Fraunces, serif", color: INK }}>
            Load your records
          </h2>
          <button onClick={onClose} style={{ color: INK }}>
            <X size={18} />
          </button>
        </div>
        <p className="text-[13px] mb-4" style={{ color: "#6B6350", fontFamily: "Inter, sans-serif" }}>
          CSVs with headers matching your people / marriages / location tables. Nothing is uploaded &mdash; parsing happens in your browser.
        </p>
        <FileRow label="People" required file={peopleFile} setFile={setPeopleFile} />
        <FileRow label="Marriages" file={marriagesFile} setFile={setMarriagesFile} />
        <FileRow label="Locations" file={locationsFile} setFile={setLocationsFile} />
        {error ? <div className="text-[12.5px] mt-3" style={{ color: BURGUNDY }}>{error}</div> : null}
        <div className="flex gap-2 mt-5">
          <button
            onClick={handleLoad}
            className="flex-1 py-2 rounded text-[13px] font-medium"
            style={{ background: INK, color: PARCHMENT, fontFamily: "Inter, sans-serif" }}
          >
            Load records
          </button>
          <button
            onClick={() => {
              onReset();
              onClose();
            }}
            className="py-2 px-3 rounded text-[13px]"
            style={{ border: `1px solid ${LINE}`, color: INK, fontFamily: "Inter, sans-serif" }}
          >
            Use sample
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  MAIN APP                                                                */
/* ---------------------------------------------------------------------- */
export default function FamilyRegister() {
  const [people, setPeople] = useState(SAMPLE_PEOPLE);
  const [marriages, setMarriages] = useState(SAMPLE_MARRIAGES);
  const [locations, setLocations] = useState(SAMPLE_LOCATIONS);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const containerRef = useRef(null);
  const panState = useRef({ dragging: false, startX: 0, startY: 0, origX: 0, origY: 0 });
  const [ready, setReady] = useState(false);

  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const locationsById = useMemo(() => new Map(locations.map((l) => [l.location_id, l])), [locations]);
  const layout = useMemo(() => buildLayout(people, marriages), [people, marriages]);

  const fitView = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { bounds } = layout;
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    const treeW = bounds.maxX - bounds.minX;
    const treeH = bounds.maxY - bounds.minY;
    const scale = Math.min(cw / treeW, ch / treeH, 1);
    setView({
      x: cw / 2 - ((bounds.minX + bounds.maxX) / 2) * scale,
      y: 56 - bounds.minY * scale,
      scale,
    });
  }, [layout]);

  useLayoutEffect(() => {
    fitView();
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

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

      <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b shrink-0" style={{ borderColor: LINE }}>
        <div>
          <h1 className="text-xl leading-none" style={{ fontFamily: "Fraunces, serif", fontWeight: 700, color: INK }}>
            The Family Register
          </h1>
          <div className="text-[11px] mt-1 tracking-wide" style={{ color: "#8A8265", fontFamily: "'IBM Plex Mono', monospace" }}>
            {people.length} recorded lives &middot; {genCount} generations
          </div>
        </div>
        <div className="flex items-center gap-2">
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
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded border"
            style={{ borderColor: LINE, color: INK, background: CARD }}
          >
            <Upload size={13} />
            <span className="hidden md:inline">Load data</span>
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden"
        style={{
          background: "radial-gradient(circle at 1px 1px, rgba(35,42,59,0.09) 1px, transparent 0) " + PARCHMENT,
          backgroundSize: "22px 22px",
          cursor: panState.current.dragging ? "grabbing" : "grab",
        }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onClick={() => setShowSearchResults(false)}
      >
        {ready ? (
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

      {showUpload ? (
        <UploadDrawer
          onClose={() => setShowUpload(false)}
          onReset={() => {
            setPeople(SAMPLE_PEOPLE);
            setMarriages(SAMPLE_MARRIAGES);
            setLocations(SAMPLE_LOCATIONS);
            setSelectedId(null);
          }}
          onLoad={({ people: p, marriages: m, locations: l }) => {
            setPeople(p);
            if (m.length) setMarriages(m);
            if (l.length) setLocations(l);
            setSelectedId(null);
            setShowUpload(false);
          }}
        />
      ) : null}
    </div>
  );
}
