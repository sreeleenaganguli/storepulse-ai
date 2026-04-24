from google import genai
from google.genai import types
from config import GEMINI_API_KEY

client = genai.Client(api_key=GEMINI_API_KEY)

for model in ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash-001"]:
    try:
        r = client.models.generate_content(
            model=model,
            contents="Return this exact JSON: {\"status\": \"ok\", \"model\": \"working\"}",
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1,
            )
        )
        print(f"✅ {model}: {r.text.strip()}")
    except Exception as e:
        print(f"❌ {model}: {e}")