let recBuffers = [];
let recLength = 0;
const numChannels = 2;
const chunkSize = 1500000;
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
      // chrome.tabs.sendMessage(window.tabs[0].id, { buffer: recBuffers, sampleRate });
      chrome.runtime.onMessage.addListener(async (message, sender) => {
        if (message.key === 'window-finish-loading') {
          const tid = window.tabs[0].id;
          chrome.tabs.sendMessage(tid, { key: 'init', sampleRate, numChannels });
          // chrome.runtime.sendMessage({
          //   key: 'test',
          //   data: `${recBuffers[0][3000]}<br>${recBuffers[1][3000]}`,
          // });
          const taskList = [];
          for (let index = 0; index < recBuffers[0].length / chunkSize; index++) {
            taskList.push(
              chrome.tabs.sendMessage(tid, {
                key: 'chunk',
                index,
                data: [
                  recBuffers[0].slice(index * chunkSize, (index + 1) * chunkSize),
                  recBuffers[1].slice(index * chunkSize, (index + 1) * chunkSize),
                ],
              })
            );
          }
          await Promise.all(taskList);
          chrome.tabs.sendMessage(tid, { key: 'finish' });
        }
      });
      //   chrome.runtime.sendMessage({ key: 'test', data: [recBuffers[0][3000], recBuffers[1][3000]] });
    }
  );
};
const init = (sample_rate) => {
  sampleRate = sample_rate;
  for (let channel = 0; channel < numChannels; channel++) {
    recBuffers[channel] = [];
  }
};
