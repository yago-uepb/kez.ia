from typing import Annotated

from asyncpg import Connection
from fastapi import Depends

from src.features.ai.prompts import (
    SYSTEM_PROMPT_APPROVED_REVIEW,
    SYSTEM_PROMPT_FAILED_REVIEW,
)
from src.features.ai.service import AIService
from src.shared.dependencies import get_connection
from src.shared.exceptions import NotFoundException

from .executor import CodeExecutor
from .schemas import (
    AIReviewApprovedCase,
    AIReviewRejectedCase,
    FailedCase,
    SubmitRequest,
    SubmitResponse,
)


class SubmitService:
    def __init__(
        self,
        connection: Annotated[Connection, Depends(get_connection)],
        ai_service: Annotated[AIService, Depends(AIService)],
        code_executor: Annotated[CodeExecutor, Depends(CodeExecutor)],
    ):
        self.connection = connection
        self.ai_service = ai_service
        self.code_executor = code_executor

    async def _get_problem(
        self,
        problem_id,
    ):
        row = await self.connection.fetchrow(
            """
            SELECT
                id,
                title,
                description,
                input,
                expected_output
            FROM problems
            WHERE id = $1
            """,
            problem_id,
        )

        if not row:
            raise NotFoundException(
                "Exercício não encontrado"
            )

        return dict(row)


    async def _get_test_cases(
        self,
        problem_id,
        problem,
    ):
        rows = await self.connection.fetch(
            """
            SELECT
                input,
                expected_output
            FROM test_cases
            WHERE problem_id = $1
            ORDER BY id
            """,
            problem_id,
        )

        cases = [
            {
                "input": problem["input"] or "",
                "expected_output": (
                    problem["expected_output"] or ""
                ),
            }
        ]

        cases.extend(
            dict(row)
            for row in rows
        )

        return cases


    async def _run_test_cases(
        self,
        attempt,
        cases,
    ):
        """
        Executa os casos de teste em sequência.

        Retorna o primeiro caso que falhar.
        Caso todos sejam aprovados, retorna None.
        """

        for case in cases:
            result = await self.code_executor.run_case(
                code=attempt,
                case=case,
            )

            if not result["passed"]:
                return result

        return None


    async def _review_failed_submission(
        self,
        problem,
        attempt,
        failed_case,
    ):
        user_prompt = self.ai_service.build_user_prompt(
            problem["description"],
            attempt,
            failed_case,
        )

        ai_review = await self.ai_service.process_prompt(
            SYSTEM_PROMPT_FAILED_REVIEW,
            user_prompt,
            "code_review",
        )

        return SubmitResponse(
            status="rejected",
            failed_case=FailedCase(
                input=failed_case["case"]["input"],
                expected_output=(
                    failed_case["case"]["expected_output"]
                ),
                actual_output=failed_case["actual_output"],
            ),
            ai_review=AIReviewRejectedCase(
                category=ai_review.get("category"),
                exception=ai_review.get("exception"),
                explanation=ai_review.get("explanation"),
                lines=ai_review.get("lines"),
                suggestion=ai_review.get("suggestion"),
            ) if ai_review else None,
        )


    async def _review_approved_submission(
        self,
        problem,
        attempt,
    ):
        user_prompt = self.ai_service.build_user_prompt(
            problem["description"],
            attempt,
        )

        ai_review = await self.ai_service.process_prompt(
            SYSTEM_PROMPT_APPROVED_REVIEW,
            user_prompt,
            "code_review",
        )

        return SubmitResponse(
            status="approved",
            failed_case=None,
            ai_review=AIReviewApprovedCase(
                explanation=ai_review.get("explanation"),
                suggestion=ai_review.get("suggestion"),
            ) if ai_review else None,
        )


    async def review(self, data: SubmitRequest):
        """
        Fluxo principal de correção de uma submissão.

        1. Busca a questão.
        2. Busca os casos de teste.
        3. Executa a submissão.
        4. Interrompe no primeiro erro.
        5. Solicita análise à IA.
        6. Retorna o resultado.
        """
        problem_id = data.problem_id
        attempt = data.attempt

        problem = await self._get_problem(
            problem_id
        )

        cases = await self._get_test_cases(
            problem_id,
            problem,
        )

        failed_case = await self._run_test_cases(
            attempt,
            cases,
        )

        if failed_case is not None:
            return await self._review_failed_submission(
                problem,
                attempt,
                failed_case,
            )

        return await self._review_approved_submission(
            problem,
            attempt,
        )
