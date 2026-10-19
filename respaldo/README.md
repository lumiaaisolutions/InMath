# Respaldo — código y archivos retirados de la raíz

Movido aquí el 19-oct-2026, no borrado: todo sigue en git/GitHub por si hace
falta consultarlo o recuperarlo.

## `php-legacy/`

El monolito PHP original (`backend/`, `panel/`, `sitio/`, `chatbot/`,
`reportes/`) que `inmath-next/` reemplazó. Confirmado código muerto en
producción antes de moverlo:
- nginx en el VPS solo hace `proxy_pass` a Next.js (:3010) — no sirve nada de
  `public_html/` ni `backend/`.
- Las imágenes/materiales/reportes reales viven en carpetas separadas del VPS
  (`panel-img/`, `storage/`), no dentro de este árbol.
- Nada modificado aquí desde antes de mediados de agosto 2026.

**Ojo con el dev local de `inmath-next`:** tres rutas usan esta carpeta como
*fallback* cuando la variable de entorno correspondiente no está puesta —
`COMPROBANTES_DIR`, `PANEL_IMG_DIR`, `STORAGE_DIR` (ver
`inmath-next/src/lib/pagos.ts`, `lib/panel/media.ts`, `lib/reportes/generador.ts`
y las rutas de comprobante). Si corres `npm run dev` localmente y ves 404 en
avatares, comprobantes o reportes, pon esas tres variables en tu `.env` local
de `inmath-next/` apuntando a donde quieras guardar esos archivos — no hace
falta que apunten aquí.

## `archivos-raiz/`

Archivos sueltos sin relación con el código (screenshots de sesiones viejas,
un `.docx` que es insumo del cliente) que estorbaban en la raíz del repo.
