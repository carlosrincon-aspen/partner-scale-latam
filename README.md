# Partner Scale LATAM

WebApp de seguimiento de **partners y forecast** para un Partner Scale Director
en Salesforce LATAM. Marca Salesforce (nube + paleta azul), barra oscura + pestañas + tarjetas KPI.

**La pestaña Forecast es la fuente de datos:** el forecast se captura manualmente ahí
y alimenta todo lo demás (Overview, territorios, países, partners).

> ⚠️ Los datos que trae por defecto son **ficticios** ("Partner 1, 2, 3…") solo para
> demostrar el flujo. Se reemplazan capturando el forecast real en la pestaña Forecast.

## Pestañas

- **Overview** — KPIs del **trimestre calendario actual**: comprometido en $, # de
  negocios y # de partners que entran al forecast, más comprometido de resto de año
  y del próximo año. Clic en **$ comprometido** → lista de esos negocios. Debajo,
  tarjetas de **territorios** (BRA · MEX · NOLA · SOLA) → país → partner.
- **Partners** — todos los partners **por territorio** (pocos clics). Abrir un partner =
  vista detallada: KPIs de forecast + **% de accuracy del partner**, **hoja de vida**
  (tier, tipo, antigüedad, owner, industria, sede, web, salud, notas), **contactos**
  (nombre, cargo, correo, teléfono) y sus negocios. **Los partners se crean/editan aquí.**
  Aquí también se **registra el resultado real por deal** (Won / Lost / Declined + monto
  real cerrado) con ✎.
- **Forecast** — captura manual de **negocios** (deals) + botón **Lock month**: congela el
  forecast comprometido del mes actual y lo envía a Accuracy. **Filtros:** pills por stage
  (con conteo), buscador (deal/partner/vendedor), partner, producto, rango de fecha de cierre
  y rango de **ARR $**. Cada deal tiene **vendedor de Salesforce (AE)**. Los montos son **ARR $**.
- **Accuracy** — **forecast bloqueado** (derivado de los deals comprometidos) vs. **real**
  (Won, con monto real por deal) por mes: gráfico Forecast/Actual, lock por mes y % de
  acierto (YTD y mensual). Nada se escribe a mano aquí: todo migra de Forecast y de los deals.
- **Admin** — editar catálogos (**tiers**, health, productos, tipos; renombrar tier
  actualiza a todos los partners), **backups** (snapshots automáticos + Export/Import JSON
  + restaurar) y zona de reinicio.

## Modelo comercial (territorios Salesforce LATAM)

| Territorio | Países |
|---|---|
| **BRA** Brasil | Brasil |
| **MEX** México | México |
| **NOLA** Norteamérica & Caribe | Costa Rica, Panamá, Guatemala, Rep. Dominicana |
| **SOLA** Sudamérica (Cono Sur + Andina) | Colombia, Chile, Argentina, Perú |

## Deal stages (probabilidad de cierre)

`Discovery` (20%) · `Demo - POC` (40%) · `Proposal` (70%) · `Won` (100%) · `Lost` (0%) · `Declined` (0%).
**Committed** en los KPIs = `Proposal` + `Won`. **Weighted** = Σ monto × probabilidad.

> La UI de la herramienta está en **inglés**; este README (notas de dev) queda en español.

## Cómo correrla

Sitio estático sin build. Opciones:

1. **Doble clic** en `index.html`.
2. **Servidor local** (recomendado, hay Node):
   ```
   npx http-server -p 8090 -c-1
   ```
   y abrir <http://localhost:8090>.

Publicar: subir a **GitHub Pages** (rama `main`, raíz). Incluir un `.nojekyll` vacío.

## Persistencia

Todo se guarda en **localStorage** de ESE navegador, con **snapshots automáticos**
(últimos 40) en cada cambio, restaurables desde **Admin › Backups**. Para respaldo
permanente/off-device usa **Exportar JSON** (Admin) y guárdalo; **Importar JSON** lo
restaura en cualquier equipo. Storage key = `psl:data:v4`. (Para multiusuario en la nube
haría falta un backend — pendiente).

## Flujo de accuracy

1. Captura tus deals en **Forecast** (stage Discovery→Proposal). El comprometido = Proposal+Won.
2. Al terminar el mes de forecast, pulsa **Lock month** → congela el número del mes en Accuracy.
3. Durante/al cierre del mes, en **Partners → deal (✎)** marca el resultado real (Won + monto
   cerrado, o Lost/Declined).
4. **Accuracy** compara lo real (Won) contra el forecast **bloqueado** → % de acierto por mes,
   YTD y por partner.

## Estructura

```
index.html      Barra superior + pestañas
css/styles.css  Estilos
js/data.js      Catálogos (territorios, países) + datos SEMILLA ficticios
js/app.js       Store (localStorage), cálculos de forecast, vistas y módulo Forecast
```

## Próximos pasos sugeridos

- Cuotas por territorio/partner → % de attainment.
- Backend/nube para multiusuario (Firebase, Google Sheets, etc.).
- Conexión a Salesforce (API o CSV) para reemplazar la captura manual.
- Vista de evolución de pipeline por trimestre.
