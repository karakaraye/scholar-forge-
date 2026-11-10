import { test, expect } from '@playwright/test';

test.describe('Stage 8 Professional Microsoft Word & PDF Export, Academic Document Rendering & QA', () => {
  const testId = Date.now();
  const testUser = {
    email: `stage8_${testId}@scholarforge.ai`,
    password: 'Password2026!Secure',
    firstName: 'Marcus',
    lastName: 'Thorne',
    institution: 'University of Oxford',
  };
  const projectTitle = `Autonomous Decentralized Swarm Coordination in Edge Robotics (${testId})`;

  test('Journeys A-F: Complete Document Export, Layout Preview, QA Parity & History Workflow', async ({ page }) => {
    test.setTimeout(240000);

    // =========================================================================
    // 1. REGISTER USER
    // =========================================================================
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

    // =========================================================================
    // 2. DASHBOARD ARRIVAL & PROJECT CREATION
    // =========================================================================
    await page.waitForURL('**/dashboard', { timeout: 20000 });
    await expect(page.locator('h1')).toContainText('Welcome back, Marcus');

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
    await page.fill('textarea[placeholder*="Quantitative experimental"]', 'Empirical study on multi-agent consensus protocols.');
    await page.fill('textarea[placeholder*="Quantify verification throughput"]', '1. Maximize consensus rate. 2. Bound convergence latency.');
    await page.fill('input[placeholder="30000"]', '40000');
    await page.click('button:has-text("Next Step")');

    // Step 5: Review & Initialize
    await expect(page.getByText('Step 5: Review & Initialize Workspace')).toBeVisible();
    await page.click('button:has-text("Initialize Research Workspace")');

    // =========================================================================
    // 3. ENTER RESEARCH WORKSPACE & SWITCH TO EXPORT STUDIO
    // =========================================================================
    await page.waitForURL(/.*research\/[0-9a-f-]+/, { timeout: 60000 });
    await expect(page.getByText('Loading Academic Workspace & Manuscript...')).not.toBeVisible({ timeout: 60000 });

    // Click "Word & PDF Export" tab
    await page.click('button:has-text("Word & PDF Export")');

    // =========================================================================
    // JOURNEY A & B: 3-PANEL WORKSPACE & LAYOUT PREVIEW
    // =========================================================================
    await expect(page.getByText('Export Settings')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Document Layout Preview')).toBeVisible();
    await expect(page.getByText('Export QA & Audit')).toBeVisible();

    // Verify dual pagination callout
    await expect(page.getByText('Dual Pagination Architecture')).toBeVisible();
    await expect(page.getByText('Lowercase Roman')).toBeVisible();
    await expect(page.getByText('Arabic numerals')).toBeVisible();

    // Verify Virtual Page Navigator
    await expect(page.getByText(/Page 1 of/i)).toBeVisible();
    const nextBtn = page.getByTitle('Next Page');
    if (await nextBtn.isEnabled()) {
      await nextBtn.click();
      await expect(page.getByText(/Page 2 of/i)).toBeVisible();
      const prevBtn = page.getByTitle('Previous Page');
      await prevBtn.click();
      await expect(page.getByText(/Page 1 of/i)).toBeVisible();
    }

    // Zoom Controls
    const zoomIn = page.getByTitle('Zoom In');
    await zoomIn.click();
    await expect(page.getByText('110%')).toBeVisible();
    const resetZoom = page.getByTitle('Reset Zoom');
    await resetZoom.click();
    await expect(page.getByText('100%')).toBeVisible();

    // =========================================================================
    // JOURNEY C: INITIATE MICROSOFT WORD (.DOCX) EXPORT
    // =========================================================================
    // Click DOCX format button
    await page.click('button:has-text("Microsoft Word")');

    // Select citation style
    const citationSelect = page.locator('#citation-style-select');
    await citationSelect.selectOption('apa-7th');

    // Click Export Document (DOCX)
    const exportDocxBtn = page.locator('button:has-text("Export Document (DOCX)")');
    await expect(exportDocxBtn).toBeVisible();
    await exportDocxBtn.click();

    // Wait for export completion (polling handles transition)
    await expect(page.locator('button:has-text("Download DOCX"):not([disabled])')).toBeVisible({ timeout: 60000 });

    // =========================================================================
    // JOURNEY D: EXPORT QA AUDIT, OVERALL RATING & CRYPTOGRAPHIC HASH
    // =========================================================================
    // Verify overall rating badge is visible (either EXCELLENT or ACCEPTABLE)
    const hasExcellent = await page.locator('span:has-text("EXCELLENT")').first().isVisible();
    const hasAcceptable = await page.locator('span:has-text("ACCEPTABLE")').first().isVisible();
    expect(hasExcellent || hasAcceptable).toBe(true);

    // Verify Structural Parity Cross-Check metrics
    await expect(page.getByText('Structural Parity Cross-Check')).toBeVisible();
    await expect(page.getByText('Headings')).toBeVisible();
    await expect(page.getByText('Tables')).toBeVisible();
    await expect(page.getByText('Figures')).toBeVisible();
    await expect(page.getByText('References')).toBeVisible();

    // Verify Checksum
    await expect(page.getByText('SHA-256 Checksum')).toBeVisible();
    const copyChecksumBtn = page.getByTitle('Copy SHA-256 Checksum');
    await expect(copyChecksumBtn).toBeVisible();

    // =========================================================================
    // JOURNEY E: INITIATE PRINT-READY PDF EXPORT
    // =========================================================================
    await page.click('button:has-text("PDF Document")');
    const exportPdfBtn = page.locator('button:has-text("Export Document (PDF)")');
    await expect(exportPdfBtn).toBeVisible();
    await exportPdfBtn.click();

    // Wait for PDF completion
    await expect(page.locator('button:has-text("Download PDF"):not([disabled])')).toBeVisible({ timeout: 60000 });

    // Verify PDF QA details
    await expect(page.locator('span:has-text("PDF")').first()).toBeVisible();

    // =========================================================================
    // JOURNEY F: EXPORT HISTORY DRAWER
    // =========================================================================
    await page.click('button:has-text("Export History")');
    await expect(page.getByText('Document Export History')).toBeVisible({ timeout: 5000 });

    // Verify both DOCX and PDF entries exist in drawer
    await expect(page.locator('div:has-text("DOCX")').first()).toBeVisible();
    await expect(page.locator('div:has-text("PDF")').first()).toBeVisible();

    // Close drawer
    await page.locator('button svg path[d="M6 18L18 6M6 6l12 12"]').click();
    await expect(page.getByText('Document Export History')).not.toBeVisible();
  });
});

