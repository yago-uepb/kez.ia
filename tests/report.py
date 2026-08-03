from src.shared.classes import TestResult

def print_report(script_name: str, results: list[TestResult]) -> None:
    print(f"\n=== Resultado para {script_name} ===")
    for i, r in enumerate(results, start=1):
        status = "PASS" if r.passed else "FAIL"
        print(f"\nCaso {i}: {status}  (entrada: {r.case.input_data!r})")
        if r.timed_out:
            print("  -> timeout na execução")
        elif r.returncode != 0:
            print(f"  -> processo terminou com erro (código {r.returncode})")
            print(f"  -> stderr: {r.stderr.splitlines()[-1] if r.stderr else ''}")
        elif not r.passed:
            print(f"  -> esperado: {r.case.expected_output!r}")
            print(f"  -> obtido:   {r.actual_output!r}")

    total = len(results)
    passed = sum(r.passed for r in results)
    print(f"\n{passed}/{total} casos passaram.\n")
