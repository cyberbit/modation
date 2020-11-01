import '../plugins/bootstrap'

console.log('Content script working...')

const msgFunctions = {}
// let triggers = []

let hasNavigated = false

msgFunctions.onHistoryStateUpdated = ({ meta }) => {
    console.log("Location changed to %o", meta.url);
};

msgFunctions.onNavigationCompleted = () => {
    hasNavigated = true

    console.log('Navigation complete')
}

// Bind content script on load
msgFunctions.onHistoryStateUpdated({
    meta: {
        url: window.location.href
    }
});

chrome.runtime.sendMessage({ action: 'onGetTab' }, ({ tab }) => {
    // inactive tabs do not reliably deliver navigation updates,
    // so here we are detecting if the current tab is active
    // to manually trigger the event handler
    if (!hasNavigated && !tab.active) {
        msgFunctions.onNavigationCompleted({
            meta: {
                url: window.location.href
            }
        })
    }
})

// Runtime message handler
chrome.runtime.onMessage.addListener((msg, sender, response) => {
    // Pass message data to event handler
    if (msgFunctions[msg.action]) msgFunctions[msg.action](msg, sender, response)
});