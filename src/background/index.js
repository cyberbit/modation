import intersection from 'lodash/intersection'
import axios from 'axios'

import { matchAny } from '../services/helpers'

// OnInstall handler
chrome.runtime.onInstalled.addListener(details => {
  console.log(details)
})

// Navigation handler
chrome.webNavigation.onHistoryStateUpdated.addListener((meta) => {
  console.log("Request detected: %o", meta.url)

  const triggers = matchAny(meta.url, {
      message: /\/account\/messages\/\d+/,
      group: /\/group\//,
      track: /\/user\/.*\/track\//,
      user: /\/user\/[^/]*$/,
      profile: /\/account\/profile/,
      general: /\/soundation.com\//,
      feed: /soundation.com\/feed/
  }, true);

  // define valid SAM sync targets
  const samTriggers = ['group', 'track']

  if (intersection(triggers, samTriggers).length) {
    const samUrl = meta.url.replace('https://soundation.com', 'https://modation.app')

    // trigger SAM event
    axios.get(samUrl).then(d => console.log("SAM response: %o", d))
  }

  // need to send message to specific tab
  chrome.tabs.sendMessage(meta.tabId, { action: "onHistoryStateUpdated", meta })
})

// Navigation complete handler
chrome.webRequest.onCompleted.addListener((meta) => {
  console.log("Page load detected")

  // need to send message to specific tab
  chrome.tabs.sendMessage(meta.tabId, { action: "onNavigationCompleted", meta })
}, {
  urls: [
    'https://soundation.com/datalayer'
  ]
})

const msgFunctions = {
  onGetTab (msg, { tab }, response) {
    return response({ tab })
  }
}

// TODO move this structure to a service
// Runtime message handler
chrome.runtime.onMessage.addListener((msg, sender, response) => {
  // Pass message data to event handler
  if (msgFunctions[msg.action]) msgFunctions[msg.action](msg, sender, response);
});