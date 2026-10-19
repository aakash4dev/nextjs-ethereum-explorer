/** Shared ABI argument handling for browser writes and server reads. */
export function abiType(parameter) {
  return parameter.type.startsWith('tuple')
    ? `(${(parameter.components ?? []).map(abiType).join(',')})${parameter.type.slice(5)}`
    : parameter.type;
}

export const functionSignature = (fn) => `${fn.name}(${(fn.inputs ?? []).map(abiType).join(',')})`;

export function coerceContractArg(parameter, raw) {
  const { type, components = [] } = parameter;
  const array = type.match(/^(.*)\[(\d*)\]$/);
  if (array) {
    const values = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(values)) throw new Error(`${type} requires a JSON array`);
    if (array[2] && values.length !== Number(array[2])) throw new Error(`${type} requires ${array[2]} items`);
    return values.map((v) => coerceContractArg({ ...parameter, type: array[1] }, v));
  }
  if (type === 'tuple') {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!value || typeof value !== 'object') throw new Error('tuple requires a JSON array or object');
    if (Array.isArray(value)) {
      if (value.length !== components.length) throw new Error(`tuple requires ${components.length} items`);
      return components.map((p, i) => coerceContractArg(p, value[i]));
    }
    return components.map((p) => coerceContractArg(p, value[p.name]));
  }
  if (raw === undefined || raw === null) throw new Error(`Missing ${parameter.name || type} argument`);
  const value = typeof raw === 'string' ? raw.trim() : raw;
  if (/^u?int\d*$/.test(type)) {
    if (!/^-?\d+$/.test(String(value))) throw new Error(`${type} requires an integer (use a string in JSON for large values)`);
    if (typeof value === 'number' && !Number.isSafeInteger(value)) throw new Error('Large integers must be supplied as strings');
    return BigInt(value);
  }
  if (type === 'bool') {
    if ([true, 'true', '1', 1].includes(value)) return true;
    if ([false, 'false', '0', 0].includes(value)) return false;
    throw new Error('bool requires true or false');
  }
  return value;
}
