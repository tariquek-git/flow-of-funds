/**
 * Shareable-flow codec: pack a whole FlowOfFunds into a compact, URL-safe string
 * and back, so a "share this exact flow" link works with ZERO backend and ZERO
 * AI spend. The hash is the payload — there is no server lookup, so the only
 * trust boundary is decode-time validation.
 *
 * Wire format (after base64url-decode):
 *   [1 byte magic/version] [body]
 *   magic 0x01 → body is gzip(JSON(flow))      (the compact, normal path)
 *   magic 0x00 → body is utf8 JSON(flow)        (uncompressed fallback)
 * The version byte lets `decode` pick the right path AND lets us evolve the
 * format later without silently mis-reading an old link.
 *
 * Web APIs only (TextEncoder, CompressionStream, btoa/atob) so this stays
 * edge-runtime safe and runs identically in the browser and under tsx (Node 18+).
 * No new npm dependency.
 *
 * SECURITY: a shared link is UNTRUSTED input. `decodeHashToFlow` never throws,
 * caps the decoded size (decompression-bomb guard), and only returns a flow that
 * passes the real schema validator — anything else is `null`.
 */
import { validateFlow } from "./schema/validate";
import type { FlowOfFunds } from "./schema/flow";

const MAGIC_GZIP = 0x01;
const MAGIC_RAW = 0x00;

// Hard ceiling on the decoded JSON byte length. A real flow is a few KB; this
// is generous headroom while still refusing a hostile hash that decompresses to
// something enormous (a decompression bomb) before we ever hand it to JSON.parse.
const MAX_DECODED_BYTES = 256 * 1024;

// ---------------------------------------------------------------------------
// base64url <-> bytes (no '+' '/' '=', so the string is safe raw in a URL)
// ---------------------------------------------------------------------------

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  // Build a binary string in chunks to avoid blowing the call-stack arg limit
  // on apply() for large byte arrays.
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(b64url: string): Uint8Array {
  // Reject anything outside the base64url alphabet up front: atob would either
  // throw or silently coerce, and we want a clean, predictable failure.
  if (!/^[A-Za-z0-9_-]*$/.test(b64url)) {
    throw new Error("not base64url");
  }
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  // Re-pad to a multiple of 4 so atob accepts it.
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ---------------------------------------------------------------------------
// gzip via the platform CompressionStream (browser + Node 18+), with a guard.
// ---------------------------------------------------------------------------

function hasCompression(): boolean {
  return (
    typeof CompressionStream !== "undefined" &&
    typeof DecompressionStream !== "undefined"
  );
}

async function pipeThrough(
  input: Uint8Array,
  stream: GenericTransformStream,
): Promise<Uint8Array> {
  const writer = stream.writable.getWriter();
  // Pump the input in and close, concurrently with draining the readable below.
  // CRITICAL: keep this promise HANDLED. On a stream error (e.g. malformed gzip
  // from a tampered share link) the writable side rejects too; an un-awaited,
  // un-caught rejection is fatal in modern Node and crashes the process *after*
  // assertions pass. The readable side (Response.arrayBuffer below) surfaces the
  // real error to the caller, so this writer-side rejection is redundant —
  // swallow it. (`as BufferSource`: a Uint8Array is always a valid BufferSource
  // at runtime; the cast only sidesteps the lib's ArrayBufferLike variance.)
  const pump = writer
    .write(input as BufferSource)
    .then(() => writer.close())
    .catch(() => {});
  const buf = await new Response(stream.readable).arrayBuffer();
  await pump;
  return new Uint8Array(buf);
}

function gzip(input: Uint8Array): Promise<Uint8Array> {
  return pipeThrough(input, new CompressionStream("gzip"));
}

function gunzip(input: Uint8Array): Promise<Uint8Array> {
  return pipeThrough(input, new DecompressionStream("gzip"));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Encode a flow into a compact, URL-safe (base64url, no padding) hash.
 * Uses gzip when the platform supports it; otherwise falls back to an
 * uncompressed (correct, just longer) payload. Inverse of `decodeHashToFlow`.
 */
export async function encodeFlowToHash(flow: FlowOfFunds): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(flow));
  if (hasCompression()) {
    const body = await gzip(json);
    const out = new Uint8Array(body.length + 1);
    out[0] = MAGIC_GZIP;
    out.set(body, 1);
    return bytesToBase64Url(out);
  }
  const out = new Uint8Array(json.length + 1);
  out[0] = MAGIC_RAW;
  out.set(json, 1);
  return bytesToBase64Url(out);
}

/**
 * Decode a share hash back into a validated flow. Returns `null` on ANY
 * malformed/invalid/oversized/hostile input — never throws. The decoded object
 * MUST pass `validateFlow` (a share link is untrusted) or this returns null.
 */
export async function decodeHashToFlow(hash: string): Promise<FlowOfFunds | null> {
  try {
    if (typeof hash !== "string" || hash.length === 0) return null;

    const bytes = base64UrlToBytes(hash);
    if (bytes.length < 2) return null; // need at least a magic byte + 1 byte body

    const magic = bytes[0];
    const body = bytes.subarray(1);

    let json: Uint8Array;
    if (magic === MAGIC_GZIP) {
      if (!hasCompression()) return null;
      json = await gunzip(body);
    } else if (magic === MAGIC_RAW) {
      json = body;
    } else {
      return null; // unknown format/version byte
    }

    // Decompression-bomb guard: refuse anything implausibly large BEFORE parse.
    if (json.length > MAX_DECODED_BYTES) return null;

    const text = new TextDecoder().decode(json);
    const candidate: unknown = JSON.parse(text);

    const result = validateFlow(candidate);
    if (!result.ok) return null;
    return result.flow;
  } catch {
    // Bad base64, bad gzip, non-JSON, anything — a share link must fail closed.
    return null;
  }
}
