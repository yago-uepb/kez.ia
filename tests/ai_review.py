"""
Etapa 2 do pipeline: perspectiva da IA.
Recebe os TestResult já calculados pelo main.py (nenhuma execução de
código acontece aqui) e monta uma chamada estruturada ao modelo.

Requer a variável de ambiente AI_API_KEY para rodar de verdade.
"""

import json

from groq import Groq

from src.shared.classes import TestResult
from src.shared.constants import BASE_DIR, SYSTEM_PROMPT
from tests.run import run_all


def build_user_prompt(statement: str, code: str, results: list[TestResult]) -> str:
    failures = [r for r in results if not r.passed]
    failures_summary = []

    for r in failures:
        failures_summary.append(
            {
                "entrada": r.case.input_data,
                "esperado": r.case.expected_output,
                "obtido": r.actual_output,
                "stderr": r.stderr,
                "returncode": r.returncode,
            }
        )

    return json.dumps(
        {
            "enunciado": statement,
            "codigo_do_aluno": code,
            "falhas": failures_summary,
        },
        ensure_ascii=False,
        indent=2,
    )


def call_ai(system_prompt: str, user_prompt: str) -> dict:
    client = Groq()
    response = client.chat.completions.create(
        model="openai/gpt-oss-120b", # 10
        # # Requests: [30 / minute, 1K / day]
        # # Tokens: [8K / minute, 200K / day]
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        response_format={"type": "json_object"},
    )

    return json.loads(response.choices[0].message.content)


def review(script_name: str) -> dict:
    statement = (BASE_DIR / "tests/mocks/problem_statement.txt").read_text(encoding="utf-8")
    code = (BASE_DIR / script_name).read_text(encoding="utf-8")
    results = run_all(script_name)

    if all(r.passed for r in results):
        return {"category": "APROVADO", "explanation": "Todos os casos passaram."}

    user_prompt = build_user_prompt(statement, code, results)
    return call_ai(SYSTEM_PROMPT, user_prompt)
