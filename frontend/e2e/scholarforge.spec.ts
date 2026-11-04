import { test, expect } from '@playwright/test';

test.describe('ScholarForge AI E2E Tests', () => {
  const testId = Date.now();
  const testUser = {
    email: `researcher_${testId}@stanford.edu`,
    password: 'Password2026!Secure',
    firstName: 'Alexandra',
    lastName: 'Moreau',
    institution: 'Stanford University',
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

  test('Full Researcher Journey: Registration, Login, Wizard, Workspace, and Dashboard Metrics', async ({ page }) => {
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
    await expect(page.locator('h1')).toContainText('Welcome back, Alexandra');

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
    await page.click('button:has-text("Computer Science")');
    await page.click('button:has-text("Next Step")');

    // Step 4: Fill Research Information
    await expect(page.getByText('Step 4: Research Information & Requirements')).toBeVisible();
    const projectTitle = `Neural Semantic Compression in Ultra-Low Bandwidth Edge Systems (${testId})`;
    await page.fill('input[placeholder*="An Empirical Evaluation"]', projectTitle);
    await page.selectOption('select:has-text("APA 7th edition")', 'IEEE');
    await page.fill('textarea[placeholder*="Quantitative experimental"]', 'Empirical multi-node distributed benchmarks on embedded RISC-V nodes.');
    await page.fill('textarea[placeholder*="Quantify verification throughput"]', '1. Measure memory footprint. 2. Evaluate round-trip latency.');
    await page.fill('input[placeholder="30000"]', '45000');
    await page.click('button:has-text("Next Step")');

    // Step 5: Review & Initialize
    await expect(page.getByText('Step 5: Review & Initialize Workspace')).toBeVisible();
    await expect(page.getByText(projectTitle)).toBeVisible();
    await expect(page.getByText('Computer Science', { exact: true })).toBeVisible();

    // Click "Initialize Research Workspace"
    await page.click('button:has-text("Initialize Research Workspace")');

    // 3. Verify Dedicated Workspace loaded
    await page.waitForURL(/.*research\/[0-9a-f-]+/, { timeout: 15000 });
    await expect(page.locator('h1')).toContainText(projectTitle);
    await expect(page.getByText('PhD Dissertation')).toBeVisible();
    await expect(page.getByText('IEEE', { exact: true })).toBeVisible();

    // Verify dynamic chapter outline generated in database
    await expect(page.getByText('Chapters & Sections')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Introduction & Problem Statement' })).toBeVisible();

    // 4. Return to Dashboard and verify project is listed with real DB stats
    await page.goto('/dashboard');
    await expect(page.locator('h1')).toContainText('Welcome back, Alexandra');
    await expect(page.getByText(projectTitle)).toBeVisible();

    // 5. Test Logout & Login
    await page.click('button[title="Sign Out"]');
    await page.waitForURL('**/login', { timeout: 10000 });

    // Sign back in
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await expect(page.getByText(projectTitle)).toBeVisible();
  });
});
