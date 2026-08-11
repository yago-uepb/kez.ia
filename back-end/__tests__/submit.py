import asyncio
import json
import sys
from pathlib import Path

import requests

from src.core.settings import settings

from .get_problem import problem_id

api_url = settings.API_MAIN_URL

root = Path(__file__).parent

attempt_path = root / "attempt.py"

content = attempt_path.read_text(encoding="utf-8")

async def submit():
    return await asyncio.to_thread(
        requests.post, 
        f"{api_url}/submits",
        json={
            "problem_id": problem_id,
            "attempt": content,
        },
        headers={
            "accept": "application/json"
        }
    )

response = asyncio.run(submit())

if response is not None:
    if response.status_code != 200:
        print(f"\033[31m[ERRO DA API - STATUS {response.status_code}]\033[0m")
        try:
            # Tenta mostrar o erro detalhado enviado pelo servidor
            print("Resposta do Servidor:", json.dumps(response.json(), indent=2, ensure_ascii=False))
        except ValueError:
            print("Conteúdo bruto da resposta:", response.text)
        sys.exit(1)

    try:
        result = response.json()
    except ValueError:
        print("\033[31m[ERRO DE PARSING]\033[0m A API respondeu 200, mas o corpo não era um JSON válido.")
        sys.exit(1)

    if result.get("status") == "approved":
        ai_review = result.get("ai_review") or {}

        print("Status: \033[032mAPROVADO\033[0m")
        print("-" * 30)
        print("REVISÃO DA IA")
        print(f"Explicação: {ai_review.get('explanation')}")
        print(f"Sugestão: {ai_review.get('suggestion')}")

    else:
        failed_case = result.get("failed_case") or {}
        ai_review = result.get("ai_review") or {}

        print("Status: \033[031mREPROVADO\033[0m")
        print("-" * 30)

        print("INFORMAÇÕES APURADAS:")
        print(f"Entrada: {failed_case.get('input')}")
        print(f"Saída Esperada: {failed_case.get('expected_output')}")
        print(f"Saída Real: {failed_case.get('actual_output')}")

        print("-" * 30)
        print("REVISÃO DA IA")
        print(f"Categoria de Rejeição: {ai_review.get('category')}")
        print(f"Exceção Disparada: {ai_review.get('exception')}")
        print(f"Explicação: {ai_review.get('explanation')}")
        print(f"Erro(s) Possivelmente nas Linha(s): {ai_review.get('lines')}")
        print(f"Sugestão: {ai_review.get('suggestion')}")
