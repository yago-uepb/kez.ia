from pydantic import BaseModel, Field


class TestCase(BaseModel):
    input: str | None = None
    expected_output: str | None = None

class ExtractedQuestion(BaseModel):
    title: str = Field(min_length=3, max_length=255)
    description: str

class ExtractQuestionsResponse(BaseModel):
    is_exercise_list: bool
    reason: str | None = None
    questions: list[ExtractedQuestion] = Field(default_factory=list)



class SuggestTestCasesRequest(BaseModel):
    questions: list[ExtractedQuestion] = Field(min_length=1, max_length=30)

class QuestionWithTestCases(BaseModel):
    title: str = Field(min_length=3, max_length=255)
    description: str
    test_cases: list[TestCase] = Field(default_factory=list)

class SuggestTestCasesResponse(BaseModel):
    questions: list[QuestionWithTestCases]

