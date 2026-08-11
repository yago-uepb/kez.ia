import asyncio
import json
from typing import Annotated

from fastapi import Depends
from groq import AsyncGroq
from groq._exceptions import (
    APIError,
    APIResponseValidationError,
    APITimeoutError,
    BadRequestError,
    InternalServerError,
    RateLimitError,
)

from src.core.settings import Settings
from src.shared.dependencies import get_settings
from src.shared.exceptions import BadRequestException

from .extractor import ContentExtractor
from .prompts import (
    SYSTEM_PROMPT_EXTRACTION_QUESTIONS,
    SYSTEM_PROMPT_SUGGESTION_TEST_CASES,
)
from .schemas import (
    ExtractQuestionsResponse,
    QuestionWithTestCases,
    SuggestTestCasesRequest,
    SuggestTestCasesResponse,
)


class AIService:
    def __init__(
        self, 
        settings: Annotated[Settings, Depends(get_settings)],
        content_extractor: Annotated[ContentExtractor, Depends(ContentExtractor)],
    ):
        self.client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        self.content_extractor = content_extractor
        self.MODELS = {
            "code_review": "openai/gpt-oss-120b",
            # Requests: [30/minute, 1K/day] | Tokens: [8K/minute, 200K/day]
            "extract_questions": "llama-3.1-8b-instant",
            # Requests: [30/minute, 14.4K/day] | Tokens: [6K/minute, 500K/day]
            "suggest_test_cases": "llama-3.3-70b-versatile",
            # Requests: [30/minute, 1K/day] | Tokens: [12K/minute, 100K/day]
        }


    def build_user_prompt(self, problem_description, attempt, failed_case = None):
        return json.dumps(
            {
                "enunciado": problem_description,
                "codigo": attempt,
                "caso_malsucedido": {
                    "entrada": failed_case["case"]["input"],
                    "esperado": failed_case["case"]["expected_output"],
                    "obtido": failed_case["actual_output"],
                    "stderr": failed_case["stderr"],
                    "returncode": failed_case["returncode"],
                } if failed_case else None,
            },
            ensure_ascii=False,
            indent=2,
        )


    async def process_prompt(self, system_prompt, user_prompt, action):
        ai_model = self.MODELS[action]

        try:
            response = await self.client.chat.completions.create(
                model=ai_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
            )

            return json.loads(response.choices[0].message.content)
        except (
            APIError,
            APIResponseValidationError,
            APITimeoutError,
            BadRequestError,
            InternalServerError,
            RateLimitError
        ):
            return None


    async def _extract_content(self, content, mime_type):
        extractor = self.content_extractor.EXTRACTORS.get(mime_type)

        if extractor is None:
            raise BadRequestException(f"Nenhum extrator disponível para o tipo: {mime_type}")

        return await asyncio.to_thread(extractor, content)
    
    
    async def extract_questions(self, content, mime_type):
        ''' Extração de questões de algoritmos de um documento '''

        try:
            text = await self._extract_content(
                content, 
                mime_type
            )
        except Exception as e:
            raise BadRequestException(
                "Arquivo vazio, corrompido ou não corresponde ao tipo declarado"
            ) from e

        if not text:
            return ExtractQuestionsResponse(
                is_exercise_list=False,
                reason="Não foi possível extrair texto do arquivo.",
            )

        user_prompt = json.dumps(
            {"conteudo_documento": text}, 
            ensure_ascii=False, 
            indent=2
        )

        extracted_questions = await self.process_prompt(
            SYSTEM_PROMPT_EXTRACTION_QUESTIONS, 
            user_prompt, 
            "extract_questions"
        ) or {}

        return ExtractQuestionsResponse(
            is_exercise_list=extracted_questions.get("is_exercise_list"),
            reason=extracted_questions.get("reason"),
            questions=extracted_questions.get("questions", []) 
        )

    
    async def suggest_test_cases(self, data: SuggestTestCasesRequest):
        questions_with_id = [
            {
                "id": index, 
                "title": q.title, 
                "description": q.description
            }
            for index, q in enumerate(data.questions)
        ]

        user_prompt = json.dumps(
            {"questões": questions_with_id}, 
            ensure_ascii=False, 
            indent=2
        )

        ai_output = await self.process_prompt(
            SYSTEM_PROMPT_SUGGESTION_TEST_CASES, 
            user_prompt, 
            "suggest_test_cases"
        ) or {}

        suggested_test_cases = ai_output.get("suggestions", [])

        result = []
        for tc in suggested_test_cases:
            try:
                tc_id = tc.get("id")
                if tc_id is None:
                    continue
                
                question = questions_with_id[tc_id]

                result.append(
                    QuestionWithTestCases(
                        title=question["title"],
                        description=question["description"],
                        test_cases=tc.get("test_cases", [])
                    )
                )
            except (IndexError, TypeError):
                print("Erro ao sugerir casos de teste para uma das questões")

        return SuggestTestCasesResponse(
            questions=result
        )
