function sanitizeInterval(settings) {
    var interval
    if (settings.hasOwnProperty('interval')) {
        interval = settings.interval
    } else {
        interval = ''
    }
    return interval ? parseFloat(interval) : 0.1
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

async function calculateDelay(interval) {
    var alarm = await browser.alarms.get('miniflux-check')

    var newDelay
    if (typeof alarm !== 'undefined') {
        var currentDelay = (alarm.scheduledTime - Date.now()) / 60
        newDelay = Math.max(interval - currentDelay, 0)
    } else {
        newDelay = 0
    }

    return newDelay
}

function handleAlarm(alarm) {
    if (alarm.name == 'miniflux-check') {
        checkFeeds()
    }
}

async function setupAlarm() {
    var loginInfo = ['url', 'username', 'password']
    var settings = await browser.storage.local.get(['interval', ...loginInfo])

    // Need all the login settings to run alarm
    if (loginInfo.some(el => !settings[el])) {
        return
    }

    var interval = sanitizeInterval(settings)
    var delay = await calculateDelay(interval)

    browser.alarms.create('miniflux-check',
                          {'delayInMinutes': delay,
                           'periodInMinutes': interval})
}

browser.browserAction.setBadgeBackgroundColor({'color': 'blue'})
browser.browserAction.onClicked.addListener(checkFeeds)
setupAlarm()
browser.alarms.onAlarm.addListener(handleAlarm)

// Notifications
