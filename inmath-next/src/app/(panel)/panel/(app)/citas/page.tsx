import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requiereModulo } from "@/lib/panel/sesion";
import { ahoraPared, isoDia, paredDesde } from "@/lib/fechas";
import { NuevaCitaBoton, FiltroAsesorCitas } from "./ClienteCitas";

export const metadata: Metadata = { title: "Citas — Inmath CRM" };
export const dynamic = "force-dynamic";

const COLORES_ASESOR = ["#0E5A4E", "#3E9E86", "#EBA23C", "#6E93B5", "#D4703A"];
const DIAS_SEM = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/** Lunes de la semana de la fecha dada (pared-UTC). */
function lunesDe(d: Date): Date {
  const l = new Date(d); l.setUTCHours(0, 0, 0, 0);
  const dow = l.getUTCDay() === 0 ? 7 : l.getUTCDay();
  return new Date(l.getTime() - (dow - 1) * 86400_000);
}

export default async function Citas({ searchParams }: { searchParams: Promise<{ semana?: string; asesor_id?: string }> }) {
  await requiereModulo("citas");
  const { semana, asesor_id } = await searchParams;
  const inicioSemana = semana ? lunesDe(paredDesde(`${semana} 00:00`) ?? ahoraPared()) : lunesDe(ahoraPared());
  const finSemana = new Date(inicioSemana.getTime() + 7 * 86400_000);
  const asesorId = asesor_id ? parseInt(asesor_id, 10) : null;

  const asesores = await prisma.usuarios.findMany({
    where: { es_asesor: true, activo: true }, select: { id: true, nombre: true }, orderBy: { id: "asc" },
  });
  const mapaColor = new Map(asesores.map((a, i) => [a.id, COLORES_ASESOR[i % COLORES_ASESOR.length]]));

  const citas = await prisma.citas.findMany({
    where: {
      inicio: { gte: inicioSemana, lt: finSemana },
      estado: { not: "cancelada" },
      ...(asesorId ? { asesor_id: asesorId } : {}),
    },
    orderBy: { inicio: "asc" },
    include: { prospectos: { select: { id: true, nombre: true, telefono_whatsapp: true } }, usuarios: { select: { nombre: true } } },
  });

  const porCelda = new Map<string, typeof citas>();
  for (const c of citas) {
    const clave = `${isoDia(c.inicio)} ${String(c.inicio.getUTCHours()).padStart(2, "0")}`;
    if (!porCelda.has(clave)) porCelda.set(clave, []);
    porCelda.get(clave)!.push(c);
  }

  const dias = Array.from({ length: 6 }, (_, i) => new Date(inicioSemana.getTime() + i * 86400_000));
  const horas = Array.from({ length: 13 }, (_, i) => 8 + i);
  const fmt = (d: Date) => `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  const qsAsesor = asesor_id ? `&asesor_id=${asesor_id}` : "";

  return (
    <>
      <div className="cabecera">
        <div>
          <h1>Calendario de citas</h1>
          <div className="sub">Semana del {fmt(inicioSemana)}/{inicioSemana.getUTCFullYear()} — cada asesor con su color</div>
        </div>
        <div className="form-inline">
          <Link className="boton mini fantasma" href={`/panel/citas?semana=${isoDia(new Date(inicioSemana.getTime() - 7 * 86400_000))}${qsAsesor}`}>← Anterior</Link>
          <Link className="boton mini fantasma" href={`/panel/citas?semana=${isoDia(new Date(inicioSemana.getTime() + 7 * 86400_000))}${qsAsesor}`}>Siguiente →</Link>
          <FiltroAsesorCitas asesores={asesores} filtro={asesor_id ?? ""} semana={isoDia(inicioSemana)} />
        </div>
        <NuevaCitaBoton asesores={asesores} hoy={isoDia(ahoraPared())} />
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
        {asesores.map((a) => (
          <span key={a.id} className="gaje neutro">
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: mapaColor.get(a.id), display: "inline-block" }} /> {a.nombre}
          </span>
        ))}
      </div>

      <div className="tarjeta" style={{ overflowX: "auto" }}>
        <div className="calendario" style={{ minWidth: 820 }}>
          <div />
          {dias.map((d) => (
            <div key={isoDia(d)} className="dia-cab">{DIAS_SEM[d.getUTCDay()]} {fmt(d)}</div>
          ))}
          {horas.map((h) => (
            <FilaHora key={h} h={h} dias={dias} porCelda={porCelda} mapaColor={mapaColor} />
          ))}
        </div>
      </div>
    </>
  );
}

function FilaHora({ h, dias, porCelda, mapaColor }: {
  h: number; dias: Date[];
  porCelda: Map<string, { id: number; inicio: Date; estado: string; asesor_id: number; meet_link: string | null; prospectos: { id: number; nombre: string | null; telefono_whatsapp: string }; usuarios: { nombre: string } }[]>;
  mapaColor: Map<number, string>;
}) {
  return (
    <>
      <div className="hora">{String(h).padStart(2, "0")}:00</div>
      {dias.map((d) => {
        const clave = `${isoDia(d)} ${String(h).padStart(2, "0")}`;
        return (
          <div key={clave} className="celda">
            {(porCelda.get(clave) ?? []).map((c) => (
              <Link key={c.id} className="cita-bloque"
                style={{ "--asesor-color": mapaColor.get(c.asesor_id) ?? "#3B6FF5" } as React.CSSProperties}
                href={`/panel/prospectos/${c.prospectos.id}`} title={c.estado}>
                {String(c.inicio.getUTCHours()).padStart(2, "0")}:{String(c.inicio.getUTCMinutes()).padStart(2, "0")} · {c.prospectos.nombre ?? c.prospectos.telefono_whatsapp}
                <small>{c.usuarios.nombre}{c.meet_link ? " · Meet" : ""}</small>
              </Link>
            ))}
          </div>
        );
      })}
    </>
  );
}
