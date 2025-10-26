-- Add deployment categorization and VRAM requirements to models table
-- Transform from price-based to deployment-based model selection

-- Add new columns
ALTER TABLE models
ADD COLUMN deployment_type TEXT,
ADD COLUMN model_size TEXT,
ADD COLUMN parameter_count TEXT,
ADD COLUMN vram_fp16_gb NUMERIC(6,2),
ADD COLUMN vram_8bit_gb NUMERIC(6,2),
ADD COLUMN vram_4bit_gb NUMERIC(6,2);

-- Add constraints
ALTER TABLE models
ADD CONSTRAINT deployment_type_check CHECK (deployment_type IN ('on-prem', 'cloud-only')),
ADD CONSTRAINT model_size_check CHECK (model_size IN ('small', 'medium', 'large') OR model_size IS NULL);

-- Categorize existing models

-- SMALL ON-PREM (7-8B): 16-32GB VRAM
UPDATE models SET
  deployment_type = 'on-prem',
  model_size = 'small',
  parameter_count = '8B',
  vram_fp16_gb = 16.0,
  vram_8bit_gb = 8.0,
  vram_4bit_gb = 4.0
WHERE name = 'llama-3.1-8b-instruct:free';

UPDATE models SET
  deployment_type = 'on-prem',
  model_size = 'small',
  parameter_count = '7B',
  vram_fp16_gb = 14.0,
  vram_8bit_gb = 7.0,
  vram_4bit_gb = 3.5
WHERE name = 'mistral-7b-instruct:free';

UPDATE models SET
  deployment_type = 'on-prem',
  model_size = 'small',
  parameter_count = '7B',
  vram_fp16_gb = 14.0,
  vram_8bit_gb = 7.0,
  vram_4bit_gb = 3.5
WHERE name = 'deepseek-chat' AND price_in = 0.00000014;

-- MEDIUM ON-PREM (30-49B): 64-98GB VRAM
UPDATE models SET
  deployment_type = 'on-prem',
  model_size = 'medium',
  parameter_count = '49B',
  vram_fp16_gb = 98.0,
  vram_8bit_gb = 49.0,
  vram_4bit_gb = 24.5
WHERE name = 'llama-3.3-nemotron-super-49b-v1.5';

UPDATE models SET
  deployment_type = 'on-prem',
  model_size = 'medium',
  parameter_count = '32B',
  vram_fp16_gb = 64.0,
  vram_8bit_gb = 32.0,
  vram_4bit_gb = 16.0
WHERE name = 'qwq-32b-preview';

-- LARGE ON-PREM (70-80B): 140-160GB VRAM
UPDATE models SET
  deployment_type = 'on-prem',
  model_size = 'large',
  parameter_count = '70B',
  vram_fp16_gb = 140.0,
  vram_8bit_gb = 70.0,
  vram_4bit_gb = 35.0
WHERE name = 'llama-3.3-70b-instruct';

UPDATE models SET
  deployment_type = 'on-prem',
  model_size = 'large',
  parameter_count = '80B',
  vram_fp16_gb = 160.0,
  vram_8bit_gb = 80.0,
  vram_4bit_gb = 40.0
WHERE name = 'qwen3-next-80b-a3b-instruct';

UPDATE models SET
  deployment_type = 'on-prem',
  model_size = 'large',
  parameter_count = '70B',
  vram_fp16_gb = 140.0,
  vram_8bit_gb = 70.0,
  vram_4bit_gb = 35.0
WHERE name = 'hermes-4-70b';

-- CLOUD ONLY (All proprietary models)
UPDATE models SET
  deployment_type = 'cloud-only',
  model_size = NULL,
  parameter_count = 'Proprietary',
  vram_fp16_gb = NULL,
  vram_8bit_gb = NULL,
  vram_4bit_gb = NULL
WHERE deployment_type IS NULL;

-- Create index for efficient querying
CREATE INDEX idx_models_deployment ON models(deployment_type, model_size);

-- Update any free models that might have been missed
UPDATE models SET
  deployment_type = 'on-prem',
  model_size = 'small',
  parameter_count = '7B',
  vram_fp16_gb = 14.0,
  vram_8bit_gb = 7.0,
  vram_4bit_gb = 3.5
WHERE name = 'deepseek-chat:free' AND deployment_type IS NULL;
