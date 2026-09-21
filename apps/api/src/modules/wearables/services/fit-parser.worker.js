const { parentPort } = require('worker_threads');
const { Decoder, Stream } = require('@garmin/fitsdk');

if (!parentPort) {
  throw new Error('fit-parser.worker deve ser executado exclusivamente dentro de um worker_threads.Worker');
}

parentPort.on('message', async (message) => {
  try {
    const { buffer } = message;
    if (!buffer) {
      throw new Error('Buffer não fornecido para o worker de parsing');
    }

    const uint8Array = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    const stream = Stream.fromBuffer(uint8Array);
    const decoder = new Decoder(stream);

    if (!decoder.isFIT()) {
      throw new Error('Validação isFIT falhou no worker thread');
    }

    const { messages, errors } = decoder.read();

    parentPort.postMessage({
      success: true,
      data: {
        sessionMesgs: messages?.sessionMesgs || [],
        lapMesgs: messages?.lapMesgs || [],
        recordMesgs: messages?.recordMesgs || [],
        setMesgs: messages?.setMesgs || [],
        fileIdMesgs: messages?.fileIdMesgs || [],
        deviceInfoMesgs: messages?.deviceInfoMesgs || [],
        sportMesgs: messages?.sportMesgs || [],
        errors: errors || [],
      },
    });
  } catch (err) {
    parentPort.postMessage({
      success: false,
      error: err?.message || 'Erro desconhecido durante o parsing do arquivo FIT',
    });
  }
});
