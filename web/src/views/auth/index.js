import { createClient } from '@supabase/supabase-js' 

const supabaseUrl = "https://dohhnithtdwtwkfwccag.supabase.co"
const supabaseKey = "sb_publishable_Tn2EFv2bbXbD9E6OxEwiLQ_VECvXrPr" // Make sure this is your ANON key
const supabase = createClient(supabaseUrl, supabaseKey)

// DOM Elements
const loginBtn = document.getElementById('login-btn');
const errorAlert = document.getElementById('error-alert');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');

// Helper to show errors
function showError(message) {
    errorAlert.textContent = message;
    errorAlert.classList.remove('d-none');
    
    // Reset button state
    loginBtn.disabled = false;
    loginBtn.textContent = "Login";
}

// Helper to clear errors
function clearError() {
    errorAlert.classList.add('d-none');
    errorAlert.textContent = "";
}

async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    
    if (error) {
        // Supabase returns specific error messages (e.g. "Invalid login credentials")
        throw new Error(error.message);
    }

    if (!data.session || !data.session.access_token) {
        throw new Error("Login successful but no session was created.");
    }

    localStorage.setItem('access_token', data.session.access_token);
    return data.session;
}

async function callBackend() {
    const token = localStorage.getItem('access_token');
    
    // CHANGE THIS BACK TO /protected or your user-data route
    const res = await fetch(`http://127.0.0.1:8000/protected`, { 
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
    });

    if (!res.ok) {
        // If backend rejects us (e.g. 401), throw an error
        const errorText = await res.text(); 
        console.error('Backend error:', res.status, errorText);
        throw new Error("Server rejected login. Please contact admin.");
    }

    const data = await res.json();
    console.log('Backend verification success:', data);
}

// Main Event Listener
loginBtn.addEventListener('click', async (e) => {
    e.preventDefault(); // Prevent form submission refresh
    clearError();

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    // Client-side validation
    if (!email || !password) {
        showError("Please enter both email and password.");
        return;
    }

    // Set Loading State
    loginBtn.disabled = true;
    loginBtn.textContent = "Logging in...";

    try {
        // Attempt Supabase Login
        await login(email, password);

        // Verify with Backend (Optional, but good practice)
        await callBackend();

        // Redirect on Success
        window.location.href = '../../views/analytics/analytics.html'; 

    } catch (err) {
        console.error(err);
        showError(err.message || "An unexpected error occurred.");
    }
});