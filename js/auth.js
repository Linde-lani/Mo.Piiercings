import {
    EmailAuthProvider,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    reauthenticateWithCredential,
    sendEmailVerification,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signOut,
    updateEmail,
    updatePassword,
    updateProfile
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    query,
    runTransaction,
    serverTimestamp,
    setDoc,
    where
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { ADMIN_EMAILS } from './admin-config.js?v=20261018-2';
import { auth, db } from './firebase.js';

const currentPage = window.location.pathname.split('/').pop() || 'index.html';
let isRegistering = false;
let isAdminSignIn = false;
let stayOnLogin = false;

function setMessage(element, message, isError) {
    if (!element) return;
    element.textContent = message;
    element.setAttribute('role', isError ? 'alert' : 'status');
}

function getErrorMessage(error) {
    const messages = {
        'auth/email-already-in-use': 'An account already exists for this email address.',
        'auth/invalid-credential': 'The email or password is incorrect.',
        'auth/invalid-email': 'Enter a valid email address.',
        'auth/weak-password': 'Choose a password with at least 6 characters.',
        'auth/too-many-requests': 'Too many attempts. Please wait a while and try again.',
        'auth/user-not-found': 'No account was found for this email address.',
        'auth/wrong-password': 'The email or password is incorrect.',
        'auth/requires-recent-login': 'For security, sign out and sign in again before changing this information.',
        'auth/operation-not-allowed': 'This account cannot change credentials using email and password.',
        'permission-denied': 'Firestore denied access. Check that the deployed security rules match this app and that you are signed in.'
    };

    return messages[error.code] || error.message || 'Something went wrong. Please try again.';
}

function clearLegacyAuthData() {
    try {
        localStorage.removeItem('mopiiercings_registered_user');
        localStorage.removeItem('mopiiercings_logged_in_user');
        localStorage.removeItem('mopiiercings_user_name');
        localStorage.removeItem('mopiiercings_user_email');
        localStorage.removeItem('mopiiercings_user_phone');
    } catch (error) {
        console.error('Could not clear legacy browser-stored account data.', error);
    }
}

async function ensureUserProfile(user, username) {
    const userRef = doc(db, 'users', user.uid);
    const profileSnapshot = await getDoc(userRef);
    const existingProfile = profileSnapshot.exists() ? profileSnapshot.data() : {};
    const profileUsername = username || existingProfile.username || existingProfile.name || user.displayName || user.email.split('@')[0];
    const profile = {
        username: profileUsername,
        email: user.email,
        createdAt: existingProfile.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    if (existingProfile.phone) {
        profile.phone = existingProfile.phone;
    }
    if (existingProfile.lastLoginAt) {
        profile.lastLoginAt = existingProfile.lastLoginAt;
    }

    await setDoc(userRef, profile);
    return profile;
}

function toggleProtectedUi(user) {
    document.querySelectorAll('.profile-icon, .logout-button, a[href="profile.html"]').forEach((element) => {
        element.style.visibility = user ? 'visible' : 'hidden';
    });
}

async function updateAdminLink(user) {
    const existingLink = document.querySelector('[data-admin-link]');
    if (!existingLink) {
        console.error('Admin navigation placeholder is missing.');
        return;
    }

    if (!user) {
        existingLink.style.visibility = 'hidden';
        return;
    }

    try {
        const token = await user.getIdTokenResult();
        const isVerifiedAdmin = ADMIN_EMAILS.has(user.email?.trim().toLowerCase())
            && token.claims.email_verified === true;
        existingLink.style.visibility = isVerifiedAdmin ? 'visible' : 'hidden';
    } catch (error) {
        console.error('Could not determine administrator access for navigation.', error);
    }
}

function redirectForAuthState(user) {
    const publicPages = ['register.html', 'login.html'];
    const isPublicPage = publicPages.includes(currentPage);

    if (user && isPublicPage && !isAdminSignIn && !stayOnLogin) {
        window.location.href = 'index.html';
    } else if (!user && !isPublicPage) {
        window.location.href = 'login.html';
    }
}

function updateBookingDetails(profile) {
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');

    if (usernameInput) {
        usernameInput.value = profile.username || '';
    }
    if (emailInput) {
        emailInput.value = profile.email || '';
    }
    if (phoneInput && profile.phone) {
        phoneInput.value = profile.phone;
    }
}

function makeSlotId(date, time) {
    return `${date}_${time}`;
}

function handleBookingAvailability() {
    const dateInput = document.getElementById('date');
    const timeInput = document.getElementById('time');
    const availabilityMessage = document.getElementById('availability-message');
    if (!dateInput || !timeInput) return;

    const localDate = new Date();
    const today = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
    dateInput.min = today;

    const slots = Array.from(document.querySelectorAll('.timeslot'));
    let unsubscribeSlots = null;
    let reservedTimes = new Set();

    function refreshSlots() {
        slots.forEach((slot) => {
            const isBooked = reservedTimes.has(slot.dataset.time);
            slot.disabled = isBooked;
            slot.classList.toggle('unavailable', isBooked);
            slot.setAttribute('aria-disabled', String(isBooked));
            slot.setAttribute('aria-label', `${slot.dataset.time}${isBooked ? ', unavailable' : ', available'}`);
            slot.title = isBooked ? 'Unavailable' : 'Available';
            slot.style.cursor = isBooked ? 'not-allowed' : 'pointer';
            slot.style.opacity = isBooked ? '0.65' : '1';
            slot.style.backgroundColor = isBooked ? '#e2e2e2' : '';
            slot.style.borderColor = isBooked ? '#b8b8b8' : '';
            slot.style.color = isBooked ? '#777' : '';
        });

        if (reservedTimes.has(timeInput.value)) {
            timeInput.value = '';
            document.querySelectorAll('.timeslot.selected').forEach((slot) => slot.classList.remove('selected'));
            setMessage(availabilityMessage, 'That time was just booked. Please choose another available time.', true);
        }
    }

    function watchDate() {
        if (unsubscribeSlots) unsubscribeSlots();
        reservedTimes = new Set();
        timeInput.value = '';
        document.querySelectorAll('.timeslot.selected').forEach((slot) => slot.classList.remove('selected'));
        slots.forEach((slot) => {
            slot.disabled = false;
            slot.classList.remove('unavailable');
        });

        if (!dateInput.value) {
            setMessage(availabilityMessage, 'Choose a date to see available times.', false);
            return;
        }

        setMessage(availabilityMessage, 'Checking available times...', false);
        unsubscribeSlots = onSnapshot(
            query(collection(db, 'bookingSlots'), where('date', '==', dateInput.value)),
            (snapshot) => {
                reservedTimes = new Set(snapshot.docs.map((slot) => slot.data().time));
                refreshSlots();
                setMessage(availabilityMessage, 'Unavailable times are greyed out.', false);
            },
            (error) => {
                console.error('Could not load reserved booking times.', error);
                setMessage(availabilityMessage, 'Could not check availability. Please refresh and try again.', true);
            }
        );
        setMessage(availabilityMessage, 'Unavailable times are greyed out.', false);
    }

    slots.forEach((slot) => {
        slot.addEventListener('click', () => {
            if (slot.disabled) return;
            slots.forEach((otherSlot) => otherSlot.classList.remove('selected'));
            slot.classList.add('selected');
            timeInput.value = slot.dataset.time;
        });
    });
    dateInput.addEventListener('change', watchDate);
    watchDate();
}

function handleLoginPage() {
    const form = document.getElementById('login-form');
    if (!form) return;

    const message = document.getElementById('login-message');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        setMessage(message, '', false);
        const isAdminAttempt = event.submitter?.value === 'admin';
        isAdminSignIn = isAdminAttempt;

        try {
            const credential = await signInWithEmailAndPassword(
                auth,
                document.getElementById('login-email').value.trim(),
                document.getElementById('login-password').value
            );
            if (isAdminAttempt) {
                await credential.user.reload();
                const token = await credential.user.getIdTokenResult(true);
                const signedInEmail = credential.user.email?.trim().toLowerCase();
                if (!signedInEmail || !ADMIN_EMAILS.has(signedInEmail)) {
                    await signOut(auth);
                    throw new Error(
                        `The signed-in Firebase account is "${credential.user.email || 'unknown'}". ` +
                        `Admin access is currently allowed for: ${Array.from(ADMIN_EMAILS).join(', ')}.`
                    );
                }
                if (token.claims.email_verified !== true) {
                    stayOnLogin = true;
                    document.getElementById('resend-verification').hidden = false;
                    setMessage(message, 'Verify the administrator email address first. Use the button below to send a verification link.', true);
                    return;
                }

                window.location.href = 'admin.html';
                return;
            }

            await ensureUserProfile(credential.user);
            await setDoc(doc(db, 'users', credential.user.uid), {
                lastLoginAt: serverTimestamp()
            }, { merge: true });
        } catch (error) {
            setMessage(message, getErrorMessage(error), true);
        } finally {
            isAdminSignIn = false;
        }
    });

    document.getElementById('resend-verification')?.addEventListener('click', async () => {
        if (!auth.currentUser) return;
        try {
            await sendEmailVerification(auth.currentUser);
            await signOut(auth);
            stayOnLogin = false;
            document.getElementById('resend-verification').hidden = true;
            setMessage(message, 'Verification email sent. Verify your address, then sign in with the Admin Dashboard button.', false);
        } catch (error) {
            setMessage(message, getErrorMessage(error), true);
        }
    });

    const resetLink = form.querySelector('[data-reset-password]');
    resetLink?.addEventListener('click', async (event) => {
        event.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        if (!email) {
            setMessage(message, 'Enter your email address first, then choose Forgot password.', true);
            return;
        }

        try {
            await sendPasswordResetEmail(auth, email);
            setMessage(message, 'Password reset email sent. Check your inbox.', false);
        } catch (error) {
            setMessage(message, getErrorMessage(error), true);
        }
    });
}

