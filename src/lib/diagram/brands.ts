import {
  siAlipay,
  siAmericanexpress,
  siDiscover,
  siJcb,
  siMastercard,
  siPix,
  siVisa,
  siWechat,
} from "simple-icons";

/**
 * Brand identification for payment rails and network parties. Where an
 * official mark exists in the CC0 simple-icons set (Visa, Mastercard, Amex,
 * Discover, JCB, Pix, Alipay, WeChat) we render the real logo path; everything
 * else gets a styled wordmark chip in approximate brand colors. Marks are used
 * for identification only.
 *
 * Deliberately NOT using simple-icons marks: UnionPay (absent from our package
 * version) and the `swift` icon (that's the Swift *programming language* logo,
 * #F05138 — not the SWIFT bank messaging network). Both stay wordmark chips.
 * See docs/payment-schemes-global.md for the full source-verified matrix.
 */
export type BrandChip = {
  label: string;
  bg: string;
  fg: string;
  italic?: boolean;
  /** Official mark (24x24 SVG path) when available. */
  iconPath?: string;
  iconHex?: string;
};

const BRANDS: { rx: RegExp; chip: BrandChip }[] = [
  { rx: /visa/i, chip: { label: "Visa", bg: "#1A1F71", fg: "#ffffff", iconPath: siVisa.path, iconHex: "#1A1F71" } },
  { rx: /mastercard|banknet/i, chip: { label: "Mastercard", bg: "#EB001B", fg: "#ffffff", iconPath: siMastercard.path, iconHex: "#EB001B" } },
  { rx: /american express|amex/i, chip: { label: "American Express", bg: "#2E77BC", fg: "#ffffff", iconPath: siAmericanexpress.path, iconHex: "#2E77BC" } },
  { rx: /discover|diners|pulse/i, chip: { label: "Discover", bg: "#FF6000", fg: "#ffffff", iconPath: siDiscover.path, iconHex: "#FF6000" } },
  { rx: /\bjcb\b/i, chip: { label: "JCB", bg: "#0B4EA2", fg: "#ffffff", iconPath: siJcb.path, iconHex: "#0B4EA2" } },
  { rx: /unionpay|\bcup\b/i, chip: { label: "UnionPay", bg: "#E21836", fg: "#ffffff" } },
  { rx: /\bpix\b/i, chip: { label: "Pix", bg: "#32BCAD", fg: "#ffffff", iconPath: siPix.path, iconHex: "#32BCAD" } },
  { rx: /alipay/i, chip: { label: "Alipay", bg: "#1677FF", fg: "#ffffff", iconPath: siAlipay.path, iconHex: "#1677FF" } },
  { rx: /wechat|weixin|tenpay/i, chip: { label: "WeChat Pay", bg: "#07C160", fg: "#ffffff", iconPath: siWechat.path, iconHex: "#07C160" } },
  { rx: /interac/i, chip: { label: "Interac", bg: "#FDB913", fg: "#231F20" } },
  { rx: /fednow/i, chip: { label: "FedNow", bg: "#046A38", fg: "#ffffff" } },
  { rx: /fedwire|federal reserve|fedach|\bfed\b/i, chip: { label: "Federal Reserve", bg: "#0A3161", fg: "#ffffff" } },
  { rx: /\bach\b|nacha/i, chip: { label: "ACH", bg: "#1C4F9C", fg: "#ffffff" } },
  { rx: /\brtp\b|clearing house/i, chip: { label: "RTP", bg: "#12284C", fg: "#ffffff" } },
  { rx: /swift/i, chip: { label: "SWIFT", bg: "#3D3D3D", fg: "#ffffff" } },
  { rx: /payments canada|lynx|acss/i, chip: { label: "Payments Canada", bg: "#7A1F3D", fg: "#ffffff" } },
  { rx: /\beft\b/i, chip: { label: "EFT", bg: "#475569", fg: "#ffffff" } },
  // Global rails — wordmark chips (no CC0 marks; see docs/payment-schemes-global.md).
  { rx: /sct inst|sepa inst|sepa/i, chip: { label: "SEPA", bg: "#003399", fg: "#ffffff" } },
  { rx: /\brt1\b|eba clearing/i, chip: { label: "EBA CLEARING", bg: "#0B2C5E", fg: "#ffffff" } },
  { rx: /target2|\btips\b|t2 |eurosystem|\becb\b/i, chip: { label: "Eurosystem", bg: "#243E90", fg: "#ffffff" } },
  { rx: /faster payments|\bfps\b|pay\.?uk/i, chip: { label: "Faster Payments", bg: "#E4002B", fg: "#ffffff" } },
  { rx: /bank of england|\bboe\b/i, chip: { label: "Bank of England", bg: "#11385B", fg: "#ffffff" } },
  { rx: /\bupi\b|\bnpci\b/i, chip: { label: "UPI", bg: "#097939", fg: "#ffffff" } },
  { rx: /reserve bank of india|\brbi\b/i, chip: { label: "RBI", bg: "#10316B", fg: "#ffffff" } },
  { rx: /\bspi\b|banco central do brasil|\bbcb\b/i, chip: { label: "Banco Central do Brasil", bg: "#1F6B3B", fg: "#ffffff" } },
];

export function railBrand(text: string): BrandChip | null {
  for (const b of BRANDS) if (b.rx.test(text)) return b.chip;
  return null;
}
