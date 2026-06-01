import React, { Component, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Copy, ImagePlus, Mail, Minus, Plus, Save, Square, Trash2, Type, Upload } from "lucide-react";
import "./styles.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5174";
const fonts = ["Arial", "Verdana", "Georgia", "Tahoma", "Trebuchet MS", "Courier New"];
const fields = ["name", "title", "department", "email", "phone", "mobile", "location"];
const fieldLabels = {
  name: "Nombre",
  title: "Puesto",
  department: "Departamento",
  email: "Correo",
  phone: "Telefono",
  mobile: "Celular",
  location: "Ubicacion"
};

function emptySignature(seasonId, seasonName = "Nueva temporada", logoUrl = "") {
  return {
    season_id: seasonId,
    name: `Firma ${seasonName}`,
    mode: "visual",
    html: "",
    canvas_width: 720,
    canvas_height: 280,
    background_color: "#ffffff",
    is_default: true,
    config: {
      elements: [
        logoUrl ? createElement("logo", { src: logoUrl, x: 24, y: 24, w: 92, h: 92 }) : createElement("box", { x: 24, y: 24, w: 92, h: 92, backgroundColor: "#e7f0fb", radius: 8 }),
        createElement("field", { field: "name", x: 140, y: 28, w: 360, h: 30, fontSize: 22, color: "#1666c1", fontWeight: "700" }),
        createElement("field", { field: "title", x: 140, y: 60, w: 360, h: 24, fontSize: 14, color: "#334155" }),
        createElement("field", { field: "email", x: 140, y: 90, w: 360, h: 22, fontSize: 13, color: "#334155" }),
        createElement("field", { field: "phone", x: 140, y: 114, w: 220, h: 22, fontSize: 13, color: "#334155" }),
        createElement("text", { text: "Campana de temporada", x: 24, y: 154, w: 660, h: 42, fontSize: 14, color: "#ffffff", backgroundColor: "#1666c1", fontWeight: "700", padding: 10, radius: 6 }),
        createElement("text", { text: "Este mensaje puede contener informacion confidencial. Si lo recibio por error, por favor eliminelo y notifique al remitente.", x: 24, y: 218, w: 660, h: 38, fontSize: 10, color: "#64748b" })
      ]
    }
  };
}

function createElement(type, overrides = {}) {
  const base = {
    id: `${type}-${Date.now()}-${Math.round(Math.random() * 10000)}`,
    type,
    x: 30,
    y: 30,
    w: type === "text" ? 260 : 120,
    h: type === "text" ? 42 : 80,
    fontSize: 14,
    fontFamily: "Arial",
    color: "#1f2937",
    backgroundColor: "transparent",
    fontWeight: "400",
    padding: 0,
    radius: 0,
    objectFit: "contain"
  };

  if (type === "field") return { ...base, field: "name", w: 280, h: 32, fontSize: 22, color: "#1666c1", fontWeight: "700", ...overrides };
  if (type === "image" || type === "logo") return { ...base, src: "https://dummyimage.com/160x120/1666c1/ffffff.png&text=Imagen", ...overrides };
  if (type === "box") return { ...base, w: 180, h: 48, backgroundColor: "#e7f0fb", radius: 6, ...overrides };
  if (type === "line") return { ...base, w: 260, h: 3, backgroundColor: "#1666c1", ...overrides };
  return { ...base, text: "Nuevo texto", ...overrides };
}

