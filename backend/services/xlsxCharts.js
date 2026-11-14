/**
 * Puts native bar charts into an .xlsx file that ExcelJS wrote.
 *
 * ExcelJS cannot draw charts, so this opens the finished file (a zip), adds a drawing with the charts
 * to one sheet and closes it again. The charts read their numbers from cells of that sheet, so they
 * stay editable in Excel and LibreOffice. The file is returned unchanged if the sheet cannot be found.
 *
 *   const withCharts = await addBarCharts(buffer, { sheetId: sheet.id, charts: [...] });
 *
 * A chart:
 *   {
 *     title,                       the heading above the chart
 *     sheetName,                   the sheet the cells are on
 *     categories: { ref, labels }  ref "$A$2:$A$6", the labels in it (the bars' names)
 *     series: [{ name, nameRef, ref, values, color }]  one bar colour each; ref "$E$2:$E$6", nameRef "$E$1"
 *     from: { col, row }, to: { col, row }   the cells it covers, counted from 0
 *   }
 */
const JSZip = require("jszip");

const NS_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const NS_CHART = "http://schemas.openxmlformats.org/drawingml/2006/chart";
const NS_MAIN = "http://schemas.openxmlformats.org/drawingml/2006/main";
const NS_DRAWING = "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing";
const TYPE_DRAWING = "application/vnd.openxmlformats-officedocument.drawing+xml";
const TYPE_CHART = "application/vnd.openxmlformats-officedocument.drawingml.chart+xml";

const escapeXml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** 'Mentor analytics'!$A$2:$A$6 */
const absolute = (sheetName, ref) => `'${String(sheetName).replace(/'/g, "''")}'!${ref}`;

const stringCache = (labels) =>
  `<c:strCache><c:ptCount val="${labels.length}"/>${labels.map((label, index) => `<c:pt idx="${index}"><c:v>${escapeXml(label)}</c:v></c:pt>`).join("")}</c:strCache>`;

const numberCache = (values) =>
  `<c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${values.length}"/>${values
    .map((value, index) => (typeof value === "number" ? `<c:pt idx="${index}"><c:v>${value}</c:v></c:pt>` : ""))
    .join("")}</c:numCache>`;

const text = (value, size, bold = false) =>
  `<c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="${size}" b="${bold ? 1 : 0}"/></a:pPr><a:r><a:rPr lang="en-US" sz="${size}" b="${bold ? 1 : 0}"/><a:t>${escapeXml(value)}</a:t></a:r></a:p></c:rich></c:tx>`;

function seriesXml(chart, series, index) {
  const { sheetName, categories } = chart;
  return `<c:ser><c:idx val="${index}"/><c:order val="${index}"/>
<c:tx><c:strRef><c:f>${escapeXml(absolute(sheetName, series.nameRef))}</c:f>${stringCache([series.name])}</c:strRef></c:tx>
<c:spPr><a:solidFill><a:srgbClr val="${series.color}"/></a:solidFill></c:spPr>
<c:invertIfNegative val="0"/>
<c:dLbls><c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/></c:dLbls>
<c:cat><c:strRef><c:f>${escapeXml(absolute(sheetName, categories.ref))}</c:f>${stringCache(categories.labels)}</c:strRef></c:cat>
<c:val><c:numRef><c:f>${escapeXml(absolute(sheetName, series.ref))}</c:f>${numberCache(series.values)}</c:numRef></c:val>
</c:ser>`;
}

