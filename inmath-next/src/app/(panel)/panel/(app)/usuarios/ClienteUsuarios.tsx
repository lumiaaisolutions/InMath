"use client";
import { useActionState, useState, useTransition } from "react";
import { IconoPanel } from "@/components/IconoPanel";
import { usuarioCrearAccion, usuarioGuardarAccion, usuarioEliminarAccion, type Resultado } from "../acciones";
import { Velo, ConfirmarDialogo, useToastResultado } from "../ClientePanel";

export type UsuarioFicha = {
  id: number; nombre: string; email: string; rol: string; telefono: string | null;
  activo: boolean; esAsesor: boolean; modulos: string[] | null; foto: string | null;
};

const MODULOS: [string, string][] = [["pipeline", "Pipeline"], ["citas", "Citas"], ["alumnos", "Alumnos"], ["pagos", "Pagos"]];

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
        {usuarios.map((u) => (
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
              <select name="rol" defaultValue={u.rol} disabled={esYo}>
                <option value="asesor">Asesor</option>
                <option value="admin">Administrador</option>
              </select>
              {esYo && <input type="hidden" name="rol" value="admin" />}
            </label>
            <label className="pl-campo">Contraseña nueva <small>(opcional)</small>
              <input type="password" name="password" minLength={8} autoComplete="new-password" placeholder="Sin cambio" />
            </label>
            <label className="pl-campo" style={{ alignContent: "end" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" name="es_asesor" defaultChecked={u.esAsesor} /> Atiende citas y prospectos
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                <input type="checkbox" name="activo" defaultChecked={u.activo} disabled={esYo} /> Acceso activo
              </span>
              {esYo && <input type="hidden" name="activo" value="1" />}
            </label>
          </div>
          <div className="us-modulos">
            <span className="us-etiqueta">Módulos permitidos{u.rol === "admin" ? " (los administradores ven todo)" : ""}</span>
            <div className="us-chips">
              {MODULOS.map(([clave, nombre]) => (
                <label key={clave} className="chip-modulo">
                  <input type="checkbox" name="modulos" value={clave} defaultChecked={modulosU.includes(clave)} disabled={u.rol === "admin"} />
                  <span>{nombre}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="us-pie">
            <button className="boton primario" disabled={pendiente}>{pendiente ? "Guardando…" : "Guardar cambios"}</button>
          </div>
        </form>
        {!esYo && (
          <>
            <div className="us-eliminar-form">
              <button className="boton peligro" disabled={borrando} onClick={() => setConfirmar(true)}>Eliminar usuario</button>
            </div>
            <ConfirmarDialogo
              abierto={confirmar}
              texto="El usuario perderá el acceso al panel. Sus registros históricos se conservan."
              onNo={() => setConfirmar(false)}
              onSi={() => {
                setConfirmar(false);
                startBorrar(async () => { toast(await usuarioEliminarAccion(u.id)); onCerrar(); });
              }}
            />
          </>
        )}
      </div>
    </Velo>
  );
}

/** Modal "+ Agregar usuario" — port del usModalNuevo. */
export function NuevoUsuarioBoton() {
  const [abierto, setAbierto] = useState(false);
  const toast = useToastResultado();
  const [, accion, pendiente] = useActionState<Resultado, FormData>(async (prev, fd) => {
    const r = await usuarioCrearAccion(prev, fd);
    toast(r);
    if (r.ok) setAbierto(false);
    return r;
  }, {});
  return (
    <>
      <button type="button" className="boton primario" onClick={() => setAbierto(true)}>+ Agregar usuario</button>
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
                <select name="rol" defaultValue="asesor"><option value="asesor">Asesor</option><option value="admin">Administrador</option></select>
              </label>
            </div>
            <div className="us-pie"><button className="boton primario" disabled={pendiente}>{pendiente ? "Creando…" : "Crear usuario"}</button></div>
          </form>
        </div>
      </Velo>
    </>
  );
}
