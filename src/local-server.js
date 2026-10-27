import { randomInt } from 'node:crypto';

// Use the dynamic/private range, above the Fetch standard's blocked HTTP ports.
// https://fetch.spec.whatwg.org/#port-blocking
export async function listenLocal(server, port, choosePort = () => randomInt(49152, 65536)) {
  for (let attempt = 0; attempt < 32; attempt++) {
    const selected = port || choosePort();
    if (!port && (!Number.isInteger(selected) || selected < 49152 || selected > 65535)) continue;
    try {
      await new Promise((resolve, reject) => {
        const failed = error => {
          server.removeListener('listening', ready);
          reject(error);
        };
        const ready = () => {
          server.removeListener('error', failed);
          resolve(undefined);
        };
        server.once('error', failed);
        server.once('listening', ready);
        server.listen(selected, '127.0.0.1');
      });
      return `http://127.0.0.1:${server.address().port}`;
    } catch (error) {
      if (port || !['EADDRINUSE', 'EACCES'].includes(error.code)) throw error;
    }
  }
  throw new Error('Unable to find an available local app port. Please try launching again.');
}
