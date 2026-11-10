/**
 * Reads a WAV header. The browser always sends 16 kHz mono 16-bit PCM, but a
 * hand-made request must not be able to store arbitrary bytes or a huge clip.
 *
 * @param {Buffer} buffer
 * @returns {{durationS: number} | null} null when the bytes are not a usable WAV file
 */
function parseWav(buffer) {
  if (
    buffer.length < 44 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WAVE"
  ) {
    return null;
  }

  let offset = 12;
  let channels = 0;
  let sampleRate = 0;
  let bits = 0;
  let dataBytes = 0;

  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (id === "fmt " && offset + 24 <= buffer.length) {
      channels = buffer.readUInt16LE(offset + 10);
      sampleRate = buffer.readUInt32LE(offset + 12);
      bits = buffer.readUInt16LE(offset + 22);
    } else if (id === "data") {
      dataBytes = Math.min(size, buffer.length - offset - 8);
      break;
    }
    offset += 8 + size + (size % 2);
  }

  if (!channels || !sampleRate || !bits || !dataBytes) return null;
  return { durationS: dataBytes / (sampleRate * channels * (bits / 8)) };
}

module.exports = { parseWav };
