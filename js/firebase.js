import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

const firebaseConfig = {
    apiKey: 'AIzaSyBk3HXvOWTqBQ6G-QQ6jj-B_1Lrt1Wi-zk',
    authDomain: 'moes-24f8a.firebaseapp.com',
    projectId: 'moes-24f8a',
    storageBucket: 'moes-24f8a.firebasestorage.app',
    messagingSenderId: '816222431601',
    appId: '1:816222431601:web:54f330d86f99c85887aed0',
    measurementId: 'G-YNPRDS1XJL'
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