function App() {
  const [data, setData] = useState({ users: [], seasons: [], signatures: [], assets: [] });
  const [selectedSeasonId, setSelectedSeasonId] = useState(null);
  const [selectedSignatureId, setSelectedSignatureId] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [signatureDraft, setSignatureDraft] = useState(null);
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const [status, setStatus] = useState("Cargando...");

  function pickSignatureForSeason(seasonId, payload = data) {
    const season = payload.seasons.find((item) => item.id === seasonId);
    const signature = payload.signatures.find((item) => item.season_id === seasonId);
    return signature || emptySignature(seasonId, season?.name, payload.assets[0]?.public_url);
  }

  async function load(options = {}) {
    const response = await fetch(`${API}/api/bootstrap`);
    const payload = await response.json();
    setData(payload);
    const activeSeason = payload.seasons.find((season) => season.is_active) || payload.seasons[0];
    const seasonId = options.seasonId || selectedSeasonId || activeSeason?.id || null;
    const signature = pickSignatureForSeason(seasonId, payload);
    setSelectedSeasonId(seasonId);
    setSelectedSignatureId(signature.id || null);
    setSignatureDraft(structuredClone(signature));
    setSelectedElementId(signature.config?.elements?.[0]?.id || null);
    setSelectedUserId(options.userId || selectedUserId || payload.users[0]?.id || null);
    setStatus("Listo");
  }

  useEffect(() => {
    load().catch((error) => setStatus(`Error: ${error.message}`));
  }, []);

  const selectedUser = useMemo(
    () => data.users.find((user) => user.id === selectedUserId) || data.users[0] || {},
    [data.users, selectedUserId]
  );

  const selectedElement = useMemo(
    () => signatureDraft?.config?.elements?.find((element) => element.id === selectedElementId) || null,
    [signatureDraft, selectedElementId]
  );

  useEffect(() => {
    if (!selectedSeasonId || data.seasons.length === 0) return;
    const signature = pickSignatureForSeason(selectedSeasonId, data);
    setSelectedSignatureId(signature.id || null);
    setSignatureDraft(structuredClone(signature));
    setSelectedElementId(signature.config?.elements?.[0]?.id || null);
  }, [selectedSeasonId, data.seasons.length, data.signatures.length, data.assets.length]);

  useEffect(() => {
    async function refreshPreview() {
      if (!selectedUser.email) return;
      try {
        const response = await fetch(`${API}/api/public/signature?email=${encodeURIComponent(selectedUser.email)}`);
        const payload = await response.json();
        setPreviewHtml(payload.html || "");
      } catch {
        setPreviewHtml("");
      }
    }
    refreshPreview();
  }, [selectedUser.email, selectedSignatureId, status]);

  function updateDraft(patch) {
    setSignatureDraft((current) => ({ ...current, ...patch }));
  }

  function updateElement(id, patch) {
    setSignatureDraft((current) => ({
      ...current,
      config: {
        ...current.config,
        elements: current.config.elements.map((element) => element.id === id ? { ...element, ...patch } : element)
      }
    }));
  }

  function addElement(type, overrides = {}) {
    const element = createElement(type, {
      ...(type === "image" || type === "logo" ? { src: data.assets[0]?.public_url || "https://dummyimage.com/160x120/1666c1/ffffff.png&text=Imagen" } : {}),
      ...overrides
    });
    setSignatureDraft((current) => ({
      ...current,
      config: { ...current.config, elements: [...current.config.elements, element] }
    }));
    setSelectedElementId(element.id);
  }

  function removeElement(id) {
    setSignatureDraft((current) => ({
      ...current,
      config: { ...current.config, elements: current.config.elements.filter((element) => element.id !== id) }
    }));
    setSelectedElementId(null);
  }

  function duplicateElement(id) {
    const element = signatureDraft.config.elements.find((item) => item.id === id);
    if (!element) return;
    const copy = { ...element, id: `${element.type}-${Date.now()}`, x: Number(element.x || 0) + 16, y: Number(element.y || 0) + 16 };
    setSignatureDraft((current) => ({
      ...current,
      config: { ...current.config, elements: [...current.config.elements, copy] }
    }));
    setSelectedElementId(copy.id);
  }

  function moveLayer(id, direction) {
    const elements = [...(signatureDraft.config.elements || [])];
    const index = elements.findIndex((element) => element.id === id);
    const nextIndex = direction === "up" ? index + 1 : index - 1;
    if (index < 0 || nextIndex < 0 || nextIndex >= elements.length) return;
    [elements[index], elements[nextIndex]] = [elements[nextIndex], elements[index]];
    setSignatureDraft((current) => ({ ...current, config: { ...current.config, elements } }));
  }

  function addQuickField(field, yOffset = 0) {
    const defaults = {
      name: { fontSize: 22, color: "#1666c1", fontWeight: "700", w: 360, h: 32 },
      title: { fontSize: 14, color: "#334155", w: 360, h: 24 },
      department: { fontSize: 13, color: "#334155", w: 280, h: 22 },
      email: { fontSize: 13, color: "#334155", w: 330, h: 22 },
      phone: { fontSize: 13, color: "#334155", w: 230, h: 22 },
      mobile: { fontSize: 13, color: "#334155", w: 230, h: 22 },
      location: { fontSize: 13, color: "#334155", w: 260, h: 22 }
    };
    addElement("field", { field, x: 140, y: 32 + yOffset, ...(defaults[field] || {}) });
  }

  async function saveSignature() {
    setStatus("Guardando firma...");
    const method = signatureDraft.id ? "PUT" : "POST";
    const url = signatureDraft.id ? `${API}/api/signatures/${signatureDraft.id}` : `${API}/api/signatures`;
    const payload = {
      ...signatureDraft,
      html: signatureDraft.mode === "html" ? String(signatureDraft.html || "") : signatureDraft.html
    };
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error("No se pudo guardar");
    const saved = await response.json();
    if (saved.signature) {
      setSignatureDraft(structuredClone(saved.signature));
      setSelectedSignatureId(saved.signature.id || null);
      setData((current) => ({
        ...current,
        signatures: [
          saved.signature,
          ...current.signatures.filter((signature) => signature.id !== saved.signature.id)
        ]
      }));
    }
    setStatus("Firma guardada en MySQL");
  }

  async function uploadAsset(file, options = { addToCanvas: true }) {
    if (!file) return;
    setStatus("Subiendo imagen...");
    const form = new FormData();
    form.append("file", file);
    const response = await fetch(`${API}/api/assets`, { method: "POST", body: form });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "No se pudo subir imagen");
    await load();
    if (options.addToCanvas) addElementFromImage(payload.public_url);
    setStatus("Imagen guardada en MySQL");
  }

  function addElementFromImage(src, type = "image") {
    const id = `image-${Date.now()}`;
    const element = createElement(type, { id, src, x: 28, y: 24, w: 110, h: 90, objectFit: "contain" });
    setSignatureDraft((current) => ({
      ...current,
      config: { ...current.config, elements: [...current.config.elements, element] }
    }));
    setSelectedElementId(id);
  }

  async function addSeason() {
    const name = prompt("Nombre de la temporada");
    if (!name) return;
    await fetch(`${API}/api/seasons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, is_active: false })
    });
    await load({ userId: selectedUserId });
  }

  async function activateSeason() {
    if (!selectedSeasonId) return;
    await fetch(`${API}/api/seasons/${selectedSeasonId}/activate`, { method: "POST" });
    await load({ seasonId: selectedSeasonId, userId: selectedUserId });
    setStatus("Temporada activada");
  }

  async function addUser() {
    const email = prompt("Correo del usuario");
    if (!email) return;
    await fetch(`${API}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: email.split("@")[0], email, active: 1 })
    });
    await load({ seasonId: selectedSeasonId });
  }

  if (!signatureDraft) {
    return <div className="loading">{status}</div>;
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="mark"><Mail size={24} /></div>
          <div>
            <h1>Firmas 365</h1>
            <p>Temporadas, usuarios e imagenes en MySQL</p>
          </div>
        </div>

        <section>
          <div className="section-title">
            <span>Temporadas</span>
            <button onClick={addSeason} title="Agregar temporada"><Plus size={16} /></button>
          </div>
          <div className="list">
            {data.seasons.map((season) => (
              <button
                key={season.id}
                className={season.id === selectedSeasonId ? "list-item active" : "list-item"}
                onClick={() => setSelectedSeasonId(season.id)}
              >
                <strong>{season.name}</strong>
                <span>{season.is_active ? "Activa" : data.signatures.some((signature) => signature.season_id === season.id) ? "Con firma" : "Sin firma"}</span>
              </button>
            ))}
          </div>
          <button className="wide-button" onClick={activateSeason}>Activar temporada</button>
        </section>

        <section>
          <div className="section-title">
            <span>Usuarios</span>
            <button onClick={addUser} title="Agregar usuario"><Plus size={16} /></button>
          </div>
          <div className="list users">
            {data.users.map((user) => (
              <button
                key={user.id}
                className={user.id === selectedUserId ? "list-item active" : "list-item"}
                onClick={() => setSelectedUserId(user.id)}
              >
                <strong>{user.name}</strong>
                <span>{user.email}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="section-title">
            <span>Logos</span>
            <label className="sidebar-upload" title="Cargar logo">
              <Upload size={15} />
              <input type="file" accept="image/*" onChange={(event) => uploadAsset(event.target.files[0], { addToCanvas: false })} />
            </label>
          </div>
          <div className="logo-list">
            {data.assets.length === 0 && <p className="sidebar-empty">Aun no hay logos cargados.</p>}
            {data.assets.map((asset) => (
              <div className="logo-card" key={asset.id}>
                <img src={asset.public_url} alt={asset.original_name} />
                <div>
                  <strong>{asset.original_name}</strong>
                  <span>{Math.round(asset.size_bytes / 1024)} KB</span>
                </div>
                <div className="logo-actions">
                  <button onClick={() => addElementFromImage(asset.public_url, "logo")}>Usar</button>
                  <button onClick={async () => {
                    await navigator.clipboard.writeText(asset.public_url);
                    setStatus("URL del logo copiada");
                  }}>URL</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h2>Editor de firma digital</h2>
            <p>Arrastra bloques, cambia tamanos, fuentes, colores, fondos o pega HTML completo.</p>
          </div>
          <div className="actions">
            <button className="button" onClick={() => {
              const season = data.seasons.find((item) => item.id === selectedSeasonId);
              const next = emptySignature(selectedSeasonId, season?.name, data.assets[0]?.public_url);
              setSignatureDraft(next);
              setSelectedSignatureId(null);
              setSelectedElementId(next.config.elements[0]?.id || null);
            }}>Nueva firma</button>
            <button className="button primary" onClick={saveSignature}><Save size={17} /> Guardar</button>
          </div>
        </header>

        <div className="status">{status}</div>

        <div className="workspace">
          <section className="panel controls">
            <h3>Firma</h3>
            <label>Nombre</label>
            <input value={signatureDraft.name} onChange={(event) => updateDraft({ name: event.target.value })} />

            <label>Modo</label>
            <div className="segmented">
              <button className={signatureDraft.mode === "visual" ? "selected" : ""} onClick={() => updateDraft({ mode: "visual" })}>Visual</button>
              <button className={signatureDraft.mode === "html" ? "selected" : ""} onClick={() => updateDraft({ mode: "html" })}>HTML</button>
            </div>

            {signatureDraft.mode === "visual" ? (
              <>
                <div className="two">
                  <div>
                    <label>Ancho</label>
                    <input type="number" value={signatureDraft.canvas_width} onChange={(event) => updateDraft({ canvas_width: Number(event.target.value) })} />
                  </div>
                  <div>
                    <label>Alto</label>
                    <input type="number" value={signatureDraft.canvas_height} onChange={(event) => updateDraft({ canvas_height: Number(event.target.value) })} />
                  </div>
                </div>
                <label>Fondo</label>
                <input type="color" value={signatureDraft.background_color} onChange={(event) => updateDraft({ background_color: event.target.value })} />
                <div className="tool-section">
                  <span>Bloques rapidos</span>
                  <div className="quick-grid">
                    <button onClick={() => addQuickField("name", 0)}>Nombre</button>
                    <button onClick={() => addQuickField("title", 28)}>Puesto</button>
                    <button onClick={() => addQuickField("email", 56)}>Correo</button>
                    <button onClick={() => addQuickField("phone", 82)}>Telefono</button>
                    <button onClick={() => addElement("text", { text: "Banner de temporada", x: 24, y: 154, w: 660, h: 42, color: "#ffffff", backgroundColor: "#1666c1", fontWeight: "700", padding: 10, radius: 6 })}>Banner</button>
                    <button onClick={() => addElement("text", { text: "Texto legal o confidencialidad", x: 24, y: 218, w: 660, h: 38, fontSize: 10, color: "#64748b" })}>Legal</button>
                  </div>
                </div>
                <div className="toolbar">
                  <button onClick={() => addElement("field")}><Type size={16} /> Campo</button>
                  <button onClick={() => addElement("text")}><Type size={16} /> Texto</button>
                  <button onClick={() => addElement("box")}><Square size={16} /> Caja</button>
                  <button onClick={() => addElement("line")}><Minus size={16} /> Linea</button>
                  <button onClick={() => addElement("logo")}><ImagePlus size={16} /> Logo</button>
                  <label className="upload-button">
                    <ImagePlus size={16} /> Imagen
                    <input type="file" accept="image/*" onChange={(event) => uploadAsset(event.target.files[0])} />
                  </label>
                </div>
                <ElementControls
                  element={selectedElement}
                  onChange={(patch) => updateElement(selectedElement.id, patch)}
                  onDelete={() => removeElement(selectedElement.id)}
                  onDuplicate={() => duplicateElement(selectedElement.id)}
                  onLayerUp={() => moveLayer(selectedElement.id, "up")}
                  onLayerDown={() => moveLayer(selectedElement.id, "down")}
                  assets={data.assets}
                />
              </>
            ) : (
              <>
                <label>HTML de la firma</label>
                <textarea
                  className="html-editor"
                  value={signatureDraft.html || ""}
                  placeholder="Pega aqui tu HTML. Puedes usar {{name}}, {{email}}, {{title}}, {{department}}, {{phone}}, {{mobile}}, {{location}}."
                  onChange={(event) => updateDraft({ html: event.target.value })}
                />
                <label className="upload-button full">
                  <Upload size={16} /> Subir archivo HTML
                  <input
                    type="file"
                    accept=".html,text/html"
                    onChange={async (event) => {
                      const text = await event.target.files[0]?.text();
                      if (text) updateDraft({ html: text, mode: "html" });
                    }}
                  />
                </label>
              </>
            )}
          </section>

          <div className="right-stack">
            <section className="panel canvas-panel">
              <div className="panel-title">
                <h3>Diseno editable</h3>
                <span>{selectedUser.email}</span>
              </div>
              {signatureDraft.mode === "visual" ? (
                <Canvas
                  signature={signatureDraft}
                  user={selectedUser}
                  selectedElementId={selectedElementId}
                  onSelect={setSelectedElementId}
                  onMove={updateElement}
                />
              ) : (
                <div className="html-preview" dangerouslySetInnerHTML={{ __html: applyTokens(signatureDraft.html, selectedUser) }} />
              )}
            </section>

            <section className="panel preview-panel">
              <div className="panel-title">
                <h3>Como lo consultara Outlook</h3>
                <span>/api/public/signature</span>
              </div>
              <div className="email">
                <p>Hola,</p>
                <p>Adjunto lo solicitado.</p>
              <div dangerouslySetInnerHTML={{ __html: renderLocal(signatureDraft, selectedUser) || previewHtml }} />
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function ElementControls({ element, onChange, onDelete, onDuplicate, onLayerUp, onLayerDown, assets }) {
  if (!element) return <p className="muted">Selecciona o agrega un bloque para editarlo.</p>;

  return (
    <div className="element-controls">
      <div className="element-header">
        <h4>Bloque seleccionado</h4>
        <span>{element.type}</span>
      </div>
      <div className="element-actions">
        <button onClick={onDuplicate}><Copy size={15} /> Duplicar</button>
        <button onClick={onLayerUp}>Subir</button>
        <button onClick={onLayerDown}>Bajar</button>
        <button className="danger" onClick={onDelete}><Trash2 size={15} /> Eliminar</button>
      </div>
      {element.type === "field" && (
        <>
          <label>Campo</label>
          <select value={element.field} onChange={(event) => onChange({ field: event.target.value })}>
            {fields.map((field) => <option key={field} value={field}>{fieldLabels[field]}</option>)}
          </select>
        </>
      )}
      {element.type === "text" && (
        <>
          <label>Texto</label>
          <textarea value={element.text || ""} onChange={(event) => onChange({ text: event.target.value })} />
        </>
      )}
      {(element.type === "image" || element.type === "logo") && (
        <>
          <label>{element.type === "logo" ? "Logo guardado" : "Imagen guardada"}</label>
          <select value={element.src} onChange={(event) => onChange({ src: event.target.value })}>
            <option value={element.src}>{element.src}</option>
            {assets.map((asset) => <option key={asset.id} value={asset.public_url}>{asset.original_name}</option>)}
          </select>
          <div>
            <label>Ajuste</label>
            <select value={element.objectFit || "contain"} onChange={(event) => onChange({ objectFit: event.target.value })}>
              <option value="contain">Contener</option>
              <option value="cover">Cubrir</option>
              <option value="fill">Estirar</option>
            </select>
          </div>
        </>
      )}
      <div className="quad">
        <NumberField label="X" value={element.x} onChange={(x) => onChange({ x })} />
        <NumberField label="Y" value={element.y} onChange={(y) => onChange({ y })} />
        <NumberField label="Ancho" value={element.w || 0} onChange={(w) => onChange({ w })} />
        <NumberField label="Alto" value={element.h || 0} onChange={(h) => onChange({ h })} />
      </div>
      {element.type !== "image" && element.type !== "logo" && (
        <>
          {element.type !== "box" && element.type !== "line" && (
            <div className="two">
              <div>
                <label>Fuente</label>
                <select value={element.fontFamily || "Arial"} onChange={(event) => onChange({ fontFamily: event.target.value })}>
                  {fonts.map((font) => <option key={font} value={font}>{font}</option>)}
                </select>
              </div>
              <NumberField label="Tamano" value={element.fontSize || 13} onChange={(fontSize) => onChange({ fontSize })} />
            </div>
          )}
          <div className="two">
            <div>
              <label>Color</label>
              <input type="color" value={element.color || "#1f2937"} onChange={(event) => onChange({ color: event.target.value })} />
            </div>
            <div>
              <label>Fondo</label>
              <input type="color" value={normalizeColor(element.backgroundColor)} onChange={(event) => onChange({ backgroundColor: event.target.value })} />
            </div>
          </div>
          {element.type !== "line" && (
            <div className="two">
              <NumberField label="Padding" value={element.padding || 0} onChange={(padding) => onChange({ padding })} />
              <NumberField label="Radio" value={element.radius || 0} onChange={(radius) => onChange({ radius })} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function NumberField({ label, value, onChange }) {
  return (
    <div>
      <label>{label}</label>
      <input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </div>
  );
}

function Canvas({ signature, user, selectedElementId, onSelect, onMove }) {
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const elements = signature.config?.elements || [];

  function pointerDown(event, element) {
    event.stopPropagation();
    const rect = canvasRef.current.getBoundingClientRect();
    dragRef.current = {
      id: element.id,
      offsetX: event.clientX - rect.left - Number(element.x || 0),
      offsetY: event.clientY - rect.top - Number(element.y || 0)
    };
    onSelect(element.id);
  }

  function pointerMove(event) {
    if (!dragRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    onMove(dragRef.current.id, {
      x: Math.max(0, Math.round(event.clientX - rect.left - dragRef.current.offsetX)),
      y: Math.max(0, Math.round(event.clientY - rect.top - dragRef.current.offsetY))
    });
  }

  return (
    <div className="canvas-wrap">
      <div
        ref={canvasRef}
        className="signature-canvas"
        style={{ width: signature.canvas_width, height: signature.canvas_height, backgroundColor: signature.background_color }}
        onPointerMove={pointerMove}
        onPointerUp={() => { dragRef.current = null; }}
        onPointerLeave={() => { dragRef.current = null; }}
      >
        {elements.map((element) => (
          <div
            key={element.id}
            className={element.id === selectedElementId ? "canvas-element selected" : "canvas-element"}
            style={elementStyle(element)}
            onPointerDown={(event) => pointerDown(event, element)}
          >
            {element.type === "image" || element.type === "logo"
              ? <img src={element.src} alt="" style={{ objectFit: element.objectFit || "contain" }} />
              : element.type === "box" || element.type === "line"
                ? null
                : element.type === "field"
                ? user[element.field] || element.field
                : element.text}
          </div>
        ))}
      </div>
    </div>
  );
}

function elementStyle(element) {
  return {
    left: element.x,
    top: element.y,
    width: element.w || "auto",
    height: element.h || "auto",
    color: element.color,
    backgroundColor: element.backgroundColor || "transparent",
    fontSize: element.fontSize,
    fontFamily: element.fontFamily,
    fontWeight: element.fontWeight,
    borderRadius: element.radius,
    padding: element.padding,
    lineHeight: 1.25
  };
}

function applyTokens(html = "", user = {}) {
  return String(html || "")
    .replaceAll("{{name}}", user.name || "")
    .replaceAll("{{email}}", user.email || "")
    .replaceAll("{{title}}", user.title || "")
    .replaceAll("{{department}}", user.department || "")
    .replaceAll("{{phone}}", user.phone || "")
    .replaceAll("{{mobile}}", user.mobile || "")
    .replaceAll("{{location}}", user.location || "");
}

function renderLocal(signature, user) {
  if (signature.mode === "html") return applyTokens(signature.html, user);
  const elements = signature.config?.elements || [];
  return `<div style="position:relative;width:${signature.canvas_width}px;height:${signature.canvas_height}px;background:${signature.background_color};">${elements.map((element) => {
    const style = `position:absolute;left:${element.x}px;top:${element.y}px;width:${element.w || 100}px;height:${element.h || 30}px;color:${element.color || "#111"};font-size:${element.fontSize || 13}px;font-family:${element.fontFamily || "Arial"};font-weight:${element.fontWeight || 400};background:${element.backgroundColor || "transparent"};border-radius:${element.radius || 0}px;padding:${element.padding || 0}px;box-sizing:border-box;overflow:hidden;`;
    if (element.type === "image" || element.type === "logo") return `<img src="${element.src}" style="${style}object-fit:${element.objectFit || "contain"};display:block;border:0;">`;
    if (element.type === "box" || element.type === "line") return `<div style="${style}"></div>`;
    const text = element.type === "field" ? (user[element.field] || "") : (element.text || "");
    return `<div style="${style}">${text}</div>`;
  }).join("")}</div>`;
}

function normalizeColor(color) {
  return color && color !== "transparent" ? color : "#ffffff";
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="fatal-error">
          <h1>No se pudo mostrar el editor</h1>
          <p>{this.state.error.message}</p>
          <button onClick={() => window.location.reload()}>Recargar</button>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
