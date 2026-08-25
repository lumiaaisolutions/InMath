import type { Metadata } from "next";
import { prisma, config } from "@/lib/db";
import { requiereModulo } from "@/lib/panel/sesion";
import { ListaCursos, ListaCupones, SwitchMercadoPago } from "./ClientePrecios";

export const metadata: Metadata = { title: "Precios y promociones — Inmath CRM" };
export const dynamic = "force-dynamic";

export default async function PreciosPage() {
  await requiereModulo("precios");
  const [cursos, cupones, procesadorActivo] = await Promise.all([
    prisma.cursos.findMany({ orderBy: [{ orden: "asc" }, { id: "asc" }] }),
    prisma.cupones.findMany({ orderBy: { id: "desc" }, include: { cursos: { select: { nombre: true } } } }),
    config("procesador_pago_activo", ""),
  ]);

  const cursosLigero = cursos.map((c) => ({ id: c.id, nombre: c.nombre }));

  return (
    <>
      <div className="cabecera">
        <div>
          <h1>Precios y promociones</h1>
          <div className="sub">Precios por curso, promoción activa, cupones y el procesador de pago</div>
        </div>
      </div>

      <div className="tarjeta pp-panel">
        <p className="pl-titulo">Mercado Pago</p>
        <p className="pl-ayuda">Enciende o apaga el cobro con tarjeta/OXXO. Las credenciales viven en el servidor, no aquí.</p>
        <SwitchMercadoPago activo={procesadorActivo.trim() === "mercadopago"} />
      </div>

      <div className="tarjeta pp-panel">
        <p className="pl-titulo">Cursos y paquetes</p>
        <p className="pl-ayuda">Cada curso es un paquete vendible independiente — precio, modalidad, duración y promoción.</p>
        <ListaCursos
          inicial={cursos.map((c) => ({
            id: c.id, nombre: c.nombre, precio_centavos: c.precio_centavos, precio_original_centavos: c.precio_original_centavos,
            moneda: c.moneda, duracion_semanas: c.duracion_semanas, modalidad: c.modalidad,
            promocion_activa: c.promocion_activa, promocion_texto: c.promocion_texto,
            promocion_expira_en: c.promocion_expira_en ? c.promocion_expira_en.toISOString().slice(0, 16) : null,
            destacado: c.destacado, activo: c.activo, orden: c.orden,
          }))}
        />
      </div>

      <div className="tarjeta pp-panel">
        <p className="pl-titulo">Cupones</p>
        <p className="pl-ayuda">Códigos de descuento — el alumno los captura al elegir cómo pagar, en /pago.</p>
        <ListaCupones
          inicial={cupones.map((c) => ({
            id: c.id, codigo: c.codigo, tipo: c.tipo, valor: c.valor,
            curso_id: c.curso_id, curso_nombre: c.cursos?.nombre ?? null,
            activo: c.activo, usos_maximos: c.usos_maximos,
            expira_en: c.expira_en ? c.expira_en.toISOString().slice(0, 16) : null,
          }))}
          cursos={cursosLigero}
        />
      </div>
    </>
  );
}