function handleRegisterPage() {
    const form = document.getElementById('register-form');
    if (!form) return;

    const message = document.getElementById('register-message');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        setMessage(message, '', false);

        const username = document.getElementById('register-username').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (password !== confirmPassword) {
            setMessage(message, 'Passwords do not match.', true);
            return;
        }

        isRegistering = true;
        try {
            const credential = await createUserWithEmailAndPassword(auth, email, password);
            await sendEmailVerification(credential.user);
            await updateProfile(credential.user, { displayName: username });
            await ensureUserProfile(credential.user, username);
            window.location.href = 'index.html';
        } catch (error) {
            setMessage(message, getErrorMessage(error), true);
        } finally {
            isRegistering = false;
        }
    });
}

function handleLogout() {
    document.getElementById('logout-link')?.addEventListener('click', async (event) => {
        event.preventDefault();
        try {
            await signOut(auth);
            window.location.href = 'login.html';
        } catch (error) {
            window.alert(`Could not log out: ${getErrorMessage(error)}`);
        }
    });
}

function handleProfilePage(user, profile) {
    const usernameElement = document.getElementById('profile-user-username');
    const emailElement = document.getElementById('profile-user-email');
    const avatar = document.getElementById('profile-avatar');

    if (usernameElement) usernameElement.textContent = profile.username || 'Username';
    if (emailElement) emailElement.textContent = profile.email || user.email || 'Email';
    if (avatar) avatar.textContent = (profile.username || 'U').charAt(0).toUpperCase();

    handleProfileEdit(user, profile);

    const appointments = document.getElementById('appointments-list');
    if (!appointments) return;

    getDocs(query(collection(db, 'bookings'), where('userId', '==', user.uid)))
        .then((snapshot) => {
            appointments.replaceChildren();
            const bookings = snapshot.docs
                .map((booking) => booking.data())
                .sort((a, b) => String(a.preferredDate).localeCompare(String(b.preferredDate)));

            if (!bookings.length) {
                const row = appointments.insertRow();
                const cell = row.insertCell();
                cell.colSpan = 3;
                cell.textContent = 'No appointments yet.';
                return;
            }

            bookings.forEach((booking) => {
                const row = appointments.insertRow();
                row.insertCell().textContent = booking.preferredDate || 'Date pending';
                row.insertCell().textContent = booking.service || 'Service';
                const statusCell = row.insertCell();
                const status = document.createElement('span');
                status.className = 'status pending';
                status.textContent = booking.status || 'Pending';
                statusCell.append(status);
            });
        })
        .catch((error) => {
            console.error('Could not load appointments from Firestore.', error);
            const row = appointments.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 3;
            cell.textContent = 'Appointments could not be loaded. Please try again later.';
        });
}

