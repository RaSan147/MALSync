import {
  content,
  emitter,
  minimalWindow,
  sendMessageI,
  videoTime,
  videoTimeSet,
  xhrI,
} from '../api/messageInterface';
import { databaseRequest } from '../background/database';
import { sendNotification } from '../background/notifications';

export function initMessageHandler() {
  chrome.runtime.onMessage.addListener((message: sendMessageI, sender, sendResponse) => {
    return messageHandler(message, sender, sendResponse);
  });
}

function messageHandler(message: sendMessageI, sender, sendResponse) {
  switch (message.name) {
    case 'xhr':
      return xhrAction(message, sender, sendResponse);
    case 'videoTime':
      return videoTimeAction(message, sender, sendResponse);
    case 'content':
      return contentAction(message, sender, sendResponse);
    case 'videoTimeSet':
      return videoTimeSetAction(message, sender, sendResponse);
    case 'minimalWindow':
      return minimalWindowAction(message, sender, sendResponse);
    case 'emitter':
      return emitterAction(message, sender, sendResponse);
    case 'notification': {
      sendNotification(message.options);
      return undefined;
    }
    case 'database': {
      databaseRequest(message.options.call, message.options.param).then(res => sendResponse(res));
      return true;
    }
    default:
      throw new Error(`Unknown action: ${message.name}`);
  }
}

function videoTimeAction(message: videoTime, sender, sendResponse) {
  chrome.tabs.sendMessage(sender.tab.id, {
    action: 'videoTime',
    item: message.item,
    sender,
  });
  return undefined;
}

function contentAction(message: content, sender, sendResponse) {
  chrome.tabs.sendMessage(sender.tab.id, {
    action: 'content',
    item: message.item,
    sender,
  });
  return undefined;
}

function videoTimeSetAction(message: videoTimeSet, sender, sendResponse) {
  if (!message.sender?.tab?.id) return undefined;

  chrome.tabs.sendMessage(
    message.sender.tab.id,
    {
      action: 'videoTimeSet',
      time: message.time,
      timeAdd: message.timeAdd,
    },
    { frameId: message.sender.frameId },
  );

  return undefined;
}

function minimalWindowAction(message: minimalWindow, sender, sendResponse) {
  api.storage.get('windowId').then(winId => {
    if (typeof winId === 'undefined') winId = 22;
    if (chrome.windows && chrome.windows.update && chrome.windows.create) {
      chrome.windows.update(winId, { focused: true }, function () {
        if (chrome.runtime.lastError) {
          const config: any = {
            url: chrome.runtime.getURL('window.html'),
            type: 'popup',
          };

          if (message.width) {
            config.width = message.width;
          }
          if (message.height) {
            config.height = message.height;
          }
          if (message.left) {
            config.left = message.left;
          }

          chrome.windows.create(config, function (win) {
            api.storage.set('windowId', win!.id);
            sendResponse();
          });
        } else {
          sendResponse();
        }
      });
    } else {
      chrome.tabs.update(winId, { active: true }, function () {
        if (chrome.runtime.lastError) {
          const config: any = {
            url: chrome.runtime.getURL('window.html'),
            active: true,
          };

          chrome.tabs.create(config, function (win) {
            api.storage.set('windowId', win!.id);
            sendResponse();
          });
        }
      });
    }
  });
  return true;
}

function emitterAction(message: emitter, sender, sendResponse) {
  chrome.runtime.sendMessage(message);
  chrome.tabs.query({}, tabs => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id!, message);
    });
  });
  return undefined;
}

function xhrAction(message: xhrI, sender, sendResponse, retry = 0) {
  throw new Error('Function not implemented.');
}
