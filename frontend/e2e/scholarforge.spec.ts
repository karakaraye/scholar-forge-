import { test, expect } from '@playwright/test';

test.describe('ScholarForge AI E2E Tests', () => {
  const testId = Date.now();
  const testUser = {
    email: `researcher_${testId}@oxford.ac.uk`,
    password: 'Password2026!Secure',
    firstName: 'Eleanor',
    lastName: 'Vance',
    institution: 'University of Oxford',
  };

  test('Public pages: Landing and Features navigation', async ({ page }) => {
    // 1. Visit landing page
    await page.goto('/');
    await expect(page).toHaveTitle(/ScholarForge AI/);
    await expect(page.locator('h1')).toContainText('Your intelligent');
    await expect(page.locator('h1')).toContainText('research workspace');

    // 2. Check 3 document categories
    await expect(page.getByText('Three Pillars of Academic Scaffolding')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Academic Project' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Research Paper' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Journal Article' })).toBeVisible();

    // 3. Navigate to Features
    await page.getByRole('link', { name: 'Explore Features' }).click();
    await expect(page).toHaveURL(/.*features/);
    await expect(page.locator('h1')).toContainText('Engineered for Serious Academic Research');
    await expect(page.getByText('Supported Citation Formats')).toBeVisible();
    await expect(page.getByText('APA 7th edition')).toBeVisible();
  });

  test('Stage 1 & Stage 2 Full Researcher Journey: Auth, Creation Wizard, 3-Panel Workspace, Tiptap Writing, Autosave, AI Assistant & Version History', async ({ page }) => {
    // 1. Visit Register Page
    await page.goto('/register');
    await expect(page.locator('h2')).toContainText('Create Your ScholarForge Account');

    // Fill registration form
    await page.fill('input[name="first_name"]', testUser.firstName);
    await page.fill('input[name="last_name"]', testUser.lastName);
    await page.fill('input[name="email"]', testUser.email);
    await page.selectOption('select[name="academic_level"]', 'PHD');
    await page.fill('input[name="institution"]', testUser.institution);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="password_confirm"]', testUser.password);

    // Submit registration
    await page.click('button[type="submit"]');

    // Verify redirected to Dashboard
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await expect(page.locator('h1')).toContainText('Welcome back, Eleanor');

    // Check dashboard statistics initially
    await expect(page.getByText('Total Projects')).toBeVisible();

    // 2. Launch 5-Step Creation Wizard
    await page.click('a:has-text("Create Research")');
    await page.waitForURL('**/research/create');
    await expect(page.locator('h1')).toContainText('Configure Research Workspace');

    // Step 1: Select Academic Project
    await expect(page.getByText('Step 1: Select Document Category')).toBeVisible();
    await page.click('button:has-text("Academic Project")');
    await page.click('button:has-text("Next Step")');

    // Step 2: Select Document Subtype
    await expect(page.getByText('Step 2: Select Document Subtype')).toBeVisible();
    await page.click('button:has-text("PhD Dissertation")');
    await page.click('button:has-text("Next Step")');

    // Step 3: Select Academic Discipline
    await expect(page.getByText('Step 3: Select Academic Discipline')).toBeVisible();
    await page.fill('input[placeholder*="Search disciplines"]', 'Computer Science');
    await page.click('button:has-text("Computer Science")');
    await page.click('button:has-text("Next Step")');

    // Step 4: Fill Research Information
    await expect(page.getByText('Step 4: Research Information & Requirements')).toBeVisible();
    const projectTitle = `Strategic Resilience and Decentralized Governance in Volatile Distributed Networks (${testId})`;
    await page.fill('input[placeholder*="An Empirical Evaluation"]', projectTitle);
    await page.selectOption('select:has-text("APA 7th edition")', 'IEEE');
    await page.fill('textarea[placeholder*="Quantitative experimental"]', 'Empirical multi-node benchmarks under high packet drop conditions.');
    await page.fill('textarea[placeholder*="Quantify verification throughput"]', '1. Measure consensus throughput. 2. Evaluate latency under partitions.');
    await page.fill('input[placeholder="30000"]', '50000');
    await page.click('button:has-text("Next Step")');

    // Step 5: Review & Initialize
    await expect(page.getByText('Step 5: Review & Initialize Workspace')).toBeVisible();
    await expect(page.getByText(projectTitle)).toBeVisible();
    await expect(page.getByText('Computer Science', { exact: true })).toBeVisible();

    // Click "Initialize Research Workspace"
    await page.click('button:has-text("Initialize Research Workspace")');

    // 3. Verify Dedicated Stage 2 Workspace loaded
    await page.waitForURL(/.*research\/[0-9a-f-]+/, { timeout: 30000 });
    await expect(page.getByText('Manuscript Outline')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Introduction', { exact: false }).first()).toBeVisible();

    // Center: Academic Writing Editor (Tiptap)
    await expect(page.getByText('Save Now')).toBeVisible();
    await expect(page.getByText(/Words:/)).toBeVisible();

    // Right: AI Assistant & Consistency
    await expect(page.getByText('AI Assistant')).toBeVisible();
    await expect(page.getByText('Consistency')).toBeVisible();
    await expect(page.getByText('Context')).toBeVisible();

    // 4. Test Tiptap Rich Text Editing & Autosave
    const editorArea = page.locator('.ProseMirror');
    await editorArea.click();
    await editorArea.fill('In this empirical inquiry, organizational governance mechanisms are rigorously tested.');

    // Verify Save indicator updates
    await expect(page.getByText(/All changes saved|Saving/)).toBeVisible({ timeout: 10000 });

    // 5. Test AI Assistant Interaction
    await page.getByText('Request AI Assistance').click();
    // Verify AI suggestion card appears
    await expect(page.getByText('AI Suggestion Ready for Review')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Academic Integrity Check: No fabricated citations')).toBeVisible();

    // Accept suggestion into editor
    await page.getByRole('button', { name: 'Accept & Insert' }).click();

    // 6. Test Academic Consistency Scanner
    await page.getByText('Consistency').click();
    await expect(page.getByText('Academic Consistency Scanner')).toBeVisible();
    await page.getByRole('button', { name: 'Scan Now' }).click();
    await expect(page.getByText('Consistency Index')).toBeVisible({ timeout: 10000 });

    // 7. Test Version History Snapshot
    await page.getByRole('button', { name: /Versions/ }).click();
    await expect(page.getByText('Manuscript Revision History')).toBeVisible();
    await page.getByText('Create Manual Revision Snapshot').click();
    await page.fill('input[placeholder*="Summary of changes"]', 'Stage 2 E2E verified checkpoint');
    await page.getByRole('button', { name: 'Save Checkpoint' }).click();
    await expect(page.getByText('Stage 2 E2E verified checkpoint')).toBeVisible({ timeout: 10000 });

    // Close modal
    await page.click('button[aria-label="Close modal"]');

    // 8. Return to Dashboard and verify project is listed
    await page.goto('/dashboard');
    await expect(page.locator('h1')).toContainText('Welcome back, Eleanor');
    await expect(page.getByText(projectTitle)).toBeVisible();

    // 9. Test Logout & Login
    await page.click('button[title="Sign Out"]');
    await page.waitForURL('**/login', { timeout: 10000 });

    // Sign back in
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await expect(page.getByText(projectTitle)).toBeVisible();
  });

  test('Acceptance Journey A & B: Scholarly Discovery, Save to Library, Literature Intelligence Matrix', async ({ page }) => {
    // Log in
    await page.goto('/login');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });

    // 1. Visit Research Library
    await page.goto('/library');
    await expect(page.locator('h1')).toContainText('Academic Research Library & Discovery');

    // 2. Perform Discovery Search
    await page.fill('input[placeholder*="Search by keywords"]', 'Machine Learning');
    await page.click('button:has-text("Search Publications")');

    // Verify search results appear
    await expect(page.getByText(/Found \d+ publication/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Authoritative Deduplication Active')).toBeVisible();

    // 3. Save publication to library
    const saveBtn = page.getByRole('button', { name: /Save to Library/i }).first();
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await expect(page.getByText('Saved').first()).toBeVisible({ timeout: 5000 });
    }

    // 4. Check "My Library" tab
    await page.click('button:has-text("My Library")');
    await expect(page.getByPlaceholder('Search personal library')).toBeVisible();
  });

  test('Acceptance Journey C & D: Bibliographic Import, CSL Citation Insertion & Integrity Audit', async ({ page }) => {
    // Log in
    await page.goto('/login');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });

    // 1. Visit Library Import Tab
    await page.goto('/library');
    await page.click('button:has-text("Import & Document Upload")');
    await expect(page.getByText('Bibliographic Import')).toBeVisible();

    // Test BibTeX mode switcher
    await page.click('button:has-text("BibTeX")');
    await expect(page.getByPlaceholder(/@article/i)).toBeVisible();

    // Test RIS mode switcher
    await page.click('button:has-text("RIS")');
    await expect(page.getByPlaceholder(/TY  - JOUR/i)).toBeVisible();

    // 2. Navigate to first research project
    await page.goto('/dashboard');
    const projectLink = page.locator('a[href^="/research/"]').first();
    await projectLink.click();
    await page.waitForURL(/.*research\/[0-9a-f-]+/, { timeout: 15000 });

    // 3. Open Citation Modal
    await page.click('button:has-text("Cite")');
    await expect(page.getByText('Insert Scholarly Citation')).toBeVisible();
    await expect(page.getByText('Parenthetical')).toBeVisible();
    await expect(page.getByText('Narrative')).toBeVisible();
    await page.click('button:has-text("Cancel")');

    // 4. Open Citation Audit Modal
    await page.click('button:has-text("Audit Citations")');
    await expect(page.getByText('Manuscript Citation Integrity Audit')).toBeVisible();
    await expect(page.getByText('Citation Integrity Score')).toBeVisible({ timeout: 10000 });
    await page.click('button:has-text("Close")');

    // 5. Test Literature Intelligence Panel Toggle
    await page.click('button:has-text("Literature")');
    await expect(page.getByText('Literature Review Intelligence')).toBeVisible();
    await expect(page.getByText('Empirical Matrix')).toBeVisible();
    await expect(page.getByText('Theoretical Framework')).toBeVisible();
    await expect(page.getByText('Conceptual Review')).toBeVisible();
    await expect(page.getByText('PRISMA Systematic')).toBeVisible();
  });

  // ==========================================================================
  // STAGE 4 ACCEPTANCE JOURNEYS A - E
  // ==========================================================================

  test('Stage 4 Journey A: Management Empirical Study & Chapter 4 Results Insertion', async ({ page }) => {
    // 1. Visit workspace
    await page.goto('/dashboard');
    const projectLink = page.locator('a[href^="/research/"]').first();
    await projectLink.click();
    await page.waitForURL(/.*research\/[0-9a-f-]+/, { timeout: 15000 });

    // 2. Navigate to Statistical Analysis tab
    await page.click('button:has-text("Statistical Analysis")');
    await expect(page.getByText('Deterministic Statistical Analysis Engine')).toBeVisible();

    // 3. Verify Publication APA Table & Chart Viewers
    await expect(page.getByText('Execute Statistical Test')).toBeVisible();

    // 4. Navigate to Results & Chapter 4 tab
    await page.click('button:has-text("Results & Chapter 4")');
    await expect(page.getByText('Chapter 4 & Results Interpretation Assistant')).toBeVisible();
    await expect(page.getByRole('button', { name: /Execute Results Interpretation/i })).toBeVisible();
  });

  test('Stage 4 Journey B: Educational Sampling & Research Instruments', async ({ page }) => {
    await page.goto('/dashboard');
    const projectLink = page.locator('a[href^="/research/"]').first();
    await projectLink.click();
    await page.waitForURL(/.*research\/[0-9a-f-]+/, { timeout: 15000 });

    // 1. Navigate to Methodology & Sampling tab
    await page.click('button:has-text("Methodology & Sampling")');
    await expect(page.getByText('Intelligent Research Methodology Engine')).toBeVisible();

    // Check Sampling Calculator
    await page.click('button:has-text("Sampling Calculator")');
    await expect(page.getByText('Sampling Size Assistant')).toBeVisible();
    await expect(page.getByRole('button', { name: /Calculate Sample Size/i })).toBeVisible();

    // 2. Navigate to Research Instruments tab
    await page.click('button:has-text("Research Instruments")');
    await expect(page.getByText('Research Instrument Builder')).toBeVisible();
    await expect(page.getByPlaceholder(/Instrument title/i)).toBeVisible();
  });

  test('Stage 4 Journey C: Social Sciences Qualitative Transcripts & Verbatim Excerpts', async ({ page }) => {
    await page.goto('/dashboard');
    const projectLink = page.locator('a[href^="/research/"]').first();
    await projectLink.click();
    await page.waitForURL(/.*research\/[0-9a-f-]+/, { timeout: 15000 });

    // 1. Navigate to Qualitative Analysis tab
    await page.click('button:has-text("Qualitative Analysis")');
    await expect(page.getByText('Qualitative Research Analysis & Excerpts')).toBeVisible();
    await expect(page.getByText('Transcripts')).toBeVisible();
    await expect(page.getByText('Codebook')).toBeVisible();
    await expect(page.getByText('Thematic Synthesis')).toBeVisible();
  });

  test('Stage 4 Journey D: Experimental Group Comparison & Distribution Visualizations', async ({ page }) => {
    await page.goto('/dashboard');
    const projectLink = page.locator('a[href^="/research/"]').first();
    await projectLink.click();
    await page.waitForURL(/.*research\/[0-9a-f-]+/, { timeout: 15000 });

    // 1. Navigate to Datasets & Cleaning tab
    await page.click('button:has-text("Datasets & Cleaning")');
    await expect(page.getByText('Research Dataset Management & Cleaning')).toBeVisible();
    await expect(page.getByText('Drag & drop dataset file')).toBeVisible();

    // 2. Navigate to Hypotheses & Decisions tab
    await page.click('button:has-text("Hypotheses & Decisions")');
    await expect(page.getByText('Hypothesis Testing & Empirical Decisions')).toBeVisible();
    await expect(page.getByText('Evaluate Research Hypothesis')).toBeVisible();
  });

  test('Stage 4 Journey E: Strict Refusal Protocol Enforcement', async ({ page }) => {
    await page.goto('/dashboard');
    const projectLink = page.locator('a[href^="/research/"]').first();
    await projectLink.click();
    await page.waitForURL(/.*research\/[0-9a-f-]+/, { timeout: 15000 });

    // 1. Navigate to Results & Chapter 4 tab
    await page.click('button:has-text("Results & Chapter 4")');
    await expect(page.getByText('Chapter 4 & Results Interpretation Assistant')).toBeVisible();

    // 2. Verify Scientific Rigor & Zero Hallucination protocol
    await expect(page.getByText('Scientific Rigor & Zero Hallucination')).toBeVisible();
    await expect(page.getByText('Statistical values are never invented')).toBeVisible();
  });

  // ==========================================
  // STAGE 5 ACCEPTANCE JOURNEYS
  // ==========================================

  test('Stage 5 Journey A: Adaptive Research Workflow Lifecycle', async ({ page }) => {
    await page.goto('/dashboard');
    const projectLink = page.locator('a[href^="/research/"]').first();
    await projectLink.click();
    await page.waitForURL(/.*research\/[0-9a-f-]+/, { timeout: 15000 });

    // 1. Workflow Lifecycle Tab
    await page.click('button:has-text("Workflow Lifecycle")');
    await expect(page.getByText('Adaptive Academic Research Lifecycle')).toBeVisible();
    await expect(page.getByText('Total Completion')).toBeVisible();
    await expect(page.getByText('Research Setup & Paradigm Configuration')).toBeVisible();
  });

  test('Stage 5 Journey B: Structured Research Planning & Approval Gate', async ({ page }) => {
    await page.goto('/dashboard');
    const projectLink = page.locator('a[href^="/research/"]').first();
    await projectLink.click();
    await page.waitForURL(/.*research\/[0-9a-f-]+/, { timeout: 15000 });

    // 1. Planning Workspace Tab
    await page.click('button:has-text("Research Planning")');
    await expect(page.getByText('Structured Research Planning & Governance Gate')).toBeVisible();
    await expect(page.getByRole('button', { name: /Record Decision/i })).toBeVisible();
  });

  test('Stage 5 Journey C: 13-Node Research Alignment Matrix', async ({ page }) => {
    await page.goto('/dashboard');
    const projectLink = page.locator('a[href^="/research/"]').first();
    await projectLink.click();
    await page.waitForURL(/.*research\/[0-9a-f-]+/, { timeout: 15000 });

    // 1. Alignment Tab
    await page.click('button:has-text("13-Node Alignment")');
    await expect(page.getByText('13-Node Research Alignment Matrix')).toBeVisible();
    await expect(page.getByText('Congruence Index')).toBeVisible();
    await expect(page.getByText('Detected Methodological Issues')).toBeVisible();
  });

  test('Stage 5 Journey D: Manuscript Assembly Compilation & Preview', async ({ page }) => {
    await page.goto('/dashboard');
    const projectLink = page.locator('a[href^="/research/"]').first();
    await projectLink.click();
    await page.waitForURL(/.*research\/[0-9a-f-]+/, { timeout: 15000 });

    // 1. Assembly Tab
    await page.click('button:has-text("Manuscript Assembly")');
    await expect(page.getByText('End-to-End Manuscript Assembly Engine')).toBeVisible();
    await expect(page.getByRole('button', { name: /Compile Full Manuscript/i })).toBeVisible();
    await expect(page.getByText('Preliminary Pages')).toBeVisible();
    await expect(page.getByText('Table of Contents')).toBeVisible();
  });

  test('Stage 5 Journey E: Academic Quality Assurance & Disclaimer', async ({ page }) => {
    await page.goto('/dashboard');
    const projectLink = page.locator('a[href^="/research/"]').first();
    await projectLink.click();
    await page.waitForURL(/.*research\/[0-9a-f-]+/, { timeout: 15000 });

    // 1. Quality QA Tab
    await page.click('button:has-text("Quality QA (6-Cat)")');
    await expect(page.getByText('Academic Quality Assurance & Readiness Index')).toBeVisible();
    await expect(page.getByRole('button', { name: /Run Quality Audit/i })).toBeVisible();
    await expect(page.getByText('Structural Quality')).toBeVisible();
    await expect(page.getByText('Academic Disclaimer:')).toBeVisible();
  });

  test('Stage 5 Journey F: Defense Preparation & Review Workflow', async ({ page }) => {
    await page.goto('/dashboard');
    const projectLink = page.locator('a[href^="/research/"]').first();
    await projectLink.click();
    await page.waitForURL(/.*research\/[0-9a-f-]+/, { timeout: 15000 });

    // 1. Defense & Review Tab
    await page.click('button:has-text("Defense & Review")');
    await expect(page.getByText('AI Academic Review Assistant')).toBeVisible();
    await expect(page.getByText('Pre-Defense Readiness Checklist')).toBeVisible();
    await expect(page.getByText('Record Reviewer Feedback & Approval')).toBeVisible();
    await expect(page.getByRole('button', { name: /Execute AI Academic Review/i })).toBeVisible();
  });
});
