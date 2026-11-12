import { logger } from "../../../core/constants/logger";

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
}

interface TableRow {
  cells: string[];
  photoUrls: string[];
}

interface LayoutParams {
  margin: number;
  pageWidth: number;
  pageBottom: number;
  colWidths: number[];
  photoColWidth: number;
  pad: number;
  headerFs: number;
  cellFs: number;
  imgSize: number;
  hasAnyPhotos: boolean;
  allHeaders: string[];
  headerRowHeight: number;
}

function computeRowHeight(
  doc: any,
  row: TableRow,
  photoBuffers: Buffer[],
  layout: LayoutParams,
): number {
  const { colWidths, photoColWidth, pad, cellFs, imgSize, hasAnyPhotos } =
    layout;

  doc.font("Helvetica").fontSize(cellFs);
  let maxH = 14;

  for (let i = 0; i < row.cells.length; i++) {
    const h = doc.heightOfString(row.cells[i] || "-", {
      width: colWidths[i] - pad * 2,
    });
    if (h + pad * 2 > maxH) maxH = h + pad * 2;
  }

  if (hasAnyPhotos && photoBuffers.length > 0) {
    const cols = Math.max(
      1,
      Math.floor((photoColWidth - pad * 2) / (imgSize + 2)),
    );
    const imgRows = Math.ceil(photoBuffers.length / cols);
    const photoH = imgRows * (imgSize + 2) + pad * 2;
    if (photoH > maxH) maxH = photoH;
  }

  return maxH;
}

function drawRowCells(
  doc: any,
  row: TableRow,
  y: number,
  maxH: number,
  layout: LayoutParams,
): number {
  const { margin, colWidths, pad, cellFs } = layout;

  doc.font("Helvetica").fontSize(cellFs);
  let x = margin;

  for (let i = 0; i < row.cells.length; i++) {
    doc.save();
    doc.rect(x, y, colWidths[i], maxH).stroke("#cccccc");
    doc.restore();
    doc.fillColor("black").text(row.cells[i] || "-", x + pad, y + pad, {
      width: colWidths[i] - pad * 2,
      height: maxH - pad * 2,
    });
    x += colWidths[i];
  }

  return x;
}

function drawPhotoCell(
  doc: any,
  photoBuffers: Buffer[],
  x: number,
  y: number,
  maxH: number,
  layout: LayoutParams,
): void {
  const { photoColWidth, pad, imgSize } = layout;

  doc.save();
  doc.rect(x, y, photoColWidth, maxH).stroke("#cccccc");
  doc.restore();

  let imgX = x + pad;
  let imgY = y + pad;

  for (const buffer of photoBuffers) {
    try {
      doc.image(buffer, imgX, imgY, { fit: [imgSize, imgSize] });
      imgX += imgSize + 2;
      if (imgX + imgSize > x + photoColWidth - pad) {
        imgX = x + pad;
        imgY += imgSize + 2;
      }
    } catch (err) {
      logger.warn("Failed to embed image in PDF", err);
    }
  }
}

function drawTableHeader(doc: any, y: number, layout: LayoutParams): number {
  const {
    margin,
    pageWidth,
    headerRowHeight,
    allHeaders,
    colWidths,
    pad,
    headerFs,
  } = layout;
  let x = margin;
  doc.save();
  doc.rect(margin, y, pageWidth, headerRowHeight).fill("#e8e8e8");
  doc.restore();
  doc.font("Helvetica-Bold").fontSize(headerFs).fillColor("black");
  for (let i = 0; i < allHeaders.length; i++) {
    doc.text(allHeaders[i], x + pad, y + pad, {
      width: colWidths[i] - pad * 2,
      height: headerRowHeight - pad * 2,
    });
    x += colWidths[i];
  }
  return y + headerRowHeight;
}

async function fetchRowPhotoBuffers(photoUrls: string[]): Promise<Buffer[]> {
  const buffers: Buffer[] = [];
  for (const url of photoUrls) {
    const buf = await fetchImageBuffer(url);
    if (buf) buffers.push(buf);
  }
  return buffers;
}

/**
 * Renders a full table with an embedded Photos column.
 * Replaces both doc.table() and appendPhotosToPdf().
 */
export async function renderTableWithPhotos(
  doc: any,
  headers: string[],
  rows: TableRow[],
  options?: { forcePhotosColumn?: boolean },
): Promise<void> {
  const margin = doc.page.margins.left;
  const pageWidth = doc.page.width - margin * 2;
  const pageBottom = doc.page.height - doc.page.margins.bottom;

  const hasAnyPhotos =
    (options?.forcePhotosColumn ?? false) ||
    rows.some((r) => r.photoUrls.length > 0);
  const photoColWidth = hasAnyPhotos ? 130 : 0;
  const colWidth = (pageWidth - photoColWidth) / headers.length;

  const allHeaders = hasAnyPhotos ? [...headers, "Photos"] : [...headers];
  const colWidths = hasAnyPhotos
    ? [...headers.map(() => colWidth), photoColWidth]
    : headers.map(() => colWidth);

  const pad = 3;
  const headerFs = 7;
  const cellFs = 6;
  const imgSize = 50;

  doc.font("Helvetica-Bold").fontSize(headerFs);
  const headerRowHeight = Math.max(
    18,
    allHeaders.reduce((maxHeight, header, index) => {
      const textHeight = doc.heightOfString(header, {
        width: colWidths[index] - pad * 2,
      });
      return Math.max(maxHeight, textHeight + pad * 2);
    }, 0),
  );

  const layout: LayoutParams = {
    margin,
    pageWidth,
    pageBottom,
    colWidths,
    photoColWidth,
    pad,
    headerFs,
    cellFs,
    imgSize,
    hasAnyPhotos,
    allHeaders,
    headerRowHeight,
  };

  let y = drawTableHeader(doc, doc.y, layout);

  for (const row of rows) {
    const photoBuffers = hasAnyPhotos
      ? await fetchRowPhotoBuffers(row.photoUrls)
      : [];
    const maxH = computeRowHeight(doc, row, photoBuffers, layout);

    if (y + maxH > pageBottom) {
      doc.addPage();
      y = drawTableHeader(doc, doc.page.margins.top, layout);
    }

    const photoX = drawRowCells(doc, row, y, maxH, layout);

    if (hasAnyPhotos) {
      drawPhotoCell(doc, photoBuffers, photoX, y, maxH, layout);
    }

    y += maxH;
  }

  doc.y = y;
}
