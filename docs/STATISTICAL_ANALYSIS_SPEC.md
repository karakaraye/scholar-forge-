# Deterministic Statistical Analysis Engine Specification

## 1. Overview & Anti-Hallucination Philosophy

The ScholarForge AI **Deterministic Statistical Analysis Engine** performs genuine mathematical computation on actual uploaded datasets.

> [!IMPORTANT]
> **Zero Mathematical Hallucination Guarantee**: Large language models (LLMs) are strictly prohibited from generating numbers, p-values, test statistics, degrees of freedom, effect sizes, or tables. Every numerical metric is calculated via pure deterministic Python algorithms before being presented to the researcher or passed as grounded context to the interpretation assistant.

---

## 2. Mathematical Foundation & Algorithmic Implementation

All statistical routines are implemented with pure Python standard library modules (`math`, incomplete beta and gamma functions) ensuring instant portability and zero runtime binary wheel compilation failures.

### 2.1 Descriptive Statistics & Distributional Shape
- **Central Tendency**: Mean ($\mu$), Median ($\tilde{x}$), Mode ($M_o$)
- **Dispersion**: Sample Variance ($s^2$), Standard Deviation ($s$), Range, Interquartile Range ($IQR = Q_3 - Q_1$)
- **Distributional Shape**:
  - Sample Skewness: $g_1 = \frac{n}{(n-1)(n-2)} \sum \left(\frac{x_i - \bar{x}}{s}\right)^3$
  - Sample Excess Kurtosis: $g_2 = \frac{n(n+1)}{(n-1)(n-2)(n-3)} \sum \left(\frac{x_i - \bar{x}}{s}\right)^4 - \frac{3(n-1)^2}{(n-2)(n-3)}$

### 2.2 Scale Reliability Analysis
- **Cronbach's Alpha ($\alpha$)**:
  $$\alpha = \frac{k}{k - 1} \left( 1 - \frac{\sum_{i=1}^k \sigma_{y_i}^2}{\sigma_X^2} \right)$$
  Where $k$ is the number of items, $\sigma_{y_i}^2$ is item variance, and $\sigma_X^2$ is the total composite scale variance.
- **Corrected Item-Total Correlations**: Pearson correlation between item score and total score excluding that item ($r_{i(total-i)}$).

### 2.3 Bivariate Association
- **Pearson Product-Moment Correlation ($r$)**:
  $$r = \frac{\sum (x_i - \bar{x})(y_i - \bar{y})}{\sqrt{\sum (x_i - \bar{x})^2 \sum (y_i - \bar{y})^2}}$$
  Exact two-tailed $p$-value calculated via Student's $t$ distribution with $df = n - 2$:
  $$t = r \sqrt{\frac{n - 2}{1 - r^2}}$$
- **Spearman Rank-Order Correlation ($\rho$)**:
  $$\rho = 1 - \frac{6 \sum d_i^2}{n(n^2 - 1)}$$
  Where $d_i = \text{rank}(x_i) - \text{rank}(y_i)$, adjusting for tied ranks.
- **Chi-Square Test of Independence ($\chi^2$)**:
  $$\chi^2 = \sum \frac{(O_{ij} - E_{ij})^2}{E_{ij}}$$
  With Cramer's $V$ effect size:
  $$V = \sqrt{\frac{\chi^2}{n \cdot \min(r - 1, c - 1)}}$$

### 2.4 Group Differences & Comparisons
- **Independent Samples $t$-Test**:
  - Levene's Test for Equality of Variances: Evaluates $F$-ratio on absolute deviations $|x_{ij} - \bar{x}_j|$.
  - Student's $t$ (equal variances):
    $$t = \frac{\bar{x}_1 - \bar{x}_2}{s_p \sqrt{\frac{1}{n_1} + \frac{1}{n_2}}}, \quad s_p = \sqrt{\frac{(n_1 - 1)s_1^2 + (n_2 - 1)s_2^2}{n_1 + n_2 - 2}}$$
  - Welch's $t$ (unequal variances):
    $$t = \frac{\bar{x}_1 - \bar{x}_2}{\sqrt{\frac{s_1^2}{n_1} + \frac{s_2^2}{n_2}}}$$
  - Effect Size: Cohen's $d = \frac{\bar{x}_1 - \bar{x}_2}{s_p}$
- **Paired Samples $t$-Test**:
  $$t = \frac{\bar{d}}{s_d / \sqrt{n}}$$
  Where $\bar{d}$ is the mean of difference scores and $s_d$ is the standard deviation of differences.
- **One-Way Analysis of Variance (ANOVA)**:
  $$SS_{\text{Total}} = SS_{\text{Between}} + SS_{\text{Within}}$$
  $$F = \frac{MS_{\text{Between}}}{MS_{\text{Within}}} = \frac{SS_{\text{Between}} / (k - 1)}{SS_{\text{Within}} / (N - k)}$$
  Effect Size: Eta-Squared $\eta^2 = \frac{SS_{\text{Between}}}{SS_{\text{Total}}}$
- **Mann-Whitney $U$ Test (Non-Parametric)**:
  $$U_1 = R_1 - \frac{n_1(n_1 + 1)}{2}$$

### 2.5 Regression Modeling & Diagnostics
- **Multiple Linear Regression (OLS)**:
  Estimates $\mathbf{b} = (\mathbf{X}^T \mathbf{X})^{-1} \mathbf{X}^T \mathbf{y}$ via Gauss-Jordan matrix elimination.
  Outputs:
  - Coefficient of Determination: $R^2 = \frac{SS_{\text{reg}}}{SS_{\text{total}}}$
  - Adjusted $R^2 = 1 - \left[\frac{(1 - R^2)(n - 1)}{n - k - 1}\right]$
  - Model ANOVA $F$-statistic and significance
  - Unstandardized coefficients ($B$), Standard Errors ($SE$), Standardized Betas ($\beta$), $t$-values, exact $p$-values, and $95\%$ Confidence Intervals.
  - **Multicollinearity Diagnostics**: Variance Inflation Factor ($VIF = \frac{1}{1 - R_j^2}$) and Tolerance ($1 / VIF$) for every predictor variable.
- **Binary Logistic Regression**:
  Estimates log-odds $\ln\left(\frac{p}{1 - p}\right) = \beta_0 + \sum \beta_j X_j$ using iteratively reweighted least squares (Newton-Raphson optimization).
  Outputs:
  - $\beta$ coefficients, asymptotic Standard Errors, Wald $z$-scores, $p$-values, and Odds Ratios ($e^\beta$) with $95\%$ confidence intervals.

---

## 3. Publication APA 7th Edition Output

Every test automatically generates:
1. **Academic HTML Table**: Formatted according to APA 7th edition guidelines (horizontal rules at top, bottom, and under headers; zero vertical borders; italicized statistical symbols $M$, $SD$, $t$, $F$, $p$, $r$, $R^2$).
2. **APA In-Text Reporting String**: Standardized scholarly reporting sentence (e.g. `r(318) = .58, p = .001, 95% CI [.49, .65]`).
3. **Manuscript Integration**: A single click appends the formatted table and text directly into the active section of the manuscript.

