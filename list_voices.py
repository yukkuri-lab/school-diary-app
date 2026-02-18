import os
import requests
import json

api_key = None
try:
    with open(".env", "r") as f:
        for line in f:
            if line.startswith("VITE_GOOGLE_CLOUD_API_KEY="):
                api_key = line.split("=", 1)[1].strip()
                break
except FileNotFoundError:
    print(".env file not found")
    exit(1)

if not api_key:
    print("API Key not found in .env")
    exit(1)

url = f"https://texttospeech.googleapis.com/v1/voices?key={api_key}&languageCode=ja-JP"
try:
    response = requests.get(url)
    if response.status_code == 200:
        voices = response.json().get('voices', [])
        print(f"Total voices found: {len(voices)}")
        neural_voices = [v for v in voices if 'Wavenet' in v['name']]
        for v in neural_voices:
            gender = v.get('ssmlGender', 'UNKNOWN')
            print(f"Name: {v['name']}, Gender: {gender}")
    else:
        print(f"Error: {response.status_code} - {response.text}")
except Exception as e:
    print(f"Request failed: {e}")
