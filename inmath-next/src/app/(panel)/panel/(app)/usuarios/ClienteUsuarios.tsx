"use client";
import { useActionState, useState, useTransition } from "react";
import { IconoPanel } from "@/components/IconoPanel";
import { usuarioCrearAccion, usuarioGuardarAccion, usuarioEliminarAccion, type Resultado } from "../acciones";
import { Velo, ConfirmarDialogo, useToastResultado, Segmentado, BotonMagnetico } from "../ClientePanel";

export type UsuarioFicha = {
  id: number; nombre: string; email: string; rol: string; telefono: string | null;
  activo: boolean; esAsesor: boolean; modulos: string[] | null; foto: string | null;
};

const MODULOS: [string, string][] = [
  ["pipeline", "Pipeline"], ["citas", "Citas"], ["alumnos", "Alumnos y pagos"], ["pagos", "Aprobar/cancelar pagos"],
  ["reactivos", "Reactivos"], ["precios", "Precios y promociones"],
];

/* ── Controles propios (sin <select> ni <input type="checkbox"> nativos) ─ */

function Interruptor({ activo, onChange, etiqueta, detalle }: { activo: boolean; onChange: (v: boolean) => void; etiqueta: string; detalle?: string }) {
  return (
    <button type="button" className={`interr${activo ? " on" : ""}`} role="switch" aria-checked={activo} onClick={() => onChange(!activo)}>
      <span className="interr-sw" aria-hidden="true" />
      <span className="interr-tx"><b>{etiqueta}</b>{detalle && <i>{detalle}</i>}</span>
    </button>
  );
}

function Avatar({ u }: { u: UsuarioFicha }) {
  return (
    <span className="pw-avatar">
      {u.foto ? <img src={u.foto} alt="" /> : u.nombre.charAt(0).toUpperCase()}
    </span>
  );
}

/** Port de usuarios.php: filtros por rol, tarjetas mini y frames de edición. */
export function UsuariosRejilla({ usuarios, yoId }: { usuarios: UsuarioFicha[]; yoId: number }) {
  const [filtro, setFiltro] = useState<"todos" | "admin" | "asesor">("todos");
  const [abierto, setAbierto] = useState<number | null>(null);

  return (
    <>
      <div className="us-filtros" role="tablist" aria-label="Filtrar por tipo de usuario">
        {(["todos", "admin", "asesor"] as const).map((r) => (
          <button key={r} type="button" className={`us-filtro${filtro === r ? " activo" : ""}`} onClick={() => setFiltro(r)}>
            {r === "todos" ? "Todos" : r === "admin" ? "Administradores" : "Asesores"}
          </button>
        ))}
      </div>
      <div className="us-rejilla">
        {[...usuarios].sort((a, b) => Number(b.activo) - Number(a.activo)).map((u) => (
          <button key={u.id} type="button" hidden={filtro !== "todos" && u.rol !== filtro}
            className={`tarjeta us-mini ${u.activo ? "" : "bloqueado"}`} onClick={() => setAbierto(u.id)}>
            <Avatar u={u} />
            <span className="us-quien">
              <b>{u.nombre}{u.id === yoId ? " · tú" : ""}</b>
              <span>{u.email}</span>
            </span>
            <i className={`pw-chip ${u.rol === "admin" ? "admin" : ""}`}>{u.rol === "admin" ? "Administrador" : "Asesor"}</i>
            {!u.activo && <i className="pw-chip suave">Bloqueado</i>}
          </button>
        ))}
      </div>
      {usuarios.map((u) => (
        <EditarUsuarioModal key={u.id} u={u} yoId={yoId} abierto={abierto === u.id} onCerrar={() => setAbierto(null)} />
      ))}
    </>
  );
}

