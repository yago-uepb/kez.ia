
import json

from groq import AsyncGroq


class AIService:
    def __init__(self, settings):
        self.client = AsyncGroq(api_key=settings.GROQ_API_KEY)


    def build_user_prompt(self, problem_description, attempt, failed_case=None):
        return json.dumps(
            {
                "enunciado": problem_description,
                "codigo": attempt,
                "caso_malsucedido": {
                    "entrada": failed_case["case"]["input_data"],
                    "esperado": failed_case["case"]["expected_output"],
                    "obtido": failed_case["actual_output"],
                    "stderr": failed_case["stderr"],
                    "returncode": failed_case["returncode"],
                } if failed_case else None,
            },
            ensure_ascii=False,
            indent=2,
        )


    async def review(self, system_prompt, user_prompt):
        response = await self.client.chat.completions.create(
            model="openai/gpt-oss-120b",
            # Requests: [30/minute, 1K/day]
            # Tokens:   [8K/minute, 200K/day]
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"},
        )

        return json.loads(response.choices[0].message.content)


    def read_pdf():
        pass
