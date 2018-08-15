function sanitizeInterval(interval) {
    return interval ? parseFloat(interval) : 5
}

async function checkFeeds() {
    var info = await browser.storage.local.get(['url', 'username', 'password'])
    var request = new XMLHttpRequest()

    function reqListener () {
        var response = JSON.parse(this.responseText)
        browser.browserAction.setBadgeText({'text': `${response.total}`})
    }
    request.addEventListener('load', reqListener)

    request.open('GET', info.url + '/v1/entries?status=unread&limit=1')
    request.withCredentials = true
    request.setRequestHeader('Authorization', 'Basic ' + btoa(info.username + ':' + info.password))
    request.send()
}

async function updateAlarm(interval) {
    interval = sanitizeInterval(interval)
    var alarm = await browser.alarms.get('miniflux-check')

    if (alarm.periodInMinutes == interval) {
        return
    }

    var currentDelay = (alarm.scheduledTime - Date.now()) / 60
    var newDelay = Math.max(interval - currentDelay, 0)

    await browser.alarms.clear('miniflux-check')

    browser.alarms.create('miniflux-check',
                          {'delayInMinutes': newDelay,
                           'periodInMinutes': interval})
}

function handleAlarm(alarm) {
    if (alarm.name == 'miniflux-check') {
        checkFeeds()
    }
}

async function setupAlarm() {
    var info = await browser.storage.local.get(['interval'])
    browser.alarms.create('miniflux-check',
                          {'delayInMinutes': 0,
                           'periodInMinutes': sanitizeInterval(info.interval)})
}

browser.browserAction.setBadgeBackgroundColor({'color': 'blue'})
browser.browserAction.onClicked.addListener(checkFeeds)
setupAlarm()
browser.alarms.onAlarm.addListener(handleAlarm)

// Notifications
