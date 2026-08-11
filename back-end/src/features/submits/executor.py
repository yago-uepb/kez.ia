import ast
import asyncio
import os
import subprocess
import sys


class CodeExecutor:
    def __init__(self):
        self.TIMEOUT_SECONDS = 5
        
        self.ALLOWED_STDLIB_MODULES = {
            "math",
            "random",
            "statistics",
            "collections",
            "itertools",
            "functools",
            "heapq",
            "bisect",
            "decimal",
        }
    
        self.ALLOWED_EXTERNAL_MODULES = {
            # "numpy", 
            # Adicionar posteriormente
        }
    
        self.BLOCKED_MODULES = {
            "os",
            "subprocess",
            "sys",
            "shutil",
            "socket",
            "urllib",
            "requests",
            "ctypes",
        }
    
        self.BLOCKED_FUNCTIONS = {
            "eval",
            "exec",
            "open",
            "compile",
            "__import__",
        }


    def allowed_modules(self):
        return (
            self.ALLOWED_STDLIB_MODULES
            | 
            self.ALLOWED_EXTERNAL_MODULES
        ) if self.ALLOWED_EXTERNAL_MODULES else self.ALLOWED_STDLIB_MODULES


    def is_code_safe(self, code):
        """
        Faz uma validação estática simples utilizando AST.

        A ideia não é criar uma sandbox de segurança completa,
        mas impedir o uso acidental/direto de módulos e funções
        que não fazem parte do ambiente didático.
        """

        try:
            tree = ast.parse(code)

        except SyntaxError:
            # Erros de sintaxe devem ser tratados pelo próprio
            # interpretador durante a execução.
            return True

        allowed_modules = self.allowed_modules()

        for node in ast.walk(tree):

            # --------------------------------------------------
            # import modulo
            #
            # Exemplo:
            # import math
            # import numpy
            # import numpy.linalg
            # --------------------------------------------------
            if isinstance(node, ast.Import):

                for alias in node.names:
                    module_name = alias.name.split(".")[0]

                    if module_name in self.BLOCKED_MODULES:
                        return False

                    if module_name not in allowed_modules:
                        return False

            # --------------------------------------------------
            # from modulo import ...
            #
            # Exemplo:
            # from math import sqrt
            # from numpy import array
            # --------------------------------------------------
            elif isinstance(node, ast.ImportFrom):

                if node.module is None:
                    # Import relativo, por exemplo:
                    # from .arquivo import alguma_coisa
                    return False

                module_name = node.module.split(".")[0]

                if module_name in self.BLOCKED_MODULES:
                    return False

                if module_name not in allowed_modules:
                    return False

            # --------------------------------------------------
            # Funções bloqueadas
            #
            # Exemplo:
            # eval(...)
            # exec(...)
            # open(...)
            # --------------------------------------------------
            elif (
                isinstance(node, ast.Call) 
                and isinstance(node.func, ast.Name) 
                and node.func.id in self.BLOCKED_FUNCTIONS
            ):
                return False

        return True


    def _build_environment(self):
        """
        Cria um ambiente mínimo para o subprocesso.
        """
        return {
            "PATH": os.environ.get("PATH", ""),
        }


    def _get_creation_flags(self):
        """
        Configura flags específicas para Windows.
        """
        if os.name == "nt":
            return (
                subprocess.CREATE_NEW_PROCESS_GROUP
                | subprocess.DETACHED_PROCESS
            )


    async def execute(
        self,
        code,
        input_data,
    ):
        if not self.is_code_safe(code):
            return {
                "success": False,
                "actual_output": "",
                "stderr": 
                    "Erro de Segurança: uso de módulos ou comandos não permitidos.",
                "returncode": -1,
                "timed_out": False,
            }

        try:
            process = await asyncio.to_thread(
                subprocess.run,
                [
                    sys.executable,
                    "-I",
                    "-c",
                    code,
                ],
                input=input_data,
                capture_output=True,
                text=True,
                timeout=self.TIMEOUT_SECONDS,
                check=False,
                env=self._build_environment(),
                creationflags=self._get_creation_flags(),
            )

        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "actual_output": "",
                "stderr": "Tempo limite excedido.",
                "returncode": -1,
                "timed_out": True,
            }

        return {
            "success": process.returncode == 0,
            "actual_output": self._normalize_output(
                process.stdout
            ),
            "stderr": process.stderr.strip(),
            "returncode": process.returncode,
            "timed_out": False,
        }


    @staticmethod
    def _normalize_output(output):
        """
        Normaliza a saída para evitar diferenças entre
        sistemas operacionais e espaços no final das linhas.
        """

        output = output.strip()
        output = output.replace("\r\n", "\n")

        lines = [
            line.rstrip()
            for line in output.splitlines()
        ]

        return "\n".join(lines)


    def compare_output(
        self,
        actual_output,
        expected_output,
    ):
        """
        Compara a saída produzida pelo aluno com a esperada.
        """

        actual = self._normalize_output(actual_output)
        expected = self._normalize_output(expected_output)

        return actual == expected


    async def run_case(
        self,
        code,
        case,
    ):
        input_data = case["input"].strip() + "\n"

        execution = await self.execute(
            code=code,
            input_data=input_data,
        )

        passed = (
            not execution["timed_out"]
            and execution["returncode"] == 0
            and self.compare_output(
                execution["actual_output"],
                case["expected_output"],
            )
        )

        return {
            "case": case,
            "passed": passed,
            "actual_output": execution["actual_output"],
            "stderr": execution["stderr"],
            "returncode": execution["returncode"],
            "timed_out": execution["timed_out"],
        }
