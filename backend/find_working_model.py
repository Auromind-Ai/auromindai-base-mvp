
import google.generativeai as genai
import os
from dotenv import load_dotenv
import time

load_dotenv()

api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    exit("No API Key")

genai.configure(api_key=api_key)

print(f"Testing API Key: {api_key[:5]}...")

working_models = []

try:
    print("Fetching model list...")
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            model_name = m.name.replace('models/', '')
            print(f"\n--- Testing {model_name} ---")
            try:
                model = genai.GenerativeModel(model_name)
                response = model.generate_content("Hi")
                print(f"SUCCESS! Response: {response.text}")
                working_models.append(model_name)
                # If we find one, we can stop or keep looking? Let's find ALL to be sure.
                # But to save time if we find one we might just start using it. 
                # Let's check a few.
            except Exception as e:
                print(f"FAILED: {e}")
            
            time.sleep(1) # Prevent rate limiting our check
except Exception as e:
    print(f"Fatal error listing models: {e}")

print("\n\n=== SUMMARY ===")
if working_models:
    print(f"Working models found: {working_models}")
else:
    print("No working models found.")
