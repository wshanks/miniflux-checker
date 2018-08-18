var defaults = {
    'interval': 5, 
    'lastEntry': 0,
    'maxNotifications': 5,
    'notifications': true,
    'password': '',
    'url': '',
    'username': '',
    'useIcons': true
}

async function setDefaults() {
    var settingsNames = Object.getOwnPropertyNames(defaults)
    var settings = await browser.storage.local.get(settingsNames)

    var val
    for (let setting in defaults) {
        if (settings[setting] === undefined) {
            val = defaults[setting]
        } else {
            val = settings[setting]
        }
        settings[setting] = val
    }
    browser.storage.local.set(settings)
}

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
    var info = await browser.storage.local.get([
        'url', 'username', 'password', 'lastEntry', 'notifications',
        'maxNotifications', 'useIcons'])

    var limit
    if (info.notifications) {
        limit = info.maxNotifications
    } else {
        limit = 1
    }
    var url = info.url + '/v1/entries?status=unread&direction=desc' +
        `&limit=${limit}&after_entry_id=${info.lastEntry}`
    var headers = new Headers()
    headers.append('Authorization', 'Basic ' + btoa(`${info.username}:${info.password}`))
    var response = await fetch(url, {credentials: "include", headers: headers})
    var body = await response.json()

    browser.browserAction.setBadgeText({'text': `${body.total}`})

    var numEntries = body.entries.length
    if (numEntries > 0) {
        var lastEntry = Math.max(body.entries[0].id, info.lastEntry)
        browser.storage.local.set({'lastEntry': lastEntry})
    }

    if (info.notifications && numEntries > 0) {
        var numShow
        if (numEntries > info.maxNotifications) {
            numShow = info.maxNotifications - 1
        } else {
            numShow = numEntries
        }

        var iconIds = []
        var iconData = []
        if (info.useIcons) {
            for (let idx=numShow - 1; idx >= 0; idx--) {
                let entry = body.entries[idx]
                if (iconIds.includes(entry.feed_id)) {
                    continue
                }

                if (entry.feed.icon) {
                    iconIds.push(entry.feed_id)
                    iconData.push(fetch(
                        info.url + `/v1/feeds/${entry.feed_id}/icon`,
                        {credentials: 'include', headers: headers}).
                        then((response) => response.json()))
                }
            }
        }
        if (iconIds) {
            iconData = await Promise.all(iconData)
        }
        var icons = {}
        for (let idx=0; idx<iconIds.length; idx++) {
            icons[iconIds[idx]] = iconData[idx].data
        }
        // icondIds.forEach((key, idx) => icons[key] = iconData[idx])

        for (let idx=numShow - 1; idx >= 0; idx--) {
            let entry = body.entries[idx]
            let iconUrl
            if (icons.hasOwnProperty(entry.feed_id)) {
                iconUrl = 'data:' + icons[entry.feed_id]
            } else {
                iconUrl = 'icons/icon64.png'
            }
            browser.notifications.create('', {
                "type": "basic",
                "title": entry.feed.title,
                "message": entry.title,
                "iconUrl": iconUrl
            })
        }

        if (body.total > info.maxNotifications) {
            var msg = `${body.total - info.maxNotifications}` +
                ' additional new feed items....'
            browser.notifications.create('', {
                "type": "basic",
                "title": 'Miniflux',
                "message": msg,
                "iconUrl": 'icons/icon64.png'
            })
        }
    }
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

    // Need non-empty values for all the login settings to run alarm
    if (loginInfo.some(el => !settings[el])) {
        return
    }

    var interval = sanitizeInterval(settings)
    var delay = await calculateDelay(interval)

    browser.alarms.create('miniflux-check',
                          {'delayInMinutes': delay,
                           'periodInMinutes': interval})
}

setDefaults()
browser.browserAction.setBadgeBackgroundColor({'color': 'blue'})
browser.browserAction.onClicked.addListener(checkFeeds)
setupAlarm()
browser.alarms.onAlarm.addListener(handleAlarm)
