import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    runTransaction,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { ADMIN_EMAILS } from './admin-config.js?v=20261018-2';
import { auth, db } from './firebase.js';

const message = document.getElementById('admin-message');
const migrationMessage = document.getElementById('migration-message');
const bookingsBody = document.getElementById('admin-bookings');
const validTimes = new Set([
    '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM',
    '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'
]);

function normalizeStatus(status) {
    return String(status || 'pending').trim().toLowerCase() || 'pending';
}

function showMessage(element, text, isError) {
    element.textContent = text;
    element.setAttribute('role', isError ? 'alert' : 'status');
}

function addCell(row, text) {
    const cell = row.insertCell();
    cell.textContent = text || '—';
    return cell;
}

function renderBookings(bookings) {
    bookingsBody.replaceChildren();
    if (bookings.length === 0) {
        const row = bookingsBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 5;
        cell.textContent = 'No bookings have been submitted.';
        return;
    }

    bookings.sort((a, b) => `${a.preferredDate || ''} ${a.preferredTime || ''}`.localeCompare(`${b.preferredDate || ''} ${b.preferredTime || ''}`));
    bookings.forEach((booking) => {
        const normalizedStatus = normalizeStatus(booking.status);
        const row = bookingsBody.insertRow();
        addCell(row, `${booking.preferredDate || 'Date pending'} ${booking.preferredTime || ''}`.trim());
        addCell(row, `${booking.username || 'Customer'} (${booking.email || 'No email'})`);
        addCell(row, booking.service);
        addCell(row, normalizedStatus === 'pending' ? 'Pending' : normalizedStatus === 'confirmed' ? 'Confirmed' : normalizedStatus === 'cancelled' ? 'Cancelled' : 'Pending');
        const actionCell = row.insertCell();

        if (normalizedStatus === 'cancelled') {
            actionCell.textContent = 'Cancelled';
            return;
        }

        if (normalizedStatus === 'confirmed') {
            const cancelButton = document.createElement('button');
            cancelButton.type = 'button';
            cancelButton.className = 'btn secondary';
            cancelButton.dataset.action = 'cancel-booking';
            cancelButton.dataset.id = booking.id;
            cancelButton.textContent = 'Cancel';
            actionCell.append(cancelButton);
            return;
        }

        const confirmButton = document.createElement('button');
        confirmButton.type = 'button';
        confirmButton.className = 'btn';
        confirmButton.dataset.action = 'confirm-booking';
        confirmButton.dataset.id = booking.id;
        confirmButton.textContent = 'Confirm';

        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'btn secondary';
        cancelButton.dataset.action = 'cancel-booking';
        cancelButton.dataset.id = booking.id;
        cancelButton.textContent = 'Cancel';

        actionCell.append(confirmButton, ' ', cancelButton);
    });
}

async function migrateLegacyBookings(bookings) {
    const legacyBookings = bookings.filter((booking) =>
        !booking.slotId
        && normalizeStatus(booking.status) !== 'cancelled'
        && booking.preferredDate
        && validTimes.has(booking.preferredTime)
    );
    let migrated = 0;
    let conflicts = 0;

    for (const booking of legacyBookings) {
        const bookingRef = doc(db, 'bookings', booking.id);
        const slotId = `${booking.preferredDate}_${booking.preferredTime}`;
        const slotRef = doc(db, 'bookingSlots', slotId);

        const result = await runTransaction(db, async (transaction) => {
            const currentBooking = await transaction.get(bookingRef);
            if (!currentBooking.exists() || normalizeStatus(currentBooking.data().status) === 'cancelled') return 'skipped';
            if (currentBooking.data().slotId) return 'skipped';

            const slotSnapshot = await transaction.get(slotRef);
            if (slotSnapshot.exists() && slotSnapshot.data().bookingId !== booking.id) {
                return 'conflict';
            }

            if (!slotSnapshot.exists()) {
                transaction.set(slotRef, {
                    bookingId: booking.id,
                    date: currentBooking.data().preferredDate,
                    time: currentBooking.data().preferredTime,
                    createdAt: serverTimestamp()
                });
            }
            transaction.update(bookingRef, {
                slotId,
                status: normalizeStatus(currentBooking.data().status),
                updatedAt: serverTimestamp()
            });
            return 'migrated';
        });

        if (result === 'migrated') migrated += 1;
        if (result === 'conflict') conflicts += 1;
    }

    return { migrated, conflicts };
}

async function loadDashboard(user) {
    await user.reload();
    const token = await user.getIdTokenResult(true);
    if (!ADMIN_EMAILS.has(user.email?.trim().toLowerCase()) || token.claims.email_verified !== true) {
        showMessage(
            message,
            `This dashboard requires a verified allowlisted email. Signed in as "${user.email || 'unknown'}".`,
            true
        );
        bookingsBody.replaceChildren();
        return;
    }

    showMessage(message, 'Administrator access verified.', false);
    const initialBookings = (await getDocs(collection(db, 'bookings'))).docs.map((snapshot) => ({
        ...snapshot.data(),
        id: snapshot.id,
        status: normalizeStatus(snapshot.data().status)
    }));

    const migration = await migrateLegacyBookings(initialBookings);
    if (migration.conflicts) {
        showMessage(migrationMessage, `${migration.migrated} old booking(s) secured. ${migration.conflicts} booking(s) share an already-reserved date/time and need manual review.`, true);
    } else if (migration.migrated) {
        showMessage(migrationMessage, `${migration.migrated} existing booking(s) were added to the availability calendar.`, false);
    } else {
        showMessage(migrationMessage, '', false);
    }

    const bookings = (await getDocs(collection(db, 'bookings'))).docs.map((snapshot) => ({
        ...snapshot.data(),
        id: snapshot.id,
        status: normalizeStatus(snapshot.data().status)
    }));
    renderBookings(bookings);
}

document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button || button.disabled) return;
    button.disabled = true;

    try {
        const bookingRef = doc(db, 'bookings', button.dataset.id);
        const status = button.dataset.action === 'confirm-booking' ? 'confirmed' : 'cancelled';

        button.remove();

        await runTransaction(db, async (transaction) => {
            const bookingSnapshot = await transaction.get(bookingRef);
            if (!bookingSnapshot.exists()) {
                throw new Error('This booking no longer exists.');
            }

            const booking = bookingSnapshot.data();
            if (normalizeStatus(booking.status) === 'cancelled') {
                throw new Error('This booking has already been cancelled.');
            }

            let slotRef = null;
            let slotSnapshot = null;
            if (status === 'cancelled' && booking.slotId) {
                slotRef = doc(db, 'bookingSlots', booking.slotId);
                slotSnapshot = await transaction.get(slotRef);
            }

            transaction.update(bookingRef, {
                status: normalizeStatus(status),
                updatedAt: serverTimestamp()
            });
            if (slotSnapshot && slotSnapshot.exists()) {
                transaction.delete(slotRef);
            }
        });

        if (auth.currentUser) await loadDashboard(auth.currentUser);
    } catch (error) {
        console.error('Administrator booking action failed.', error);
        showMessage(message, error.message || 'The action failed. Please try again.', true);
    } finally {
        button.disabled = false;
    }
});

onAuthStateChanged(auth, (user) => {
    if (!user) return;
    loadDashboard(user).catch((error) => {
        console.error('Could not load the administrator dashboard.', error);
        showMessage(message, error.message || 'Could not load the administrator dashboard.', true);
    });
});
