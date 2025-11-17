# aspectsofyou-endpoint
## Database Schema

- **Tables** and main columns (created by migrations):
	- **`Surveys`**: `SurveyId (GUID, PK)`, `Title (text)`
	- **`Questions`**: `QuestionId (GUID, PK)`, `QuestionText (text)`, `QuestionType (int)`, `OrderIndex (int)`, `SurveyId (GUID, FK -> Surveys)`
	- **`Answers`**: `AnswerID (GUID, PK)`, `AnswerText (text)`, `ExtraText (bool)`, `QuestionId (GUID, FK -> Questions)`
	- **`Responses`**: `ResponseId (GUID, PK)`, `Date (date)`, `Additional (text, nullable)`, `SurveyId (GUID, FK -> Surveys)`, `QuestionId (GUID, FK -> Questions)`, `AnswerId (GUID, FK -> Answers)`
	- **`Users`**: `UserId (GUID, PK)`, `Username`, `PasswordHash`, `CanCreateSurveys (bool)`

- **Relationships**:
	- `Survey` 1..* `Question`
	- `Question` 1..* `Answer`
	- `Survey` 1..* `Response` and `Question` 1..* `Response` and `Answer` 1..* `Response` (each response links a survey/question/answer)

## DTOs

Below are the DTOs exposed/consumed by the endpoints (property types shown):

- `CreateSurveyDto`
	- `Title : string`
	- `Questions : List<CreateQuestionDto>`

- `SurveyDto`
	- `SurveyId : Guid`
	- `Title : string`
	- `Questions : List<QuestionDto>`

- `CreateQuestionDto`
	- `QuestionText : string`
	- `QuestionType : int` (0 = single choice, 1 = multiple choice, 2 = open-ended)
	- `Answers : List<CreateAnswerDto>`

- `QuestionDto`
	- `QuestionId : Guid`
	- `QuestionText : string`
	- `QuestionType : int`
	- `OrderIndex : int` (position in survey)
	- `Answers : List<AnswerDto>`

- `CreateAnswerDto`
	- `AnswerText : string`
	- `ExtraText : bool` (if selecting this answer accepts additional free text)

- `AnswerDto`
	- `AnswerId : Guid`
	- `AnswerText : string`
	- `ExtraText : bool`

- `CreateResponseDto`
	- `SurveyId : Guid`
	- `QuestionId : Guid`
	- `AnswerId : Guid`
	- `Additional : string?` (open text for extra responses)

- `ResponseDto`
	- `ResponseId : Guid`
	- `Date : DateOnly`
	- `Additional : string?`
	- `SurveyId : Guid`
	- `QuestionId : Guid`
	- `AnswerId : Guid`

- `ResponseCountDto` (aggregation shape returned by responseCounts)
	- `QuestionId : Guid`
	- `QuestionText : string`
	- `AnswerId : Guid` (for open-ended answers this will be `00000000-0000-0000-0000-000000000000`)
	- `AnswerText : string` (or response text for open questions)
	- `Count : int`

## API Endpoints

- `POST /api/surveys`
	- Request body: `CreateSurveyDto`
	- Creates a `Survey` with nested `Question`s and `Answer`s. `OrderIndex` is assigned by server based on input order.

- `GET /api/surveys`

- `GET /api/surveys/{id}`

- `POST /api/responses`
	- Request body: `CreateResponseDto`
	- Adds a response row with server-side `Date = UTC now`.

- `GET /api/surveys/{surveyId}/responses`
	-  `List<ResponseDto>` for the survey.

- `GET /api/questions/{questionId}/responses`
	- `List<ResponseDto>` for the question.

- `GET /api/surveys/{surveyId}/responseCounts`
	- Grouped counts per answer for multiple-choice questions, plus grouped open-ended responses.

- `DELETE /api/surveys/delete/{id}`
	- Deletes the survey (current implementation removes the `Survey`; related deletes are in-progress / commented).

## Running Locally

- Requirements: .NET SDK (matching project target, e.g. .NET 9.0), PostgreSQL (or other DB matching `UseNpgsql`).
- Important environment variable / configuration:
	- `ConnectionStrings:AspectContext` in `appsettings.json` (example uses Npgsql/Postgres).

- Common commands (from repository root):
	- Run migrations and start API (in project folder):

```bash
cd aspectsofyou-endpoint
dotnet run
```