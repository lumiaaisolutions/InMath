"use client";
import { useState, useTransition } from "react";
import { pagoAprobarAccion } from "../acciones";
import { ConfirmarDialogo, useToastResultado } from "../ClientePanel";

/** Botón "Aprobar e inscribir" con confirmación propia — port de pagos.php. */
export function AprobarPagoBoton({ pagoId }: { pagoId: number }) {
  const [confirmar, setConfirmar] = useState(false);
  const [pendiente, start] = useTransition();
  const toast = useToastResultado();
  return (
    <>
      <button className="boton mini primario" disabled={pendiente} onClick={() => setConfirmar(true)}>
        {pendiente ? "Aprobando…" : "Aprobar e inscribir"}
      </button>
      <ConfirmarDialogo
        abierto={confirmar}
        texto="Se marcará como pagado y se inscribirá al alumno con sus datos de acceso."
        onNo={() => setConfirmar(false)}
        onSi={() => {
          setConfirmar(false);
          start(async () => toast(await pagoAprobarAccion(pagoId)));
        }}
      />
    </>
  );
}
