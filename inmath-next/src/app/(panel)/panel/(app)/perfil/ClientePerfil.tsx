"use client";
import { useActionState, useRef } from "react";
import { perfilGuardarAccion, perfilFotoAccion, logoutAccion, type Resultado } from "../acciones";
import { useToastResultado } from "../ClientePanel";

/** Avatar clicable que sube la foto al elegirla — port del formFoto de perfil.php. */
export function PerfilFotoForm({ foto, inicial }: { foto: string | null; inicial: string }) {
  const form = useRef<HTMLFormElement>(null);
  const toast = useToastResultado();
  const [, accion] = useActionState<Resultado, FormData>(async (prev, fd) => {
    const r = await perfilFotoAccion(prev, fd);
    toast(r);
    return r;
  }, {});

  return (
    <form action={accion} className="pc-foto-form" ref={form}>
      <label className="pc-avatar" title="Cambiar foto">
        {foto ? <img src={foto} alt="Tu foto de perfil" /> : <span className="pc-inicial">{inicial}</span>}
        <span className="pc-camara">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h2l2-3h8l2 3h2a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13" r="3.5" /></svg>
        </span>
        <input type="file" name="foto" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => { if (e.target.files?.length) form.current?.requestSubmit(); }} />
      </label>
    </form>
  );
}

export function PerfilDatosForm({ nombre, telefono }: { nombre: string; telefono: string }) {
  const toast = useToastResultado();
  const [, accion, pendiente] = useActionState<Resultado, FormData>(async (prev, fd) => {
    const r = await perfilGuardarAccion(prev, fd);
    toast(r);
    return r;
  }, {});

  return (
    <form action={accion} className="pl-form">
      <label className="pl-campo">
        Nombre completo
        <input type="text" name="nombre" required maxLength={120} defaultValue={nombre} />
      </label>
      <label className="pl-campo">
        Teléfono (WhatsApp)
        <input type="tel" name="telefono" maxLength={20} inputMode="numeric" placeholder="55 1234 5678" defaultValue={telefono} />
      </label>
      <div className="pl-separador">Cambiar contraseña <small>(opcional — déjalo vacío para no cambiarla)</small></div>
      <label className="pl-campo">
        Contraseña nueva
        <input type="password" name="password" minLength={8} autoComplete="new-password" placeholder="Mínimo 8 caracteres" />
      </label>
      <label className="pl-campo">
        Repite la contraseña
        <input type="password" name="password2" autoComplete="new-password" />
      </label>
      <button className="boton primario" disabled={pendiente}>{pendiente ? "Guardando…" : "Guardar cambios"}</button>
    </form>
  );
}

export function SalirPerfilBoton({ children }: { children: React.ReactNode }) {
  return (
    <form action={logoutAccion} className="pc-salir">
      <button type="submit" className="boton fantasma">{children}</button>
    </form>
  );
}