function handleProfileEdit(user, profile) {
    const form = document.getElementById('profile-edit-form');
    if (!form || form.dataset.initialized === 'true') return;
    form.dataset.initialized = 'true';

    const usernameInput = document.getElementById('edit-username');
    const emailInput = document.getElementById('edit-email');
    const currentPasswordInput = document.getElementById('current-password');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-new-password');
    const message = document.getElementById('profile-edit-message');

    usernameInput.value = profile.username || '';
    emailInput.value = user.email || profile.email || '';
    currentPasswordInput.autocomplete = 'current-password';

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        setMessage(message, '', false);

        const username = usernameInput.value.trim();
        const email = emailInput.value.trim() || user.email || profile.email || '';
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        const usernameChanged = username !== (profile.username || '');
        const emailChanged = email.toLowerCase() !== (user.email || '').toLowerCase();
        const passwordChanged = newPassword.length > 0;

        if (!username) {
            setMessage(message, 'Username is required.', true);
            return;
        }
        if (!passwordChanged && confirmPassword) {
            setMessage(message, 'Enter a new password before confirming it.', true);
            return;
        }
        if (passwordChanged && newPassword !== confirmPassword) {
            setMessage(message, 'The new passwords do not match.', true);
            return;
        }
        if (!usernameChanged && !emailChanged && !passwordChanged) {
            setMessage(message, 'There are no changes to save.', false);
            return;
        }
        if ((emailChanged || passwordChanged) && !currentPasswordInput.value) {
            setMessage(message, 'Enter your current password to change your email or password.', true);
            return;
        }

        const submitButton = form.querySelector('[type="submit"]');
        submitButton.disabled = true;
        const completedChanges = [];
        let profileSaved = false;
        let verificationSent = false;
        let verificationError = '';

        try {
            if (emailChanged || passwordChanged) {
                if (!user.email) {
                    throw new Error('This account does not have an email address for password verification.');
                }
                const credential = EmailAuthProvider.credential(user.email, currentPasswordInput.value);
                await reauthenticateWithCredential(user, credential);
            }

            if (usernameChanged) {
                await updateProfile(user, { displayName: username });
                completedChanges.push('username');
            }

            if (emailChanged) {
                await updateEmail(user, email);
                completedChanges.push('email');
                await user.reload();
                await user.getIdToken(true);
            }

            await setDoc(doc(db, 'users', user.uid), {
                username,
                email: user.email,
                updatedAt: serverTimestamp()
            }, { merge: true });
            profileSaved = true;
            profile.username = username;
            profile.email = user.email;

            const usernameElement = document.getElementById('profile-user-username');
            const emailElement = document.getElementById('profile-user-email');
            const avatar = document.getElementById('profile-avatar');
            if (usernameElement) usernameElement.textContent = username;
            if (emailElement) emailElement.textContent = user.email;
            if (avatar) avatar.textContent = username.charAt(0).toUpperCase();

            if (emailChanged) {
                try {
                    await sendEmailVerification(user);
                    verificationSent = true;
                } catch (error) {
                    verificationError = getErrorMessage(error);
                }
            }

            if (passwordChanged) {
                await updatePassword(user, newPassword);
                completedChanges.push('password');
            }

            newPasswordInput.value = '';
            confirmPasswordInput.value = '';
            currentPasswordInput.value = '';
            if (verificationError) {
                setMessage(message, `Changes saved, but the verification email could not be sent: ${verificationError}`, true);
            } else if (emailChanged) {
                setMessage(message, 'Changes saved. Check your new email address for a verification link.', false);
            } else {
                setMessage(message, 'Your account information has been updated.', false);
            }
        } catch (error) {
            const details = [];
            if (completedChanges.length) {
                details.push(`${completedChanges.join(' and ')} updated in Firebase Authentication`);
            }
            if (profileSaved) {
                details.push('Firestore profile saved');
            } else if (completedChanges.length) {
                details.push('Firestore profile could not be synchronized');
            }
            if (emailChanged) {
                if (verificationError) {
                    details.push(`verification email could not be sent: ${verificationError}`);
                } else if (verificationSent) {
                    details.push('verification link sent to the new email address');
                } else if (!profileSaved) {
                    details.push('verification link was not sent because the Firestore profile could not be synchronized');
                }
            }
            if (passwordChanged && !completedChanges.includes('password')) {
                details.push('password was not updated');
            }
            details.push(getErrorMessage(error));
            setMessage(message, `${details.join('. ')}.`, true);
        } finally {
            submitButton.disabled = false;
        }
    });
}

