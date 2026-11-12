/// <reference types="jest" />
import { sendMail } from "../../../../src/modules/shared/services/mail.service";
import nodemailer from "nodemailer";
import ejs from "ejs";

let mockTransporter: any;

// Mock nodemailer
jest.mock("nodemailer", () => {
  const mockTransporterObj = {
    verify: jest.fn().mockImplementation((cb) => cb(null, true)),
    sendMail: jest.fn(),
  };
  return {
    createTransport: jest.fn().mockReturnValue(mockTransporterObj),
  };
});

// Mock ejs
jest.mock("ejs", () => ({
  renderFile: jest.fn(),
}));

describe("Mail Service Unit Tests", () => {
  beforeAll(() => {
    mockTransporter = (nodemailer.createTransport as jest.Mock).mock.results[0].value;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("[Positive] should successfully render template and send email", async () => {
    (ejs.renderFile as jest.Mock).mockResolvedValue("<html><body>rendered</body></html>");
    mockTransporter.sendMail.mockResolvedValue({ messageId: "msg123" });

    const result = await sendMail("recipient@test.com", "Test Subject", "<p>content</p>");

    expect(ejs.renderFile).toHaveBeenCalledWith(
      expect.stringContaining("email-layout.ejs"),
      expect.objectContaining({ subject: "Test Subject", content: "<p>content</p>" })
    );
    expect(mockTransporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "recipient@test.com",
        subject: "Test Subject",
        html: "<html><body>rendered</body></html>",
      })
    );
    expect(result).toEqual({ messageId: "msg123" });
  });

  it("[Negative] should log error and return placeholder messageId if transporter sendMail fails", async () => {
    (ejs.renderFile as jest.Mock).mockResolvedValue("<html></html>");
    const mailError = new Error("SMTP Auth Failed");
    (mailError as any).code = "EAUTH";
    mockTransporter.sendMail.mockRejectedValue(mailError);

    const result = await sendMail("recipient@test.com", "Subject", "Body");

    expect(mockTransporter.sendMail).toHaveBeenCalled();
    expect(result).toBeDefined();
    expect(result.messageId).toContain("@app");
  });

  it("[Edge] should log error and return placeholder messageId if ejs renderFile fails", async () => {
    (ejs.renderFile as jest.Mock).mockRejectedValue(new Error("File not found"));

    const result = await sendMail("recipient@test.com", "Subject", "Body");

    expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    expect(result).toBeDefined();
    expect(result.messageId).toContain("@app");
  });
});
