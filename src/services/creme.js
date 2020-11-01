const getCurrentTab = cb => {
  return chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tab = tabs.length ? tabs[0] : null

    cb(tab)
  })
}

const asset = path => {
  return chrome.runtime.getURL(`assets/${path}`)
}

export default {
  getCurrentTab,
  asset
}