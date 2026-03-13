import "./App.css";
import { useState, useCallback, useMemo, useRef, useEffect } from "react";

// ============================================================
// LIQUID DEFINITIONS (fest, nicht konfigurierbar)
// ============================================================
const LIQUIDS = [
  { value: 0, name: "inactive",      color: "#718096" },
  { value: 1, name: "washwater",     color: "#3B82F6" },
  { value: 2, name: "feed",          color: "#8B5E3C" },
  { value: 3, name: "turbid",        color: "#C4956A" },
  { value: 4, name: "clearfiltrate", color: "#EAB308" },
  { value: 5, name: "rinsing",       color: "#F97316" },
];
const NUM_GROUPS = 9;

// Farbe für eine Gruppe im Editor (basierend auf Gruppen-Nummer)
const GROUP_COLORS = [
  null,      // 0 = keine Gruppe
  "#6B9BD2", // 1
  "#D26B6B", // 2
  "#6BD29B", // 3
  "#D2A86B", // 4
  "#9B6BD2", // 5
  "#6BD2D2", // 6
  "#D26BB8", // 7
  "#8BD26B", // 8
  "#D2D26B", // 9
];

// ============================================================
// CONTROL DEFINITIONS
// ============================================================
const CONTROL_DEFS = {
  pipe: {
    label: "Pipe", width: 1, height: 1,
    userControl: "Pages/UserControls/Pipes/Pipe.usercontrol",
    property: "pipetype", prefix: "Pipe",
    variants: [
      { value: 0, label: "straight-h ─" }, { value: 1, label: "straight-v │" },
      { value: 2, label: "elbow-tr └" }, { value: 3, label: "elbow-br ┌" },
      { value: 4, label: "elbow-bl ┐" }, { value: 5, label: "elbow-tl ┘" },
      { value: 6, label: "tee-b ┬" }, { value: 7, label: "tee-l ┤" },
      { value: 8, label: "tee-t ┴" }, { value: 9, label: "tee-r ├" },
    ],
    render: (v) => ["─","│","└","┌","┐","┘","┬","┤","┴","├"][v] || "?",
    color: "#6B9BD2", extraProps: [],
    idMode: "prefix",
    layer: "bg",
  },
  pipe2: {
    label: "Pipe ②", width: 1, height: 1,
    userControl: "Pages/UserControls/Pipes/Pipe.usercontrol",
    property: "pipetype", prefix: "Pipe",
    variants: [
      { value: 0, label: "straight-h ─" }, { value: 1, label: "straight-v │" },
      { value: 2, label: "elbow-tr └" }, { value: 3, label: "elbow-br ┌" },
      { value: 4, label: "elbow-bl ┐" }, { value: 5, label: "elbow-tl ┘" },
      { value: 6, label: "tee-b ┬" }, { value: 7, label: "tee-l ┤" },
      { value: 8, label: "tee-t ┴" }, { value: 9, label: "tee-r ├" },
    ],
    render: (v) => ["─","│","└","┌","┐","┘","┬","┤","┴","├"][v] || "?",
    color: "#4A7FB0", extraProps: [],
    idMode: "prefix",
    layer: "bg2",
  },
  valve_manual: {
    label: "Valve Manual", width: 1, height: 1,
    userControl: "Pages/UserControls/Valves/Valve_Manual.usercontrol",
    property: "valvetype", prefix: "Valve_Manual",
    variants: [
      { value: 0, label: "0 – Rad oben" }, { value: 1, label: "1 – Rad rechts" },
      { value: 2, label: "2 – Rad unten" }, { value: 3, label: "3 – Rad links" },
    ],
    render: (v) => ["⊤","⊣","⊥","⊢"][v] || "V",
    color: "#E8A838", extraProps: [],
    idMode: "prefix",
    layer: "fg",
  },
  valve_auto: {
    label: "Valve Auto", width: 1, height: 1,
    userControl: "Pages/UserControls/Valves/Valve_Auto.usercontrol",
    property: "valvetype", prefix: "VA",
    variants: [
      { value: 0, label: "0 – Akt. oben" }, { value: 1, label: "1 – Akt. rechts" },
      { value: 2, label: "2 – Akt. unten" }, { value: 3, label: "3 – Akt. links" },
    ],
    render: (v) => ["▲","▶","▼","◀"][v] || "A",
    color: "#E86838",
    extraProps: [
      { attr: "hmi-index", label: "arrHMI Index (0-23)", type: "number", default: "" },
    ],
    idMode: "hmi-index",
    layer: "fg",
  },
  pump: {
    label: "Pump", width: 1, height: 1,
    userControl: "Pages/UserControls/Pumps/Pump.usercontrol",
    property: null, prefix: "Pump",
    variants: [],
    render: () => "⊛", color: "#5ABB5A",
    extraProps: [{ attr: "pump-running", label: "Running Binding", type: "text", default: "" }],
    idMode: "prefix",
    layer: "fg",
  },
  tank_feed: {
    label: "FeedTank", width: 3, height: 4,
    userControl: "Pages/UserControls/TankLevel/FeedTank.usercontrol",
    property: null, prefix: "FeedTank", variants: [],
    render: () => "🜄", color: "#5ABCEC",
    extraProps: [
      { attr: "filllevel", label: "FillLevel Binding", type: "text", default: "" },
      { attr: "tankcolor", label: "TankColor (Binding)", type: "text", default: "" },
      { attr: "tankcolor-static", label: "Flüssigkeitsfarbe (statisch)", type: "color", default: "#5ABCEC" },
    ],
    idMode: "prefix",
    layer: "fg",
  },
  filterpress: {
    label: "Filterpresse", width: 4, height: 3,
    userControl: "Pages/UserControls/Filterpress/UC_Filterpress.usercontrol",
    property: null, prefix: "Filterpress", variants: [],
    render: () => "⧈", color: "#B07ACC", extraProps: [],
    idMode: "prefix",
    layer: "fg",
  },
  restecontainer: {
    label: "Restecontainer", width: 2, height: 2,
    userControl: "Pages/UserControls/Restecontainer/Restecontainer.usercontrol",
    property: null, prefix: "Restecontainer", variants: [],
    render: () => "☐", color: "#8B7355", extraProps: [],
    idMode: "prefix",
    layer: "fg",
  },
};

const ALL_LAYERS = ["bg", "bg2", "fg"];
const PIPE_LAYERS = ["bg", "bg2"];
const COLS = 19, ROWS = 10, CELL = 100, SCALE = 0.8;
const S = CELL * SCALE;

