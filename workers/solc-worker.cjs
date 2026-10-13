/**
 * Worker thread that runs a solc-js compilation off the main event loop.
 * workerData: { input: StandardJsonInput, soljsonPath: string | null }
 */
const { parentPort, workerData } = require('node:worker_threads');

try {
  const solc = workerData.soljsonPath
    ? require('solc/wrapper')(require(workerData.soljsonPath))
    : require('solc');
  const findImports = (path) => ({ error: `Import not provided: ${path}. Use the standard JSON input format to include every source file.` });
  const output = solc.compile(JSON.stringify(workerData.input), { import: findImports });
  parentPort.postMessage({ ok: true, output, version: solc.version() });
} catch (err) {
  parentPort.postMessage({ ok: false, error: String(err && err.message ? err.message : err) });
}
