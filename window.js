let numChannels = 2;
let sampleRate;
const originAudio = document.querySelector('#origin');
const reverseAudio = document.querySelector('#reverse');
// const audioContext = new AudioContext();
// const bufferSource = audioContext.createBufferSource(originAudio);
let buffer = [];
window.onload = () => chrome.runtime.sendMessage({ key: 'window-finish-loading' });
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.key === 'init') {
    sampleRate = message.sampleRate;
    numChannels = message.numChannels;
    buffer = Array(numChannels)
      .fill()
      .map(() => []);
  }
  if (message.key === 'chunk') {
    for (let i = 0; i < numChannels; i++) {
      buffer[i][message.index] = message.data[i];
    }
  }
  if (message.key === 'finish') {
    const b = [buffer[0].flat(1), buffer[1].flat(1)];
    const blob = new Blob([encodeWAV(interleave(...b))], {
      type: 'audio/wav',
    });
    const blobUrl = URL.createObjectURL(blob);
    originAudio.innerHTML = `<audio src="${blobUrl}" controls></audio><a href="${blobUrl}" download="down.wav"></a>`;
    const blob2 = new Blob([encodeWAV(interleave(b[0].reverse(), b[1].reverse()))], {
      type: 'audio/wav',
    });
    const blob2Url = URL.createObjectURL(blob2);
    reverseAudio.innerHTML = `<audio src="${blob2Url}" controls></audio><a href="${blob2Url}" download="down.wav"></a>`;
  }
});
function interleave(inputL, inputR) {
  let length = inputL.length + inputR.length;
  let result = new Float32Array(length);
  let index = 0;
  let inputIndex = 0;
  while (index < length) {
    result[index++] = inputL[inputIndex];
    result[index++] = inputR[inputIndex];
    inputIndex++;
  }
  return result;
}
function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
function floatTo16BitPCM(output, offset, input) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
}
function encodeWAV(samples) {
  let buffer = new ArrayBuffer(44 + samples.length * 2);
  let view = new DataView(buffer);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* RIFF chunk length */
  view.setUint32(4, 36 + samples.length * 2, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, 1, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * 4, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, numChannels * 2, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, samples.length * 2, true);

  floatTo16BitPCM(view, 44, samples);

  return view;
}
