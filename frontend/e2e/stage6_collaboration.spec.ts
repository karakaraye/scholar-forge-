import { test, expect } from '@playwright/test';

test.describe('Stage 6 End-to-End Academic Collaboration, Supervisor Review & Revision Lifecycle', () => {
  const testId = Date.now();
  const testUser = {
    email: `stage6_${testId}@scholarforge.ai`,
    password: 'Password2026!Secure',
    firstName: 'Marcus',
    lastName: 'Vance',
    institution: 'Cambridge Centre for Advanced Study',
  };
  const projectTitle = `Empirical Resilience in Multilateral Payment Networks (${testId})`;

  test('Stage 6 Complete Journey: Collaboration -> Comments -> Ingestion -> AI Analysis -> Tasks -> Diff -> Matrix', async ({ page }) => {
    test.setTimeout(180000);

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
    await page.waitForURL('**/dashboard', { timeout: 20000 });
    await expect(page.locator('h1')).toContainText('Welcome back, Marcus');

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
    await page.fill('input[placeholder*="Search disciplines"]', 'Economics');
    await page.click('button:has-text("Economics")');
    await page.click('button:has-text("Next Step")');

    // Step 4: Info & Requirements
    await expect(page.getByText('Step 4: Research Information & Requirements')).toBeVisible();
    await page.fill('input[placeholder*="An Empirical Evaluation"]', projectTitle);
    await page.fill('textarea[placeholder*="Quantitative experimental"]', 'Empirical macroeconomic modeling with panel VAR analysis.');
    await page.fill('textarea[placeholder*="Quantify verification throughput"]', '1. Assess shock transmission. 2. Verify payment resilience.');
    await page.fill('input[placeholder="30000"]', '40000');
    await page.click('button:has-text("Next Step")');

    // Step 5: Review & Initialize
    await expect(page.getByText('Step 5: Review & Initialize Workspace')).toBeVisible();
    await page.click('button:has-text("Initialize Research Workspace")');

    // 4. Arrive at Research Workspace
    await page.waitForURL(/.*research\/[0-9a-f-]+/, { timeout: 60000 });
    await expect(page.getByText('Loading Academic Workspace & Manuscript...')).not.toBeVisible({ timeout: 60000 });
    await expect(page.getByText('Manuscript Outline')).toBeVisible({ timeout: 60000 });

    // ==========================================
    // JOURNEY 1: COLLABORATORS & INVITATIONS
    // ==========================================
    await page.click('button:has-text("Collaborators & Roles")');
    await expect(page.getByText('Research Collaborators & Supervisors')).toBeVisible({ timeout: 10000 });

    // Open invite form
    await page.click('button:has-text("+ Invite Collaborator")');
    await page.fill('input[placeholder="supervisor@university.edu"]', `prof_supervisor_${testId}@university.edu`);
    await page.selectOption('select:has-text("Supervisor")', 'SUPERVISOR');
    await page.fill('input[placeholder*="Chapter 3"]', 'Chapter 2: Literature Review, Chapter 3: Methodology');
    await page.click('button:has-text("Send Secure Invitation")');

    // Verify invitation notification and record
    await expect(page.getByText(/Invitation sent to prof_supervisor/i)).toBeVisible({ timeout: 15000 });
    await expect(page.locator('td', { hasText: `prof_supervisor_${testId}@university.edu` })).toBeVisible();

    // ==========================================
    // JOURNEY 2: INLINE MANUSCRIPT COMMENTS
    // ==========================================
    await page.click('button:has-text("Manuscript & Editor")');
    await expect(page.getByText('Manuscript Outline')).toBeVisible();

    // Switch right panel to Comments
    await page.click('button:has-text("Comments")');
    await expect(page.getByText('Manuscript Comments')).toBeVisible();

    // Trigger comment creation
    page.once('dialog', async (dialog) => {
      await dialog.accept('Clarify econometric assumptions regarding cross-sectional dependence.');
    });
    await page.locator('button[title="Add Inline Manuscript Comment"]').click();

    // Verify comment appears in the comments panel
    await expect(page.getByText('Clarify econometric assumptions regarding cross-sectional dependence.')).toBeVisible({ timeout: 15000 });

    // Submit reply to comment
    await page.fill('input[placeholder="Reply to this thread..."]', 'Addressed using Pesaran CD test in Section 3.2.');
    await page.click('button:has-text("Reply")');
    await expect(page.getByText('Addressed using Pesaran CD test in Section 3.2.')).toBeVisible({ timeout: 15000 });

    // ==========================================
    // JOURNEY 3: SUPERVISOR FEEDBACK INGESTION & AI ANALYSIS
    // ==========================================
    await page.click('button:has-text("Supervisor Feedback")');
    await expect(page.getByText('Supervisor Feedback Assistant')).toBeVisible();

    // Ingest manual feedback
    const supervisorReviewText = 'Chapter 2 needs an expanded review of recent 2024 literature on liquidity contagion. Chapter 4 requires explicit confidence intervals for Table 4.1.';
    await page.fill('textarea[placeholder*="Strengthen literature gap"]', supervisorReviewText);
    await page.click('button:has-text("Ingest Manual Comments")');

    await expect(page.getByText('Manual supervisor feedback ingested successfully.')).toBeVisible({ timeout: 15000 });

    // Trigger AI correction analysis
    await page.click('button:has-text("⚡ AI Correction Analysis")');
    await expect(page.getByText(/AI Correction Analysis Summary/i)).toBeVisible({ timeout: 25000 });

    // ==========================================
    // JOURNEY 4: REVISION & CORRECTION TRACKER
    // ==========================================
    await page.click('button:has-text("Revisions & Tasks")');
    await expect(page.getByText('Revision & Correction Tracker')).toBeVisible();

    // Apply suggestion on the first task if available
    const applyButton = page.locator('button:has-text("Apply Revision to Section")').first();
    if (await applyButton.isVisible()) {
      await applyButton.click();
      await expect(page.getByText(/Correction applied!/i)).toBeVisible({ timeout: 20000 });
    }

    // ==========================================
    // JOURNEY 5: VERSION DIFF VIEWER
    // ==========================================
    await page.click('button:has-text("Version Diff")');
    await expect(page.getByText('Manuscript Version Comparison & Diff')).toBeVisible();
    await expect(page.getByText('Net Delta')).toBeVisible({ timeout: 20000 });

    // ==========================================
    // JOURNEY 6: JOURNAL REVIEWER MATRIX & RESPONSE DOC
    // ==========================================
    await page.click('button:has-text("Reviewer Matrix")');
    await expect(page.getByText('Journal Reviewer Point-by-Point Response Matrix')).toBeVisible();

    // Add Reviewer Critique Point
    await page.click('button:has-text("+ Add Reviewer Point")');
    await page.fill('input[placeholder*="Reviewer 1"]', 'Reviewer 1');
    await page.fill('textarea[placeholder*="Quote the exact reviewer critique"]', 'The robustness check in Section 4.5 should account for high-frequency volatility.');
    await page.fill('textarea[placeholder*="Explain how this comment"]', 'We implemented an intraday GARCH specification and reported the estimates in Appendix C.');
    await page.click('button:has-text("Save Point")');

    await expect(page.getByText('Reviewer comment added to matrix.')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('The robustness check in Section 4.5 should account for high-frequency volatility.')).toBeVisible();

    // Export Response Document
    await page.click('button:has-text("Export Response Document")');
    await expect(page.getByText('Formatted Response to Reviewers Document')).toBeVisible({ timeout: 15000 });

    // ==========================================
    // JOURNEY 7: SUPERVISOR STANDALONE VIEW
    // ==========================================
    await page.goto('/supervisor');
    await expect(page.getByText('Academic Supervisor Dashboard')).toBeVisible({ timeout: 20000 });
  });
});
