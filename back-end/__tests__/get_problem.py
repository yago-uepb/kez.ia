import asyncio

import requests

from src.core.settings import settings

api_url = settings.API_MAIN_URL
problem_id = 2

async def get_problem():
    return await asyncio.to_thread(
        requests.get, 
        f"{api_url}/problems/{problem_id}",
        headers={
            "accept": "application/json"
        }
    )

response = asyncio.run(get_problem())

if response.status_code == 200:
    result = response.json()
    print(f"EXERCÍCIO #{result["id"]}")
    print("-"*30)
    print(f"{result["title"]}")
    print(f"{result["description"]}")
    print("-"*30)
    print(f"Entrada: {result["input"]}")
    print(f"Saída Esperada: {result["expected_output"]}")
