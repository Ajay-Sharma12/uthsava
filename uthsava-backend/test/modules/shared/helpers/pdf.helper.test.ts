import { renderTableWithPhotos } from "../../../../src/modules/shared/helpers/pdf.helper";
import { logger } from "../../../../src/core/constants/logger";

jest.mock("../../../../src/core/constants/logger", () => ({
  logger: {
    warn: jest.fn(),
  },
}));

describe("PDF Helper Unit Tests", () => {
  let mockDoc: any;
  let originalFetch: any;

  beforeAll(() => {
    originalFetch = global.fetch;
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockDoc = {
      y: 100,
      page: {
        margins: { left: 50, right: 50, top: 50, bottom: 50 },
        width: 600,
        height: 800,
      },
      font: jest.fn().mockReturnThis(),
      fontSize: jest.fn().mockReturnThis(),
      fillColor: jest.fn().mockReturnThis(),
      heightOfString: jest.fn().mockReturnValue(12),
      save: jest.fn().mockReturnThis(),
      rect: jest.fn().mockReturnThis(),
      fill: jest.fn().mockReturnThis(),
      stroke: jest.fn().mockReturnThis(),
      restore: jest.fn().mockReturnThis(),
      text: jest.fn().mockReturnThis(),
      image: jest.fn().mockReturnThis(),
      addPage: jest.fn().mockImplementation(function (this: any) {
        this.y = 50;
        return this;
      }),
    };
  });

  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should successfully render table headers and cells without photos", async () => {
    const headers = ["ID", "Name", "Role"];
    const rows = [
      { cells: ["1", "John Doe", "Moderator"], photoUrls: [] },
      { cells: ["2", "Jane Smith", "Producer"], photoUrls: [] },
    ];

    await renderTableWithPhotos(mockDoc, headers, rows);

    expect(mockDoc.rect).toHaveBeenCalled();
    expect(mockDoc.text).toHaveBeenCalled();
    expect(mockDoc.font).toHaveBeenCalledWith("Helvetica-Bold");
    expect(mockDoc.font).toHaveBeenCalledWith("Helvetica");
    expect(mockDoc.addPage).not.toHaveBeenCalled();
  });

  it("[Positive] should fetch image buffers and draw photo cell when photos are present", async () => {
    const mockBuffer = Buffer.from("mock-binary-image-data");
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      arrayBuffer: jest.fn().mockResolvedValue(mockBuffer),
    });

    const headers = ["ID", "Name"];
    const rows = [
      { cells: ["1", "John Doe"], photoUrls: ["https://test.com/john.jpg"] },
    ];

    await renderTableWithPhotos(mockDoc, headers, rows);

    expect(global.fetch).toHaveBeenCalledWith("https://test.com/john.jpg", expect.any(Object));
    expect(mockDoc.image).toHaveBeenCalledWith(mockBuffer, expect.any(Number), expect.any(Number), { fit: [50, 50] });
  });

  /* =========================================================================
   * NEGATIVE / VALIDATION TEST CASES
   * ========================================================================= */
  it("[Negative] should skip image rendering and warn if image fetch fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
    });

    const headers = ["ID", "Name"];
    const rows = [
      { cells: ["1", "John Doe"], photoUrls: ["https://test.com/failed.jpg"] },
    ];

    await renderTableWithPhotos(mockDoc, headers, rows);

    expect(global.fetch).toHaveBeenCalled();
    expect(mockDoc.image).not.toHaveBeenCalled();
  });

  it("[Negative] should catch throw in fetch and continue rendering table", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error("Connection timeout"));

    const headers = ["ID", "Name"];
    const rows = [
      { cells: ["1", "John Doe"], photoUrls: ["https://test.com/timeout.jpg"] },
    ];

    await renderTableWithPhotos(mockDoc, headers, rows);

    expect(global.fetch).toHaveBeenCalled();
    expect(mockDoc.image).not.toHaveBeenCalled();
  });

  /* =========================================================================
   * EDGE TEST CASES
   * ========================================================================= */
  it("[Edge] should automatically add a new page if the row height overflows pageBottom boundary", async () => {
    const headers = ["ID", "Name"];
    // Configure row to occupy large height
    mockDoc.heightOfString.mockReturnValue(500);

    const rows = [
      { cells: ["1", "Item A"], photoUrls: [] },
      { cells: ["2", "Item B"], photoUrls: [] },
    ];

    // Starts at y = 100
    // First row draws, height is 500, next y is 600
    // Next row height is 500. y + maxH = 600 + 500 = 1100 > pageBottom (800 - 50 = 750)
    // Thus it should call addPage()
    await renderTableWithPhotos(mockDoc, headers, rows);

    expect(mockDoc.addPage).toHaveBeenCalled();
  });
});
