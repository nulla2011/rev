let recBuffers = [];
let recLength = 0;
const numChannels = 2;
let sampleRate;
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.key) {
    case 'start-capture':
      chrome.runtime.sendMessage('1');
      break;
    case 'start':
      init(message.sampleRate);
      break;
    case 'record':
      record(message.buffer);
      break;
    case 'finish':
      finish();
      break;
  }
});
const record = (buffer) => {
  for (let channel = 0; channel < numChannels; channel++) {
    recBuffers[channel] = recBuffers[channel].concat(buffer[channel]);
  }
  recLength += buffer[0].length;
};
const finish = () => {
  chrome.windows.create(
    { type: 'popup', url: 'window.html', focused: !0, height: 300, width: 350 },
    (window) => {
      chrome.tabs.sendMessage(window.tabs[0].id, { buffer: recBuffers, sampleRate });
    }
  );
};
const init = (sample_rate) => {
  sampleRate = sample_rate;
  for (let channel = 0; channel < numChannels; channel++) {
    recBuffers[channel] = [];
  }
};
