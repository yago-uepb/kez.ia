from fastapi import HTTPException


class AppException(HTTPException):
    def __init__(self, status_code, detail):
        super().__init__(status_code=status_code, detail=detail)

class BadRequestException(AppException):
    def __init__(self, detail = "Requisição mal feita"):
        super().__init__(400, detail)

class NotFoundException(AppException):
    def __init__(self, detail = "Recurso não encontrado"):
        super().__init__(404, detail)

class ConflictException(AppException):
    def __init__(self, detail = "Recurso existente"):
        super().__init__(409, detail)

class UnsupportedMediaTypeException(AppException):
    def __init__(self, detail = "Tipo de arquivo não suportado"):
        super().__init__(415, detail)

class ValidationException(AppException):
    def __init__(self, detail = "Validation Error"):
        super().__init__(422, detail)

class InternalServerException(AppException):
    def __init__(self, detail = "Internal Server Error"):
        super().__init__(500, detail)
