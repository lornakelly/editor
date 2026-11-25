---
"@openworkflowspec/text-editor": minor
"@openworkflowspec/dual-editor": patch
---

`TextEditor` takes an optional `themeColors` prop: Monaco colour overrides per colour mode on top of `vs`/`vs-dark` (Monaco's theme is global to the page). The dual editor uses it to give the code pane the diagram's slate surfaces instead of Monaco's grey, and its divider shows a hairline at rest.
