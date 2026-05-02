import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey)

// ========== CLEAR SESSION ON LOGIN PAGE LOAD ==========
// Only clear session if NOT an OAuth callback (to allow Google login to complete)
const hasOAuthToken = window.location.hash.includes('access_token') ||
    window.location.search.includes('code');

if (!hasOAuthToken) {
    await supabase.auth.signOut();
    localStorage.removeItem('access_token');
}

// ========== DOM ELEMENTS ==========
// Login
const loginBtn = document.getElementById('login-btn');
const errorAlert = document.getElementById('error-alert');
const successAlert = document.getElementById('success-alert');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const forgotPasswordLink = document.getElementById('forgot-password-link');
// const googleBtn = document.getElementById('google-btn'); // Google sign-in disabled for now

// Forgot Password Modal
const forgotModal = document.getElementById('forgotPasswordModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalError = document.getElementById('modal-error');
const modalSuccess = document.getElementById('modal-success');
const stepEmail = document.getElementById('step-email');
const stepOtp = document.getElementById('step-otp');
const stepPassword = document.getElementById('step-password');
const resetEmailInput = document.getElementById('reset-email');
const otpCodeInput = document.getElementById('otp-code');
const sendCodeBtn = document.getElementById('send-code-btn');
const verifyCodeBtn = document.getElementById('verify-code-btn');
const updatePasswordBtn = document.getElementById('update-password-btn');

// Modal helper functions
function showModal() {
    forgotModal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function hideModal() {
    forgotModal.classList.remove('show');
    document.body.style.overflow = '';
}

let resetEmail = '';

// ========== BRUTE FORCE STATE ==========
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_SECS = 30;
const OTP_MAX_ATTEMPTS = 5;
const OTP_LOCKOUT_SECS = 60;
const SEND_CODE_COOLDOWN_SECS = 60;

let loginAttempts = 0;
let otpAttempts = 0;

// Starts a countdown on `btn`, disabling it for `secs` seconds.
// `labelFn(remaining)` returns the button text during countdown.
// `resetLabel` is restored when the lockout ends.
function startCountdown(btn, secs, labelFn, resetLabel, onDone) {
    btn.disabled = true;
    let remaining = secs;
    btn.textContent = labelFn(remaining);
    const timer = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
            clearInterval(timer);
            btn.disabled = false;
            btn.textContent = resetLabel;
            if (onDone) onDone();
        } else {
            btn.textContent = labelFn(remaining);
        }
    }, 1000);
}

// Block emojis on all text inputs in real time
[emailInput, passwordInput, resetEmailInput, otpCodeInput,
    document.getElementById('new-password'), document.getElementById('confirm-password')]
    .forEach(el => blockEmojis(el));

// Block non-digits on OTP input in real time
otpCodeInput.addEventListener('input', () => {
    const cleaned = otpCodeInput.value.replace(/\D/g, '');
    if (cleaned !== otpCodeInput.value) otpCodeInput.value = cleaned;
});

// ========== INPUT VALIDATION ==========
const emojiRegex = /\p{Extended_Pictographic}/u;

function isValidInput(value) {
    return value.length <= 100
        && !/[\x00-\x1F\x7F]/.test(value)
        && !emojiRegex.test(value);
}

function blockEmojis(el) {
    el.addEventListener('input', () => {
        const original = el.value;
        const cleaned = original.replace(/\p{Extended_Pictographic}/gu, '');
        if (cleaned !== original) {
            let pos = null;
            try { pos = el.selectionStart; } catch { }
            el.value = cleaned;
            if (pos !== null) {
                const newPos = Math.max(0, pos - (original.length - cleaned.length));
                try { el.setSelectionRange(newPos, newPos); } catch { }
            }
        }
    });
}

// ========== ALERT HELPERS ==========
function showError(msg) {
    errorAlert.textContent = msg;
    errorAlert.classList.remove('d-none');
    successAlert.classList.add('d-none');
    loginBtn.disabled = false;
    loginBtn.textContent = "Login";
}

function showSuccess(msg) {
    successAlert.textContent = msg;
    successAlert.classList.remove('d-none');
    errorAlert.classList.add('d-none');
}

function clearAlerts() {
    errorAlert.classList.add('d-none');
    successAlert.classList.add('d-none');
}