/** The XML of one clustered column chart. */
function chartXml(chart, number) {
  const catAxis = number * 10 + 1;
  const valAxis = number * 10 + 2;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="${NS_CHART}" xmlns:a="${NS_MAIN}" xmlns:r="${NS_REL}">
<c:roundedCorners val="0"/>
<c:chart>
<c:title>${text(chart.title, 1200, true)}<c:overlay val="0"/></c:title>
<c:autoTitleDeleted val="0"/>
<c:plotArea><c:layout/>
<c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="0"/>
${chart.series.map((series, index) => seriesXml(chart, series, index)).join("\n")}
<c:gapWidth val="80"/><c:axId val="${catAxis}"/><c:axId val="${valAxis}"/></c:barChart>
<c:catAx><c:axId val="${catAxis}"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:numFmt formatCode="General" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="${valAxis}"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx>
<c:valAx><c:axId val="${valAxis}"/><c:scaling><c:orientation val="minMax"/><c:min val="0"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:majorGridlines><c:spPr><a:ln w="6350"><a:solidFill><a:srgbClr val="E3E8EF"/></a:solidFill></a:ln></c:spPr></c:majorGridlines><c:numFmt formatCode="General" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="${catAxis}"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx>
</c:plotArea>
<c:legend><c:legendPos val="b"/><c:overlay val="0"/></c:legend>
<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/>
</c:chart>
</c:chartSpace>`;
}

const cellAnchor = (tag, { col, row }) => `<xdr:${tag}><xdr:col>${col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:${tag}>`;

/** The drawing that places each chart on the sheet; chart n is related as rId n. */
function drawingXml(charts) {
  const anchors = charts
    .map(
      (chart, index) => `<xdr:twoCellAnchor>${cellAnchor("from", chart.from)}${cellAnchor("to", chart.to)}
<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${index + 2}" name="Chart ${index + 1}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>
<xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>
<a:graphic><a:graphicData uri="${NS_CHART}"><c:chart xmlns:c="${NS_CHART}" xmlns:r="${NS_REL}" r:id="rId${index + 1}"/></a:graphicData></a:graphic>
</xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="${NS_DRAWING}" xmlns:a="${NS_MAIN}">
${anchors}
</xdr:wsDr>`;
}

const relationships = (items) =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${items
    .map(({ id, type, target }) => `<Relationship Id="${id}" Type="${NS_REL}/${type}" Target="${target}"/>`)
    .join("")}</Relationships>`;

/** The first name `${prefix}${n}${suffix}` that the zip does not have yet. */
function freeName(zip, prefix, suffix) {
  let n = 1;
  while (zip.file(`${prefix}${n}${suffix}`)) n += 1;
  return n;
}

/** Declares the relationship in the sheet's rels file (created when the sheet had none). Returns its id. */
async function relateDrawing(zip, sheetFile, drawingName) {
  const relsPath = sheetFile.replace("worksheets/", "worksheets/_rels/") + ".rels";
  const existing = zip.file(relsPath);
  const target = `../drawings/${drawingName}`;
  if (!existing) {
    zip.file(relsPath, relationships([{ id: "rId1", type: "drawing", target }]));
    return "rId1";
  }
  const xml = await existing.async("string");
  const ids = [...xml.matchAll(/Id="rId(\d+)"/g)].map((match) => Number(match[1]));
  const id = `rId${Math.max(0, ...ids) + 1}`;
  zip.file(relsPath, xml.replace("</Relationships>", `<Relationship Id="${id}" Type="${NS_REL}/drawing" Target="${target}"/></Relationships>`));
  return id;
}

/** Adds <drawing r:id=".."/> to the sheet, before the elements the schema puts after it. */
function referenceDrawing(sheetXml, relId) {
  const element = `<drawing r:id="${relId}"/>`;
  const after = ["<legacyDrawing", "<legacyDrawingHF", "<picture", "<oleObjects", "<controls", "<webPublishItems", "<tableParts", "<extLst"];
  const positions = after.map((tag) => sheetXml.indexOf(tag)).filter((position) => position >= 0);
  const at = positions.length ? Math.min(...positions) : sheetXml.lastIndexOf("</worksheet>");
  return sheetXml.slice(0, at) + element + sheetXml.slice(at);
}

/**
 * @param {Buffer|ArrayBuffer|Uint8Array} buffer  the workbook ExcelJS wrote
 * @param {{ sheetId: number, charts: Array }} options
 * @returns {Promise<Buffer>}
 */
async function addBarCharts(buffer, { sheetId, charts }) {
  if (!charts || charts.length === 0) return Buffer.from(buffer);
  const zip = await JSZip.loadAsync(buffer);
  const sheetFile = `xl/worksheets/sheet${sheetId}.xml`;
  const sheet = zip.file(sheetFile);
  if (!sheet) return Buffer.from(buffer);

  const drawingNumber = freeName(zip, "xl/drawings/drawing", ".xml");
  const drawingName = `drawing${drawingNumber}.xml`;
  // Each chart is written before the next number is looked for, so the numbers stay apart
  const written = [];
  charts.forEach((chart) => {
    const number = freeName(zip, "xl/charts/chart", ".xml");
    zip.file(`xl/charts/chart${number}.xml`, chartXml(chart, number));
    written.push(number);
  });

  zip.file(`xl/drawings/${drawingName}`, drawingXml(charts));
  zip.file(
    `xl/drawings/_rels/${drawingName}.rels`,
    relationships(written.map((number, index) => ({ id: `rId${index + 1}`, type: "chart", target: `../charts/chart${number}.xml` })))
  );

  const relId = await relateDrawing(zip, sheetFile, drawingName);
  zip.file(sheetFile, referenceDrawing(await sheet.async("string"), relId));

  const typesFile = zip.file("[Content_Types].xml");
  const overrides = [
    `<Override PartName="/xl/drawings/${drawingName}" ContentType="${TYPE_DRAWING}"/>`,
    ...written.map((number) => `<Override PartName="/xl/charts/chart${number}.xml" ContentType="${TYPE_CHART}"/>`),
  ].join("");
  zip.file("[Content_Types].xml", (await typesFile.async("string")).replace("</Types>", `${overrides}</Types>`));

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

module.exports = { addBarCharts };
