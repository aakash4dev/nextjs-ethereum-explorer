/**
 * Bytecode comparison for source verification (pure functions).
 *
 * A "full" match means the on-chain runtime code equals the compiled code
 * byte-for-byte (after masking immutables / linking libraries), including the
 * CBOR metadata hash, which commits to the exact sources. A "partial" match
 * means everything except the metadata section is identical (e.g. comments
 * or file names differ).
 */

const strip0x = (h) => (h?.startsWith('0x') ? h.slice(2) : h ?? '').toLowerCase();

/** Split code into [executable, cborMetadata] using the trailing length marker. */
export function splitMetadata(hex) {
  const code = strip0x(hex);
  if (code.length < 4) return [code, ''];
  const len = Number.parseInt(code.slice(-4), 16);
  const total = (len + 2) * 2;
  if (!len || total > code.length) return [code, ''];
  const meta = code.slice(code.length - total);
  // CBOR map with 1..5 entries (solc emits a1..a3, vyper/others vary).
  if (!/^a[1-5]/.test(meta)) return [code, ''];
  return [code.slice(0, code.length - total), meta];
}

/** Zero out byte ranges ({ start, length } in bytes) in a hex string. */
export function maskRanges(hex, ranges) {
  let code = strip0x(hex);
  for (const { start, length } of ranges) {
    const s = start * 2;
    code = code.slice(0, s) + '0'.repeat(length * 2) + code.slice(s + length * 2);
  }
  return code;
}

// solc CBOR auxdata: ipfs (>=0.6), bzzr1 (0.5.x), bzzr0 (0.4.x) variants.
const AUXDATA_RE = /a264697066735822[0-9a-f]{68}64736f6c6343[0-9a-f]{6}0033|a265627a7a72315820[0-9a-f]{64}64736f6c6343[0-9a-f]{6}0032|a165627a7a72305820[0-9a-f]{64}0029/g;

/**
 * Byte ranges of every metadata blob in `hex`, including those embedded in
 * the creation code of child contracts (factories using `new Child()`).
 */
export function auxdataRanges(hex) {
  const code = strip0x(hex);
  const ranges = [];
  for (const m of code.matchAll(AUXDATA_RE)) {
    if (m.index % 2 === 0) ranges.push({ start: m.index / 2, length: m[0].length / 2 });
  }
  return ranges;
}

export function immutableRanges(immutableReferences) {
  return Object.values(immutableReferences ?? {}).flat();
}

/**
 * Link library placeholders. When an address for a library is not supplied,
 * take whatever the on-chain code has at that position (auto-detection).
 * Returns { code, libraries } with the detected/used addresses.
 */
export function linkLibraries(compiledHex, linkReferences, onchainHex, provided = {}) {
  let code = strip0x(compiledHex);
  const onchain = strip0x(onchainHex);
  const libraries = {};
  for (const [file, libs] of Object.entries(linkReferences ?? {})) {
    for (const [name, refs] of Object.entries(libs)) {
      const given = provided[`${file}:${name}`] ?? provided[name];
      for (const { start, length } of refs) {
        const s = start * 2;
        const addr = given ? strip0x(given).padStart(40, '0') : onchain.slice(s, s + length * 2);
        code = code.slice(0, s) + addr + code.slice(s + length * 2);
        libraries[`${file}:${name}`] = `0x${addr}`;
      }
    }
  }
  return { code, libraries };
}

/**
 * Compare runtime bytecode.
 * @returns {{ match: 'full'|'partial'|null, libraries: object }}
 */
export function compareRuntime(onchainHex, compiled) {
  const onchain = strip0x(onchainHex);
  const { code: linked, libraries } = linkLibraries(compiled.deployedBytecode, compiled.linkReferences, onchain, compiled.libraries);
  let local = linked;
  // Libraries embed their own address (call protection: PUSH20 at offset 1).
  if (local.startsWith('73' + '0'.repeat(40)) && onchain.startsWith('73')) {
    local = onchain.slice(0, 42) + local.slice(42);
  }
  if (!local || local.length !== onchain.length) {
    // Length differs: only a partial match is possible if metadata length differs.
    const [a] = splitMetadata(onchain);
    const [b] = splitMetadata(local);
    const ranges = immutableRanges(compiled.immutableReferences);
    if (a && b && maskRanges(a, ranges) === maskRanges(b, ranges)) return { match: 'partial', libraries };
    return { match: null, libraries };
  }
  const ranges = immutableRanges(compiled.immutableReferences);
  const maskedOnchain = maskRanges(onchain, ranges);
  const maskedLocal = maskRanges(local, ranges);
  if (maskedOnchain === maskedLocal) return { match: 'full', libraries };
  const [a] = splitMetadata(maskedOnchain);
  const [b] = splitMetadata(maskedLocal);
  if (a && a === b) return { match: 'partial', libraries };
  const aux = auxdataRanges(maskedLocal);
  if (aux.length && maskRanges(maskedOnchain, aux) === maskRanges(maskedLocal, aux)) return { match: 'partial', libraries };
  return { match: null, libraries };
}

/**
 * Extract ABI-encoded constructor arguments from a creation transaction input
 * by removing the compiled creation bytecode prefix. Returns null when the
 * creation code does not match.
 */
export function extractConstructorArgs(creationInputHex, compiledCreationHex) {
  const input = strip0x(creationInputHex);
  const creation = strip0x(compiledCreationHex);
  if (!creation) return null;
  if (input.startsWith(creation)) return input.slice(creation.length);
  // Allow differing metadata (partial match): compare executable part only.
  const [exec, meta] = splitMetadata(creation);
  if (meta && input.startsWith(exec) && input.length >= creation.length) {
    return input.slice(creation.length);
  }
  return null;
}
