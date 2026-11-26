import os

# Tests must never use credentials from the developer's .env or call an LLM.
os.environ['NODE_ENV'] = 'test'
os.environ['GROQ_API_KEY'] = ''
os.environ['NVIDIA_API_KEY'] = ''
os.environ['OPENAI_API_KEY'] = ''
os.environ['AI_SERVICE_INTERNAL_TOKEN'] = 'isolated-test-token'
