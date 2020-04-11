var optionNames = ['interval', 'lastEntry', 'maxNotifications',
    'notifications', 'password', 'url', 'username', 'useIcons', 'token']

function saveOptions(e) {
    e.preventDefault()
    var settings = {}
    var element
    for (let setting of optionNames) {
        element = document.querySelector('#'+setting)
        if (element.type == 'checkbox') {
            settings[setting] = element.checked
        } else {
            settings[setting] = element.value
        }
    }
    browser.storage.local.set(settings)

    var background = browser.extension.getBackgroundPage()
    background.setupAlarm()
}

async function restoreOptions() {
    var settings = await browser.storage.local.get(optionNames)

    var element
    for (let setting in settings) {
        element = document.querySelector('#'+setting)
        if (element.type == 'checkbox') {
            element.checked = settings[setting]
        } else {
            element.value = settings[setting]
        }
    }
}

function updateID(changes) {
    if (changes.hasOwnProperty('lastEntry')) {
        var element = document.querySelector('#lastEntry')
        element.value = changes.lastEntry.newValue
    }
}

function resetID(e) {
    e.preventDefault()
    browser.storage.local.set({'lastEntry': '0'})
    var element = document.querySelector('#lastEntry')
    element.value = '0'
}

function testAPI(e) {
    e.preventDefault()
    var inputUrlElement = document.querySelector('#url')
    var inputUrl = inputUrlElement.value
    var inputToken = document.querySelector('#token').value
    var inputUser = document.querySelector('#username').value
    var inputPass = document.querySelector('#password').value

    var url = inputUrl + '/v1/entries?limit=1'

    var headers = new Headers()
    if (inputToken) {
        headers.append('X-Auth-Token', inputToken)
    } else {
        headers.append('Authorization',
            'Basic ' + btoa(`${inputUser}:${inputPass}`))
    }

    var resultElement = document.querySelector('#test-api-result')
    resultElement.textContent = ''

    if (inputUrl === '' || !inputUrlElement.checkValidity()) {
        resultElement.textContent = 'Not OK, bad URL'
        return
    }

    fetch(url, {credentials: 'include', headers: headers})
        .then(response => {
            var status = response.status

            var message
            if (status === 200) {
                message = 'OK'
            } else if (status === 401) {
                if (inputToken) {
                    message = 'Not OK, token not accepted'
                } else if (inputUser) {
                    message = 'Not OK, bad username or password'
                } else {
                    message = 'Not OK, must provide credentials'
                }
            } else if (status === 404) {
                message = 'Not OK, Miniflux not found'
            } else if (status === 500) {
                message = 'Not OK, internal server error'
            } else {
                message = 'Not OK, HTTP status code: ' + status
            }

            resultElement.textContent = message
        })
        .catch(error => {
            resultElement.textContent = 'Not OK, could not reach server'
        })
}

document.addEventListener('DOMContentLoaded', restoreOptions)
document.querySelector('#save').addEventListener('submit', saveOptions)
document.querySelector('#reset-id').addEventListener('submit', resetID)
document.querySelector('#test-api').addEventListener('submit', testAPI)
browser.storage.onChanged.addListener(updateID)
