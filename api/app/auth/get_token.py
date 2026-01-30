import requests

API_KEY = "AIzaSyB_2wjgcKqi-sherzc1ztuVIzl7-2QsJ1k"
email = "admin@test.com"
password = "Password123!"

url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}"

payload = {
    "email": email,
    "password": password,
    "returnSecureToken": True
}

response = requests.post(url, json=payload)

try:
    response.raise_for_status()
except requests.exceptions.HTTPError:
    print("Error:", response.json())  # <-- Shows Firebase's detailed error
    raise

data = response.json()
print("ID TOKEN:\n", data["idToken"])
