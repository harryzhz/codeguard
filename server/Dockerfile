FROM python:3.12-slim AS base

WORKDIR /app

RUN pip install --no-cache-dir --upgrade pip

COPY pyproject.toml .
RUN pip install --no-cache-dir .

COPY . .

EXPOSE 9527

CMD ["uvicorn", "app.main:create_app", "--factory", "--host", "0.0.0.0", "--port", "9527"]