function handleBookingForm(user, profile) {
    const form = document.getElementById('booking-form');
    if (!form) return;

    const message = document.getElementById('booking-message');
    handleBookingAvailability();

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        setMessage(message, '', false);

        const submitButton = form.querySelector('[type="submit"]');
        submitButton.disabled = true;

        try {
            const formData = new FormData(form);
            const cartItems = JSON.parse(formData.get('cart_items') || '[]');
            if (!Array.isArray(cartItems)) {
                throw new Error('The cart details are invalid. Please refresh the page and try again.');
            }

            const preferredDate = String(formData.get('date') || '');
            const preferredTime = String(formData.get('time') || '');
            if (!preferredDate || !preferredTime) {
                throw new Error('Choose a date and available time before submitting.');
            }

            const slotId = makeSlotId(preferredDate, preferredTime);
            const slotRef = doc(db, 'bookingSlots', slotId);
            const bookingRef = doc(collection(db, 'bookings'));
            await runTransaction(db, async (transaction) => {
                const slotSnapshot = await transaction.get(slotRef);
                if (slotSnapshot.exists()) {
                    throw new Error('That date and time is already booked. Please select another slot.');
                }

                transaction.set(bookingRef, {
                    userId: user.uid,
                    username: profile.username,
                    email: user.email,
                    phone: String(formData.get('phone') || '').trim(),
                    service: String(formData.get('service') || ''),
                    slotId,
                    preferredDate,
                    preferredTime,
                    notes: String(formData.get('notes') || '').trim(),
                    cartItems,
                    status: 'pending',
                    createdAt: serverTimestamp()
                });
                transaction.set(slotRef, {
                    bookingId: bookingRef.id,
                    date: preferredDate,
                    time: preferredTime,
                    createdAt: serverTimestamp()
                });
            });

            form.reset();
            updateBookingDetails(profile);
            document.querySelectorAll('.timeslot.selected').forEach((slot) => slot.classList.remove('selected'));
            setMessage(message, 'Your booking has been saved. We will contact you to confirm.', false);
        } catch (error) {
            setMessage(message, getErrorMessage(error), true);
        } finally {
            submitButton.disabled = false;
        }
    });
}

