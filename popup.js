let tab = {};
let isRecording = false;
let recorder;
const button = document.querySelector('.button');
// button.onclick = () => chrome.runtime.sendMessage('start-capture');
button.onclick = () => {
  if (!isRecording) {
    getAudio();
    button.innerText = 'stop';
    isRecording = !isRecording;
  } else {
    closeAudio();
    button.innerText = 'record';
    // document.querySelector('#test').innerText = recorder.buffer[0];
    isRecording = !isRecording;
  }
};
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.key === 'test') {
    // document.querySelector('h1').innerText = message.data;
  }
});
const getAudio = () => {
  closeAudio();
  chrome.tabCapture.capture({ audio: true, video: false }, (callback) => {
    if (chrome.runtime.lastError) {
    }
    if (callback) {
      createAudio(callback);
    }
  });
};
const closeAudio = () => {
  if (tab.stream) {
    tab.stream.getAudioTracks()[0].stop();
    tab.audioCtx.close();
    tab = {};
  }
  if (recorder) {
    recorder.finishRecording();
  }
};
const createAudio = (stream) => {
  tab.stream = stream;
  tab.audioCtx = new AudioContext();
  tab.streamOutput = tab.audioCtx.createMediaStreamSource(tab.stream);
  tab.streamOutput.connect(tab.audioCtx.destination);
  recorder = new Recorder(tab.streamOutput);
  recorder.startRecording();
};
class Recorder {
  constructor(source) {
    this.numChannels = 2;
    this.context = source.context;
    if (this.context.createScriptProcessor == null)
      this.context.createScriptProcessor = this.context.createJavaScriptNode;
    this.input = this.context.createGain();
    source.connect(this.input);
    this.buffer = [];
  }
  isRecording() {
    return this.processor != null;
  }
  startRecording() {
    if (!this.isRecording()) {
      this.processor = this.context.createScriptProcessor(
        undefined,
        this.numChannels,
        this.numChannels
      );
      this.input.connect(this.processor);
      this.processor.connect(this.context.destination);
      this.processor.onaudioprocess = (event) => {
        for (let ch = 0; ch < this.numChannels; ch++)
          this.buffer[ch] = event.inputBuffer.getChannelData(ch);
        chrome.runtime.sendMessage({
          key: 'record',
          buffer: this.buffer.map((a) => Array.from(a)),
        });
      };
      chrome.runtime.sendMessage({
        key: 'start',
        bufferSize: this.processor.bufferSize,
        sampleRate: this.context.sampleRate,
      });
    }
  }
  finishRecording() {
    if (this.isRecording()) {
      this.input.disconnect();
      this.processor.disconnect();
      delete this.processor;
      chrome.runtime.sendMessage({ key: 'finish' });
    }
  }
}
