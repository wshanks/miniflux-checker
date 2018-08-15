var settingsNames = ['url', 'username', 'password', 'interval', 'notifications']

function saveOptions(e) {
    e.preventDefault()
    var settings = {}
    for (let setting of settingsNames) {
        settings[setting] = document.querySelector("#"+setting).value
    }
    browser.storage.local.set(settings)

    var background = browser.extension.getBackgroundPage()
    background.updateAlarm(settings.interval)
}

async function restoreOptions() {
    var settings = await browser.storage.local.get(settingsNames)

    for (let setting in settings) {
        document.querySelector("#"+setting).value = settings[setting]
    }
}

document.addEventListener("DOMContentLoaded", restoreOptions)
document.querySelector("form").addEventListener("submit", saveOptions)
