/*
 * Copyright 2021-Present The Open Workflow Specification Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * The subset of JSON Schema the panel reads.
 *
 * Deliberately hand-written and deliberately partial: it describes what this code *looks at*, not
 * what the DSL schema contains. Generating it from the schema would put a second copy of the spec
 * in the repo, which is the thing the whole engine is built to avoid — when DSL 1.0.4 ships the
 * only change here must be bumping the SDK.
 */
export interface JsonSchema {
  $ref?: string;
  type?: string;
  title?: string;
  description?: string;
  const?: unknown;
  enum?: unknown[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  additionalProperties?: boolean | JsonSchema;
  oneOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  allOf?: JsonSchema[];
}
