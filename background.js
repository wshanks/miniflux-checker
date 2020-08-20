var defaults = {
    'interval': 5, 
    'lastEntry': 0,
    'maxNotifications': 5,
    'notifications': true,
    'password': '',
    'url': '',
    'username': '',
    'useIcons': true,
    'token': ''
}

async function setDefaults() {
    var settingsNames = Object.getOwnPropertyNames(defaults)
    var settings = await browser.storage.local.get(settingsNames)

    var val
    for (let setting in defaults) {
        if (defaults.hasOwnProperty(setting)) {
            if (settings[setting] === undefined) {
                val = defaults[setting]
            } else {
                val = settings[setting]
            }
            settings[setting] = val
        }
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
        'maxNotifications', 'useIcons', 'token'])

    var url = info.url + '/v1/entries?status=unread&direction=desc'

    var headers = new Headers()

    if (info.token) {
        headers.append('X-Auth-Token', info.token)
    } else {
        headers.append('Authorization',
            'Basic ' + btoa(`${info.username}:${info.password}`))
    }

    let bad_request = false
    try {
        var response = await fetch(url, {credentials: 'include', headers: headers})
    } catch(e) {
        bad_request = true
    }
    if (bad_request || !response.ok) {
        browser.browserAction.setBadgeText({'text': 'X'})
        browser.browserAction.setBadgeBackgroundColor({color: 'red'})
        browser.browserAction.setTitle({title: 'Miniflux Checker [Error connecting to Miniflux]'})
        return
    }
    var body = await response.json()

    browser.browserAction.setBadgeText({'text': `${body.total}`})
    browser.browserAction.setBadgeBackgroundColor({color: 'blue'})
    browser.browserAction.setTitle({title: 'Miniflux Checker'})

    var previousLastEntry = info.lastEntry
    if (body.total > 0) {
        var lastEntry = info.lastEntry
        for (let idx=0; idx<body.entries.length; idx++) {
            lastEntry = Math.max(body.entries[idx].id, lastEntry)
        }
        if (lastEntry != info.lastEntry) {
            browser.storage.local.set({'lastEntry': lastEntry})
        }
    }

    if (!info.notifications) {
        return
    }

    var newEntries = []
    for (let idx=0; idx<body.entries.length; idx++) {
        if (body.entries[idx].id > previousLastEntry) {
            newEntries.push(body.entries[idx])
        }
    }

    if (newEntries.length === 0) {
        return
    }

    var numShow
    if (newEntries.length > info.maxNotifications) {
        numShow = info.maxNotifications - 1
    } else {
        numShow = newEntries.length
    }

    var iconIds = []
    var iconData = []
    if (info.useIcons) {
        for (let idx=numShow - 1; idx >= 0; idx--) {
            let entry = newEntries[idx]
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
    iconIds.forEach((key, idx) => icons[key] = iconData[idx].data)

    for (let idx=numShow - 1; idx >= 0; idx--) {
        let entry = newEntries[idx]
        let iconUrl
        if (icons.hasOwnProperty(entry.feed_id)) {
            iconUrl = 'data:' + icons[entry.feed_id]
        } else {
            iconUrl = 'icons/icon64.png'
        }
        browser.notifications.create('', {
            'type': 'basic',
            'title': entry.feed.title,
            'message': entry.title,
            'iconUrl': iconUrl
        })
    }

    if (newEntries.length > info.maxNotifications) {
        var msg = `${newEntries.length - numShow}`
        if (info.maxNotifications == 1) {
            msg = msg + ' new feed items....'
        } else {
            msg = msg + ' additional new feed items....'
        }
        browser.notifications.create('', {
            'type': 'basic',
            'title': 'Miniflux',
            'message': msg,
            'iconUrl': 'icons/icon64.png'
        })
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
    if (alarm.name === 'miniflux-check') {
        checkFeeds()
    }
}

async function setupAlarm() {
    var settingsKeys = ['interval', 'url', 'token', 'username', 'password']
    var settings = await browser.storage.local.get(settingsKeys)

    // Need non-empty values for the login settings to run alarm

    let settings_good = true
    if (!settings['url']) {
        console.warn('Miniflux refresh disabled due to no URL')
        settings_good = false
    }

    if (!settings['token']) {
        if (!settings['username'] || !settings['password']) {
            console.warn('Miniflux refresh disabled due to no credentials')
            settings_good = false
        }
    }

    if (settings_good) {
        browser.browserAction.enable()
        var interval = sanitizeInterval(settings)
        var delay = await calculateDelay(interval)

        browser.alarms.create('miniflux-check',
            {'delayInMinutes': delay, 'periodInMinutes': interval})
    } else {
        browser.browserAction.disable()
        browser.alarms.clear('miniflux-check')
        browser.browserAction.setBadgeText({text: ''})
        browser.browserAction.setTitle({title: 'Miniflux Checker [Missing required settings]'})
    }
}

async function onContextAction(actionInfo) {
    if (actionInfo.menuItemId === 'miniflux-show-unread') {
        var settings = await browser.storage.local.get(['url'])
        if (!settings.url) {
            return
        }
        browser.tabs.create({url: `${settings.url}/unread`})
    }
}

setDefaults()
browser.browserAction.setBadgeBackgroundColor({'color': 'blue'})
browser.browserAction.onClicked.addListener(checkFeeds)
setupAlarm()
browser.alarms.onAlarm.addListener(handleAlarm)

browser.contextMenus.create({
    id: 'miniflux-show-unread',
    title: 'Show unread',
    contexts: ['browser_action']
})
browser.contextMenus.onClicked.addListener(info => onContextAction(info))
