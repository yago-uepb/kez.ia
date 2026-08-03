import asyncio
import subprocess
import sys

import asyncpg
from fastapi import Depends, HTTPException

from src.features.ai.ai_service import AIService
from src.shared.dependencies import get_connection, get_settings
from src.shared.prompts import (
    SYSTEM_PROMPT_APPROVED_REVIEW,
    SYSTEM_PROMPT_FAILED_REVIEW,
)


class SubmitService:
    def __init__(
        self, 
        settings=Depends(get_settings),
        connection: asyncpg.Connection = Depends(get_connection)
    ):
        self.connection = connection
        self.ai_service = AIService(settings=settings)
        self.TIMEOUT_SECONDS = 5


    async def run_case(self, attempt, case):
        try:
            proc = await asyncio.to_thread(
                subprocess.run,
                [sys.executable, attempt],
                input=case["input"] + "\n",
                capture_output=True,
                text=True,
                timeout=self.TIMEOUT_SECONDS,
                check=False
            )
        except subprocess.TimeoutExpired:
            return {
                "case": case,
                "passed": False,
                "actual_output": "",
                "stderr": "Tempo limite excedido",
                "returncode": -1,
                "timed_out": True,
            }

        actual = proc.stdout.strip()
        passed = actual == case["expected_output"] and proc.returncode == 0

        return {
            "case": case,
            "passed": passed,
            "actual_output": actual,
            "stderr": proc.stderr.strip(),
            "returncode": proc.returncode,
        }


    async def review(self, problem_id, attempt):
        exists = await self.connection.fetchrow(
            """
            SELECT 
                id, title, description, input, output
            FROM problems
            WHERE id = $1
            """, problem_id
        )

        if not exists:
            raise HTTPException(status_code=404, detail="Problem Not Found")

        problem = dict(exists)

        rows_cases = await self.connection.fetch(
            """
            SELECT 
                input, output 
            FROM test_cases 
            WHERE problem_id = $1 
            """, problem_id
        )

        cases = [
            { "input": problem["input"], "output": problem["output"] }, 
            *[dict(row) for row in rows_cases]
        ]

        qty_cases = len(cases)
        failed_case = None
        count = 0

        # Melhoria futura: busca e teste de cases em lotes

        while failed_case is None and count < qty_cases:
            current_case = await self.run_case(attempt, cases[count])
            if not current_case["passed"]:
                failed_case = current_case
            count += 1

        if failed_case:
            user_prompt = self.ai_service.build_user_prompt(problem["description"], attempt, failed_case)
            print(user_prompt)
            return await self.ai_service.review(SYSTEM_PROMPT_FAILED_REVIEW, user_prompt)

        user_prompt = self.ai_service.build_user_prompt(problem["description"], attempt)
        return await self.ai_service.review(SYSTEM_PROMPT_APPROVED_REVIEW, user_prompt)
