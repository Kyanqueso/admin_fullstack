import { createClient } from '@supabase/supabase-js' // now works in production via Vite bundle

const supabaseUrl = "https://dohhnithtdwtwkfwccag.supabase.co"
const supabaseKey = "sb_publishable_Tn2EFv2bbXbD9E6OxEwiLQ_VECvXrPr"
const supabase = createClient(supabaseUrl, supabaseKey)

async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
        console.error("Login error:", error)
        return false
    }

    if (!data.session || !data.session.access_token) {
        console.error("No access token returned", data)
        return false
    }

    localStorage.setItem('access_token', data.session.access_token)
    console.log('Logged in! Token:', data.session.access_token)
    return true
}

async function callBackend() {
    const token = localStorage.getItem('access_token')
    
    // CHANGE THIS BACK TO /protected
    const res = await fetch(`http://127.0.0.1:8000/protected`, { 
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
    })

    if (!res.ok) {
        // Log the actual error text from the backend so we see WHY it failed
        const errorText = await res.text(); 
        console.error('Backend rejected token:', res.status, errorText);
        return;
    }

    const data = await res.json();
    console.log('SUCCESS! Backend response:', data);
    alert("Authentication Working! User ID: " + data.user_id);
}

document.getElementById('login-btn').addEventListener('click', async () => {
    const email = document.getElementById('email').value
    const password = document.getElementById('password').value
    if (await login(email, password)) await callBackend()
})
