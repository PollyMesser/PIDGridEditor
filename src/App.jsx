import "./App.css";
import { useState, useCallback, useMemo, useRef } from "react";

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
    render: (v) => {
      const arrows = ["▲","▶","▼","◀"];
      return arrows[v] || "A";
    },
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
    userControl: "Pages/UserControls/Filterpress/Filterpress.usercontrol",
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

const COLS = 19, ROWS = 10, CELL = 100, SCALE = 0.8;
const S = CELL * SCALE;

function hexToRgba(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 1)`;
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function App() {
  const [bgCells, setBgCells] = useState({});
  const [fgCells, setFgCells] = useState({});

  const [tool, setTool] = useState("pipe");
  const [variantVal, setVariantVal] = useState(0);
  const [selected, setSelected] = useState(null);
  const [counters, setCounters] = useState({});
  const [showCode, setShowCode] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importMsg, setImportMsg] = useState(null);
  const [copyMsg, setCopyMsg] = useState(false);

  const [dragging, setDragging] = useState(null);
  const [dragPreview, setDragPreview] = useState(null);
  const gridRef = useRef(null);

  // ============================================================
  // PIPELINE GROUPS
  // ============================================================
  const [pipelines, setPipelines] = useState([]);
  // { name: "FeedLine1", color: "#3B82F6", activeColor: "#22D3EE" }
  const [showPipelinePanel, setShowPipelinePanel] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState("");
  const [newPipelineColor, setNewPipelineColor] = useState("#3B82F6");
  const [newPipelineActiveColor, setNewPipelineActiveColor] = useState("#22D3EE");
  const [activePipeline, setActivePipeline] = useState(null); // aktuell ausgewählte Pipeline zum Zuweisen

  const def = CONTROL_DEFS[tool];

  const getLayer = (typeKey) => CONTROL_DEFS[typeKey]?.layer || "fg";
  const setCellsForLayer = useCallback((layer, val) => {
    if (layer === "bg") setBgCells(val);
    else setFgCells(val);
  }, []);

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
    const cells = layer === "bg" ? bgCells : fgCells;
    for (let r = row; r < row + h; r++)
      for (let c = col; c < col + w; c++) {
        const cell = cells[`${c},${r}`];
        if (cell && cell.ref !== excludeId) return false;
      }
    return true;
  }, [bgCells, fgCells]);

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
    for (let i = 0; i <= 23; i++) {
      if (!isHmiIndexUsed(i)) return i;
    }
    return -1;
  }, [isHmiIndexUsed]);

  // ============================================================
  // Pipeline management
  // ============================================================
  const addPipeline = useCallback(() => {
    const name = newPipelineName.trim();
    if (!name) return;
    if (pipelines.some((p) => p.name === name)) { alert("Pipeline \"" + name + "\" existiert bereits."); return; }
    setPipelines((prev) => [...prev, { name, color: newPipelineColor, activeColor: newPipelineActiveColor }]);
    setNewPipelineName("");
    setActivePipeline(name);
  }, [newPipelineName, newPipelineColor, newPipelineActiveColor, pipelines]);

  const removePipeline = useCallback((name) => {
    // Entferne Pipeline-Zuordnung von allen Pipes
    const nc = { ...bgCells };
    Object.entries(nc).forEach(([k, c]) => {
      if (c.entry?.extras?.pipeline === name) {
        const newExtras = { ...c.entry.extras };
        delete newExtras.pipeline;
        nc[k] = { ...c, entry: { ...c.entry, extras: newExtras } };
      }
    });
    setBgCells(nc);
    setPipelines((prev) => prev.filter((p) => p.name !== name));
    if (activePipeline === name) setActivePipeline(null);
  }, [bgCells, activePipeline]);

  const updatePipelineColor = useCallback((name, field, value) => {
    setPipelines((prev) => prev.map((p) => p.name === name ? { ...p, [field]: value } : p));
  }, []);

  const renamePipeline = useCallback((oldName, newName) => {
    newName = newName.trim();
    if (!newName || newName === oldName) return;
    if (pipelines.some((p) => p.name === newName)) { alert("Name bereits vergeben."); return; }
    setPipelines((prev) => prev.map((p) => p.name === oldName ? { ...p, name: newName } : p));
    // Update alle Pipe-Zuordnungen
    const nc = { ...bgCells };
    Object.entries(nc).forEach(([k, c]) => {
      if (c.entry?.extras?.pipeline === oldName) {
        nc[k] = { ...c, entry: { ...c.entry, extras: { ...c.entry.extras, pipeline: newName } } };
      }
    });
    setBgCells(nc);
    if (activePipeline === oldName) setActivePipeline(newName);
  }, [bgCells, pipelines, activePipeline]);

  // Pipe einer Pipeline zuweisen/entfernen
  const assignPipeline = useCallback((pipeId, pipelineName) => {
    const nc = { ...bgCells };
    Object.entries(nc).forEach(([k, c]) => {
      if (c.ref === pipeId) {
        const newExtras = { ...c.entry.extras };
        if (pipelineName) {
          newExtras.pipeline = pipelineName;
        } else {
          delete newExtras.pipeline;
        }
        nc[k] = { ...c, entry: { ...c.entry, extras: newExtras } };
      }
    });
    setBgCells(nc);
  }, [bgCells]);

  // Pipes einer bestimmten Pipeline
  const pipesInPipeline = useCallback((pipelineName) => {
    const ids = new Set();
    Object.values(bgCells).forEach((c) => {
      if (c.isOrigin && c.entry?.extras?.pipeline === pipelineName) ids.add(c.ref);
    });
    return ids;
  }, [bgCells]);

  // Pipeline-Farbe für eine Pipe
  const getPipelineForPipe = useCallback((pipeId) => {
    for (const c of Object.values(bgCells)) {
      if (c.isOrigin && c.ref === pipeId && c.entry?.extras?.pipeline) {
        return pipelines.find((p) => p.name === c.entry.extras.pipeline) || null;
      }
    }
    return null;
  }, [bgCells, pipelines]);

  // ============================================================
  // Place control
  // ============================================================
  const placeControl = useCallback((col, row) => {
    if (dragging) return;
    const d = CONTROL_DEFS[tool];
    const w = d.width, h = d.height;
    const layer = d.layer;

    if (!isAreaFree(col, row, w, h, layer)) return;

    let hmiIndex;
    let id;

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

    // Auto-assign pipeline wenn Pipe + aktive Pipeline
    if (tool === "pipe" && activePipeline) {
      extras.pipeline = activePipeline;
    }

    const entry = { id, type: tool, col, row, w, h, variant: d.variants.length > 0 ? variantVal : null, extras };

    const cells = { ...(layer === "bg" ? bgCells : fgCells) };
    for (let r = row; r < row + h; r++)
      for (let c = col; c < col + w; c++)
        cells[`${c},${r}`] = { ref: id, isOrigin: c === col && r === row, entry };

    setCellsForLayer(layer, cells);
    setSelected(id);
  }, [bgCells, fgCells, tool, variantVal, counters, dragging, isAreaFree, nextFreeHmiIndex, setCellsForLayer, activePipeline]);

  const findEntry = useCallback((id) => {
    for (const c of Object.values(bgCells)) {
      if (c.isOrigin && c.ref === id) return { layer: "bg", entry: c.entry };
    }
    for (const c of Object.values(fgCells)) {
      if (c.isOrigin && c.ref === id) return { layer: "fg", entry: c.entry };
    }
    return null;
  }, [bgCells, fgCells]);

  const deleteControl = useCallback((id) => {
    const found = findEntry(id);
    if (!found) return;
    const cells = found.layer === "bg" ? bgCells : fgCells;
    const nc = {};
    Object.entries(cells).forEach(([k, v]) => { if (v.ref !== id) nc[k] = v; });
    setCellsForLayer(found.layer, nc);
    if (selected === id) setSelected(null);
  }, [bgCells, fgCells, selected, findEntry, setCellsForLayer]);

  const updateVariant = useCallback((id, val) => {
    const found = findEntry(id);
    if (!found) return;
    const cells = { ...(found.layer === "bg" ? bgCells : fgCells) };
    Object.keys(cells).forEach((k) => {
      if (cells[k].ref === id) cells[k] = { ...cells[k], entry: { ...cells[k].entry, variant: val } };
    });
    setCellsForLayer(found.layer, cells);
  }, [bgCells, fgCells, findEntry, setCellsForLayer]);

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

    const cells = { ...(found.layer === "bg" ? bgCells : fgCells) };
    Object.entries(cells).forEach(([k, c]) => {
      if (c.ref === id) {
        const newExtras = { ...c.entry.extras, [attr]: val };
        cells[k] = { ...c, ref: newId, entry: { ...c.entry, extras: newExtras, id: newId } };
      }
    });
    setCellsForLayer(found.layer, cells);
    if (selected === id) setSelected(newId);
  }, [bgCells, fgCells, selected, findEntry, isHmiIndexUsed, setCellsForLayer]);

  const moveControl = useCallback((id, newCol, newRow) => {
    const found = findEntry(id);
    if (!found) return;
    const { layer, entry } = found;
    if (!isAreaFree(newCol, newRow, entry.w, entry.h, layer, id)) return;

    const cells = { ...(layer === "bg" ? bgCells : fgCells) };
    const nc = {};
    Object.entries(cells).forEach(([k, v]) => { if (v.ref !== id) nc[k] = v; });

    const newEntry = { ...entry, col: newCol, row: newRow };
    for (let r = newRow; r < newRow + entry.h; r++)
      for (let c = newCol; c < newCol + entry.w; c++)
        nc[`${c},${r}`] = { ref: id, isOrigin: c === newCol && r === newRow, entry: newEntry };

    setCellsForLayer(layer, nc);
  }, [bgCells, fgCells, findEntry, isAreaFree, setCellsForLayer]);

  // --- Drag handlers ---
  const handleDragStart = useCallback((e, id, entry) => {
    e.stopPropagation();
    const cellPos = getCellFromEvent(e);
    if (!cellPos) return;
    setDragging({ id, offsetCol: cellPos.col - entry.col, offsetRow: cellPos.row - entry.row, w: entry.w, h: entry.h, layer: getLayer(entry.type) });
    setSelected(id);
    const img = new Image();
    img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=";
    e.dataTransfer.setDragImage(img, 0, 0);
    e.dataTransfer.effectAllowed = "move";
  }, [getCellFromEvent]);

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
    [bgCells, fgCells].forEach((cells) => {
      Object.values(cells).forEach((c) => {
        if (c.isOrigin && !seen.has(c.ref)) {
          seen.add(c.ref);
          list.push(c.entry);
        }
      });
    });
    return list.sort((a, b) => a.id.localeCompare(b.id));
  }, [bgCells, fgCells]);

  const selEntry = placedControls.find((e) => e.id === selected);
  const hasValveAuto = placedControls.some((e) => e.type === "valve_auto");

  // ============================================================
  // Code generation
  // ============================================================
  const generateCode = useCallback(() => {
    const lines = [];
    const bgControls = placedControls.filter((e) => getLayer(e.type) === "bg");
    const fgControls = placedControls.filter((e) => getLayer(e.type) === "fg");

    // Pipeline-Kommentar-Block
    if (pipelines.length > 0) {
      lines.push("<!-- ========== Pipeline-Gruppen (Referenz) ========== -->");
      lines.push("<!--");
      pipelines.forEach((p) => {
        const pipeIds = [];
        Object.values(bgCells).forEach((c) => {
          if (c.isOrigin && c.entry?.extras?.pipeline === p.name) pipeIds.push(c.ref);
        });
        lines.push(`  Pipeline "${p.name}": color=${p.color}, activeColor=${p.activeColor}`);
        lines.push(`    Pipes: ${pipeIds.length > 0 ? pipeIds.join(", ") : "(keine)"}`);
      });
      lines.push("-->");
      lines.push("");
    }

    // Pipeline-Config als Script-Block (für Runtime-Nutzung)
    if (pipelines.length > 0) {
      const pipelineConfig = {};
      pipelines.forEach((p) => {
        const pipeIds = [];
        Object.values(bgCells).forEach((c) => {
          if (c.isOrigin && c.entry?.extras?.pipeline === p.name) pipeIds.push(c.ref);
        });
        pipelineConfig[p.name] = {
          color: p.color,
          activeColor: p.activeColor,
          pipes: pipeIds,
        };
      });
      lines.push(`<script id="PipelineConfig" type="application/json">`);
      lines.push(JSON.stringify(pipelineConfig, null, 2));
      lines.push(`</script>`);
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
    }

    return lines.join("\n");
  }, [placedControls, hasValveAuto, pipelines, bgCells]);

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

    // Pipeline-Attribut
    if (e.extras?.pipeline) {
      attrs.push(`data-tchmi-pipeline="${e.extras.pipeline}"`);
    }

    if (d.extraProps) {
      d.extraProps.forEach((ep) => {
        if (ep.type === "color" || ep.attr === "hmi-index") return;
        const val = e.extras[ep.attr] || "";
        if (val && ep.attr !== "pipeline") attrs.push(`data-tchmi-${ep.attr}="${val}"`);
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

    // Pipeline-Farbe als PipeColor Script-Block
    if (e.type === "pipe" && e.extras?.pipeline) {
      const pl = pipelines.find((p) => p.name === e.extras.pipeline);
      if (pl) {
        const rgba = hexToRgba(pl.color);
        scriptBlock += `\n<script data-tchmi-target-attribute="data-tchmi-pipecolor" type="application/json">\n{\n  "color": "${rgba}"\n}\n</script>\n`;
      }
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
    Object.entries(CONTROL_DEFS).forEach(([key, d]) => { ucToKey[d.userControl] = key; });

    // Pipeline-Config importieren
    const scriptEl = doc.querySelector('#PipelineConfig');
    let importedPipelines = [];
    if (scriptEl) {
      try {
        const pConfig = JSON.parse(scriptEl.textContent);
        Object.entries(pConfig).forEach(([name, cfg]) => {
          importedPipelines.push({
            name,
            color: cfg.color || "#3B82F6",
            activeColor: cfg.activeColor || "#22D3EE",
          });
        });
      } catch (e) {}
    }

    const newBg = {}, newFg = {}, newCounters = {};
    let imported = 0, skipped = 0;
    const errors = [];

    hosts.forEach((host) => {
      const id = host.getAttribute("id") || "";
      const uc = host.getAttribute("data-tchmi-target-user-control") || "";
      if (id === "Popup_Valve") return;

      const typeKey = ucToKey[uc];
      if (!typeKey) { skipped++; errors.push(id + ": unbekanntes UserControl"); return; }

      const d = CONTROL_DEFS[typeKey];
      const left = parseInt(host.getAttribute("data-tchmi-left")) || 0;
      const top = parseInt(host.getAttribute("data-tchmi-top")) || 0;
      const col = Math.round(left / CELL);
      const row = Math.round(top / CELL);
      const w = d.width, h = d.height;
      const layer = d.layer;
      const targetCells = layer === "bg" ? newBg : newFg;

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

      // Pipeline-Zuordnung importieren
      const pipelineAttr = host.getAttribute("data-tchmi-pipeline");
      if (pipelineAttr) {
        extras.pipeline = pipelineAttr;
        // Pipeline auto-erstellen falls nicht in Config
        if (!importedPipelines.some((p) => p.name === pipelineAttr)) {
          importedPipelines.push({ name: pipelineAttr, color: "#3B82F6", activeColor: "#22D3EE" });
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

      if (d.idMode === "prefix") {
        const numMatch = id.match(/(\d+)$/);
        if (numMatch) {
          const num = parseInt(numMatch[1]);
          if (!newCounters[d.prefix] || num > newCounters[d.prefix]) newCounters[d.prefix] = num;
        }
      }

      const entry = { id, type: typeKey, col, row, w, h, variant, extras };
      for (let r = row; r < row + h; r++)
        for (let c = col; c < col + w; c++)
          targetCells[c + "," + r] = { ref: id, isOrigin: c === col && r === row, entry };

      imported++;
    });

    setBgCells(newBg);
    setFgCells(newFg);
    setCounters(newCounters);
    setPipelines(importedPipelines);
    setSelected(null);

    let msg = imported + " Controls importiert.";
    if (importedPipelines.length > 0) msg += " " + importedPipelines.length + " Pipelines importiert.";
    if (skipped > 0) msg += " " + skipped + " übersprungen.";
    if (errors.length > 0) msg += "\n" + errors.join("\n");
    setImportMsg({ type: skipped > 0 ? "warn" : "success", text: msg });
  }, [importText]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generateCode()).then(() => {
      setCopyMsg(true); setTimeout(() => setCopyMsg(false), 2000);
    });
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
          const layerTag = cd.layer === "bg" ? " ⊡" : "";
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
        <button className={`tool-btn tool-btn-pipeline ${showPipelinePanel ? "active" : ""}`}
          onClick={() => setShowPipelinePanel(!showPipelinePanel)}
          style={{
            borderColor: showPipelinePanel ? "#8B5CF6" : "#445",
            color: showPipelinePanel ? "#8B5CF6" : "#aaa",
            background: showPipelinePanel ? "#8B5CF633" : "#1a1a2e",
          }}>
          ⬡ Pipelines{pipelines.length > 0 ? ` (${pipelines.length})` : ""}
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
          <button className="btn-del" onClick={() => { setBgCells({}); setFgCells({}); setCounters({}); setSelected(null); setPipelines([]); setActivePipeline(null); }}>
            Alles löschen
          </button>
        </div>
      </div>

      {/* PIPELINE PANEL */}
      {showPipelinePanel && !showCode && !showImport && (
        <div className="pipeline-panel">
          <div className="pipeline-panel-header">
            <span className="pipeline-panel-title">Pipeline-Gruppen</span>
            {activePipeline && (
              <span className="pipeline-active-hint">
                Aktiv: <strong style={{ color: pipelines.find(p => p.name === activePipeline)?.color || "#fff" }}>{activePipeline}</strong>
                <button className="pipeline-deselect" onClick={() => setActivePipeline(null)}>✕</button>
              </span>
            )}
          </div>
          <div className="pipeline-list">
            {pipelines.map((p) => {
              const count = pipesInPipeline(p.name).size;
              const isActive = activePipeline === p.name;
              return (
                <div key={p.name} className={`pipeline-item ${isActive ? "pipeline-item-active" : ""}`}
                  onClick={() => setActivePipeline(isActive ? null : p.name)}>
                  <div className="pipeline-item-header">
                    <span className="pipeline-swatch" style={{ background: p.color }} />
                    <span className="pipeline-name">{p.name}</span>
                    <span className="pipeline-count">{count} Pipes</span>
                    {isActive && <span className="pipeline-active-tag">AKTIV</span>}
                  </div>
                  <div className="pipeline-item-colors" onClick={(e) => e.stopPropagation()}>
                    <label>
                      <span className="pipeline-color-label">Farbe:</span>
                      <input type="color" value={p.color}
                        onChange={(e) => updatePipelineColor(p.name, "color", e.target.value)} />
                    </label>
                    <label>
                      <span className="pipeline-color-label">Aktiv:</span>
                      <input type="color" value={p.activeColor}
                        onChange={(e) => updatePipelineColor(p.name, "activeColor", e.target.value)} />
                    </label>
                    <button className="pipeline-del" onClick={() => removePipeline(p.name)} title="Pipeline löschen">✕</button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="pipeline-add">
            <input className="pipeline-add-input" value={newPipelineName}
              onChange={(e) => setNewPipelineName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPipeline()}
              placeholder="Neuer Pipeline-Name…" />
            <input type="color" className="pipeline-add-color" value={newPipelineColor}
              onChange={(e) => setNewPipelineColor(e.target.value)} title="Standard-Farbe" />
            <input type="color" className="pipeline-add-color" value={newPipelineActiveColor}
              onChange={(e) => setNewPipelineActiveColor(e.target.value)} title="Aktiv-Farbe" />
            <button className="pipeline-add-btn" onClick={addPipeline}>+</button>
          </div>
          {pipelines.length > 0 && !activePipeline && (
            <div className="pipeline-hint">Klicke auf eine Pipeline um sie zu aktivieren. Neue Pipes werden dann automatisch zugewiesen.</div>
          )}
          {activePipeline && (
            <div className="pipeline-hint pipeline-hint-active">
              Neue Pipes werden automatisch der Pipeline „{activePipeline}" zugewiesen. Im Properties-Panel kannst du die Zuordnung einzelner Pipes ändern.
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
                Unterstützte Controls: {Object.values(CONTROL_DEFS).map(d => d.label).join(", ")}. Pipeline-Zuordnungen (data-tchmi-pipeline) und PipelineConfig-Block werden mit importiert.
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
              {pipelines.length > 0 && (
                <div className="popup-info" style={{ background: "rgba(139,92,246,0.15)", color: "#8B5CF6" }}>
                  ⬡ {pipelines.length} Pipeline-Gruppen werden als JSON-Config exportiert ({pipelines.map(p => `"${p.name}"`).join(", ")})
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

              {/* Grid lines */}
              <svg width={COLS * S} height={ROWS * S} style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}>
                {Array.from({ length: COLS + 1 }, (_, i) => (
                  <line key={`v${i}`} x1={i * S} y1={0} x2={i * S} y2={ROWS * S} stroke="#334" strokeWidth={0.5} />
                ))}
                {Array.from({ length: ROWS + 1 }, (_, i) => (
                  <line key={`h${i}`} x1={0} y1={i * S} x2={COLS * S} y2={i * S} stroke="#334" strokeWidth={0.5} />
                ))}
              </svg>

              {/* Drag preview */}
              {dragPreview && (
                <div className="drag-preview" style={{
                  left: dragPreview.col * S, top: dragPreview.row * S,
                  width: dragPreview.w * S, height: dragPreview.h * S,
                  borderColor: dragPreview.valid ? "#5f8" : "#f55",
                  background: dragPreview.valid ? "rgba(85,255,136,0.15)" : "rgba(255,85,85,0.15)",
                }} />
              )}

              {/* BG Layer (Pipes) */}
              {Array.from({ length: ROWS }, (_, r) =>
                Array.from({ length: COLS }, (_, c) => {
                  const k = `${c},${r}`;
                  const cell = bgCells[k];
                  if (!cell || !cell.isOrigin) return null;
                  const e = cell.entry;
                  const cd = CONTROL_DEFS[e.type];
                  const isSel = selected === e.id;
                  const isDragged = dragging && dragging.id === e.id;
                  const currentToolLayer = CONTROL_DEFS[tool]?.layer;

                  // Pipeline-Farbe bestimmen
                  const pl = e.extras?.pipeline ? pipelines.find((p) => p.name === e.extras.pipeline) : null;
                  const cellColor = pl ? pl.color : cd.color;
                  const plHighlight = pl && activePipeline === pl.name;

                  return (
                    <div key={`bg-${k}`}
                      className={`cell-placed cell-bg ${isSel ? "selected" : ""} ${isDragged ? "dragging" : ""} ${plHighlight ? "pipeline-highlight" : ""}`}
                      draggable onDragStart={(ev) => handleDragStart(ev, e.id, e)} onDragEnd={handleDragEnd}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        if (currentToolLayer === "fg") {
                          placeControl(c, r);
                        } else {
                          setSelected(isSel ? null : e.id);
                        }
                      }}
                      style={{
                        left: c * S, top: r * S, width: e.w * S, height: e.h * S,
                        background: cellColor + (plHighlight ? "55" : "33"),
                        border: isSel ? "2px solid #fff" : plHighlight ? `2px solid ${cellColor}` : `1px solid ${cellColor}44`,
                        zIndex: 1,
                      }}>
                      <span className="cell-sym" style={{ fontSize: 18 }}>{cd.render(e.variant, e)}</span>
                      {pl && <span className="cell-pipeline-tag" style={{ background: cellColor }}>{pl.name}</span>}
                      <span className="cell-id" style={{ color: cellColor, fontSize: 9 }}>{e.id}</span>
                    </div>
                  );
                })
              )}

              {/* FG Layer (Controls) */}
              {Array.from({ length: ROWS }, (_, r) =>
                Array.from({ length: COLS }, (_, c) => {
                  const k = `${c},${r}`;
                  const cell = fgCells[k];
                  if (!cell || !cell.isOrigin) return null;
                  const e = cell.entry;
                  const cd = CONTROL_DEFS[e.type];
                  const isSel = selected === e.id;
                  const isDragged = dragging && dragging.id === e.id;
                  const fs = e.w > 1 || e.h > 1 ? 22 : 18;
                  const currentToolLayer = CONTROL_DEFS[tool]?.layer;

                  let indexBadge = null;
                  if (e.type === "valve_auto" && e.extras["hmi-index"] !== undefined && e.extras["hmi-index"] !== "") {
                    indexBadge = e.extras["hmi-index"];
                  }

                  return (
                    <div key={`fg-${k}`}
                      className={`cell-placed cell-fg ${isSel ? "selected" : ""} ${isDragged ? "dragging" : ""}`}
                      draggable onDragStart={(ev) => handleDragStart(ev, e.id, e)} onDragEnd={handleDragEnd}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        if (currentToolLayer === "bg") {
                          placeControl(c, r);
                        } else {
                          setSelected(isSel ? null : e.id);
                        }
                      }}
                      style={{
                        left: c * S, top: r * S, width: e.w * S, height: e.h * S,
                        background: cd.color + "55",
                        border: isSel ? "2px solid #fff" : `1px solid ${cd.color}88`,
                        zIndex: 2,
                      }}>
                      <span className="cell-sym" style={{ fontSize: fs }}>{cd.render(e.variant, e)}</span>
                      {indexBadge !== null && (
                        <span className="cell-badge" style={{ background: cd.color }}>{indexBadge}</span>
                      )}
                      <span className="cell-id" style={{ color: cd.color }}>{e.id}</span>
                    </div>
                  );
                })
              )}

              {/* Leere Zellen */}
              {Array.from({ length: ROWS }, (_, r) =>
                Array.from({ length: COLS }, (_, c) => (
                  <div key={`empty-${c},${r}`} className="cell-empty"
                    onClick={() => placeControl(c, r)}
                    style={{ left: c * S, top: r * S, width: S, height: S, zIndex: 0 }} />
                ))
              )}
            </div>
          )}
        </div>

        {/* PROPERTIES PANEL */}
        {!showCode && !showImport && (
          <div className="props">
            {selEntry ? (() => {
              const cd = CONTROL_DEFS[selEntry.type];
              const layerLabel = cd.layer === "bg" ? "Hintergrund" : "Vordergrund";
              const isPipe = selEntry.type === "pipe";
              const currentPipeline = selEntry.extras?.pipeline || "";
              return (
                <>
                  <div className="props-title" style={{ color: cd.color }}>{selEntry.id}</div>
                  <div className="props-sub">{cd.label} ({selEntry.w}×{selEntry.h}) · {layerLabel}</div>
                  <div className="props-path">{cd.userControl}</div>

                  {cd.variants.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div className="props-label">{cd.property}:</div>
                      <select className="props-select" value={selEntry.variant ?? 0}
                        onChange={(e) => updateVariant(selEntry.id, parseInt(e.target.value))}>
                        {cd.variants.map((v) => (
                          <option key={v.value} value={v.value}>{v.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Pipeline-Zuordnung (nur für Pipes) */}
                  {isPipe && (
                    <div style={{ marginBottom: 10 }}>
                      <div className="props-label">Pipeline-Gruppe:</div>
                      <select className="props-select"
                        value={currentPipeline}
                        onChange={(e) => assignPipeline(selEntry.id, e.target.value || null)}
                        style={currentPipeline ? { borderColor: pipelines.find(p => p.name === currentPipeline)?.color || "#445" } : {}}>
                        <option value="">(keine)</option>
                        {pipelines.map((p) => (
                          <option key={p.name} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                      {currentPipeline && (() => {
                        const pl = pipelines.find((p) => p.name === currentPipeline);
                        return pl ? (
                          <div className="props-pipeline-info">
                            <span className="pipeline-swatch" style={{ background: pl.color }} />
                            <span style={{ color: pl.color }}>{pl.color}</span>
                            <span style={{ margin: "0 4px", color: "#666" }}>→</span>
                            <span className="pipeline-swatch" style={{ background: pl.activeColor }} />
                            <span style={{ color: pl.activeColor }}>{pl.activeColor}</span>
                          </div>
                        ) : null;
                      })()}
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

                  <div className="props-pos">
                    Position: left={selEntry.col * CELL}, top={selEntry.row * CELL}
                  </div>
                  <button className="props-del-btn" onClick={() => deleteControl(selEntry.id)}>Löschen</button>
                </>
              );
            })() : (
              <>
                <div className="props-hint">
                  <p>Klicke auf eine Zelle, um <strong style={{ color: def.color }}>{def.label}</strong> zu platzieren.</p>
                  {(def.width > 1 || def.height > 1) && <p>Größe: {def.width}×{def.height} Zellen</p>}
                  {def.layer === "bg" && <p style={{ color: "#6B9BD2", fontSize: 12 }}>⊡ Hintergrund-Layer – kann unter anderen Controls liegen.</p>}
                  {tool === "pipe" && activePipeline && (
                    <p style={{ color: pipelines.find(p => p.name === activePipeline)?.color || "#8B5CF6", fontSize: 12 }}>
                      ⬡ Neue Pipes → Pipeline „{activePipeline}"
                    </p>
                  )}
                  {tool === "valve_auto" && <p style={{ color: "#E86838", fontSize: 12 }}>arrHMI-Index wird automatisch vergeben. ID = VA_N.</p>}
                  <p>Drag & Drop um Controls zu verschieben.</p>
                </div>
                {placedControls.length > 0 && (
                  <div className="placed-list">
                    <div className="placed-list-title">Platzierte Controls:</div>
                    {placedControls.map((e) => {
                      const cd = CONTROL_DEFS[e.type];
                      const pl = e.extras?.pipeline ? pipelines.find(p => p.name === e.extras.pipeline) : null;
                      return (
                        <div key={e.id} className="placed-item"
                          onClick={() => setSelected(e.id)} style={{ color: pl ? pl.color : cd.color }}>
                          {cd.layer === "bg" ? "⊡ " : ""}{cd.render(e.variant, e)} {e.id}
                          {pl && <span className="placed-item-pipeline"> [{pl.name}]</span>}
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