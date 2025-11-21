importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// --- REPLACE WITH YOUR FIREBASE CONFIG ---
const firebaseConfig = {
  apiKey: "AIzaSyDO80i4f5hhBHNH2LFFycnjTokPbPyc0qQ",
  authDomain: "hcibso.firebaseapp.com",
  projectId: "hcibso",
  storageBucket: "hcibso.firebasestorage.app",
  messagingSenderId: "1077288795449",
  appId: "1:1077288795449:web:30306666f8349d770abce8"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  // --- UPDATED: Read from 'data' instead of 'notification' ---
  const notificationTitle = payload.data.title;
  const notificationOptions = {
    body: payload.data.body,
    icon: '/logo.png',
    // Optional: Add click action data so we can use it later
    data: { url: payload.data.url }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Optional: Handle notification click to open the app
self.addEventListener('notificationclick', function(event) {
  console.log('[firebase-messaging-sw.js] Notification click Received.');
  event.notification.close();
  // Open the URL sent in data.url
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});