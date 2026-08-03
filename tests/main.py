"""
Etapa 1 do pipeline: execução e validação.
Nenhuma IA envolvida ainda -- só rodar o código do aluno contra os
casos de teste e dizer se bateu ou não.
"""

import json
import os

from dotenv import load_dotenv

from tests.ai_review import review

if __name__ == "__main__":
    # Se o arquivo for importado como um módulo em outro script, esse bloco será ignorado
    load_dotenv()

    if os.environ.get("GROQ_API_KEY") is None:
        print("Defina GROQ_API_KEY para rodar esta etapa de verdade.")
    else:
        path = "tests/mocks/attempt.py"
        print(json.dumps(review(path), ensure_ascii=False, indent=2))
