import re
from pathlib import Path

from src.shared.classes import TestCase


def parse_expected_file(path: Path) -> list[TestCase]:
    """
    Parseia um arquivo no formato:

        Input:
        <entrada>
        Output: <saída esperada>

    separado por linhas em branco entre os blocos.
    """
    cases = []

    if not path.exists():
        print("Erro: arquivo inexistente")        
    else:
        content = path.read_text(encoding="utf-8")
        # Regex corrigido: captura o Input e o Output de forma direta,
        # parando apenas quando encontra o próximo INPUT ou o fim do arquivo.
        pattern = re.compile(
            r"INPUT:\s*(.*?)\s*OUTPUT:\s*(.*?)(?=\s*INPUT:|\Z)",
            re.DOTALL | re.IGNORECASE
        )
        
        for match in pattern.finditer(content):
            raw_input, raw_output = match.groups()
            cases.append(
                TestCase(
                    input_data=raw_input.strip(),
                    expected_output=raw_output.strip(),
                )
            )

    return cases
