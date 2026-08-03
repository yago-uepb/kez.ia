import re
import subprocess
import sys
from pathlib import Path

from src.shared.constants import BASE_DIR, TIMEOUT_SECONDS
from src.shared.classes import TestCase, TestResult
from tests.read import parse_expected_file


def run_case(script_path: Path, case: TestCase) -> TestResult:
    try:
        proc = subprocess.run(
            [sys.executable, str(script_path)],
            input=case.input_data + "\n",
            capture_output=True,
            text=True,
            timeout=TIMEOUT_SECONDS,
        )
    except subprocess.TimeoutExpired:
        return TestResult(
            case=case,
            passed=False,
            actual_output="",
            stderr="Tempo limite excedido",
            returncode=-1,
            timed_out=True,
        )

    actual = proc.stdout.strip()
    # o "> " do prompt do input() vai para stdout junto -- removemos a
    # primeira linha se ela contiver o prompt, para comparar só a saída real
    actual_clean = re.sub(r"^.*Informe um número:\s*", "", actual, flags=re.DOTALL).strip()

    passed = actual_clean == case.expected_output and proc.returncode == 0

    return TestResult(
        case=case,
        passed=passed,
        actual_output=actual_clean,
        stderr=proc.stderr.strip(),
        returncode=proc.returncode,
    )


def run_all(script_name: str) -> list[TestResult]:
    script_path = BASE_DIR / script_name
    cases = parse_expected_file(BASE_DIR / "tests/mocks/expected.txt")
    return [run_case(script_path, c) for c in cases]
