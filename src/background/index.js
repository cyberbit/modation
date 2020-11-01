import '../plugins/bootstrap'

import intersection from 'lodash/intersection'
import axios from 'axios'

import { matchAny } from '../services/helpers'
import { proxyUrl, urlMatchers } from '../services/sam'

// OnInstall handler
chrome.runtime.onInstalled.addListener(details => {
  console.log(details)
})

// Navigation handler
chrome.webNavigation.onHistoryStateUpdated.addListener((meta) => {
  console.log("Request detected: %o", meta.url)

  const triggers = matchAny(meta.url, urlMatchers, true);

  // define valid SAM sync targets
  const samTriggers = ['group', 'track']

  if (intersection(triggers, samTriggers).length) {
    const samUrl = proxyUrl(meta.url)

    // trigger SAM event
    axios.get(samUrl).then(d => console.log("SAM response: %o", d))
  }

  // TODO determine if "tabs" permission can be avoided and still use this functionality
  // need to send message to specific tab
  chrome.tabs.sendMessage(meta.tabId, { action: "onHistoryStateUpdated", meta })
}, {
  url: [{
    // TODO replace with constant
    hostEquals: 'soundation.com'
  }]
})

// Navigation complete handler
chrome.webRequest.onCompleted.addListener((meta) => {
  console.log("Page load detected")

  // need to send message to specific tab
  chrome.tabs.sendMessage(meta.tabId, { action: "onNavigationCompleted", meta })
}, {
  urls: [
    // TODO replace with constant
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