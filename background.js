let recBuffers = [];
let recLength = 0;
const numChannels = 2;
const chunkSize = 2500000;
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
    async (window) => {
      chrome.runtime.sendMessage({ key: 'test', data: recBuffers[0].length });
      const id = window.tabs[0].id;
      await chrome.tabs.sendMessage(id, { key: 'sampleRate', data: sampleRate });
      const taskList = [];
      for (let i = 0; i < recBuffers[0].length; i += chunkSize) {
        taskList.push(
          chrome.tabs.sendMessage(id, {
            key: 'chunk',
            data: [recBuffers[0].slice(i, i + chunkSize), recBuffers[1].slice(i, i + chunkSize)],
          })
        );
      }
      await Promise.all(taskList).then(() => chrome.tabs.sendMessage(id, { key: 'finish' }));
    }
  );
};
const init = (sample_rate) => {
  sampleRate = sample_rate;
  for (let channel = 0; channel < numChannels; channel++) {
    recBuffers[channel] = [];
  }
};