function showModalError(msg) {
    modalError.textContent = msg;
    modalError.classList.remove('d-none');
    modalSuccess.classList.add('d-none');
}

function showModalSuccess(msg) {
    modalSuccess.textContent = msg;
    modalSuccess.classList.remove('d-none');
    modalError.classList.add('d-none');
}

function clearModalAlerts() {
    modalError.classList.add('d-none');
    modalSuccess.classList.add('d-none');
}

// ========== BACKEND VERIFICATION ==========
async function callBackend(checkAdmin = false) {
    const token = localStorage.getItem('access_token');
    const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";
    console.log("Backend URL:", backendUrl);
    // Use different endpoint for OAuth (Google) that checks admin table
    const endpoint = checkAdmin ? '/protected/oauth' : '/protected';

    const res = await fetch(`${backendUrl}${endpoint}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
    });

    if (!res.ok) {
        let errorMessage = "Server rejected login. Please contact admin.";

        try {
            const errorData = await res.json();
            if (res.status === 403) {
                errorMessage = errorData.detail || "Access denied. Your Google account is not authorized to access this admin portal.";
            } else if (res.status === 401) {
                errorMessage = errorData.detail || "Authentication failed. Please try again.";
            }
        } catch (e) {
            console.error('Error parsing response:', e);
        }

        console.error('Backend error:', res.status);
        throw new Error(errorMessage);
    }

    const data = await res.json();
    console.log('Backend verification success:', data);
}

// ========== EMAIL + PASSWORD LOGIN ==========
loginBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    clearAlerts();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showError("Please enter both email and password.");
        return;
    }

    if (!isValidInput(email) || !isValidInput(password)) {
        showError("Input must be 100 characters or fewer with no emojis.");
        return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = "Logging in...";

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) throw new Error(error.message);
        if (!data.session?.access_token) throw new Error("Login successful but no session was created.");

        loginAttempts = 0;
        localStorage.setItem('access_token', data.session.access_token);
        await callBackend();
        window.location.href = '../../views/analytics/analytics.html';

    } catch (err) {
        console.error(err);
        loginAttempts++;
        if (loginAttempts >= LOGIN_MAX_ATTEMPTS) {
            loginAttempts = 0;
            showError(`Too many failed attempts. Please wait ${LOGIN_LOCKOUT_SECS} seconds.`);
            startCountdown(
                loginBtn, LOGIN_LOCKOUT_SECS,
                s => `Try again in ${s}s`,
                "Login"
            );
        } else {
            showError(err.message || "An unexpected error occurred.");
        }
    }
});

// ========== FORGOT PASSWORD (IN-APP OTP FLOW) ==========

// Open modal
forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    clearModalAlerts();
    resetEmailInput.value = emailInput.value.trim();
    stepEmail.classList.remove('d-none');
    stepOtp.classList.add('d-none');
    stepPassword.classList.add('d-none');
    showModal();
});

// Close modal
closeModalBtn.addEventListener('click', () => {
    hideModal();
});

// Close modal when clicking overlay
forgotModal.querySelector('.custom-modal-overlay').addEventListener('click', () => {
    hideModal();
});

// Step 1: Send OTP
sendCodeBtn.addEventListener('click', async () => {
    clearModalAlerts();
    resetEmail = resetEmailInput.value.trim();

    if (!resetEmail) {
        showModalError("Please enter your email.");
        return;
    }

    if (!isValidInput(resetEmail)) {
        showModalError("Email must be 100 characters or fewer with no emojis.");
        return;
    }

    sendCodeBtn.disabled = true;
    sendCodeBtn.textContent = "Sending...";

    try {
        const { error } = await supabase.auth.signInWithOtp({
            email: resetEmail,
            options: { shouldCreateUser: false },
        });

        if (error) {
            const msg = error.message.toLowerCase();
            if (msg.includes('signups not allowed') || msg.includes('signup') || msg.includes('not allowed')) {
                throw new Error("No account found with that email address.");
            }
            throw new Error(error.message);
        }

        showModalSuccess("Code sent! Check your email.");
        stepEmail.classList.add('d-none');
        stepOtp.classList.remove('d-none');
        otpAttempts = 0;
        startCountdown(
            sendCodeBtn, SEND_CODE_COOLDOWN_SECS,
            s => `Resend in ${s}s`,
            "Send Code"
        );

    } catch (err) {
        showModalError(err.message);
        sendCodeBtn.disabled = false;
        sendCodeBtn.textContent = "Send Code";
    }
});

// Step 2: Verify OTP
verifyCodeBtn.addEventListener('click', async () => {
    clearModalAlerts();
    const code = otpCodeInput.value.trim();

    if (!/^\d{8}$/.test(code)) {
        showModalError("Please enter exactly 8 digits.");
        return;
    }

    verifyCodeBtn.disabled = true;
    verifyCodeBtn.textContent = "Verifying...";

    try {
        const { error } = await supabase.auth.verifyOtp({
            email: resetEmail,
            token: code,
            type: 'email',
        });

        if (error) throw new Error(error.message);

        otpAttempts = 0;
        showModalSuccess("Verified! Set your new password.");
        stepOtp.classList.add('d-none');
        stepPassword.classList.remove('d-none');

    } catch (err) {
        otpAttempts++;
        if (otpAttempts >= OTP_MAX_ATTEMPTS) {
            otpAttempts = 0;
            showModalError(`Too many failed attempts. Please wait ${OTP_LOCKOUT_SECS} seconds.`);
            startCountdown(
                verifyCodeBtn, OTP_LOCKOUT_SECS,
                s => `Try again in ${s}s`,
                "Verify Code"
            );
        } else {
            showModalError(err.message);
            verifyCodeBtn.disabled = false;
            verifyCodeBtn.textContent = "Verify Code";
        }
    }
});

// Step 3: Update password
updatePasswordBtn.addEventListener('click', async () => {
    clearModalAlerts();
    const newPassword = document.getElementById('new-password').value.trim();
    const confirmPassword = document.getElementById('confirm-password').value.trim();

    if (!newPassword || !confirmPassword) {
        showModalError("Please fill in both fields.");
        return;
    }

    if (newPassword !== confirmPassword) {
        showModalError("Passwords do not match.");
        return;
    }

    if (newPassword.length < 8) {
        showModalError("Password must be at least 8 characters.");
        return;
    }

    if (!isValidInput(newPassword)) {
        showModalError("Password must be 100 characters or fewer with no emojis.");
        return;
    }

    updatePasswordBtn.disabled = true;
    updatePasswordBtn.textContent = "Updating...";

    try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });

        if (error) throw new Error(error.message);

        showModalSuccess("Password updated! You can now log in.");

        setTimeout(async () => {
            hideModal();
            await supabase.auth.signOut();
        }, 2000);

    } catch (err) {
        showModalError(err.message);
    } finally {
        updatePasswordBtn.disabled = false;
        updatePasswordBtn.textContent = "Update Password";
    }
});

// ========== GOOGLE LOGIN (disabled for now) ==========
// googleBtn.addEventListener('click', async () => {
//     clearAlerts();
//
//     // Check if running in Electron
//     if (window.electronAPI?.googleOAuth) {
//         googleBtn.disabled = true;
//         googleBtn.textContent = "Signing in...";
//
//         try {
//             const result = await window.electronAPI.googleOAuth();
//
//             if (!result?.access_token) {
//                 googleBtn.disabled = false;
//                 googleBtn.textContent = "Sign in with Google";
//                 return; // User closed the popup
//             }
//
//             // Set the session in Supabase using the tokens
//             const { error } = await supabase.auth.setSession({
//                 access_token: result.access_token,
//                 refresh_token: result.refresh_token,
//             });
//
//             if (error) throw new Error(error.message);
//
//             localStorage.setItem('access_token', result.access_token);
//             await callBackend(true); // Check admin whitelist
//             window.location.href = '../../views/analytics/analytics.html';
//
//         } catch (err) {
//             console.error(err);
//             showError(err.message || "Google sign-in failed.");
//             await supabase.auth.signOut();
//             localStorage.removeItem('access_token');
//         } finally {
//             googleBtn.disabled = false;
//             googleBtn.textContent = "Sign in with Google";
//         }
//     } else {
//         // Fallback for non-Electron (e.g., browser testing)
//         const { error } = await supabase.auth.signInWithOAuth({
//             provider: 'google',
//         });
//         if (error) showError(error.message);
//     }
// });