function hexToRgba(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 1)`;
}

const isPipeType = (type) => type === "pipe" || type === "pipe2";

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function App() {
  const [bgCells, setBgCells] = useState({});
  const [bg2Cells, setBg2Cells] = useState({});
  const [fgCells, setFgCells] = useState({});

  const [tool, setTool] = useState("pipe");
  const [variantVal, setVariantVal] = useState(0);
  const [selected, setSelected] = useState(null);
  const [multiSel, setMultiSel] = useState(new Set());
  const [counters, setCounters] = useState({});
  const [showCode, setShowCode] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importMsg, setImportMsg] = useState(null);
  const [copyMsg, setCopyMsg] = useState(false);

  const [dragging, setDragging] = useState(null);
  const [dragPreview, setDragPreview] = useState(null);
  const gridRef = useRef(null);

  // Pipeline: aktive Gruppe zum schnellen Zuweisen
  const [activeGroup, setActiveGroup] = useState(0);
  const [showGroupPanel, setShowGroupPanel] = useState(false);

  const def = CONTROL_DEFS[tool];

  // ============================================================
  // Layer helpers
  // ============================================================
  const getCellsForLayer = useCallback((layer) => {
    if (layer === "bg") return bgCells;
    if (layer === "bg2") return bg2Cells;
    return fgCells;
  }, [bgCells, bg2Cells, fgCells]);

  const setCellsForLayer = useCallback((layer, val) => {
    if (layer === "bg") setBgCells(val);
    else if (layer === "bg2") setBg2Cells(val);
    else setFgCells(val);
  }, []);

  const getLayer = (typeKey) => CONTROL_DEFS[typeKey]?.layer || "fg";
  const isPipeLayer = (layer) => PIPE_LAYERS.includes(layer);

  // ============================================================
  // Selection helpers
  // ============================================================
  const allSelected = useMemo(() => {
    const s = new Set(multiSel);
    if (selected) s.add(selected);
    return s;
  }, [selected, multiSel]);

  const isSelected = useCallback((id) => allSelected.has(id), [allSelected]);

  const clearSelection = useCallback(() => {
    setSelected(null);
    setMultiSel(new Set());
  }, []);

  const handleSelectClick = useCallback((e, id) => {
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      setMultiSel((prev) => {
        const next = new Set(prev);
        if (selected && !next.has(selected)) next.add(selected);
        if (next.has(id)) {
          next.delete(id);
          if (selected === id) setSelected(next.size > 0 ? [...next][0] : null);
        } else {
          next.add(id);
          setSelected(id);
        }
        return next;
      });
    } else {
      setSelected((prev) => prev === id ? null : id);
      setMultiSel(new Set());
    }
  }, [selected]);

  // ============================================================
  // Find / delete
  // ============================================================
  const findEntry = useCallback((id) => {
    for (const layer of ALL_LAYERS) {
      const cells = layer === "bg" ? bgCells : layer === "bg2" ? bg2Cells : fgCells;
      for (const c of Object.values(cells)) {
        if (c.isOrigin && c.ref === id) return { layer, entry: c.entry };
      }
    }
    return null;
  }, [bgCells, bg2Cells, fgCells]);

  const deleteSelected = useCallback(() => {
    const ids = [...allSelected];
    if (ids.length === 0) return;
    let newBg = bgCells, newBg2 = bg2Cells, newFg = fgCells;
    let chBg = false, chBg2 = false, chFg = false;
    ids.forEach((id) => {
      const found = findEntry(id);
      if (!found) return;
      if (found.layer === "bg") {
        if (!chBg) { newBg = { ...newBg }; chBg = true; }
        Object.keys(newBg).forEach((k) => { if (newBg[k].ref === id) delete newBg[k]; });
      } else if (found.layer === "bg2") {
        if (!chBg2) { newBg2 = { ...newBg2 }; chBg2 = true; }
        Object.keys(newBg2).forEach((k) => { if (newBg2[k].ref === id) delete newBg2[k]; });
      } else {
        if (!chFg) { newFg = { ...newFg }; chFg = true; }
        Object.keys(newFg).forEach((k) => { if (newFg[k].ref === id) delete newFg[k]; });
      }
    });
    if (chBg) setBgCells(newBg);
    if (chBg2) setBg2Cells(newBg2);
    if (chFg) setFgCells(newFg);
    clearSelection();
  }, [allSelected, bgCells, bg2Cells, fgCells, findEntry, clearSelection]);

  const deleteControl = useCallback((id) => {
    const found = findEntry(id);
    if (!found) return;
    const cells = getCellsForLayer(found.layer);
    const nc = {};
    Object.entries(cells).forEach(([k, v]) => { if (v.ref !== id) nc[k] = v; });
    setCellsForLayer(found.layer, nc);
  }, [findEntry, getCellsForLayer, setCellsForLayer]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const tag = e.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        if (allSelected.size > 0) { e.preventDefault(); deleteSelected(); }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [allSelected, deleteSelected]);

  // ============================================================
  // Tool / variant
  // ============================================================
  const selectTool = useCallback((key) => {
    setTool(key);
    const d = CONTROL_DEFS[key];
    setVariantVal(d.variants.length > 0 ? d.variants[0].value : 0);
  }, []);

  const getCellFromEvent = useCallback((e) => {
    if (!gridRef.current) return null;
    const rect = gridRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const col = Math.floor(x / S);
    const row = Math.floor(y / S);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
    return { col, row };
  }, []);

  const isAreaFree = useCallback((col, row, w, h, layer, excludeId = null) => {
    if (col < 0 || row < 0 || col + w > COLS || row + h > ROWS) return false;
    const cells = getCellsForLayer(layer);
    for (let r = row; r < row + h; r++)
      for (let c = col; c < col + w; c++) {
        const cell = cells[`${c},${r}`];
        if (cell && cell.ref !== excludeId) return false;
      }
    return true;
  }, [getCellsForLayer]);

  const isHmiIndexUsed = useCallback((idx, excludeId = null) => {
    for (const c of Object.values(fgCells)) {
      if (c.isOrigin && c.entry.type === "valve_auto" && c.ref !== excludeId) {
        const usedIdx = c.entry.extras["hmi-index"];
        if (usedIdx !== undefined && usedIdx !== "" && parseInt(usedIdx) === idx) return true;
      }
    }
    return false;
  }, [fgCells]);

  const nextFreeHmiIndex = useCallback(() => {
    for (let i = 0; i <= 23; i++) { if (!isHmiIndexUsed(i)) return i; }
    return -1;
  }, [isHmiIndexUsed]);

  // ============================================================
  // PipeGroup helpers
  // ============================================================
  const setPipeGroup = useCallback((pipeId, groupNum) => {
    for (const [cells, setter] of [[bgCells, setBgCells], [bg2Cells, setBg2Cells]]) {
      let found = false;
      Object.values(cells).forEach(c => { if (c.ref === pipeId) found = true; });
      if (found) {
        const nc = { ...cells };
        Object.entries(nc).forEach(([k, c]) => {
          if (c.ref === pipeId) {
            const newExtras = { ...c.entry.extras, pipegroup: groupNum };
            nc[k] = { ...c, entry: { ...c.entry, extras: newExtras } };
          }
        });
        setter(nc);
        return;
      }
    }
  }, [bgCells, bg2Cells]);

  const setPipeGroupForSelection = useCallback((groupNum) => {
    let newBg = bgCells, newBg2 = bg2Cells;
    let chBg = false, chBg2 = false;
    allSelected.forEach((id) => {
      Object.entries(newBg).forEach(([k, c]) => {
        if (c.ref === id && isPipeType(c.entry?.type)) {
          if (!chBg) { newBg = { ...newBg }; chBg = true; }
          newBg[k] = { ...c, entry: { ...c.entry, extras: { ...c.entry.extras, pipegroup: groupNum } } };
        }
      });
      Object.entries(newBg2).forEach(([k, c]) => {
        if (c.ref === id && isPipeType(c.entry?.type)) {
          if (!chBg2) { newBg2 = { ...newBg2 }; chBg2 = true; }
          newBg2[k] = { ...c, entry: { ...c.entry, extras: { ...c.entry.extras, pipegroup: groupNum } } };
        }
      });
    });
    if (chBg) setBgCells(newBg);
    if (chBg2) setBg2Cells(newBg2);
  }, [bgCells, bg2Cells, allSelected]);

  const pipesInGroup = useCallback((groupNum) => {
    let count = 0;
    [bgCells, bg2Cells].forEach((cells) => {
      Object.values(cells).forEach((c) => {
        if (c.isOrigin && (c.entry?.extras?.pipegroup || 0) === groupNum) count++;
      });
    });
    return count;
  }, [bgCells, bg2Cells]);

  const hasPipeGroups = useMemo(() => {
    for (const cells of [bgCells, bg2Cells]) {
      for (const c of Object.values(cells)) {
        if (c.isOrigin && c.entry?.extras?.pipegroup > 0) return true;
      }
    }
    return false;
  }, [bgCells, bg2Cells]);

  // ============================================================
  // Place control
  // ============================================================
  const placeControl = useCallback((col, row) => {
    if (dragging) return;
    const d = CONTROL_DEFS[tool];
    const w = d.width, h = d.height;
    const layer = d.layer;

    if (!isAreaFree(col, row, w, h, layer)) return;

    let hmiIndex, id;
    if (d.idMode === "hmi-index") {
      hmiIndex = nextFreeHmiIndex();
      if (hmiIndex < 0) { alert("Alle 24 arrHMI-Indizes sind vergeben!"); return; }
      id = d.prefix + "_" + hmiIndex;
    } else {
      const pre = d.prefix;
      const num = (counters[pre] || 0) + 1;
      id = pre + "_" + num;
      setCounters((p) => ({ ...p, [pre]: num }));
    }

    const extras = {};
    if (hmiIndex !== undefined) extras["hmi-index"] = hmiIndex;
    if (isPipeType(tool) && activeGroup > 0) extras.pipegroup = activeGroup;

    const entry = { id, type: tool, col, row, w, h, variant: d.variants.length > 0 ? variantVal : null, extras };

    const cells = { ...getCellsForLayer(layer) };
    for (let r = row; r < row + h; r++)
      for (let c = col; c < col + w; c++)
        cells[`${c},${r}`] = { ref: id, isOrigin: c === col && r === row, entry };

    setCellsForLayer(layer, cells);
    setSelected(id);
    setMultiSel(new Set());
  }, [getCellsForLayer, tool, variantVal, counters, dragging, isAreaFree, nextFreeHmiIndex, setCellsForLayer, activeGroup]);

  const updateVariant = useCallback((id, val) => {
    const found = findEntry(id);
    if (!found) return;
    const cells = { ...getCellsForLayer(found.layer) };
    Object.keys(cells).forEach((k) => {
      if (cells[k].ref === id) cells[k] = { ...cells[k], entry: { ...cells[k].entry, variant: val } };
    });
    setCellsForLayer(found.layer, cells);
  }, [findEntry, getCellsForLayer, setCellsForLayer]);

  const updateExtra = useCallback((id, attr, val) => {
    const found = findEntry(id);
    if (!found) return;
    const d = CONTROL_DEFS[found.entry.type];
    let newId = id;

    if (d && d.idMode === "hmi-index" && attr === "hmi-index") {
      const numVal = parseInt(val);
      if (!isNaN(numVal) && numVal >= 0 && numVal <= 23) {
        if (isHmiIndexUsed(numVal, id)) { alert("Index " + numVal + " ist bereits vergeben!"); return; }
        newId = d.prefix + "_" + numVal;
      }
    }

    const cells = { ...getCellsForLayer(found.layer) };
    Object.entries(cells).forEach(([k, c]) => {
      if (c.ref === id) {
        const newExtras = { ...c.entry.extras, [attr]: val };
        cells[k] = { ...c, ref: newId, entry: { ...c.entry, extras: newExtras, id: newId } };
      }
    });
    setCellsForLayer(found.layer, cells);
    if (selected === id) setSelected(newId);
  }, [selected, findEntry, isHmiIndexUsed, getCellsForLayer, setCellsForLayer]);

  const moveControl = useCallback((id, newCol, newRow) => {
    const found = findEntry(id);
    if (!found) return;
    const { layer, entry } = found;
    if (!isAreaFree(newCol, newRow, entry.w, entry.h, layer, id)) return;

    const cells = { ...getCellsForLayer(layer) };
    const nc = {};
    Object.entries(cells).forEach(([k, v]) => { if (v.ref !== id) nc[k] = v; });

    const newEntry = { ...entry, col: newCol, row: newRow };
    for (let r = newRow; r < newRow + entry.h; r++)
      for (let c = newCol; c < newCol + entry.w; c++)
        nc[`${c},${r}`] = { ref: id, isOrigin: c === newCol && r === newRow, entry: newEntry };

    setCellsForLayer(layer, nc);
  }, [findEntry, isAreaFree, getCellsForLayer, setCellsForLayer]);

  // Drag handlers
  const handleDragStart = useCallback((e, id, entry) => {
    e.stopPropagation();
    const cellPos = getCellFromEvent(e);
    if (!cellPos) return;
    setDragging({ id, offsetCol: cellPos.col - entry.col, offsetRow: cellPos.row - entry.row, w: entry.w, h: entry.h, layer: getLayer(entry.type) });
    if (!allSelected.has(id)) { setSelected(id); setMultiSel(new Set()); }
    const img = new Image();
    img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=";
    e.dataTransfer.setDragImage(img, 0, 0);
    e.dataTransfer.effectAllowed = "move";
  }, [getCellFromEvent, allSelected]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!dragging) return;
    const cellPos = getCellFromEvent(e);
    if (!cellPos) { setDragPreview(null); return; }
    const newCol = cellPos.col - dragging.offsetCol;
    const newRow = cellPos.row - dragging.offsetRow;
    const valid = isAreaFree(newCol, newRow, dragging.w, dragging.h, dragging.layer, dragging.id);
    setDragPreview({ col: newCol, row: newRow, w: dragging.w, h: dragging.h, valid });
  }, [dragging, getCellFromEvent, isAreaFree]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    if (!dragging || !dragPreview || !dragPreview.valid) { setDragging(null); setDragPreview(null); return; }
    moveControl(dragging.id, dragPreview.col, dragPreview.row);
    setDragging(null); setDragPreview(null);
  }, [dragging, dragPreview, moveControl]);

  const handleDragEnd = useCallback(() => { setDragging(null); setDragPreview(null); }, []);

  // ============================================================
  // Placed controls
  // ============================================================
  const placedControls = useMemo(() => {
    const seen = new Set();
    const list = [];
    [bgCells, bg2Cells, fgCells].forEach((cells) => {
      Object.values(cells).forEach((c) => {
        if (c.isOrigin && !seen.has(c.ref)) {
          seen.add(c.ref);
          list.push(c.entry);
        }
      });
    });
    return list.sort((a, b) => a.id.localeCompare(b.id));
  }, [bgCells, bg2Cells, fgCells]);

  const selEntry = placedControls.find((e) => e.id === selected);
  const hasValveAuto = placedControls.some((e) => e.type === "valve_auto");

  const multiSelCount = allSelected.size;
  const multiSelPipeCount = useMemo(() => {
    let n = 0;
    allSelected.forEach((id) => {
      const f = findEntry(id);
      if (f && isPipeType(f.entry.type)) n++;
    });
    return n;
  }, [allSelected, findEntry]);

  // ============================================================
  // Code generation
  // ============================================================
  const generateCode = useCallback(() => {
    const lines = [];
    const bgControls = placedControls.filter((e) => getLayer(e.type) === "bg" || getLayer(e.type) === "bg2");
    const fgControls = placedControls.filter((e) => getLayer(e.type) === "fg");

    // Gruppen-Übersicht als Kommentar
    if (hasPipeGroups) {
      lines.push("<!-- ========== Pipe-Gruppen (Übersicht) ========== -->");
      lines.push("<!--");
      for (let g = 1; g <= NUM_GROUPS; g++) {
        const count = pipesInGroup(g);
        if (count > 0) {
          const ids = [];
          [bgCells, bg2Cells].forEach(cells => {
            Object.values(cells).forEach(c => {
              if (c.isOrigin && (c.entry?.extras?.pipegroup || 0) === g) ids.push(c.ref);
            });
          });
          lines.push(`  Group ${g}: ${count} Pipes [${ids.join(", ")}]`);
        }
      }
      lines.push("  Flüssigkeiten: 0=inactive, 1=washwater, 2=feed, 3=turbid, 4=clearfiltrate, 5=rinsing");
      lines.push("-->");
      lines.push("");
    }

    if (bgControls.length > 0) {
      lines.push("<!-- ========== Pipes (Hintergrund) ========== -->");
      bgControls.forEach((e) => lines.push(genControlHtml(e)));
      lines.push("");
    }

    if (fgControls.length > 0) {
      lines.push("<!-- ========== Controls (Vordergrund, z-index 1) ========== -->");
      fgControls.forEach((e) => lines.push(genControlHtml(e, 1)));
      lines.push("");
    }

    if (hasValveAuto) {
      lines.push("<!-- ========== Valve Popup (einmalig, automatisch generiert) ========== -->");
      lines.push(`<div id="Popup_Valve"\n     data-tchmi-type="TcHmi.Controls.System.TcHmiUserControlHost"\n     data-tchmi-target-user-control="Pages/UserControls/ValvePopup/ValvePopup.usercontrol"\n     data-tchmi-left="0" data-tchmi-left-unit="px"\n     data-tchmi-top="0" data-tchmi-top-unit="px"\n     data-tchmi-width="300" data-tchmi-width-unit="px"\n     data-tchmi-height="400" data-tchmi-height-unit="px"\n     data-tchmi-visibility="Collapsed"\n     data-tchmi-zindex="200"\n     data-tchmi-valveindex="-1">\n</div>`);
      lines.push("");
    }

    // PipelineManager Host
    if (hasPipeGroups) {
      lines.push("<!-- ========== PipelineManager (unsichtbar, ADS-Bindings hier setzen) ========== -->");
      lines.push("<!--");
      lines.push("  In der TcHmi Shell dieses Control auswählen und die");
      lines.push("  GroupN_Liquid Parameter an ADS-Variablen binden:");
      for (let g = 1; g <= NUM_GROUPS; g++) {
        if (pipesInGroup(g) > 0) {
          lines.push(`    Group${g}_Liquid  ←→  PLC1.GVL.nGroup${g}Liquid`);
        }
      }
      lines.push("-->");

      const mgrAttrs = [
        `id="PipelineManager_1"`,
        `data-tchmi-type="TcHmi.Controls.System.TcHmiUserControlHost"`,
        `data-tchmi-target-user-control="Pages/UserControls/PipelineManager/PipelineManager.usercontrol"`,
        `data-tchmi-left="0" data-tchmi-left-unit="px"`,
        `data-tchmi-top="0" data-tchmi-top-unit="px"`,
        `data-tchmi-width="0" data-tchmi-width-unit="px"`,
        `data-tchmi-height="0" data-tchmi-height-unit="px"`,
      ];

      lines.push(`<div ${mgrAttrs.join("\n     ")}>`);
      for (let g = 1; g <= NUM_GROUPS; g++) {
        lines.push(`<script data-tchmi-target-attribute="data-tchmi-group${g}-liquid" type="application/json">0</script>`);
      }
      lines.push(`</div>`);
      lines.push("");
    }

    return lines.join("\n");
  }, [placedControls, hasValveAuto, hasPipeGroups, pipesInGroup, bgCells, bg2Cells]);

  function genControlHtml(e, zIndex) {
    const d = CONTROL_DEFS[e.type];
    const left = e.col * CELL, top = e.row * CELL, width = e.w * CELL, height = e.h * CELL;
    const attrs = [
      `id="${e.id}"`,
      `data-tchmi-type="TcHmi.Controls.System.TcHmiUserControlHost"`,
      `data-tchmi-height="${height}" data-tchmi-height-unit="px"`,
      `data-tchmi-width="${width}" data-tchmi-width-unit="px"`,
      `data-tchmi-left="${left}" data-tchmi-left-unit="px"`,
      `data-tchmi-top="${top}" data-tchmi-top-unit="px"`,
      `data-tchmi-target-user-control="${d.userControl}"`,
    ];
    if (zIndex !== undefined) attrs.push(`data-tchmi-zindex="${zIndex}"`);
    if (d.property && e.variant !== null) attrs.push(`data-tchmi-${d.property}="${e.variant}"`);

    // PipeGroup als Attribut
    const pg = e.extras?.pipegroup || 0;
    if (isPipeType(e.type) && pg > 0) {
      attrs.push(`data-tchmi-pipegroup="${pg}"`);
    }

    if (d.extraProps) {
      d.extraProps.forEach((ep) => {
        if (ep.type === "color" || ep.attr === "hmi-index") return;
        const val = e.extras[ep.attr] || "";
        if (val) attrs.push(`data-tchmi-${ep.attr}="${val}"`);
      });
    }

    let scriptBlock = "";
    if (d.extraProps) {
      const colorProp = d.extraProps.find((p) => p.type === "color");
      const bindingProp = d.extraProps.find((p) => p.attr === "tankcolor");
      if (colorProp && bindingProp) {
        const bindingVal = e.extras[bindingProp.attr] || "";
        if (!bindingVal) {
          const hex = e.extras[colorProp.attr] || colorProp.default;
          const rgba = hexToRgba(hex);
          scriptBlock = `\n<script data-tchmi-target-attribute="data-tchmi-tankcolor" type="application/json">\n{\n  "color": "${rgba}"\n}\n</script>\n`;
        }
      }
    }

    // PipeGroup als script-block für den Default-Wert
    if (isPipeType(e.type) && pg > 0) {
      scriptBlock += `\n<script data-tchmi-target-attribute="data-tchmi-pipegroup" type="application/json">${pg}</script>\n`;
    }

    return `<div ${attrs.join("\n     ")}>${scriptBlock}</div>`;
  }

  // ============================================================
  // IMPORT
  // ============================================================
  const handleImport = useCallback(() => {
    if (!importText.trim()) { setImportMsg({ type: "error", text: "Kein Code eingegeben." }); return; }

    const parser = new DOMParser();
    const doc = parser.parseFromString("<div>" + importText + "</div>", "text/html");
    const hosts = doc.querySelectorAll('[data-tchmi-type="TcHmi.Controls.System.TcHmiUserControlHost"]');

    if (hosts.length === 0) { setImportMsg({ type: "error", text: "Keine UserControlHosts gefunden." }); return; }

    const ucToKey = {};
    Object.entries(CONTROL_DEFS).forEach(([key, d]) => {
      if (key === "pipe2") return;
      ucToKey[d.userControl] = key;
    });

    const newBg = {}, newBg2 = {}, newFg = {}, newCounters = {};
    let imported = 0, skipped = 0;
    const errors = [];

    hosts.forEach((host) => {
      const id = host.getAttribute("id") || "";
      const uc = host.getAttribute("data-tchmi-target-user-control") || "";
      if (id === "Popup_Valve") return;
      if (uc.indexOf("PipelineManager") !== -1) return;

      let typeKey = ucToKey[uc];
      if (!typeKey) { skipped++; errors.push(id + ": unbekanntes UserControl"); return; }

      const d = CONTROL_DEFS[typeKey];
      const left = parseInt(host.getAttribute("data-tchmi-left")) || 0;
      const top = parseInt(host.getAttribute("data-tchmi-top")) || 0;
      const col = Math.round(left / CELL);
      const row = Math.round(top / CELL);
      const w = d.width, h = d.height;
      let layer = d.layer;

      if (layer === "bg") {
        let occupied = false;
        for (let r = row; r < row + h; r++)
          for (let c = col; c < col + w; c++)
            if (newBg[c + "," + r]) { occupied = true; break; }
        if (occupied) {
          typeKey = "pipe2";
          layer = "bg2";
        }
      }

      const targetCells = layer === "bg" ? newBg : layer === "bg2" ? newBg2 : newFg;

      if (col < 0 || row < 0 || col + w > COLS || row + h > ROWS) {
        skipped++; errors.push(id + ": außerhalb des Grids"); return;
      }

      let overlap = false;
      for (let r = row; r < row + h; r++)
        for (let c = col; c < col + w; c++)
          if (targetCells[c + "," + r]) { overlap = true; break; }
      if (overlap) { skipped++; errors.push(id + ": Überlappung im selben Layer"); return; }

      let variant = null;
      if (d.property) {
        const rawVal = host.getAttribute("data-tchmi-" + d.property);
        if (rawVal !== null) variant = parseInt(rawVal) || 0;
      }

      const extras = {};

      // PipeGroup einlesen
      if (isPipeType(typeKey)) {
        // Aus Attribut
        const pgAttr = host.getAttribute("data-tchmi-pipegroup");
        if (pgAttr !== null) {
          extras.pipegroup = parseInt(pgAttr) || 0;
        } else {
          // Aus Script-Block
          host.querySelectorAll("script").forEach((s) => {
            if ((s.getAttribute("data-tchmi-target-attribute") || "") === "data-tchmi-pipegroup") {
              try { extras.pipegroup = parseInt(s.textContent.trim()) || 0; } catch (e) {}
            }
          });
        }
      }

      if (d.extraProps) {
        d.extraProps.forEach((ep) => {
          if (ep.attr === "hmi-index") return;
          if (ep.type === "color") {
            host.querySelectorAll("script").forEach((s) => {
              if ((s.getAttribute("data-tchmi-target-attribute") || "").indexOf("tankcolor") !== -1) {
                try {
                  const json = JSON.parse(s.textContent);
                  if (json?.color) {
                    const m = json.color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
                    if (m) extras[ep.attr] = "#" + [m[1],m[2],m[3]].map(v => ("0"+parseInt(v).toString(16)).slice(-2)).join("");
                  }
                } catch (e) {}
              }
            });
          } else {
            const val = host.getAttribute("data-tchmi-" + ep.attr);
            if (val) extras[ep.attr] = val;
          }
        });
      }

      if (typeKey === "valve_auto") {
        const idMatch = id.match(/(\d+)$/);
        if (idMatch) extras["hmi-index"] = parseInt(idMatch[1]);
      }

      if (CONTROL_DEFS[typeKey].idMode === "prefix") {
        const pre = CONTROL_DEFS[typeKey].prefix;
        const numMatch = id.match(/(\d+)$/);
        if (numMatch) {
          const num = parseInt(numMatch[1]);
          if (!newCounters[pre] || num > newCounters[pre]) newCounters[pre] = num;
        }
      }

      const entry = { id, type: typeKey, col, row, w, h, variant, extras };
      for (let r = row; r < row + h; r++)
        for (let c = col; c < col + w; c++)
          targetCells[c + "," + r] = { ref: id, isOrigin: c === col && r === row, entry };

      imported++;
    });

    setBgCells(newBg);
    setBg2Cells(newBg2);
    setFgCells(newFg);
    setCounters(newCounters);
    clearSelection();

    let msg = imported + " Controls importiert.";
    if (skipped > 0) msg += " " + skipped + " übersprungen.";
    if (errors.length > 0) msg += "\n" + errors.join("\n");
    setImportMsg({ type: skipped > 0 ? "warn" : "success", text: msg });
  }, [importText, clearSelection]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generateCode()).then(() => {
      setCopyMsg(true); setTimeout(() => setCopyMsg(false), 2000);
    });
  };

  // ============================================================
  // RENDER HELPERS
  // ============================================================
  const renderLayerCells = (cells, layerName, zIdx) => {
    const items = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const k = `${c},${r}`;
        const cell = cells[k];
        if (!cell || !cell.isOrigin) continue;
        const e = cell.entry;
        const cd = CONTROL_DEFS[e.type];
        const isSel = isSelected(e.id);
        const isPrimary = selected === e.id;
        const isDragged = dragging && dragging.id === e.id;
        const currentToolLayer = CONTROL_DEFS[tool]?.layer;
        const isBgLayer = isPipeLayer(layerName);

        const pg = e.extras?.pipegroup || 0;
        const groupColor = pg > 0 ? GROUP_COLORS[pg] : null;
        const cellColor = groupColor || cd.color;
        const groupHighlight = pg > 0 && activeGroup === pg;
        const isSecondLayer = layerName === "bg2";

        const fs = e.w > 1 || e.h > 1 ? 22 : 18;

        let indexBadge = null;
        if (e.type === "valve_auto" && e.extras["hmi-index"] !== undefined && e.extras["hmi-index"] !== "") {
          indexBadge = e.extras["hmi-index"];
        }

        items.push(
          <div key={`${layerName}-${k}`}
            className={`cell-placed ${isBgLayer ? "cell-bg" : "cell-fg"} ${isSel ? "selected" : ""} ${isPrimary ? "primary" : ""} ${isDragged ? "dragging" : ""} ${groupHighlight ? "pipeline-highlight" : ""} ${isSecondLayer ? "cell-bg2" : ""}`}
            draggable onDragStart={(ev) => handleDragStart(ev, e.id, e)} onDragEnd={handleDragEnd}
            onClick={(ev) => {
              ev.stopPropagation();
              if (!ev.shiftKey && !ev.ctrlKey && !ev.metaKey && currentToolLayer !== layerName && !isPipeLayer(currentToolLayer) !== !isPipeLayer(layerName)) {
                placeControl(c, r);
              } else {
                handleSelectClick(ev, e.id);
              }
            }}
            style={{
              left: c * S, top: r * S, width: e.w * S, height: e.h * S,
              background: cellColor + (isSel ? "55" : groupHighlight ? "55" : "33"),
              border: isPrimary ? "2px solid #fff" : isSel ? `2px solid ${cellColor}` : groupHighlight ? `2px solid ${cellColor}` : `1px solid ${cellColor}44`,
              zIndex: zIdx,
            }}>
            <span className="cell-sym" style={{ fontSize: fs }}>{cd.render(e.variant, e)}</span>
            {pg > 0 && <span className="cell-pipeline-tag" style={{ background: cellColor }}>G{pg}</span>}
            {isSecondLayer && <span className="cell-layer-tag">②</span>}
            {indexBadge !== null && <span className="cell-badge" style={{ background: cd.color }}>{indexBadge}</span>}
            <span className="cell-id" style={{ color: cellColor, fontSize: 9 }}>{e.id}</span>
          </div>
        );
      }
    }
    return items;
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="editor">
      {/* TOOLBAR */}
      <div className="toolbar">
        <span className="toolbar-title">PID Grid Editor</span>
        {Object.entries(CONTROL_DEFS).map(([key, cd]) => {
          const active = tool === key;
          const sizeLabel = cd.width > 1 || cd.height > 1 ? ` (${cd.width}×${cd.height})` : "";
          const layerTag = isPipeLayer(cd.layer) ? (cd.layer === "bg2" ? " ⊡②" : " ⊡") : "";
          return (
            <button key={key} className={`tool-btn ${active ? "active" : ""}`}
              onClick={() => selectTool(key)}
              style={{
                borderColor: active ? cd.color : "#445",
                color: active ? cd.color : "#aaa",
                background: active ? cd.color + "33" : "#1a1a2e",
              }}>
              {cd.label}{sizeLabel}{layerTag}
            </button>
          );
        })}
        <button className={`tool-btn tool-btn-pipeline ${showGroupPanel ? "active" : ""}`}
          onClick={() => setShowGroupPanel(!showGroupPanel)}
          style={{
            borderColor: showGroupPanel ? "#8B5CF6" : "#445",
            color: showGroupPanel ? "#8B5CF6" : "#aaa",
            background: showGroupPanel ? "#8B5CF633" : "#1a1a2e",
          }}>
          ⬡ Gruppen
        </button>
        <div className="toolbar-right">
          <button className="btn-gen" onClick={() => { setShowCode(!showCode); setShowImport(false); }}
            style={showCode ? { background: "rgba(85,255,136,0.13)" } : {}}>
            {showCode ? "Grid anzeigen" : "Code generieren"}
          </button>
          <button className="btn-import" onClick={() => { setShowImport(!showImport); setShowCode(false); setImportMsg(null); }}
            style={showImport ? { background: "rgba(99,179,237,0.13)" } : {}}>
            {showImport ? "Grid anzeigen" : "Code importieren"}
          </button>
          <button className="btn-del" onClick={() => { setBgCells({}); setBg2Cells({}); setFgCells({}); setCounters({}); clearSelection(); setActiveGroup(0); }}>
            Alles löschen
          </button>
        </div>
      </div>

      {/* GROUP PANEL */}
      {showGroupPanel && !showCode && !showImport && (
        <div className="pipeline-panel">
          <div className="pipeline-panel-header">
            <span className="pipeline-panel-title">Pipe-Gruppen (1–{NUM_GROUPS})</span>
            {activeGroup > 0 && (
              <span className="pipeline-active-hint">
                Aktiv: <strong style={{ color: GROUP_COLORS[activeGroup] }}>Group {activeGroup}</strong>
                <button className="pipeline-deselect" onClick={() => setActiveGroup(0)}>✕</button>
              </span>
            )}
          </div>
          <div className="pipeline-list">
            {Array.from({ length: NUM_GROUPS }, (_, i) => i + 1).map((g) => {
              const count = pipesInGroup(g);
              const isActive = activeGroup === g;
              return (
                <div key={g} className={`pipeline-item ${isActive ? "pipeline-item-active" : ""}`}
                  onClick={() => setActiveGroup(isActive ? 0 : g)}
                  style={{ borderLeft: `3px solid ${GROUP_COLORS[g]}` }}>
                  <div className="pipeline-item-header">
                    <span className="pipeline-swatch" style={{ background: GROUP_COLORS[g] }} />
                    <span className="pipeline-name">Group {g}</span>
                    <span className="pipeline-count">{count} Pipes</span>
                    {isActive && <span className="pipeline-active-tag">AKTIV</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="pipeline-hint" style={{ marginTop: 8, padding: "6px 10px" }}>
            <div style={{ marginBottom: 6, fontWeight: 600, color: "#aaa" }}>Flüssigkeiten:</div>
            {LIQUIDS.map((l) => (
              <div key={l.value} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                <span className="pipeline-swatch" style={{ background: l.color, width: 12, height: 12 }} />
                <span style={{ color: l.color, fontSize: 12 }}>{l.value} = {l.name}</span>
              </div>
            ))}
          </div>
          {activeGroup > 0 && (
            <div className="pipeline-hint pipeline-hint-active">
              Neue Pipes werden automatisch Group {activeGroup} zugewiesen.
              Shift/Strg+Klick = Mehrfachauswahl → Gruppe im Properties-Panel zuweisen.
            </div>
          )}
        </div>
      )}

      {/* VARIANT BAR */}
      {def.variants.length > 0 && !showCode && !showImport && (
        <div className="variant-bar">
          <span className="vb-label">Typ:</span>
          {def.variants.map((v) => {
            const active = variantVal === v.value;
            return (
              <button key={v.value} className={`var-btn ${active ? "active" : ""}`}
                onClick={() => setVariantVal(v.value)}
                style={{
                  borderColor: active ? def.color : "#445",
                  color: active ? def.color : "#aaa",
                  background: active ? def.color + "33" : "transparent",
                }}>
                {v.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="main">
        <div className="grid-area">
          {showImport ? (
            <div>
              <div className="code-header">
                <span>TcHmi Code einfügen:</span>
                <div><button className="btn-import-action" onClick={handleImport}>Importieren</button></div>
              </div>
              {importMsg && (
                <div className={`import-msg import-msg-${importMsg.type}`}>
                  {importMsg.text.split("\n").map((line, i) => <div key={i}>{line}</div>)}
                </div>
              )}
              <textarea className="import-textarea" value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={'TcHmi Content-Page HTML hier einfügen...'} spellCheck={false} />
              <div className="import-hint">
                Unterstützte Controls: {Object.values(CONTROL_DEFS).filter(d => d.layer !== "bg2").map(d => d.label).join(", ")}.
                Pipes auf gleicher Position → Layer 2. PipeGroup wird aus data-tchmi-pipegroup eingelesen.
              </div>
            </div>
          ) : showCode ? (
            <div>
              <div className="code-header">
                <span>{placedControls.length} Controls – TcHmi Code:</span>
                <div>
                  <button className="btn-gen" onClick={handleCopy}>Kopieren</button>
                  <span className={`copy-msg ${copyMsg ? "show" : ""}`}>✓ Kopiert!</span>
                </div>
              </div>
              {hasPipeGroups && (
                <div className="popup-info" style={{ background: "rgba(139,92,246,0.15)", color: "#8B5CF6" }}>
                  ⬡ PipelineManager Host wird generiert – GroupN_Liquid Parameter in der Shell an ADS binden.
                </div>
              )}
              {hasValveAuto && (
                <div className="popup-info">
                  ℹ Popup_Valve Host wird automatisch generiert ({placedControls.filter(e => e.type === "valve_auto").length} Valve_Auto)
                </div>
              )}
              <pre className="code-pre">{generateCode() || "// Keine Controls platziert"}</pre>
            </div>
          ) : (
            <div className="grid-container" ref={gridRef}
              style={{ width: COLS * S, height: ROWS * S }}
              onDragOver={handleDragOver} onDrop={handleDrop}>

              <svg width={COLS * S} height={ROWS * S} style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}>
                {Array.from({ length: COLS + 1 }, (_, i) => (
                  <line key={`v${i}`} x1={i * S} y1={0} x2={i * S} y2={ROWS * S} stroke="#334" strokeWidth={0.5} />
                ))}
                {Array.from({ length: ROWS + 1 }, (_, i) => (
                  <line key={`h${i}`} x1={0} y1={i * S} x2={COLS * S} y2={i * S} stroke="#334" strokeWidth={0.5} />
                ))}
              </svg>

              {dragPreview && (
                <div className="drag-preview" style={{
                  left: dragPreview.col * S, top: dragPreview.row * S,
                  width: dragPreview.w * S, height: dragPreview.h * S,
                  borderColor: dragPreview.valid ? "#5f8" : "#f55",
                  background: dragPreview.valid ? "rgba(85,255,136,0.15)" : "rgba(255,85,85,0.15)",
                }} />
              )}

              {renderLayerCells(bgCells, "bg", 1)}
              {renderLayerCells(bg2Cells, "bg2", 1)}
              {renderLayerCells(fgCells, "fg", 2)}

              {Array.from({ length: ROWS }, (_, r) =>
                Array.from({ length: COLS }, (_, c) => (
                  <div key={`empty-${c},${r}`} className="cell-empty"
                    onClick={(ev) => {
                      if (!ev.shiftKey && !ev.ctrlKey && !ev.metaKey) {
                        clearSelection();
                        placeControl(c, r);
                      }
                    }}
                    style={{ left: c * S, top: r * S, width: S, height: S, zIndex: 0 }} />
                ))
              )}
            </div>
          )}
        </div>

        {/* PROPERTIES PANEL */}
        {!showCode && !showImport && (
          <div className="props">
            {multiSelCount > 1 && (
              <div className="multi-sel-bar">
                <div className="multi-sel-title">{multiSelCount} Controls markiert</div>
                {multiSelPipeCount > 0 && (
                  <div className="multi-sel-section">
                    <div className="props-label">Pipe Group zuweisen ({multiSelPipeCount} Pipes):</div>
                    <select className="props-select"
                      value=""
                      onChange={(e) => { setPipeGroupForSelection(parseInt(e.target.value)); }}>
                      <option value="" disabled>– Auswählen –</option>
                      <option value="0">0 – keine Gruppe</option>
                      {Array.from({ length: NUM_GROUPS }, (_, i) => i + 1).map((g) => (
                        <option key={g} value={g}>Group {g}</option>
                      ))}
                    </select>
                  </div>
                )}
                <button className="props-del-btn" onClick={deleteSelected}>{multiSelCount} Controls löschen</button>
                <div className="multi-sel-hint">Entf drücken zum Löschen</div>
              </div>
            )}

            {selEntry && multiSelCount <= 1 ? (() => {
              const cd = CONTROL_DEFS[selEntry.type];
              const layerLabel = isPipeLayer(cd.layer) ? (cd.layer === "bg2" ? "Hintergrund ②" : "Hintergrund") : "Vordergrund";
              const isPipe = isPipeType(selEntry.type);
              const currentGroup = selEntry.extras?.pipegroup || 0;
              return (
                <>
                  <div className="props-title" style={{ color: currentGroup > 0 ? GROUP_COLORS[currentGroup] : cd.color }}>{selEntry.id}</div>
                  <div className="props-sub">{cd.label} ({selEntry.w}×{selEntry.h}) · {layerLabel}</div>
                  <div className="props-path">{cd.userControl}</div>

                  {cd.variants.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div className="props-label">{cd.property}:</div>
                      <select className="props-select" value={selEntry.variant ?? 0}
                        onChange={(e) => updateVariant(selEntry.id, parseInt(e.target.value))}>
                        {cd.variants.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
                      </select>
                    </div>
                  )}

                  {isPipe && (
                    <div style={{ marginBottom: 10 }}>
                      <div className="props-label">Pipe Group:</div>
                      <select className="props-select" value={currentGroup}
                        onChange={(e) => setPipeGroup(selEntry.id, parseInt(e.target.value))}
                        style={currentGroup > 0 ? { borderColor: GROUP_COLORS[currentGroup] } : {}}>
                        <option value="0">0 – keine Gruppe</option>
                        {Array.from({ length: NUM_GROUPS }, (_, i) => i + 1).map((g) => (
                          <option key={g} value={g}>Group {g} ({pipesInGroup(g)} Pipes)</option>
                        ))}
                      </select>
                      {currentGroup > 0 && (
                        <div className="props-pipeline-info">
                          <span className="pipeline-swatch" style={{ background: GROUP_COLORS[currentGroup] }} />
                          <span style={{ color: GROUP_COLORS[currentGroup], fontSize: 12 }}>
                            Group {currentGroup} · {pipesInGroup(currentGroup)} Pipes
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {cd.extraProps && cd.extraProps.map((ep) => (
                    <div key={ep.attr} style={{ marginBottom: 8 }}>
                      <div className="props-label">{ep.label}:</div>
                      {ep.type === "color" ? (
                        <div className="props-color-row">
                          <input type="color" className="props-color-input"
                            value={selEntry.extras[ep.attr] || ep.default}
                            onChange={(e) => updateExtra(selEntry.id, ep.attr, e.target.value)} />
                          <input className="props-input props-color-hex"
                            value={selEntry.extras[ep.attr] || ep.default}
                            onChange={(e) => updateExtra(selEntry.id, ep.attr, e.target.value)} placeholder="#RRGGBB" />
                        </div>
                      ) : ep.type === "number" ? (
                        <input className="props-input" type="number" min="0" max="23"
                          value={selEntry.extras[ep.attr] !== undefined ? selEntry.extras[ep.attr] : ""}
                          onChange={(e) => updateExtra(selEntry.id, ep.attr, e.target.value === "" ? "" : parseInt(e.target.value))}
                          placeholder="0-23" />
                      ) : (
                        <input className="props-input"
                          value={selEntry.extras[ep.attr] || ""}
                          onChange={(e) => updateExtra(selEntry.id, ep.attr, e.target.value)}
                          placeholder="%i%...%/i% oder %s%...%/s%" />
                      )}
                    </div>
                  ))}

                  <div className="props-pos">Position: left={selEntry.col * CELL}, top={selEntry.row * CELL}</div>
                  <button className="props-del-btn" onClick={() => { deleteControl(selEntry.id); clearSelection(); }}>Löschen</button>
                  <div className="props-shortcut-hint">Entf = Löschen · Shift/Strg+Klick = Mehrfachauswahl</div>
                </>
              );
            })() : multiSelCount <= 1 && (
              <>
                <div className="props-hint">
                  <p>Klicke auf eine Zelle, um <strong style={{ color: def.color }}>{def.label}</strong> zu platzieren.</p>
                  {(def.width > 1 || def.height > 1) && <p>Größe: {def.width}×{def.height} Zellen</p>}
                  {isPipeLayer(def.layer) && (
                    <p style={{ color: def.color, fontSize: 12 }}>
                      {def.layer === "bg2" ? "⊡② Hintergrund-Layer 2 – liegt über Layer 1 Pipes." : "⊡ Hintergrund-Layer – kann unter anderen Controls liegen."}
                    </p>
                  )}
                  {isPipeType(tool) && activeGroup > 0 && (
                    <p style={{ color: GROUP_COLORS[activeGroup], fontSize: 12 }}>
                      ⬡ Neue Pipes → Group {activeGroup}
                    </p>
                  )}
                  {tool === "valve_auto" && <p style={{ color: "#E86838", fontSize: 12 }}>arrHMI-Index wird automatisch vergeben. ID = VA_N.</p>}
                  <p>Drag & Drop um Controls zu verschieben.</p>
                  <p style={{ color: "#666", fontSize: 11 }}>Shift/Strg+Klick = Mehrfachauswahl · Entf = Löschen</p>
                  {tool === "pipe" && <p style={{ color: "#4A7FB0", fontSize: 11 }}>Tipp: „Pipe ②" für zweite Pipe auf gleicher Zelle.</p>}
                </div>
                {placedControls.length > 0 && (
                  <div className="placed-list">
                    <div className="placed-list-title">Platzierte Controls:</div>
                    {placedControls.map((e) => {
                      const cd = CONTROL_DEFS[e.type];
                      const pg = e.extras?.pipegroup || 0;
                      const itemColor = pg > 0 ? GROUP_COLORS[pg] : cd.color;
                      const isL2 = e.type === "pipe2";
                      return (
                        <div key={e.id} className={`placed-item ${isSelected(e.id) ? "placed-item-selected" : ""}`}
                          onClick={(ev) => handleSelectClick(ev, e.id)}
                          style={{ color: itemColor }}>
                          {isPipeLayer(cd.layer) ? (isL2 ? "⊡② " : "⊡ ") : ""}{cd.render(e.variant, e)} {e.id}
                          {pg > 0 && <span className="placed-item-pipeline"> [G{pg}]</span>}
                          {e.type === "valve_auto" && e.extras["hmi-index"] !== undefined && (
                            <span style={{ color: "#aaa", fontSize: 11 }}> [idx:{e.extras["hmi-index"]}]</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}