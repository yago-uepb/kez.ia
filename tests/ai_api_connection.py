import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
print("Chave carregada começa com:", str(os.environ.get("GEMINI_API_KEY"))[:5])

try:
    client = genai.Client()
    response = client.models.generate_content(
        model="gemini-3.5-flash",
        contents="Olá, responda apenas com a palavra 'Funcionou'.",
    )
    print("Sucesso! Resposta da IA:", response.text.strip())
except Exception as e:
    print("\nOcorreu um erro no teste:")
    print(type(e).__name__, ":", e)
