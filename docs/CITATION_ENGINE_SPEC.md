# Scholarly Citation & Bibliography Engine Specification

ScholarForge AI features an academic Citation Style Language (CSL) formatting and verification engine compliant with universal academic referencing manuals:
1. **APA 7th Edition** (American Psychological Association)
2. **MLA 9th Edition** (Modern Language Association)
3. **Chicago 17th Edition** (Author-Date system)
4. **Harvard Referencing Standard**
5. **IEEE Standard** (Institute of Electrical and Electronics Engineers - Numbered brackets `[1]`)
6. **Vancouver Standard** (Uniform Requirements for Biomedical Manuscripts - Numbered parentheses `(1)`)

---

## 1. Citation In-Text Formats

The citation engine generates four in-text citation variants:

### A. Parenthetical Citations
- **Single Author (APA)**: `(Vaswani, 2017)`
- **Two Authors (APA)**: `(Vaswani & Shazeer, 2017)`
- **Three+ Authors (APA)**: `(Vaswani et al., 2017)`
- **MLA 9th**: `(Vaswani 45)`
- **IEEE**: `[1]`
- **Vancouver**: `(1)`

### B. Narrative Citations
- **Single Author (APA)**: `Vaswani (2017)`
- **Two Authors (APA)**: `Vaswani and Shazeer (2017)`
- **Three+ Authors (APA)**: `Vaswani et al. (2017)`
- **MLA 9th**: `Vaswani (45)`
- **IEEE**: `Vaswani et al. [1]`
- **Vancouver**: `Vaswani et al. (1)`

### C. Multi-Source Parenthetical Citations
- Multiple publications are grouped chronologically/alphabetically:
  `"(He et al., 2016; Vaswani et al., 2017)"`
- Numbered citations are compressed:
  `"[1, 2]"` or `"[1-3]"`

---

## 2. Full Bibliography Formatting Rules

Each citation style follows rigorous bibliographic syntax:

| Citation Style | Format Template |
| :--- | :--- |
| **APA 7th** | `Author, A. A., & Author, B. B. (Year). Title of article. Title of Periodical, Volume(Issue), pages. https://doi.org/doi` |
| **MLA 9th** | `Author, First, and Second Author. "Title of Article." Title of Journal, vol. Vol, no. Issue, Year, pp. Pages. DOI: doi.` |
| **Chicago 17th** | `Author, First, and Second Author. Year. "Title of Article." Title of Journal Volume (Issue): Pages. https://doi.org/doi.` |
| **Harvard** | `Author, A.A. and Author, B.B., Year. Title of article. Title of Journal, Volume(Issue), pp.pages.` |
| **IEEE** | `[1] A. A. Author and B. B. Author, "Title of article," Title of Periodical, vol. Vol, no. Issue, pp. Pages, Year.` |
| **Vancouver** | `1. Author AA, Author BB. Title of article. Title of Periodical. Year;Volume(Issue):Pages.` |

---

## 3. Tiptap Rich-Text Writing Editor Integration

In the central writing workspace, citations are rendered as semantically tagged HTML spans:

```html
<span 
  class="csl-citation font-semibold text-navy-900" 
  data-source-id="019a557c-29b1-7299-92f7-b2848c909e4c"
  data-style="APA_7TH"
  data-type="parenthetical">
  (Vaswani et al., 2017)
</span>
```

### Benefits:
1. **Dynamic Style Switching**: If a researcher changes project style from APA to IEEE, the manuscript spans reformat without losing source references.
2. **Automated Bibliography Generation**: The system scans all `data-source-id` attributes in the document sections, cross-checks attached sources, and generates the consolidated `References` section in alphabetical or numerical sequence.
3. **Ghost Reference & Discrepancy Prevention**: Citation audit verifies every in-text citation maps to a valid source in the project bibliography.

