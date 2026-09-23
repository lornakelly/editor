---
"@openworkflowspec/diagram-editor": minor
---

Add switch case support to task form generation. A switch task's `switch` array now renders one group per case, with an editable `when` and `then`; the case list itself stays fixed because the diagram draws it. Every other array in the schema (`run.container.arguments`, `listen.to.all`) is now edited as a structured YAML/JSON value rather than a plain text field, which previously replaced the whole array with a string when edited. Also fixes a plain string field rendering blank whenever its value was a `${...}` expression, which affected every task's `if`.
