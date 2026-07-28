# 0001 - Fail Fast For AI Configuration

Status: Accepted

We should fail fast when AI configuration is invalid instead of letting the app continue with a confusing downstream provider error.

Rules:
- Normalize the Gemini model name at startup.
- Reject any model value that is not a plain Gemini model id.
- Surface a direct config error instead of retrying or masking the problem with a fallback response.
- Use a separate, larger `AI_TEST_PAPER_MAX_OUTPUT_TOKENS` budget for generated test papers.
- If Gemini cuts off a response before valid JSON is complete, surface that directly instead of trying to parse or repair partial output.

Reason:
- This makes AI failures easier to debug.
- It prevents placeholder behavior from hiding a real configuration problem.
- It keeps Teach Me and Test Me honest about whether the provider is actually usable.
