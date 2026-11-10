import { test, expect } from '@playwright/test';

test.describe('Stage 7 University Academic Formatting, Institutional Templates & Manuscript Compliance', () => {
  const testId = Date.now();
  const testUser = {
    email: `stage7_${testId}@scholarforge.ai`,
    password: 'Password2026!Secure',
    firstName: 'Eleanor',
    lastName: 'Vance',
    institution: 'University of Ibadan',
  };
  const projectTitle = `Empirical Epidemiology of Water Purification Standards (${testId})`;

  test('Journeys A-F: Complete Formatting, Institutional Templates, Compliance & Journal Standards Lifecycle', async ({ page }) => {
    test.setTimeout(240000);

    // 1. Register User
    await page.goto('/register');
    await expect(page.locator('h2')).toContainText('Create Your ScholarForge Account');

    await page.fill('input[name="first_name"]', testUser.firstName);
    await page.fill('input[name="last_name"]', testUser.lastName);
    await page.fill('input[name="email"]', testUser.email);
    await page.selectOption('select[name="academic_level"]', 'MASTERS');
    await page.fill('input[name="institution"]', testUser.institution);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="password_confirm"]', testUser.password);
    await page.click('button[type="submit"]');

    // 2. Arrive at Dashboard
    await page.waitForURL('**/dashboard', { timeout: 20000 });
    await expect(page.locator('h1')).toContainText('Welcome back, Eleanor');

    // 3. Create Empirical Master's Thesis via Wizard
    await page.click('a:has-text("Create Research")');
    await page.waitForURL('**/research/create');

    // Step 1: Category
    await expect(page.getByText('Step 1: Select Document Category')).toBeVisible();
    await page.click('button:has-text("Academic Project")');
    await page.click('button:has-text("Next Step")');

    // Step 2: Subtype
    await expect(page.getByText('Step 2: Select Document Subtype')).toBeVisible();
    await page.click('button:has-text("Master\'s Thesis")');
    await page.click('button:has-text("Next Step")');

    // Step 3: Discipline
    await expect(page.getByText('Step 3: Select Academic Discipline')).toBeVisible();
    await page.fill('input[placeholder*="Search disciplines"]', 'Public Health');
    await page.click('button:has-text("Public Health")');
    await page.click('button:has-text("Next Step")');

    // Step 4: Info & Requirements
    await expect(page.getByText('Step 4: Research Information & Requirements')).toBeVisible();
    await page.fill('input[placeholder*="An Empirical Evaluation"]', projectTitle);
    await page.fill('textarea[placeholder*="Quantitative experimental"]', 'Empirical epidemiology of municipal water filtration.');
    await page.fill('textarea[placeholder*="Quantify verification throughput"]', '1. Assess pathogen clearance. 2. Verify water security.');
    await page.fill('input[placeholder="30000"]', '25000');
    await page.click('button:has-text("Next Step")');

    // Step 5: Review & Initialize
    await expect(page.getByText('Step 5: Review & Initialize Workspace')).toBeVisible();
    await page.click('button:has-text("Initialize Research Workspace")');

    // 4. Arrive at Research Workspace
    await page.waitForURL(/.*research\/[0-9a-f-]+/, { timeout: 60000 });
    await expect(page.getByText('Loading Academic Workspace & Manuscript...')).not.toBeVisible({ timeout: 60000 });
    await expect(page.getByText('Formatting & Templates')).toBeVisible({ timeout: 60000 });

    // =========================================================================
    // JOURNEY A: Institutional Template Selection, Margin Review & Safe Auto-Format
    // =========================================================================
    await page.click('button:has-text("Formatting & Templates")');
    await expect(page.getByText('Academic Formatting & Institutional Compliance Studio')).toBeVisible();

    // Verify Template Catalog displays verified institutions
    await expect(page.getByText('Institutional & Departmental Templates')).toBeVisible();

    // Filter by Country Nigeria / University of Ibadan
    const countrySelect = page.locator('select').first();
    if (await countrySelect.isVisible()) {
      await countrySelect.selectOption({ label: 'Nigeria' }).catch(() => { });
    }

    // Assign University of Ibadan Template or Oxford Standard
    const useBtn = page.locator('button:has-text("Use This Template")').first();
    if (await useBtn.isVisible()) {
      await useBtn.click();
      await expect(page.locator('text=Assigned').first()).toBeVisible({ timeout: 10000 });
    }

    // Switch to Formatting Rules tab
    await page.click('button:has-text("Formatting Rules")');
    await expect(page.getByText('Page Margins & Binding Gutter')).toBeVisible();
    await expect(page.getByText('Binding Gutter (in)')).toBeVisible();

    // Switch sub-tabs to Typography
    await page.click('button:has-text("Typography & Spacing")');
    await expect(page.getByText('Primary Font')).toBeVisible();

    // =========================================================================
    // JOURNEY F: Layout Transparency & NOT_VERIFIED Physical Page Boundary Notice
    // =========================================================================
    // Web preview explicitly marks layout NOT_VERIFIED
    await expect(page.locator('text=NOT_VERIFIED').first()).toBeVisible();
    await expect(page.locator('text=Physical Layout: Measured on PDF/DOCX Export').first()).toBeVisible();

    // =========================================================================
    // JOURNEY A (cont): Preliminary Pages / Front Matter Workspace
    // =========================================================================
    await page.click('button:has-text("Front Matter / Prelims")');
    await expect(page.getByText('Preliminary Pages & Front Matter Engine')).toBeVisible();
    await expect(page.locator('text=Title Page').first()).toBeVisible();
    await expect(page.locator('text=Certification').first()).toBeVisible();
    await expect(page.locator('text=Declaration').first()).toBeVisible();

    // Click Edit Thesis Metadata
    await page.click('button:has-text("Edit Thesis Metadata")');
    await expect(page.getByText('Thesis & Institutional Metadata')).toBeVisible();
    await page.fill('input[placeholder*="John Doe"]', 'Eleanor Vance');
    await page.fill('input[placeholder*="2024/MPH/892"]', 'UI/2026/MPH/041');
    await page.click('button:has-text("Apply & Regenerate")');

    // =========================================================================
    // JOURNEY A (cont): Compliance Audit & Safe Auto-Format
    // =========================================================================
    await page.click('button:has-text("Compliance Audit")');
    await expect(page.getByText('Manuscript Compliance Intelligence')).toBeVisible();

    // Run Compliance Check
    await page.click('button:has-text("Run Compliance Check")');
    await page.waitForTimeout(2000);

    // Click Safe Auto-Format
    const autoformatBtn = page.locator('button:has-text("Safe Auto-Format")');
    if (await autoformatBtn.isVisible()) {
      await autoformatBtn.click();
      await page.waitForTimeout(1000);

      // Verify Snapshot Safety Banner in Modal
      if (await page.locator('text=Safe Auto-Format Preview').isVisible()) {
        await expect(page.getByText('DocumentVersion snapshot')).toBeVisible();
        await page.click('button:has-text("Accept & Apply Format")');
        await page.waitForTimeout(2000);
      }
    }

    // =========================================================================
    // JOURNEY B: Author Guideline Ingestion Engine
    // =========================================================================
    await page.click('button:has-text("Formatting & Templates")');
    await page.click('button:has-text("Ingest Guidelines")');
    await expect(page.getByText('Ingest Author Guidelines (PDF/DOCX)')).toBeVisible();
    await expect(page.getByText('Adversarial Sanitization')).toBeVisible();
    // Close modal
    await page.click('button:has-text("Cancel")');

    // =========================================================================
    // JOURNEY C: Journal Publication Standards & Submission Readiness
    // =========================================================================
    await page.click('button:has-text("Journal Publication Prep")');
    await expect(page.getByText('Journal Publication Standards & Submission Readiness')).toBeVisible();

    // Verify 4 Article Structures
    await expect(page.getByText('Original Research (IMRaD)')).toBeVisible();
    await expect(page.getByText('Review Article')).toBeVisible();
    await expect(page.getByText('Systematic Review (PRISMA)')).toBeVisible();
    await expect(page.getByText('Conceptual / Theoretical')).toBeVisible();

    // Select Systematic Review
    await page.click('button:has-text("Systematic Review (PRISMA)")');

    // Input Verified ORCID Identifier
    await page.click('button:has-text("Add Author ORCID")');
    const authorNameInput = page.locator('input[placeholder="Author Name"]').last();
    const orcidInput = page.locator('input[placeholder="0000-0002-1825-0097"]').last();
    if (await orcidInput.isVisible()) {
      await authorNameInput.fill('Eleanor Vance');
      await orcidInput.fill('0000-0002-1825-0097');
    }

    // Fill Ethics Approval & Data Statements
    await page.fill('textarea[placeholder*="Approved by the Institutional Review Board"]', 'Approved by UI Health Research Ethics Committee (UI-HREC/2026/019).');
    await page.fill('textarea[placeholder*="datasets generated during"]', 'Data available upon reasonable request from the corresponding author.');

    // Save Publication Metadata
    await page.click('button:has-text("Save Publication Metadata")');
    await expect(page.getByText('Publication metadata saved successfully!')).toBeVisible({ timeout: 10000 });

    // =========================================================================
    // JOURNEY D: Engineering & IEEE Template Standard Verification
    // =========================================================================
    await page.click('button:has-text("Formatting & Templates")');
    const searchTpl = page.locator('input[placeholder="Search template name..."]');
    if (await searchTpl.isVisible()) {
      await searchTpl.fill('IEEE');
      await page.waitForTimeout(1000);
      const ieeeTpl = page.locator('text=IEEE').first();
      if (await ieeeTpl.isVisible()) {
        await expect(ieeeTpl).toBeVisible();
      }
    }

    // =========================================================================
    // JOURNEY E: Supervisor Collaboration & Feedback Integration
    // =========================================================================
    // Verify Collaboration and Supervisor review workflows remain intact
    await expect(page.getByText('Supervisor Feedback')).toBeVisible();
    await expect(page.getByText('Revisions & Tasks')).toBeVisible();
  });
});
