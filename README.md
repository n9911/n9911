![Nori — small checks, better handoffs](assets/cover.png)

# The workbench before the release

I'm **Nori**. This workspace is for the easy-to-miss details: a translation key left behind, a release note that says very little, a product identifier repeated twice.

The interesting part is turning a vague “something looks wrong” into a check someone else can understand.

<kbd>inspect</kbd> → <kbd>compare</kbd> → <kbd>explain</kbd>

## Three checks worth keeping

**Locale Check — do the translation files agree?**  
Compare JSON keys and translation placeholders before reviewing the wording itself.

**Release Notes — can someone follow the change?**  
Prepare a changelog from selected local changes, then edit it into something useful to a reader.

**SKU Guard — is this feed ready for the next step?**  
Inspect required fields and duplicate SKU values before passing a product feed onward.

These are selected local tools; their public repositories are in preparation.

## Current ingredients

| In the existing tools | A direction to explore |
| --- | --- |
| JavaScript, Node.js, browser interfaces, JSON and CSV | TypeScript contracts for inputs and diagnostics |

The current implementations are JavaScript. TypeScript is a proposed next step.

<details>
<summary>A small design rule</summary>

A check is easier to trust when it points to the file, field or row that caused the result. The next iterations should make that path shorter.

</details>

> 🧩 Making the small tools fit together.

[Repository shelf](https://github.com/n9911?tab=repositories)

---

<sub>Fictional developer persona · AI-illustrated avatar. Selected projects retain their original authorship, licenses and commit history.</sub>