function EditarUsuarioModal({ u, yoId, abierto, onCerrar }: {
  u: UsuarioFicha; yoId: number; abierto: boolean; onCerrar: () => void;
}) {
  const [confirmar, setConfirmar] = useState(false);
  const [borrando, startBorrar] = useTransition();
  const toast = useToastResultado();
  const esYo = u.id === yoId;
  const modulosU = u.modulos ?? MODULOS.map(([k]) => k);
  const [rol, setRol] = useState(u.rol);
  const [esAsesor, setEsAsesor] = useState(u.esAsesor);
  const [activo, setActivo] = useState(u.activo);
  const [modulosSel, setModulosSel] = useState<Set<string>>(new Set(modulosU));
  const alternarModulo = (clave: string) =>
    setModulosSel((prev) => {
      const siguiente = new Set(prev);
      siguiente.has(clave) ? siguiente.delete(clave) : siguiente.add(clave);
      return siguiente;
    });
  const [, accion, pendiente] = useActionState<Resultado, FormData>(async (prev, fd) => {
    const r = await usuarioGuardarAccion(prev, fd);
    toast(r);
    if (r.ok) onCerrar();
    return r;
  }, {});

  return (
    <Velo abierto={abierto} onCerrar={onCerrar}>
      <div className="us-frame" role="dialog" aria-modal="true">
        <div className="us-frame-cab">
          <Avatar u={u} />
          <div className="us-quien"><b>{u.nombre}</b><span>{u.email}</span></div>
          <button type="button" className="toast-x us-cerrar" aria-label="Cerrar" onClick={onCerrar}><IconoPanel n="x" /></button>
        </div>
        <form action={accion} className="pl-form">
          <input type="hidden" name="usuario_id" value={u.id} />
          <div className="us-campos">
            <label className="pl-campo">Nombre<input type="text" name="nombre" required maxLength={120} defaultValue={u.nombre} /></label>
            <label className="pl-campo">Correo<input type="email" name="email" required maxLength={190} defaultValue={u.email} /></label>
            <label className="pl-campo">Teléfono<input type="tel" name="telefono" maxLength={20} defaultValue={u.telefono ?? ""} /></label>
            <label className="pl-campo">Rol
              <Segmentado
                opciones={[{ valor: "asesor", nombre: "Asesor" }, { valor: "admin", nombre: "Administrador" }]}
                valor={esYo ? "admin" : rol}
                onChange={setRol}
              />
              <input type="hidden" name="rol" value={esYo ? "admin" : rol} />
            </label>
            <label className="pl-campo" style={{ gridColumn: "1 / -1" }}>Contraseña nueva <small>(opcional)</small>
              <input type="password" name="password" minLength={8} autoComplete="new-password" placeholder="Déjalo vacío para no cambiarla" />
            </label>
          </div>
          <div className="us-toggles">
            <Interruptor activo={esAsesor} onChange={setEsAsesor} etiqueta="Atiende citas y prospectos" detalle="Entra al reparto de prospectos y al calendario de asesores" />
            {esAsesor && <input type="hidden" name="es_asesor" value="on" />}
            <Interruptor
              activo={esYo ? true : activo}
              onChange={esYo ? () => {} : setActivo}
              etiqueta="Acceso activo"
              detalle={esYo ? "No puedes desactivar tu propia cuenta" : "Puede iniciar sesión en el panel"}
            />
            {(esYo || activo) && <input type="hidden" name="activo" value="on" />}
          </div>
          <div className="us-modulos">
            <span className="us-etiqueta">Módulos permitidos{rol === "admin" ? " (los administradores ven todo)" : ""}</span>
            <div className="us-chips">
              {MODULOS.map(([clave, nombre]) => (
                <div key={clave} className="chip-modulo">
                  <Interruptor activo={rol === "admin" ? true : modulosSel.has(clave)} onChange={rol === "admin" ? () => {} : () => alternarModulo(clave)} etiqueta={nombre} />
                  {(rol === "admin" || modulosSel.has(clave)) && <input type="hidden" name="modulos" value={clave} />}
                </div>
              ))}
            </div>
          </div>
          <div className="us-pie">
            {!esYo && (
              <button type="button" className="boton peligro" disabled={borrando || !u.activo} onClick={() => setConfirmar(true)}>
                {u.activo ? "Bloquear acceso" : "Ya está bloqueado"}
              </button>
            )}
            <button className="boton primario" style={{ marginLeft: "auto" }} disabled={pendiente}>{pendiente ? "Guardando…" : "Guardar cambios"}</button>
          </div>
        </form>
        {!esYo && (
          <ConfirmarDialogo
            abierto={confirmar}
            texto="No se borra nada — el usuario sigue apareciendo en la lista marcado como Bloqueado, y todo su historial (citas, prospectos, etc.) se conserva. Simplemente ya no podrá iniciar sesión en el panel."
            onNo={() => setConfirmar(false)}
            onSi={() => {
              setConfirmar(false);
              startBorrar(async () => { toast(await usuarioEliminarAccion(u.id)); onCerrar(); });
            }}
          />
        )}
      </div>
    </Velo>
  );
}

/** Modal "+ Agregar usuario" — port del usModalNuevo. */
export function NuevoUsuarioBoton() {
  const [abierto, setAbierto] = useState(false);
  const [rol, setRol] = useState<"asesor" | "admin">("asesor");
  const toast = useToastResultado();
  const [, accion, pendiente] = useActionState<Resultado, FormData>(async (prev, fd) => {
    const r = await usuarioCrearAccion(prev, fd);
    toast(r);
    if (r.ok) setAbierto(false);
    return r;
  }, {});
  return (
    <>
      <BotonMagnetico className="boton primario boton-magnetico" onClick={() => setAbierto(true)}>+ Agregar usuario</BotonMagnetico>
      <Velo abierto={abierto} onCerrar={() => setAbierto(false)}>
        <div className="us-frame" role="dialog" aria-modal="true">
          <div className="us-frame-cab">
            <div className="us-quien"><b>Agregar usuario</b><span>Se le comparte la contraseña y la cambia en su perfil</span></div>
            <button type="button" className="toast-x us-cerrar" aria-label="Cerrar" onClick={() => setAbierto(false)}><IconoPanel n="x" /></button>
          </div>
          <form action={accion} className="pl-form">
            <div className="us-campos">
              <label className="pl-campo">Nombre<input type="text" name="nombre" required maxLength={120} /></label>
              <label className="pl-campo">Correo<input type="email" name="email" required maxLength={190} /></label>
              <label className="pl-campo">Contraseña<input type="password" name="password" required minLength={8} autoComplete="new-password" placeholder="Mínimo 8 caracteres" /></label>
              <label className="pl-campo">Rol
                <Segmentado
                  opciones={[{ valor: "asesor", nombre: "Asesor" }, { valor: "admin", nombre: "Administrador" }]}
                  valor={rol}
                  onChange={setRol}
                />
                <input type="hidden" name="rol" value={rol} />
              </label>
            </div>
            <div className="us-pie"><button className="boton primario" disabled={pendiente}>{pendiente ? "Creando…" : "Crear usuario"}</button></div>
          </form>
        </div>
      </Velo>
    </>
  );
}
