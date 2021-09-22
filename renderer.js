// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const {ipcRenderer} = require('electron')

const {START_NOTIFICATION_SERVICE, NOTIFICATION_SERVICE_STARTED, NOTIFICATION_SERVICE_ERROR, NOTIFICATION_RECEIVED, TOKEN_UPDATED,} = require('electron-push-receiver/src/constants')

// Listen for service successfully started
ipcRenderer.on(NOTIFICATION_SERVICE_STARTED, (_, token) => {
    localStorage.setItem('notification_token', token);
})

// Handle notification errors
ipcRenderer.on(NOTIFICATION_SERVICE_ERROR, (_, error) => {
    console.log('Chat>>> notification error', error)
})

// Send FCM token to backend
ipcRenderer.on(TOKEN_UPDATED, (_, token) => {
    localStorage.setItem('notification_token', token);
})

// Display notification
ipcRenderer.on(NOTIFICATION_RECEIVED, (_, serverNotificationPayload) => {
    // check to see if payload contains a body string, if it doesn't consider it a silent push
    const notification = serverNotificationPayload.data || serverNotificationPayload.notification
    if (notification.body) {
        // payload has a body, so show it to the user
        let myNotification = new Notification(notification.title, {
            body: notification.body,
            icon: '/notification-icon.png',
            image: '/notification-icon.png',
            data: notification.click_action, //the url which we gonna use later
            sound: '/sound.mp3',
            silent: false,
        })

        myNotification.onclick = (event) => {
            const parsed = new URL(event.target.data);
            window.location.hash = parsed.hash;
            window.focus()

            ipcRenderer.send('asynchronous-message', event.target.data)
        }
    } else {
        // payload has no body, so consider it silent (and just consider the data portion)
        console.log('Chat>>> do something with the key/value pairs in the data', serverNotificationPayload.data)
    }
})

// Start service
const senderId = '511004999943' // <-- replace with FCM sender ID from FCM web admin under Settings->Cloud Messaging
console.log('Chat>>> starting service and registering a client')
ipcRenderer.send(START_NOTIFICATION_SERVICE, senderId)

ipcRenderer.on('asynchronous-message', function (evt, message) {
    ipcRenderer.sendSync('update-badge', message.count || null );
    return message
})