function handleContactForm(user, profile) {
    const form = document.querySelector('.contact-form');
    if (!form) return;

    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('femail');
    if (usernameInput && !usernameInput.value) usernameInput.value = profile.username || '';
    if (emailInput && !emailInput.value) emailInput.value = user.email || '';

    const message = document.getElementById('contact-message');
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        setMessage(message, '', false);

        const submitButton = form.querySelector('[type="submit"]');
        submitButton.disabled = true;

        try {
            const formData = new FormData(form);
            await addDoc(collection(db, 'contacts'), {
                userId: user.uid,
                username: String(formData.get('username') || '').trim(),
                email: user.email,
                phone: String(formData.get('fphone') || '').trim(),
                subject: String(formData.get('subject') || '').trim(),
                message: String(formData.get('message') || '').trim(),
                createdAt: serverTimestamp()
            });

            form.reset();
            if (usernameInput) usernameInput.value = profile.username || '';
            if (emailInput) emailInput.value = user.email || '';
            setMessage(message, 'Your message has been sent successfully.', false);
        } catch (error) {
            setMessage(message, getErrorMessage(error), true);
        } finally {
            submitButton.disabled = false;
        }
    });
}

clearLegacyAuthData();
handleLoginPage();
handleRegisterPage();
handleLogout();

onAuthStateChanged(auth, async (user) => {
    toggleProtectedUi(user);
    updateAdminLink(user);
    if (isRegistering || isAdminSignIn || stayOnLogin) return;

    if (!user) {
        redirectForAuthState(null);
        return;
    }

    try {
        const profile = await ensureUserProfile(user);
        redirectForAuthState(user);
        updateBookingDetails(profile);
        handleProfilePage(user, profile);
        handleBookingForm(user, profile);
        handleContactForm(user, profile);
    } catch (error) {
        console.error('Could not load or save the signed-in user profile in Firestore.', error);
        window.alert(`You are signed in, but your profile could not be loaded from Firestore: ${getErrorMessage(error)}`);
    }
});
