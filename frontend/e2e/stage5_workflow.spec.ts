import { test, expect } from '@playwright/test';

test.describe('Stage 5 End-to-End Academic Research Workflow & Quality Assurance', () => {
  const testId = Date.now();
  const testUser = {
    email: `stage5_${testId}@scholarforge.ai`,
    password: 'Password2026!Secure',
    firstName: 'Eleanor',
    lastName: 'Thorne',
    institution: 'Oxford Institute for Advanced Studies',
  };
  const projectTitle = `Decentralized AI Governance in Cross-Border Financial Networks (${testId})`;

  test('Stage 5 Complete Integration Journey: Setup -> Planning -> Alignment -> Assembly -> QA -> Review', async ({ page }) => {
    test.setTimeout(120000);
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message, err.stack));

    // 1. Register User
    await page.goto('/register');
    await expect(page.locator('h2')).toContainText('Create Your ScholarForge Account');

    await page.fill('input[name="first_name"]', testUser.firstName);
    await page.fill('input[name="last_name"]', testUser.lastName);
    await page.fill('input[name="email"]', testUser.email);
    await page.selectOption('select[name="academic_level"]', 'PHD');
    await page.fill('input[name="institution"]', testUser.institution);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="password_confirm"]', testUser.password);
    await page.click('button[type="submit"]');

    // 2. Arrive at Dashboard
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await expect(page.locator('h1')).toContainText('Welcome back, Eleanor');

    // 3. Create Research Project via Wizard
    await page.click('a:has-text("Create Research")');
    await page.waitForURL('**/research/create');

    // Step 1: Category
    await expect(page.getByText('Step 1: Select Document Category')).toBeVisible();
    await page.click('button:has-text("Academic Project")');
    await page.click('button:has-text("Next Step")');

    // Step 2: Subtype
    await expect(page.getByText('Step 2: Select Document Subtype')).toBeVisible();
    await page.click('button:has-text("PhD Dissertation")');
    await page.click('button:has-text("Next Step")');

    // Step 3: Discipline
    await expect(page.getByText('Step 3: Select Academic Discipline')).toBeVisible();
    await page.fill('input[placeholder*="Search disciplines"]', 'Computer Science');
    await page.click('button:has-text("Computer Science")');
    await page.click('button:has-text("Next Step")');

    // Step 4: Info & Requirements
    await expect(page.getByText('Step 4: Research Information & Requirements')).toBeVisible();
    await page.fill('input[placeholder*="An Empirical Evaluation"]', projectTitle);
    await page.fill('textarea[placeholder*="Quantitative experimental"]', 'Cross-sectional survey with instrumental variable estimation.');
    await page.fill('textarea[placeholder*="Quantify verification throughput"]', '1. Evaluate liquidity shock propagation. 2. Measure digital wallet adoption elasticity.');
    await page.fill('input[placeholder="30000"]', '45000');
    await page.click('button:has-text("Next Step")');

    // Step 5: Review & Initialize
    await expect(page.getByText('Step 5: Review & Initialize Workspace')).toBeVisible();
    await page.click('button:has-text("Initialize Research Workspace")');

    // 4. Arrive at Research Workspace
    await page.waitForURL(/.*research\/[0-9a-f-]+/, { timeout: 30000 });
    await expect(page.getByText('Loading Academic Workspace & Manuscript...')).not.toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Manuscript Outline')).toBeVisible({ timeout: 15000 });

    // ==========================================
    // JOURNEY 1: WORKFLOW LIFECYCLE
    // ==========================================
    await page.click('button:has-text("Workflow Lifecycle")');
    await expect(page.getByText('Adaptive Academic Research Lifecycle')).toBeVisible();
    await expect(page.getByText('Total Completion')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Research Setup' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Research Planning' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Literature Discovery' })).toBeVisible();

    // ==========================================
    // JOURNEY 2: RESEARCH PLANNING & APPROVAL GATE
    // ==========================================
    await page.click('button:has-text("Research Planning")');
    await expect(page.getByText('Structured Research Planning & Governance Gate')).toBeVisible();
    await expect(page.getByRole('button', { name: /Record Decision/i })).toBeVisible();

    // Record a new formal research decision
    await page.click('button:has-text("Record Decision")');
    await page.fill('input[placeholder*="e.g. Primary Objective 1"]', 'Primary Research Objective 1');
    await page.fill('textarea[placeholder*="State the rigorous academic proposition"]', 'Quantify systemic liquidity stability during sudden foreign exchange fluctuations.');
    await page.fill('input[placeholder*="Why is this formulation academically necessary"]', 'Grounded in post-crisis macroeconomic stabilization models.');
    await page.click('button:has-text("Save Decision")');

    await expect(page.getByText('Primary Research Objective 1')).toBeVisible();
    await expect(page.getByText('Pending Approval Gate')).toBeVisible();

    // Approve the research decision
    await page.click('button:has-text("Approve Decision")');
    await expect(page.getByText('Approved').first()).toBeVisible({ timeout: 10000 });

    // ==========================================
    // JOURNEY 3: 13-NODE RESEARCH ALIGNMENT MATRIX
    // ==========================================
    await page.click('button:has-text("13-Node Alignment")');
    await expect(page.getByText('13-Node Research Alignment Matrix')).toBeVisible();
    await expect(page.getByText('Congruence Index')).toBeVisible();
    await expect(page.getByText('Detected Methodological Issues')).toBeVisible();

    // ==========================================
    // JOURNEY 4: MANUSCRIPT ASSEMBLY ENGINE
    // ==========================================
    await page.click('button:has-text("Manuscript Assembly")');
    await expect(page.getByText('End-to-End Manuscript Assembly Engine')).toBeVisible();
    await expect(page.getByRole('button', { name: /Compile Full Manuscript/i })).toBeVisible();

    // Trigger full manuscript compilation
    await page.click('button:has-text("Compile Full Manuscript")');
    await expect(page.getByText(/Assembly v1/i)).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Total Words:')).toBeVisible();
    await expect(page.getByRole('button', { name: /Print \/ PDF Export/i })).toBeVisible();

    // ==========================================
    // JOURNEY 5: ACADEMIC QUALITY ASSURANCE & DISCLAIMER
    // ==========================================
    await page.click('button:has-text("Quality QA (6-Cat)")');
    await expect(page.getByText('Academic Quality Assurance & Readiness Index')).toBeVisible();
    await expect(page.getByText('Readiness Score')).toBeVisible();
    await expect(page.getByText('Structural Quality').first()).toBeVisible();
    await expect(page.getByText('Research Consistency').first()).toBeVisible();
    await expect(page.getByText('Citation Integrity').first()).toBeVisible();
    await expect(page.getByText('Evidence Validity').first()).toBeVisible();
    await expect(page.getByText('Writing Quality').first()).toBeVisible();
    await expect(page.getByText('Manuscript Completeness').first()).toBeVisible();
    // Prominent academic non-guarantee disclaimer
    await expect(page.getByText('Academic Disclaimer:')).toBeVisible();
    await expect(page.getByText(/ScholarForge AI provides formative evaluation and does not guarantee journal publication/i)).toBeVisible();

    // Run audit
    await page.click('button:has-text("Run Quality Audit")');
    await expect(page.getByText('Readiness Score')).toBeVisible();

    // ==========================================
    // JOURNEY 6: DEFENSE PREPARATION & REVIEW
    // ==========================================
    await page.click('button:has-text("Defense & Review")');
    await expect(page.getByText('AI Academic Review Assistant')).toBeVisible();
    await expect(page.getByText('Pre-Defense Readiness Checklist')).toBeVisible();
    await expect(page.getByText('Record Reviewer Feedback & Approval')).toBeVisible();

    // Record formal review
    await page.fill('input[placeholder*="e.g. Dr. Vance"]', 'Prof. Eleanor Vance');
    await page.fill('textarea[placeholder*="Enter substantive review critique"]', 'The empirical methodology and structural alignment meet institutional dissertation standards.');
    await page.click('button:has-text("Save Formal Review Record")');

    await expect(page.getByText('Prof. Eleanor Vance')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('The empirical methodology and structural alignment meet institutional dissertation standards.')).toBeVisible();
  });
});
